import { useMemo, useState } from 'react';
import { formatDateLong } from '../../engine/dateMath';
import { describeDifficultyLevel } from '../../engine/difficultyDescribe';
import { PEAKS, getPeak } from '../../engine/peaks';
import { generateQuestion } from '../../engine/questions';
import { mulberry32 } from '../../engine/rng';
import type { Goal, Profile } from '../../storage/types';
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

/** Soonest-due first, regardless of pending/achieved status — a parent
 * scanning the list cares about "what's coming up", and an achieved goal
 * keeps its original target date rather than jumping to the front. */
function sortedGoals(goals: Goal[]): Goal[] {
  return [...goals].sort((a, b) => a.targetDate.localeCompare(b.targetDate));
}

export interface ReviewProps {
  profile: Profile;
  onBack: () => void;
  onAddGoal: (peakId: number, difficulty: number, targetDate: string) => void;
}

type Section = 'curriculum' | 'log' | 'goals';

/**
 * Parent/teacher-facing tooling, reachable from Map. Ships the curriculum
 * browser (6a), climber log (6b), and goals (6c) so far; profile
 * export/import (6d) lands as a later PR sharing this same screen shell —
 * `Section` grows a member per PR rather than all four being stubbed out
 * ahead of time.
 */
export default function Review({ profile, onBack, onAddGoal }: ReviewProps) {
  const [section, setSection] = useState<Section>('curriculum');
  const [peakId, setPeakId] = useState(PEAKS[0].id);
  const [difficulty, setDifficulty] = useState(1);
  const [goalPeakId, setGoalPeakId] = useState(PEAKS[0].id);
  const [goalDifficulty, setGoalDifficulty] = useState(1);
  const [goalTargetDate, setGoalTargetDate] = useState('');

  const bullets = useMemo(() => describeDifficultyLevel(difficulty), [difficulty]);
  const samples = useMemo(
    () => sampleCurriculumQuestions(peakId, difficulty, SAMPLE_COUNT),
    [peakId, difficulty],
  );
  const climbLog = useMemo(() => sortedClimbLog(profile.climbLog), [profile.climbLog]);
  const goals = useMemo(() => sortedGoals(profile.goals), [profile.goals]);

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
        </button>{' '}
        <button
          type="button"
          data-testid="review-tab-goals"
          disabled={section === 'goals'}
          onClick={() => setSection('goals')}
        >
          Goals
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

      {section === 'goals' && (
        <section data-testid="review-goals">
          <h2>Goals</h2>

          <form
            data-testid="review-goal-form"
            onSubmit={(event) => {
              event.preventDefault();
              onAddGoal(goalPeakId, goalDifficulty, goalTargetDate);
              setGoalTargetDate('');
            }}
          >
            <label htmlFor="review-goal-peak">Peak</label>{' '}
            <select
              id="review-goal-peak"
              data-testid="review-goal-peak"
              value={goalPeakId}
              onChange={(event) => setGoalPeakId(Number(event.target.value))}
            >
              {PEAKS.map((peak) => (
                <option key={peak.id} value={peak.id}>
                  {peak.id}. {peak.name}
                </option>
              ))}
            </select>{' '}
            <label htmlFor="review-goal-difficulty">Level</label>{' '}
            <select
              id="review-goal-difficulty"
              data-testid="review-goal-difficulty"
              value={goalDifficulty}
              onChange={(event) => setGoalDifficulty(Number(event.target.value))}
            >
              {DIFFICULTIES.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>{' '}
            <label htmlFor="review-goal-date">By</label>{' '}
            <input
              id="review-goal-date"
              data-testid="review-goal-date"
              type="date"
              value={goalTargetDate}
              onChange={(event) => setGoalTargetDate(event.target.value)}
            />{' '}
            <button type="submit" data-testid="review-goal-submit" disabled={!goalTargetDate}>
              Add goal
            </button>
          </form>

          {goals.length === 0 ? (
            <p data-testid="review-goals-empty">No goals yet.</p>
          ) : (
            <ul data-testid="review-goals-list">
              {goals.map((goal) => (
                <li key={goal.id} data-testid="review-goal-row">
                  {getPeak(goal.peakId).name} — level {goal.difficulty} by {goal.targetDate}:{' '}
                  {goal.achievedAt === null
                    ? 'Pending'
                    : `Achieved ${formatDateLong(new Date(goal.achievedAt))}`}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
