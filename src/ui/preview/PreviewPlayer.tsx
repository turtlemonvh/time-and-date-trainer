import { useEffect, useState } from 'react';
import { PEAKS } from '../../engine/peaks';
import type { DisplaySpec } from '../../engine/questions';
import { generateQuestionBatch } from '../../engine/questions/preview';

const DIFFICULTIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const MONTH_NAMES = [
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

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** A one-line, human-readable gloss of a display spec. Text only — the real
 * widgets (AnalogClock, CalendarMonth) arrive in a later milestone. */
function describeDisplay(display: DisplaySpec): string {
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

/**
 * Cycles through a generated batch of questions one at a time, so the
 * question engine's output is visible without the real answer-input widgets
 * (which arrive in later milestones). There is no wrong answer here — Enter
 * (or the Next button) always advances, standing in for "the player got it
 * right" until real grading is wired up. Deliberately reachable in
 * production: this is what deploys to GitHub Pages today, so progress on the
 * question engine is visible without a local checkout.
 */
export default function PreviewPlayer({ initialSeed }: { initialSeed?: number }) {
  const [difficulty, setDifficulty] = useState(3);
  const [peakId, setPeakId] = useState(PEAKS[0].id);
  const [seed, setSeed] = useState(() => initialSeed ?? Date.now());
  const [index, setIndex] = useState(0);

  const batch = generateQuestionBatch(seed, peakId, difficulty);
  const question = batch[index];

  function advance() {
    if (index + 1 < batch.length) {
      setIndex(index + 1);
    } else {
      setSeed((current) => current + 1);
      setIndex(0);
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Enter') return;
      if (event.target instanceof HTMLSelectElement) return;
      advance();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <main>
      <h1>Summit Clock — question preview</h1>
      <p>
        Work in progress: this previews what the question engine produces. Press <kbd>Enter</kbd>{' '}
        (or tap Next) to move on — it always counts as correct, since real answer input isn't wired
        up yet.
      </p>

      <p>
        <label htmlFor="preview-difficulty">Difficulty</label>{' '}
        <select
          id="preview-difficulty"
          data-testid="preview-difficulty"
          value={difficulty}
          onChange={(event) => {
            setDifficulty(Number(event.target.value));
            setIndex(0);
          }}
        >
          {DIFFICULTIES.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>{' '}
        <label htmlFor="preview-peak">Peak</label>{' '}
        <select
          id="preview-peak"
          data-testid="preview-peak"
          value={peakId}
          onChange={(event) => {
            setPeakId(Number(event.target.value));
            setIndex(0);
          }}
        >
          {PEAKS.map((peak) => (
            <option key={peak.id} value={peak.id}>
              {peak.id}. {peak.name} — {peak.emphasis}
            </option>
          ))}
        </select>{' '}
        <button
          type="button"
          onClick={() => {
            setSeed((current) => current + 1);
            setIndex(0);
          }}
        >
          Regenerate
        </button>
      </p>

      <p data-testid="preview-progress">
        Question {index + 1} of {batch.length}
      </p>

      <article data-testid="preview-card">
        <h2>{question.typeId}</h2>
        <p data-testid="preview-prompt">{question.prompt}</p>
        <p data-testid="preview-display">{describeDisplay(question.display)}</p>
        <ul>
          {question.answer.options.map((option, optionIndex) => {
            const correct = optionIndex === question.answer.correctIndex;
            return (
              <li key={option} data-testid={correct ? 'preview-correct-option' : 'preview-option'}>
                {correct ? `${option} ✓` : option}
              </li>
            );
          })}
        </ul>
        <p data-testid="preview-explain">{question.explainCorrect}</p>
      </article>

      <button type="button" data-testid="preview-next" onClick={advance}>
        Next (Enter)
      </button>
    </main>
  );
}
