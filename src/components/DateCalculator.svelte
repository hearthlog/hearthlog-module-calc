<script lang="ts">
    import { Badge, Checkbox, DatePicker, Field, Input, Metric, Panel, Select } from "@hearthlog/sdk/ui";
    import { format, isWeekend } from "date-fns";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { appClock } from "@hearthlog/sdk/runtime";
    import { toLocalDateString } from "@hearthlog/czech";
    import {
        DATE_AMOUNT_DEFAULT,
        DATE_AMOUNT_MAX,
        DATE_MODES,
        DATE_UNITS,
        czechHolidayName,
        dateDifference,
        parseDateInput,
        parseDateMode,
        shiftDate,
        validateDateAmount,
        type DateMode,
        type DateUnit,
    } from "../dates.js";
    import { formatNumber } from "@hearthlog/sdk/format";

    // Only the mode lives in the URL; the inputs start over on every visit.
    let mode = $state<DateMode>(parseDateMode(page.url.searchParams.get("mode")));

    function selectMode(value: DateMode): void {
        mode = value;
        const url = new URL(window.location.href);

        if (value === "add") url.searchParams.delete("mode"); else url.searchParams.set("mode", value);

        goto(url, { shallow: true, replace: true, state: page.state });
    }

    const today = toLocalDateString(appClock.now());
    let start = $state(today);
    let end = $state(today);
    let amount = $state<number | null>(DATE_AMOUNT_DEFAULT);
    let unit = $state<DateUnit>("days");
    let includeEnd = $state(false);

    const startDate = $derived(parseDateInput(start));
    const endDate = $derived(parseDateInput(end));
    const error = $derived(!startDate
        ? "Enter a start date."
        : mode === "difference"
            ? endDate ? null : "Enter an end date."
            : validateDateAmount(amount));
    const shifted = $derived(!error && startDate && mode !== "difference"
        ? shiftDate(startDate, amount as number, unit, mode === "subtract" ? -1 : 1)
        : null);
    const difference = $derived(!error && startDate && endDate && mode === "difference" ? dateDifference(startDate, endDate, includeEnd) : null);

    const note = $derived(shifted
        ? czechHolidayName(shifted) ?? (isWeekend(shifted) ? "Weekend" : null)
        : null);
</script>

<div class="grid items-start gap-[var(--stor-section-gap)] lg:grid-cols-[minmax(17rem,22rem)_minmax(0,1fr)]">
    <Panel title="Inputs" class="lg:sticky lg:top-3">
        <div class="stor-segmented-control flex" role="group" aria-label="Calculation">
            {#each DATE_MODES as option (option.id)}
                <button type="button" class="stor-segmented-option flex-1" aria-pressed={mode === option.id} onclick={() => selectMode(option.id)}>{option.label}</button>
            {/each}
        </div>
        <div class="mt-5 space-y-5">
            <Field label="Start date" htmlFor="date-start">
                <DatePicker id="date-start" bind:value={start} clearable={false} placeholder="Choose start date" />
            </Field>
            {#if mode === "difference"}
                <Field label="End date" htmlFor="date-end">
                    <DatePicker id="date-end" bind:value={end} clearable={false} placeholder="Choose end date" />
                </Field>
                <label class="flex min-h-11 items-center gap-2 text-sm text-[var(--stor-ink)]">
                    <Checkbox checked={includeEnd} onCheckedChange={(checked) => includeEnd = Boolean(checked)} />
                    Include end date
                </label>
            {:else}
                <div class="grid grid-cols-2 gap-3">
                    <Field label="Amount" htmlFor="date-amount">
                        <Input id="date-amount" name="amount" type="number" inputmode="numeric" min="0" max={DATE_AMOUNT_MAX} step="1" class="tabular-nums" bind:value={amount} />
                    </Field>
                    <Field label="Unit" htmlFor="date-unit">
                        <Select id="date-unit" value={unit} options={[...DATE_UNITS]} onValueChange={(value) => unit = value as DateUnit} />
                    </Field>
                </div>
            {/if}
        </div>
        {#if error}<p class="mt-3 text-sm text-[var(--stor-negative)]" role="alert">{error}</p>{/if}
    </Panel>

    <Panel label="Result" padding="all">
        {#if mode === "difference"}
            <div class="grid grid-cols-2 gap-4">
                <Metric label="Days" size="lg">{difference ? formatNumber(difference.days) : "—"}</Metric>
                <Metric label="Working days" size="lg">{difference ? formatNumber(difference.workingDays) : "—"}</Metric>
            </div>
        {:else}
            <Metric label="Resulting date" size="lg" detail={shifted ? format(shifted, "EEEE") : ""}>{shifted ? format(shifted, "d MMM yyyy") : "—"}</Metric>
            {#if note}<Badge variant="warning" class="mt-3">{note}</Badge>{/if}
        {/if}
    </Panel>
</div>
