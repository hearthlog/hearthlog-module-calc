import { deferLocalPage } from "@hearthlog/sdk/runtime";
import { calculatorById } from "../calculators.js";
import { INCOME_DEFAULTS, parseIncomeInputs } from "../income.js";
import { loadCalculatorSettings } from "../settings.svelte.js";

export const load = ({ url }: { url: URL }) =>
    deferLocalPage(url, INCOME_DEFAULTS, () => loadCalculatorSettings(calculatorById('income'), parseIncomeInputs));
