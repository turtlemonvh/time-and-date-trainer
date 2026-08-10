export interface ChoiceGridProps {
  options: string[];
  /** Presence makes options clickable; omit for a purely display-only grid. */
  onSelect?: (index: number) => void;
  /** The option the player picked, if any. */
  selectedIndex?: number;
  /** Set during the post-answer reveal to mark the correct option (and the
   * wrong one, if the player missed it). Undefined means "not revealed yet". */
  correctIndex?: number;
  /** Forces every option non-interactive, independent of onSelect. */
  disabled?: boolean;
}

/**
 * A clickable multiple-choice grid with 44px+ tap targets (design spec's
 * "sized for a 7-year-old's finger"). Purely presentational: it reports
 * clicks and renders whatever selection/reveal state it's given, but never
 * tracks its own state — the question/climb flow above it owns "has this
 * been answered yet."
 */
export default function ChoiceGrid({
  options,
  onSelect,
  selectedIndex,
  correctIndex,
  disabled,
}: ChoiceGridProps) {
  const revealing = correctIndex !== undefined;

  return (
    <div
      data-testid="choice-grid"
      role="group"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 8,
      }}
    >
      {options.map((option, index) => {
        const isSelected = index === selectedIndex;
        const isCorrect = revealing && index === correctIndex;
        const isWrongSelection = revealing && isSelected && index !== correctIndex;
        const state = isCorrect
          ? 'correct'
          : isWrongSelection
            ? 'incorrect'
            : isSelected
              ? 'selected'
              : undefined;

        return (
          <button
            type="button"
            key={option}
            data-testid={`choice-option-${index}`}
            data-state={state}
            disabled={disabled || !onSelect}
            onClick={() => onSelect?.(index)}
            style={{
              minWidth: 44,
              minHeight: 44,
              padding: '12px 16px',
              borderRadius: 8,
              background: isCorrect
                ? '#2e7d32'
                : isWrongSelection
                  ? '#c0392b'
                  : isSelected
                    ? 'var(--accent)'
                    : undefined,
              color: isCorrect || isWrongSelection || isSelected ? '#fff' : undefined,
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
