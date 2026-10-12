<script lang="ts">
    import { PageHeader, RouteTabs } from "@hearthlog/sdk/ui";
    import type { Snippet } from "svelte";
    import { calculatorLinks, type CalculatorId } from "../calculators.js";

    let { active, children }: { active: CalculatorId; children?: Snippet } = $props();

    const tabs = $derived(calculatorLinks().map((calculator) => ({
        label: calculator.label,
        href: calculator.href,
        active: calculator.id === active,
    })));
</script>

{#snippet calculatorTabs()}
    <RouteTabs label="Calculators" {tabs} />
{/snippet}

<PageHeader title="Calculator" sidebarTabs tabs={tabs.length ? calculatorTabs : undefined}>
    {@render children?.()}
</PageHeader>
