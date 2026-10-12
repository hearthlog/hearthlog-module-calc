<script lang="ts">
    import { tenant } from "@hearthlog/sdk/runtime";
    import CalculatorPageHeader from "../components/CalculatorPageHeader.svelte";
    import DateCalculator from "../components/DateCalculator.svelte";
</script>

<svelte:head><title>Date calculator | {tenant.title}</title></svelte:head>
<div class="stor-page w-full p-2.5 sm:p-3">
    <CalculatorPageHeader active="dates" />
    <DateCalculator />
</div>
