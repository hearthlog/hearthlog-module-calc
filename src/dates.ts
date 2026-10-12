import {
    addBusinessDays,
    addDays,
    addMonths,
    addWeeks,
    addYears,
    differenceInBusinessDays,
    differenceInCalendarDays,
    eachYearOfInterval,
    isBefore,
    isValid,
    isWeekend,
    max,
    min,
    parseISO,
} from 'date-fns';
import { getCzechHolidayNames, getCzechHolidays, toLocalDateString } from "@hearthlog/czech";

/**
 * Date calculator: move a date by an amount of one unit, or count the days
 * between two dates. Working days skip weekends and Czech public holidays,
 * the same rules the Calendar uses. Nothing is saved; only the mode lives in
 * the URL.
 */

export type DateMode = 'add' | 'subtract' | 'difference';

export const DATE_MODES: readonly { id: DateMode; label: string }[] = [
    { id: 'add', label: 'Add' },
    { id: 'subtract', label: 'Subtract' },
    { id: 'difference', label: 'Difference' },
];

export function parseDateMode(value: string | null): DateMode {
    return DATE_MODES.find((mode) => mode.id === value)?.id ?? 'add';
}

export type DateUnit = 'days' | 'workingDays' | 'weeks' | 'months' | 'years';

export const DATE_UNITS: readonly { value: DateUnit; label: string }[] = [
    { value: 'days', label: 'Days' },
    { value: 'workingDays', label: 'Working days' },
    { value: 'weeks', label: 'Weeks' },
    { value: 'months', label: 'Months' },
    { value: 'years', label: 'Years' },
];

export const DATE_AMOUNT_DEFAULT = 30;
export const DATE_AMOUNT_MAX = 9999;

/** A `yyyy-MM-dd` value from a date picker as a local date, or null. */
export function parseDateInput(value: string): Date | null {
    const date = parseISO(value);
    return value && isValid(date) ? date : null;
}

/** The message to show for an amount that cannot be used, or null. */
export function validateDateAmount(amount: number | null | undefined): string | null {
    const valid = typeof amount === 'number' && Number.isInteger(amount) && amount >= 0 && amount <= DATE_AMOUNT_MAX;
    return valid ? null : `Enter a whole number from 0 to ${DATE_AMOUNT_MAX}.`;
}

/** The Czech public holiday on this date, or null. */
export function czechHolidayName(date: Date): string | null {
    return getCzechHolidayNames(date.getFullYear()).get(toLocalDateString(date)) ?? null;
}

/**
 * Moves by working days. The start date never counts, so a non-zero move
 * always lands on a working day: Friday + 1 working day is Monday.
 */
function shiftWorkingDays(start: Date, amount: number, direction: 1 | -1): Date {
    let date = start;
    for (let left = amount; left > 0; ) {
        date = addBusinessDays(date, direction);
        if (!czechHolidayName(date)) left -= 1;
    }
    return date;
}

/** Adds (direction 1) or subtracts (direction -1) an amount of one unit. */
export function shiftDate(start: Date, amount: number, unit: DateUnit, direction: 1 | -1): Date {
    switch (unit) {
        case 'days': return addDays(start, amount * direction);
        case 'workingDays': return shiftWorkingDays(start, amount, direction);
        case 'weeks': return addWeeks(start, amount * direction);
        // A missing day moves to the month's last day: 31 Jan + 1 month = 28 Feb.
        case 'months': return addMonths(start, amount * direction);
        case 'years': return addYears(start, amount * direction);
    }
}

export interface DateDifference {
    days: number;
    workingDays: number;
}

/**
 * Counts the days from the earlier date up to the later one, which counts
 * only when `includeEnd` is set: 5 Oct → 9 Oct is 4 days, or 5 with the end.
 * The order of the two dates does not matter.
 */
export function dateDifference(first: Date, second: Date, includeEnd: boolean): DateDifference {
    const start = min([first, second]);
    const end = addDays(max([first, second]), includeEnd ? 1 : 0);
    // differenceInBusinessDays counts weekdays from start up to, not including, end.
    const weekdayHolidays = eachYearOfInterval({ start, end })
        .flatMap((year) => [...getCzechHolidays(year.getFullYear())])
        .map((value) => parseISO(value))
        .filter((holiday) => !isWeekend(holiday) && !isBefore(holiday, start) && isBefore(holiday, end)).length;
    return {
        days: differenceInCalendarDays(end, start),
        workingDays: differenceInBusinessDays(end, start) - weekdayHolidays,
    };
}
