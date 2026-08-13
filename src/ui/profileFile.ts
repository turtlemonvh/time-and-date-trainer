import { isValidProfile } from '../storage/profile';
import type { Profile } from '../storage/types';

export function profileExportFilename(profile: Profile): string {
  const slug = profile.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return `${slug}-profile.json`;
}

/** Downloads a single profile as a JSON file — per-profile, not the whole
 * `SaveFile`, matching "export the whole profile of a user." Same
 * Blob/`<a download>` pattern as `climbLogCsv.ts`'s CSV export. */
export function downloadProfileJson(profile: Profile): void {
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = profileExportFilename(profile);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Parses and shape-checks an imported profile file's text content. Throws
 * on invalid JSON or a shape that doesn't look like a `Profile` — the
 * caller is responsible for turning that into a user-facing message. */
export function parseProfileJson(text: string): Profile {
  const parsed: unknown = JSON.parse(text);
  if (!isValidProfile(parsed)) {
    throw new Error("That file doesn't look like a climber profile.");
  }
  return parsed;
}
