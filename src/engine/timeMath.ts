import { randInt, type Rng } from './rng';

export type TimePrecision = 'hour' | 'half' | 'quarter' | 'five' | 'minute' | 'second';

export interface TimeOfDay {
  hour: number;
  minute: number;
  second: number;
}

const PRECISION_STEP_MINUTES: Record<TimePrecision, number> = {
  hour: 60,
  half: 30,
  quarter: 15,
  five: 5,
  minute: 1,
  second: 1,
};

export function randomTime(rng: Rng, precision: TimePrecision): TimeOfDay {
  const hour = randInt(rng, 0, 23);
  const step = PRECISION_STEP_MINUTES[precision];
  const steps = 60 / step;
  const minute = randInt(rng, 0, steps - 1) * step;
  const second = precision === 'second' ? randInt(rng, 0, 59) : 0;
  return { hour, minute, second };
}

export function formatTime12(t: TimeOfDay, opts: { seconds?: boolean } = {}): string {
  const period = t.hour < 12 ? 'AM' : 'PM';
  const hour12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const mm = String(t.minute).padStart(2, '0');
  const base = opts.seconds
    ? `${hour12}:${mm}:${String(t.second).padStart(2, '0')}`
    : `${hour12}:${mm}`;
  return `${base} ${period}`;
}

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
  'twenty',
  'twenty-one',
  'twenty-two',
  'twenty-three',
  'twenty-four',
  'twenty-five',
  'twenty-six',
  'twenty-seven',
  'twenty-eight',
  'twenty-nine',
];

function hourWord(hour24: number): string {
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return NUMBER_WORDS[h12];
}

export function describeTime(t: TimeOfDay): string {
  const { hour, minute } = t;
  const nextHour = (hour + 1) % 24;
  if (minute === 0) return `${hourWord(hour)} o'clock`;
  if (minute === 15) return `quarter past ${hourWord(hour)}`;
  if (minute === 30) return `half past ${hourWord(hour)}`;
  if (minute === 45) return `quarter to ${hourWord(nextHour)}`;
  if (minute < 30) return `${NUMBER_WORDS[minute]} past ${hourWord(hour)}`;
  return `${NUMBER_WORDS[60 - minute]} to ${hourWord(nextHour)}`;
}
