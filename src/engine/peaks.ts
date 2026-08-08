export interface Peak {
  id: number;
  name: string;
  emphasis: string;
  height: number;
}

export const PEAKS: readonly Peak[] = [
  { id: 1, name: 'Basecamp Bluff', emphasis: 'Reading analog clocks', height: 20 },
  { id: 2, name: 'Sundial Spire', emphasis: 'Time in words, like "quarter past"', height: 21 },
  { id: 3, name: 'Calendar Ridge', emphasis: 'Reading calendars and dates', height: 22 },
  { id: 4, name: 'The Hourglass', emphasis: 'Setting clock hands', height: 23 },
  { id: 5, name: 'Weekday Wall', emphasis: 'Days of the week, nth weekday', height: 24 },
  { id: 6, name: 'Elapsed Escarpment', emphasis: 'Elapsed time arithmetic', height: 26 },
  { id: 7, name: 'Monthfall Pass', emphasis: 'Date math across months', height: 27 },
  { id: 8, name: 'The Meridian', emphasis: 'AM/PM and 24-hour time', height: 28 },
  { id: 9, name: 'Leap Crag', emphasis: 'Leap years and long spans', height: 29 },
  { id: 10, name: 'Summit of Hours', emphasis: 'Everything, mixed', height: 30 },
];

export function getPeak(id: number): Peak {
  const peak = PEAKS.find((p) => p.id === id);
  if (!peak) throw new Error(`getPeak: no peak with id ${id}`);
  return peak;
}
