import { formatDateLong } from '../engine/dateMath';
import { getPeak } from '../engine/peaks';
import type { ClimbLogEntry } from '../storage/types';
import { formatDuration } from './formatDuration';

const CSV_FILENAME = 'climber-log.csv';

const RESULT_LABELS: Readonly<Record<ClimbLogEntry['result'], string>> = {
  summited: 'Summited',
  fell: 'Fell',
  bailed: 'Bailed',
};

/** Newest-first — shared by the table and the CSV export so the two never
 * disagree about ordering. */
export function sortedClimbLog(climbLog: ClimbLogEntry[]): ClimbLogEntry[] {
  return [...climbLog].sort((a, b) => b.startedAt - a.startedAt);
}

export function climbLogResultLabel(result: ClimbLogEntry['result']): string {
  return RESULT_LABELS[result];
}

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** Defensively quotes every field even though peak names don't currently
 * contain commas — cheap insurance against a future peak name that does. */
export function buildClimbLogCsv(climbLog: ClimbLogEntry[]): string {
  const header = ['Peak', 'Difficulty', 'Date', 'Duration', 'Result'];
  const rows = sortedClimbLog(climbLog).map((entry) => [
    getPeak(entry.peakId).name,
    String(entry.difficulty),
    formatDateLong(new Date(entry.startedAt)),
    formatDuration(entry.endedAt - entry.startedAt),
    climbLogResultLabel(entry.result),
  ]);
  return [header, ...rows].map((row) => row.map(csvField).join(',')).join('\r\n');
}

export function downloadClimbLogCsv(climbLog: ClimbLogEntry[]): void {
  const blob = new Blob([buildClimbLogCsv(climbLog)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = CSV_FILENAME;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
