/**
 * Calculators listed under the Calculator section.
 *
 * `/calc` opens the first calculator. Each further calculator owns a route
 * under `/calc/<id>` (declared in `hearthlog.module.json`, which also lists the
 * sidebar sub-pages), a pure model in `src/<id>.ts`, and, when it keeps its
 * inputs, a device-local settings key read through `settings.svelte.ts`.
 */

export type CalculatorId = 'income' | 'dates';

export interface CalculatorDefinition {
    id: CalculatorId;
    label: string;
    href: string;
    /** Device-local KV key for the calculator's inputs; absent when nothing is saved. */
    storageKey?: string;
}

export const CALCULATORS: readonly CalculatorDefinition[] = [
    // The income calculator keeps its original key so saved inputs survive.
    { id: 'income', label: 'Income', href: '/calc', storageKey: 'calc:settings' },
    { id: 'dates', label: 'Dates', href: '/calc/dates' },
];

export function calculatorById(id: CalculatorId): CalculatorDefinition {
    const calculator = CALCULATORS.find((item) => item.id === id);
    if (!calculator) throw new Error(`Unknown calculator id: ${id}`);
    return calculator;
}

/** Tabs and sidebar sub-pages appear only once there is more than one calculator. */
export function calculatorLinks(calculators: readonly CalculatorDefinition[] = CALCULATORS): readonly CalculatorDefinition[] {
    return calculators.length > 1 ? calculators : [];
}
