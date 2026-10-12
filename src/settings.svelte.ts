/**
 * Calculator settings (KV-based).
 *
 * A calculator that keeps its inputs does so under its own key. Settings are
 * local per device and not synced, so they never go through commands or events.
 */

import { getDeviceSetting as kvGet, setDeviceSetting as kvSet } from "@hearthlog/sdk/runtime";
import type { CalculatorDefinition } from "./calculators.js";

const SAVE_DEBOUNCE_MS = 400;

function settingsKey(calculator: CalculatorDefinition): string {
    if (!calculator.storageKey) throw new Error(`Calculator ${calculator.id} keeps no settings`);
    return calculator.storageKey;
}

export async function loadCalculatorSettings<T>(calculator: CalculatorDefinition, parse: (stored: unknown) => T): Promise<T> {
    return parse(await kvGet<unknown>(settingsKey(calculator)));
}

export async function saveCalculatorSettings<T>(calculator: CalculatorDefinition, values: T): Promise<void> {
    await kvSet(settingsKey(calculator), values);
}

export type CalculatorSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Editable calculator inputs that save themselves shortly after each change
 * and flush a pending save when the page hides or the component unmounts.
 */
export class CalculatorDraft<T extends object> {
    values = $state() as T;
    ready = $state(false);
    status = $state<CalculatorSaveStatus>('idle');
    error = $state<string | null>(null);

    #calculator: CalculatorDefinition;
    #validate: (values: T) => string | null;
    #timer: ReturnType<typeof setTimeout> | null = null;
    #saved = '';

    constructor(calculator: CalculatorDefinition, initial: T, validate: (values: T) => string | null) {
        this.#calculator = calculator;
        this.#validate = validate;
        this.values = { ...initial };
    }

    /** Takes the stored inputs once; later loads never overwrite edits. */
    hydrate(stored: T): void {
        if (this.ready) return;
        this.values = { ...stored };
        this.#saved = JSON.stringify(stored);
        this.ready = true;
    }

    /** Call after every edit. */
    changed(): void {
        if (this.#timer) clearTimeout(this.#timer);
        this.#timer = setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS);
    }

    flush(): void {
        if (this.#timer) {
            clearTimeout(this.#timer);
            this.#timer = null;
        }
        if (!this.ready) return;
        const values = $state.snapshot(this.values) as T;
        const message = this.#validate(values);
        if (message) {
            this.status = 'error';
            this.error = message;
            return;
        }
        this.error = null;
        const serialized = JSON.stringify(values);
        if (serialized === this.#saved) {
            if (this.status === 'error') this.status = 'saved';
            return;
        }
        this.status = 'saving';
        void saveCalculatorSettings(this.#calculator, values)
            .then(() => {
                this.#saved = serialized;
                this.status = 'saved';
            })
            .catch(() => {
                this.status = 'error';
                this.error = 'Could not save. Your values are still here.';
            });
    }

    /** Flushes on page hide and teardown; use as `$effect(() => draft.listen())`. */
    listen(): () => void {
        const flush = () => this.flush();
        window.addEventListener('pagehide', flush);
        return () => {
            window.removeEventListener('pagehide', flush);
            flush();
        };
    }
}
