import type { DisplaySpec } from '../engine/questions';

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * A one-line, human-readable gloss of a display spec. Text only — the real
 * widgets (AnalogClock, CalendarMonth) arrive in a later milestone. Shared
 * between the production preview player and the dev-only debug page so the
 * two don't drift.
 */
export function describeDisplay(display: DisplaySpec): string {
  switch (display.kind) {
    case 'analogClock': {
      const { hour, minute, second } = display.time;
      const seconds = display.showSeconds ? ', second hand shown' : '';
      return `analog clock at ${pad(hour)}:${pad(minute)}:${pad(second)} (24h internal)${seconds}`;
    }
    case 'calendar':
      return `calendar for ${MONTH_NAMES[display.monthIndex]} ${display.year}, day ${display.highlightDay} highlighted`;
    case 'none':
      return 'no visual — the prompt carries everything';
  }
}
