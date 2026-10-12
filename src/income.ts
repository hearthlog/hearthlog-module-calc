import { calculateSummary, taxConfig, type TaxConfig } from "@hearthlog/czech";

/** Inputs of the income calculator: a month of billed days at a day rate. */
export interface IncomeInputs {
    mdCount: number;
    mdRate: number;
}

export const INCOME_DEFAULTS: IncomeInputs = { mdCount: 21, mdRate: 7000 };

function finiteNonNegative(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Stored inputs never render NaN, Infinity, or negative values. */
export function parseIncomeInputs(stored: unknown): IncomeInputs {
    const record = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
    return {
        mdCount: finiteNonNegative(record.mdCount, INCOME_DEFAULTS.mdCount),
        mdRate: finiteNonNegative(record.mdRate, INCOME_DEFAULTS.mdRate),
    };
}

/** The message to show for inputs that must not be saved, or null. */
export function validateIncomeInputs(inputs: IncomeInputs): string | null {
    const valid = [inputs.mdCount, inputs.mdRate].every((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0);
    return valid ? null : 'Enter numbers of zero or more.';
}

export type IncomeShareId = 'net' | 'incomeTax' | 'socialInsurance' | 'medicalInsurance';

export interface IncomeShare {
    id: IncomeShareId;
    label: string;
    monthly: number;
    /** Share of monthly revenue, 0–1. */
    share: number;
}

export interface IncomeResult {
    monthlyRevenue: number;
    takeHome: number;
    deductions: number;
    netPerDay: number;
    effectiveRate: number;
    annualRevenue: number;
    annualTakeHome: number;
    annualDeductions: number;
    /** Where monthly revenue goes; the shares add up to the revenue. */
    shares: IncomeShare[];
}

function ratio(value: number, total: number): number {
    if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0;
    return Math.max(0, Math.min(1, value / total));
}

/** Monthly and annual take-home under the flat-rate regime. */
export function calculateIncome(inputs: IncomeInputs, config: TaxConfig = taxConfig): IncomeResult {
    const summary = calculateSummary(inputs.mdCount, inputs.mdRate, config);
    const monthlyRevenue = summary.totalEarnings / 12;
    const count = Number(inputs.mdCount) || 0;
    const parts: [IncomeShareId, string, number][] = [
        ['net', 'Take-home', summary.netSalary],
        ['incomeTax', 'Income tax', summary.incomeTaxMonthly],
        ['socialInsurance', 'Social insurance', summary.socialInsuranceMonthly],
        ['medicalInsurance', 'Medical insurance', summary.medicalInsuranceMonthly],
    ];
    return {
        monthlyRevenue,
        takeHome: summary.netSalary,
        deductions: summary.taxes,
        netPerDay: count > 0 ? summary.netSalary / count : 0,
        effectiveRate: ratio(summary.totalTaxes, summary.totalEarnings),
        annualRevenue: summary.totalEarnings,
        annualTakeHome: summary.afterTaxEarnings,
        annualDeductions: summary.totalTaxes,
        shares: parts.map(([id, label, monthly]) => ({ id, label, monthly, share: ratio(monthly, monthlyRevenue) })),
    };
}
