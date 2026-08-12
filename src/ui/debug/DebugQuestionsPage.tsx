import { useMemo, useState } from 'react';
import { PEAKS } from '../../engine/peaks';
import { BUILT_IN_QUESTION_TYPES } from '../../engine/questions';
import { generateQuestionBatch } from '../../engine/questions/preview';
import { describeAnswer, describeDisplay } from '../questionDisplay';

const SAMPLES_PER_TYPE = 3;
const DIFFICULTIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function DebugQuestionsPage({ initialSeed }: { initialSeed?: number }) {
  const [difficulty, setDifficulty] = useState(3);
  const [peakId, setPeakId] = useState(PEAKS[0].id);
  const [seed, setSeed] = useState(() => initialSeed ?? Date.now());

  const questions = useMemo(
    () => generateQuestionBatch(seed, peakId, difficulty, SAMPLES_PER_TYPE),
    [seed, difficulty, peakId],
  );

  return (
    <main>
      <h1>Debug: questions</h1>
      <p>
        Dev-only. {SAMPLES_PER_TYPE} freshly generated questions from each of the{' '}
        {BUILT_IN_QUESTION_TYPES.length} registered generators — every type, regardless of peak, so
        every generator's output stays inspectable here no matter which peak you pick. Real gameplay
        instead weights the draw toward each peak's own matching generator(s) (see
        <code> peakEmphasis.ts</code>); the Peak selector below only reseeds this batch, it doesn't
        change which question types appear in it.
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
            {question.answer.kind === 'choice' ? (
              (() => {
                const { options, correctIndex } = question.answer;
                return (
                  <ul>
                    {options.map((option, optionIndex) => {
                      const correct = optionIndex === correctIndex;
                      return (
                        <li key={option} data-testid={correct ? 'correct-option' : 'option'}>
                          {correct ? `${option} (correct)` : option}
                        </li>
                      );
                    })}
                  </ul>
                );
              })()
            ) : (
              <p data-testid="question-answer">{describeAnswer(question.answer)}</p>
            )}
            <p data-testid="question-explain">{question.explainCorrect}</p>
            <p data-testid="question-time-limit">Time limit: {question.timeLimitMs} ms</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
