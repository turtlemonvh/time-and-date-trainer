import { useMemo, useState } from 'react';
import { describeDifficultyLevel } from '../../engine/difficultyDescribe';
import { PEAKS, getPeak } from '../../engine/peaks';
import { generateQuestion } from '../../engine/questions';
import { mulberry32 } from '../../engine/rng';
import { describeAnswer, describeDisplay } from '../questionDisplay';

const DIFFICULTIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SAMPLE_COUNT = 3;

/**
 * Deterministically samples `count` real questions for `peakId` at
 * `difficulty` — calls the same `generateQuestion` real gameplay uses (not
 * `generateQuestionBatch`, which iterates every registered type regardless
 * of theme for dev-tooling purposes). Since `selectGenerator` is fully
 * peak-exclusive, this always shows exactly what a player on that peak
 * would actually see, not a broader dev-facing sample.
 */
function sampleCurriculumQuestions(peakId: number, difficulty: number, count: number) {
  const peak = getPeak(peakId);
  const rng = mulberry32(peakId * 1000 + difficulty);
  const questions = [];
  for (let i = 0; i < count; i++) {
    questions.push(generateQuestion(rng, { difficulty, peak }));
  }
  return questions;
}

export interface ReviewProps {
  onBack: () => void;
}

type Section = 'curriculum';

/**
 * Parent/teacher-facing tooling, reachable from Map. This PR ships only the
 * curriculum browser (6a); the climber log (6b), goals (6c), and profile
 * export/import (6d) land as later PRs sharing this same screen shell —
 * `Section` grows a member per PR rather than all four being stubbed out
 * ahead of time.
 */
export default function Review({ onBack }: ReviewProps) {
  const [section] = useState<Section>('curriculum');
  const [peakId, setPeakId] = useState(PEAKS[0].id);
  const [difficulty, setDifficulty] = useState(1);

  const bullets = useMemo(() => describeDifficultyLevel(difficulty), [difficulty]);
  const samples = useMemo(
    () => sampleCurriculumQuestions(peakId, difficulty, SAMPLE_COUNT),
    [peakId, difficulty],
  );

  return (
    <main>
      <h1>Review</h1>
      <p>
        A reference for parents and teachers: what does each peak actually ask at each difficulty
        level?
      </p>
      <button type="button" data-testid="review-back" onClick={onBack}>
        Back to Map
      </button>

      {section === 'curriculum' && (
        <section data-testid="review-curriculum">
          <h2>Curriculum browser</h2>
          <p>
            <label htmlFor="review-peak">Peak</label>{' '}
            <select
              id="review-peak"
              data-testid="review-peak"
              value={peakId}
              onChange={(event) => setPeakId(Number(event.target.value))}
            >
              {PEAKS.map((peak) => (
                <option key={peak.id} value={peak.id}>
                  {peak.id}. {peak.name} — {peak.emphasis}
                </option>
              ))}
            </select>{' '}
            <label htmlFor="review-difficulty">Difficulty</label>{' '}
            <select
              id="review-difficulty"
              data-testid="review-difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(Number(event.target.value))}
            >
              {DIFFICULTIES.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </p>

          <h3>What difficulty {difficulty} means</h3>
          <ul data-testid="review-difficulty-bullets">
            {bullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          <h3>Sample questions</h3>
          <ol data-testid="review-sample-questions">
            {samples.map((question, index) => (
              <li key={`${question.typeId}-${index}`} data-testid="review-sample-question">
                <p data-testid="review-sample-prompt">{question.prompt}</p>
                <p>{describeDisplay(question.display)}</p>
                <p>{describeAnswer(question.answer)}</p>
                <p>{question.explainCorrect}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
