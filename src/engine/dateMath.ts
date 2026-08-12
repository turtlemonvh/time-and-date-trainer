import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  format,
  getDaysInMonth,
} from 'date-fns';
import { randInt, type Rng } from './rng';

export function randomDate(rng: Rng, start: Date, end: Date): Date {
  if (end.getTime() < start.getTime()) {
    throw new Error('randomDate: end must not be before start');
  }
  const spanDays = differenceInCalendarDays(end, start);
  const offset = randInt(rng, 0, spanDays);
  return addDays(start, offset);
}

export function formatDateLong(d: Date): string {
  return format(d, 'MMMM d, yyyy');
}

export function formatMonthYear(year: number, monthIndex: number): string {
  return format(new Date(year, monthIndex, 1), 'MMMM yyyy');
}

/** Every date in `year`/`monthIndex` whose `getDay()` matches `weekday`
 * (0 = Sunday), in ascending order — 4 or 5 dates, since every weekday
 * occurs at least 4 and at most 5 times in any month. */
export function weekdayOccurrencesInMonth(
  year: number,
  monthIndex: number,
  weekday: number,
): Date[] {
  const daysInMonth = getDaysInMonth(new Date(year, monthIndex, 1));
  const matches: Date[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const candidate = new Date(year, monthIndex, day);
    if (candidate.getDay() === weekday) matches.push(candidate);
  }
  return matches;
}

/**
 * The nth occurrence of `weekday` in a given month, or its last occurrence
 * when `n` is `'last'`. `n` in 1-4 is guaranteed to exist for every weekday
 * in every month; a 5th occurrence only sometimes does, which is exactly
 * why this doesn't accept `n: 5` — callers wanting "the last one" (which
 * may or may not be a 5th) ask for `'last'` explicitly instead.
 */
export function nthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  n: 1 | 2 | 3 | 4 | 'last',
): Date {
  const matches = weekdayOccurrencesInMonth(year, monthIndex, weekday);
  const match = n === 'last' ? matches[matches.length - 1] : matches[n - 1];
  if (!match) {
    throw new Error(
      `nthWeekdayOfMonth: no ${n} occurrence of weekday ${weekday} in ${year}-${monthIndex + 1}`,
    );
  }
  return match;
}

export type DateOffsetUnit = 'day' | 'week' | 'month';

export function offsetDate(d: Date, amount: number, unit: DateOffsetUnit): Date {
  switch (unit) {
    case 'day':
      return addDays(d, amount);
    case 'week':
      return addWeeks(d, amount);
    case 'month':
      return addMonths(d, amount);
  }
}
