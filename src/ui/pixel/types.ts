/**
 * A sprite's shape, independent of color. `grid` rows are all the same
 * length; each character is either `.` (transparent) or a key into `slots`.
 * `slots` names each key semantically (e.g. `H` -> `hair`) so a single grid
 * can be recolored per character via a different `Palette` — that's how
 * "six characters from a few grid variants x palette swaps" works.
 */
export interface Sprite {
  readonly w: number;
  readonly h: number;
  readonly grid: readonly string[];
  readonly slots: Readonly<Record<string, string>>;
}

/** Semantic slot name (e.g. `hair`) -> a CSS color. */
export type Palette = Readonly<Record<string, string>>;
