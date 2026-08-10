import { useEffect, useState } from 'react';
import { PEAKS } from '../../engine/peaks';
import { generateQuestionBatch } from '../../engine/questions/preview';
import { describeDisplay } from '../questionDisplay';

const DIFFICULTIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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
      <h1>Timescaler — question preview</h1>
      <p>
        Work in progress: this previews what the question engine produces. Press <kbd>Enter</kbd>{' '}
        (or tap Next) to move on — it always counts as correct, since real answer input isn't wired
        up yet.
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
        <p>
          <code data-testid="preview-id">{question.id}</code>
        </p>
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
