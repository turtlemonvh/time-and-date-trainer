import { addDays, addMonths, addWeeks, format } from 'date-fns';
import { randInt, type Rng } from './rng';

export function randomDate(rng: Rng, start: Date, end: Date): Date {
  if (end.getTime() < start.getTime()) {
    throw new Error('randomDate: end must not be before start');
  }
  const spanDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000);
  const offset = randInt(rng, 0, spanDays);
  return addDays(start, offset);
}

export function formatDateLong(d: Date): string {
  return format(d, 'MMMM d, yyyy');
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
