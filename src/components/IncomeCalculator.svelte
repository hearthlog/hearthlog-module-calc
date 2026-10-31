<script lang="ts">
    import { Amount, DataValue, Field, Input, Metric, Panel } from "@hearthlog/sdk/ui";
    import { format } from "date-fns";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { appClock } from "@hearthlog/sdk/runtime";
    import { getWorkingDays, taxConfig } from "@hearthlog/czech";
    import { calculateIncome, type IncomeInputs, type IncomeShareId } from "../income.js";
    import type { CalculatorDraft } from "../settings.svelte.js";
    import { formatMoney, formatNumber } from "@hearthlog/sdk/format";

    let { draft }: { draft: CalculatorDraft<IncomeInputs> } = $props();

    type Period = "month" | "year";
    let period = $state<Period>(page.url.searchParams.get("period") === "year" ? "year" : "month");

    function selectPeriod(value: Period): void {
        period = value;
        const url = new URL(window.location.href);

        if (value === "year") url.searchParams.set("period", value); else url.searchParams.delete("period");

        goto(url, { shallow: true, replace: true, state: page.state });
    }

    // This month's workdays come from the Calendar's weekend and Czech holiday rules.
    const today = appClock.now();
    const monthWorkdays = getWorkingDays(today.getFullYear(), today.getMonth()).filter((day) => day.isWorkingDay).length;
    const monthName = format(today, "MMMM");

    function useMonthWorkdays(): void {
        draft.values.mdCount = monthWorkdays;
        draft.flush();
    }

    const rateOptions = $derived(
        [-1000, -500, 0, 500, 1000]
            .map((step) => draft.values.mdRate + step)
            .filter((value) => value > 0),
    );
    function useRate(value: number): void {
        draft.values.mdRate = value;
        draft.flush();
    }
    const result = $derived(calculateIncome(draft.values));
    const scale = $derived(period === "year" ? 12 : 1);
    const shareColors: Record<IncomeShareId, string> = {
        net: "--stor-positive",
        incomeTax: "--stor-chart-income-tax",
        socialInsurance: "--stor-chart-social-insurance",
        medicalInsurance: "--stor-chart-medical-insurance",
    };
    const statusText = $derived(
        draft.status === "saving" ? "Saving…" : draft.status === "error" ? "Not saved" : "Saved on this device",
    );

    function money(value: number): string {
        return formatMoney(value, { decimals: "never" });
    }

    function percent(share: number): string {
        return `${formatNumber(share * 100)} %`;
    }

    function rate(value: number): string {
        return `${formatNumber(value * 100, 1)} %`;
    }
</script>

