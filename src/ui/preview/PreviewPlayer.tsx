import { useEffect, useState } from 'react';
import { PEAKS } from '../../engine/peaks';
import { generateQuestionBatch } from '../../engine/questions/preview';
import type { DisplaySpec } from '../../engine/questions';
import AnalogClock from '../widgets/AnalogClock';
import CalendarMonth from '../widgets/CalendarMonth';
import ChoiceGrid from '../widgets/ChoiceGrid';

const DIFFICULTIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function renderDisplay(display: DisplaySpec) {
  switch (display.kind) {
    case 'analogClock':
      return <AnalogClock time={display.time} showSeconds={display.showSeconds} />;
    case 'calendar':
      return (
        <CalendarMonth
          year={display.year}
          monthIndex={display.monthIndex}
          highlightDay={display.highlightDay}
        />
      );
    case 'none':
      return null;
  }
}

/**
 * Cycles through a generated batch of questions one at a time, using the
 * real M3 widgets (AnalogClock, CalendarMonth, ChoiceGrid) rather than a
 * text gloss — so the question engine's output is visible the way it'll
 * actually be presented in the game, without the full climb state machine
 * (which arrives in a later milestone). Picking an option reveals whether
 * it was correct via ChoiceGrid, but — since there's no climb/scoring here
 * yet — Enter (or Next) always advances regardless of whether an answer was
 * picked at all. Deliberately reachable in production: this is what deploys
 * to GitHub Pages today, so progress on the question engine is visible
 * without a local checkout.
 */
export default function PreviewPlayer({ initialSeed }: { initialSeed?: number }) {
  const [difficulty, setDifficulty] = useState(3);
  const [peakId, setPeakId] = useState(PEAKS[0].id);
  const [seed, setSeed] = useState(() => initialSeed ?? Date.now());
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(undefined);

  const batch = generateQuestionBatch(seed, peakId, difficulty);
  const question = batch[index];

  function advance() {
    setSelectedIndex(undefined);
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
      <h1>Timescaler — question preview</h1>
      <p>
        Work in progress: this previews what the question engine produces, using the real answer
        widgets. Pick an option to see whether it's correct, then press <kbd>Enter</kbd> (or tap
        Next) to move on — advancing doesn't require answering, since there's no scoring here yet.
      </p>
      <p>
        Every batch shows one of each question type, regardless of peak — the peak-to-question-type
        weighting described in each peak's name isn't wired up yet (most peaks don't have a matching
        generator built yet). Changing Peak reseeds the batch, so the specific values shown change,
        but not which types appear. That lands with the rest of a peak's content in a later
        milestone.
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
            setSelectedIndex(undefined);
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
            setSelectedIndex(undefined);
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
            setSelectedIndex(undefined);
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
        <p>
          <code data-testid="preview-id">{question.id}</code>
        </p>
        <p data-testid="preview-prompt">{question.prompt}</p>
        <div data-testid="preview-display">{renderDisplay(question.display)}</div>
        <ChoiceGrid
          options={question.answer.options}
          selectedIndex={selectedIndex}
          correctIndex={selectedIndex !== undefined ? question.answer.correctIndex : undefined}
          onSelect={setSelectedIndex}
        />
        <p data-testid="preview-explain">{question.explainCorrect}</p>
      </article>

      <button type="button" data-testid="preview-next" onClick={advance}>
        Next (Enter)
      </button>
    </main>
  );
}
