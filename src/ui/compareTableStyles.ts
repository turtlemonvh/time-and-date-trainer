import type { CSSProperties } from 'react';

/**
 * Shared styling for the level-comparison table — used by both the peak
 * card (Map.tsx) and the Curriculum tab (Review.tsx), which both render
 * `describeDifficultyComparisonTable`'s rows the same way. A dedicated
 * "Changed" column states outright whether a row differs, rather than a
 * full-row highlight, which doubled as a second bold treatment hard to
 * tell apart from the header row's own bold, and didn't survive
 * grayscale/color-blind viewing anyway.
 */
export const COMPARE_TABLE_STYLE: CSSProperties = { borderCollapse: 'collapse', width: '100%' };

export const COMPARE_TH_STYLE: CSSProperties = {
  background: 'var(--code-bg)',
  color: 'var(--text)',
  textAlign: 'left',
  fontSize: '0.85em',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  padding: '0.4rem 0.5rem',
  border: '1px solid var(--border)',
};

export const COMPARE_TD_STYLE: CSSProperties = {
  padding: '0.4rem 0.5rem',
  border: '1px solid var(--border)',
};

export const CHANGED_CHIP_STYLE: CSSProperties = {
  display: 'inline-block',
  fontSize: '0.8em',
  fontWeight: 700,
  padding: '0.1rem 0.5rem',
  borderRadius: 999,
  background: 'var(--accent-bg)',
  color: 'var(--accent)',
};
