<script lang="ts">
    import { PageDataStatus } from "@hearthlog/sdk/ui";
    import { providePageResource, tenant } from "@hearthlog/sdk/runtime";
    import { calculatorById } from "../calculators.js";
    import { INCOME_DEFAULTS, validateIncomeInputs, type IncomeInputs } from "../income.js";
    import { CalculatorDraft } from "../settings.svelte.js";
    import CalculatorPageHeader from "../components/CalculatorPageHeader.svelte";
    import IncomeCalculator from "../components/IncomeCalculator.svelte";

    let { data: routeData } = $props();
    const resource = $derived(routeData.pageResource);
    providePageResource(() => resource);

    const draft = new CalculatorDraft<IncomeInputs>(calculatorById("income"), INCOME_DEFAULTS, validateIncomeInputs);

    $effect(() => {
        if (!resource.loading) draft.hydrate(resource.data);
    });
    $effect(() => draft.listen());
</script>

<svelte:head><title>Calculator | {tenant.title}</title></svelte:head>
<div class="stor-page w-full p-2.5 sm:p-3">
    <CalculatorPageHeader active="income" />
    <PageDataStatus {resource} />
    <IncomeCalculator {draft} />
</div>
