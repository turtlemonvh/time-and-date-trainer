import { useMemo, useState } from 'react';
import { formatDateLong } from '../../engine/dateMath';
import { describeDifficultyLevel } from '../../engine/difficultyDescribe';
import { PEAKS, getPeak } from '../../engine/peaks';
import { generateQuestion } from '../../engine/questions';
import { mulberry32 } from '../../engine/rng';
import type { Profile } from '../../storage/types';
import { climbLogResultLabel, downloadClimbLogCsv, sortedClimbLog } from '../climbLogCsv';
import { formatDuration } from '../formatDuration';
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
  profile: Profile;
  onBack: () => void;
}

type Section = 'curriculum' | 'log';

/**
 * Parent/teacher-facing tooling, reachable from Map. Ships the curriculum
 * browser (6a) and climber log (6b) so far; goals (6c) and profile
 * export/import (6d) land as later PRs sharing this same screen shell —
 * `Section` grows a member per PR rather than all four being stubbed out
 * ahead of time.
 */
export default function Review({ profile, onBack }: ReviewProps) {
  const [section, setSection] = useState<Section>('curriculum');
  const [peakId, setPeakId] = useState(PEAKS[0].id);
  const [difficulty, setDifficulty] = useState(1);

  const bullets = useMemo(() => describeDifficultyLevel(difficulty), [difficulty]);
  const samples = useMemo(
    () => sampleCurriculumQuestions(peakId, difficulty, SAMPLE_COUNT),
    [peakId, difficulty],
  );
  const climbLog = useMemo(() => sortedClimbLog(profile.climbLog), [profile.climbLog]);

  return (
    <main>
      <h1>Review</h1>
      <p>
        A reference for parents and teachers: what does each peak actually ask at each difficulty
        level, and what has {profile.name} actually done?
      </p>
      <button type="button" data-testid="review-back" onClick={onBack}>
        Back to Map
      </button>

      <p>
        <button
          type="button"
          data-testid="review-tab-curriculum"
          disabled={section === 'curriculum'}
          onClick={() => setSection('curriculum')}
        >
          Curriculum
        </button>{' '}
        <button
          type="button"
          data-testid="review-tab-log"
          disabled={section === 'log'}
          onClick={() => setSection('log')}
        >
          Climber log
        </button>
      </p>

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

      {section === 'log' && (
        <section data-testid="review-log">
          <h2>Climber log</h2>
          <button
            type="button"
            data-testid="review-log-download"
            disabled={climbLog.length === 0}
            onClick={() => downloadClimbLogCsv(profile.climbLog)}
          >
            Download CSV
          </button>

          {climbLog.length === 0 ? (
            <p data-testid="review-log-empty">No climbs yet.</p>
          ) : (
            <table data-testid="review-log-table">
              <thead>
                <tr>
                  <th>Peak</th>
                  <th>Difficulty</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {climbLog.map((entry) => (
                  <tr key={entry.id} data-testid="review-log-row">
                    <td>{getPeak(entry.peakId).name}</td>
                    <td>{entry.difficulty}</td>
                    <td>{formatDateLong(new Date(entry.startedAt))}</td>
                    <td>{formatDuration(entry.endedAt - entry.startedAt)}</td>
                    <td>{climbLogResultLabel(entry.result)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </main>
  );
}