<div class="stor-income-calculator grid items-start gap-[var(--stor-section-gap)] lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]">
    <Panel title="Inputs" class="lg:sticky lg:top-3">
        {#snippet action()}
            <span class="text-xs text-[var(--stor-muted-text)]" role="status" aria-live="polite">{statusText}</span>
        {/snippet}
        <fieldset class="space-y-5" disabled={!draft.ready}>
            <legend class="sr-only">Monthly inputs</legend>
            <Field label="Working days" htmlFor="mdCount">
                <div class="relative">
                    <Input id="mdCount" name="mdCount" type="number" inputmode="decimal" min="0" step="0.5" class="pr-14 tabular-nums" bind:value={draft.values.mdCount} oninput={() => draft.changed()} onblur={() => draft.flush()} />
                    <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[var(--stor-muted-text)]">days</span>
                </div>
                {#if draft.ready && draft.values.mdCount !== monthWorkdays}
                    <button type="button" class="stor-income-hint" onclick={useMonthWorkdays}>Use {monthName}: {monthWorkdays} workdays</button>
                {/if}
            </Field>
            <Field label="Day rate" htmlFor="mdRate">
                <div class="relative">
                    <Input id="mdRate" name="mdRate" type="number" inputmode="decimal" min="0" step="100" class="pr-12 tabular-nums" bind:value={draft.values.mdRate} oninput={() => draft.changed()} onblur={() => draft.flush()} />
                    <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-[var(--stor-muted-text)]">Kč</span>
                </div>
                <div class="stor-rate-chips" role="group" aria-label="Day rate presets">
                    {#each rateOptions as option (option)}
                        <button type="button" class="stor-rate-chip" aria-pressed={draft.values.mdRate === option} onclick={() => useRate(option)}>{formatNumber(option)}</button>
                    {/each}
                </div>
            </Field>
        </fieldset>

        {#if draft.error}
            <p
                class="mt-3 text-sm text-[var(--stor-negative)]"
                role="alert"
            >{draft.error}</p>
        {/if}

        <details
            class="stor-income-assumptions group mt-6 border-t border-[var(--stor-border)] pt-4"
        >
            <summary
                class="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[var(--stor-ink)]"
            >
                Flat-rate assumptions 
                <span class="text-[var(--stor-muted-text)] transition group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <dl class="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 text-xs">
                <dt class="text-[var(--stor-muted-text)]">Expense allowance</dt>
                <dd class="text-right tabular-nums">{rate(taxConfig.flatRate)} up to {money(taxConfig.maxTariff)}</dd>
                <dt class="text-[var(--stor-muted-text)]">Income tax</dt>
                <dd class="text-right tabular-nums">{rate(taxConfig.incomeTax)} less {money(taxConfig.incomeTaxDiscount)}/yr</dd>
                <dt class="text-[var(--stor-muted-text)]">Social insurance</dt>
                <dd class="text-right tabular-nums">{rate(taxConfig.socialInsurance)} of {rate(taxConfig.socialInsuranceBase)}</dd>
                <dt class="text-[var(--stor-muted-text)]">Medical insurance</dt>
                <dd class="text-right tabular-nums">{rate(taxConfig.medicalInsurance)} of {rate(taxConfig.medicalInsuranceBase)}</dd>
            </dl>
        </details>
    </Panel>

    <Panel label="Result" padding="all">
        <div class="flex flex-wrap items-start justify-between gap-3">
            <Metric label={period === "year" ? "Take-home per year" : "Take-home per month"} size="lg" detail={period === "year" ? `${money(result.takeHome)} a month` : `${money(result.netPerDay)} per working day`}>
                <span class="stor-income-hero"><DataValue><Amount value={Math.round(result.takeHome * scale)} /></DataValue></span>
            </Metric>
            <div class="stor-segmented-control flex" role="group" aria-label="Period">
                <button type="button" class="stor-segmented-option" aria-pressed={period === "month"} onclick={() => selectPeriod("month")}>Month</button>
                <button type="button" class="stor-segmented-option" aria-pressed={period === "year"} onclick={() => selectPeriod("year")}>Year</button>
            </div>
        </div>

        <p class="mt-5 text-sm text-[var(--stor-muted-text)]">You keep <b class="font-semibold text-[var(--stor-ink)]"><DataValue>{formatNumber(result.takeHome / (result.monthlyRevenue || 1) * 100, 1)}</DataValue> Kč</b> of every 100 Kč invoiced.</p>
        <div class="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full bg-[var(--stor-surface-muted)]" role="img" aria-label={`Revenue split: ${result.shares.map((item) => `${item.label} ${percent(item.share)}`).join(", ")}`}>
            {#each result.shares as item (item.id)}
                {#if item.share > 0}<div class="h-full first:rounded-l-full last:rounded-r-full" style={`width:${item.share * 100}%;background:var(${shareColors[item.id]})`}></div>{/if}
            {/each}
        </div>

        <ul class="mt-4 divide-y divide-[var(--stor-border)]">
            {#each result.shares as item (item.id)}
                <li class="grid grid-cols-[minmax(0,1fr)_auto_3.5rem] items-center gap-3 py-2.5 text-sm">
                    <span class="flex min-w-0 items-center gap-2 text-[var(--stor-muted-text)]"><span class="h-2.5 w-2.5 shrink-0 rounded-full" style={`background:var(${shareColors[item.id]})`}></span>{item.label}</span>
                    <span class="font-medium tabular-nums text-[var(--stor-ink)]"><DataValue>{money(item.monthly * scale)}</DataValue></span>
                    <span class="text-right text-xs tabular-nums text-[var(--stor-muted-text)]"><DataValue>{percent(item.share)}</DataValue></span>
                </li>
            {/each}
        </ul>

        <dl class="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--stor-border)] pt-5 sm:grid-cols-3">
            {#each [["Revenue", money(result.monthlyRevenue * scale)], ["Deductions", money(result.deductions * scale)], ["Effective rate", percent(result.effectiveRate)]] as [label, value] (label)}
                <div class="stor-metric">
                    <dt class="stor-metric-label">{label}</dt>
                    <dd class="whitespace-nowrap text-lg font-semibold tabular-nums tracking-tight text-[var(--stor-ink)]"><DataValue>{value}</DataValue></dd>
                </div>
            {/each}
        </dl>
    </Panel>
</div>

<style>
    .stor-income-hero { font-size: clamp(2.25rem, 6vw, 3.25rem); line-height: 1.05; letter-spacing: -0.035em; }
    .stor-income-hint {
        margin-top: 4px;
        min-height: 36px;
        border-radius: 8px;
        padding-inline: 8px;
        margin-left: -8px;
        font-size: 12px;
        font-weight: 600;
        color: var(--stor-accent-strong);
    }
    .stor-rate-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .stor-rate-chip { min-height: 30px; padding-inline: 10px; border-radius: 999px; background: var(--stor-surface-raised); box-shadow: var(--stor-elevation-2); font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--stor-ink); }
    .stor-rate-chip[aria-pressed="true"] { background: var(--stor-accent-soft); box-shadow: inset 0 0 0 1.5px var(--stor-action); color: var(--stor-accent-text); }
    .stor-rate-chip:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--stor-focus); }
    @media (pointer: coarse) { .stor-rate-chip { min-height: 44px; } }
    .stor-income-hint:hover { background: var(--stor-accent-soft); }
    .stor-income-hint:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--stor-focus); }
    @media (pointer: coarse) { .stor-income-hint { min-height: 44px; } }
    .stor-income-assumptions summary::-webkit-details-marker { display: none; }
</style>
