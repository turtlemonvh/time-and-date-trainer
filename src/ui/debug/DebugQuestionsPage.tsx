import { useMemo, useState } from 'react';
import { getPeak, PEAKS } from '../../engine/peaks';
import { BUILT_IN_QUESTION_TYPES, type DisplaySpec, type Question } from '../../engine/questions';
import { mulberry32 } from '../../engine/rng';

const SAMPLES_PER_TYPE = 3;
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

/**
 * A one-line, human-readable gloss of a display spec. Intentionally text only —
 * the real widgets (AnalogClock, CalendarMonth) arrive in M3; this page just
 * needs to make the data legible.
 */
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

function generateBatch(seed: number, difficulty: number, peakId: number): Question[] {
  const rng = mulberry32(seed);
  // Advance RNG based on peak to get different sequences per peak
  for (let i = 0; i < peakId - 1; i++) {
    rng();
  }
  const peak = getPeak(peakId);
  const batch: Question[] = [];
  for (const type of BUILT_IN_QUESTION_TYPES) {
    for (let i = 0; i < SAMPLES_PER_TYPE; i++) {
      batch.push(type.generate(rng, { difficulty, peak }));
    }
  }
  return batch;
}

export default function DebugQuestionsPage({ initialSeed }: { initialSeed?: number }) {
  const [difficulty, setDifficulty] = useState(3);
  const [peakId, setPeakId] = useState(PEAKS[0].id);
  const [seed, setSeed] = useState(() => initialSeed ?? Date.now());

  const questions = useMemo(
    () => generateBatch(seed, difficulty, peakId),
    [seed, difficulty, peakId],
  );

  return (
    <main>
      <h1>Debug: questions</h1>
      <p>
        Dev-only. {SAMPLES_PER_TYPE} freshly generated questions from each of the{' '}
        {BUILT_IN_QUESTION_TYPES.length} registered generators.
      </p>

      <p>
        <label htmlFor="debug-difficulty">Difficulty</label>{' '}
        <select
          id="debug-difficulty"
          value={difficulty}
          onChange={(event) => setDifficulty(Number(event.target.value))}
        >
          {DIFFICULTIES.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>{' '}
        <label htmlFor="debug-peak">Peak</label>{' '}
        <select
          id="debug-peak"
          value={peakId}
          onChange={(event) => setPeakId(Number(event.target.value))}
        >
          {PEAKS.map((peak) => (
            <option key={peak.id} value={peak.id}>
              {peak.id}. {peak.name} — {peak.emphasis}
            </option>
          ))}
        </select>{' '}
        <button type="button" onClick={() => setSeed((current) => current + 1)}>
          Regenerate
        </button>
      </p>

      <p>
        Seed <code data-testid="seed">{seed}</code> · {questions.length} questions
      </p>

      <ol>
        {questions.map((question, index) => (
          <li key={`${question.typeId}-${index}`} data-testid="question-card">
            <h2>{question.typeId}</h2>
            <p>
              <code data-testid="question-id">{question.id}</code>
            </p>
            <p data-testid="question-prompt">{question.prompt}</p>
            <p data-testid="question-display">{describeDisplay(question.display)}</p>
            <details>
              <summary>Raw display spec</summary>
              <pre data-testid="display-json">{JSON.stringify(question.display, null, 2)}</pre>
            </details>
            <ul>
              {question.answer.options.map((option, optionIndex) => {
                const correct = optionIndex === question.answer.correctIndex;
                return (
                  <li key={option} data-testid={correct ? 'correct-option' : 'option'}>
                    {correct ? `${option} (correct)` : option}
                  </li>
                );
              })}
            </ul>
            <p data-testid="question-explain">{question.explainCorrect}</p>
            <p data-testid="question-time-limit">Time limit: {question.timeLimitMs} ms</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
