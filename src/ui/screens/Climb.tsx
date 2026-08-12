import { useEffect, useRef, useState } from 'react';
import {
  applyCorrect,
  applyMiss,
  createClimb,
  isFastAnswer,
  type ClimbState,
} from '../../engine/climb';
import type { Peak } from '../../engine/peaks';
import {
  generateQuestion,
  isCorrectChoice,
  isCorrectNumber,
  isCorrectPickDate,
  isCorrectSetHands,
  type DisplaySpec,
  type Question,
} from '../../engine/questions';
import { mulberry32 } from '../../engine/rng';
import type { TimeOfDay } from '../../engine/timeMath';
import { buildCharacterLayers } from '../character/buildCharacterLayers';
import type { CharacterPreset } from '../character/presets';
import BoostMeter from '../hud/BoostMeter';
import FallRiskMeter from '../hud/FallRiskMeter';
import MiniMap from '../hud/MiniMap';
import TimerBar from '../hud/TimerBar';
import PixelLayers from '../pixel/PixelLayers';
import { bodyCheer, bodyClimb, bodyIdle, bodySlip } from '../pixel/sprites/body';
import { defaultSetHandsDraft } from '../questionDisplay';
import AnalogClock from '../widgets/AnalogClock';
import CalendarMonth from '../widgets/CalendarMonth';
import ChoiceGrid from '../widgets/ChoiceGrid';
import DatePicker from '../widgets/DatePicker';
import NumberEntry from '../widgets/NumberEntry';

/** Matches the design spec's ~1.5s post-answer beat, applied to both correct and wrong answers
 * (the spec only calls it out for wrong ones, but the reveal/pose change needs the same beat
 * either way for legibility). */
const REVEAL_MS = 1500;
const TICK_MS = 100;
const CHARACTER_SCALE = 6;

const NOON: TimeOfDay = { hour: 12, minute: 0, second: 0 };

/** `defaultSetHandsDraft` needs a target; non-`setHands` questions never
 * render the draft, so this arbitrary (but always-PM) fallback is never
 * actually shown. */
function defaultDraftTime(question: Question): TimeOfDay {
  return question.answer.kind === 'setHands' ? defaultSetHandsDraft(question.answer.target) : NOON;
}

type Pose = 'idle' | 'climb' | 'slip' | 'cheer';

const POSE_SPRITES = { idle: bodyIdle, climb: bodyClimb, slip: bodySlip, cheer: bodyCheer };

function renderDisplay(display: DisplaySpec) {
  switch (display.kind) {
    case 'analogClock':
      return (
        <AnalogClock
          time={display.time}
          showSeconds={display.showSeconds}
          showNumerals={display.showNumerals}
        />
      );
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

export interface ClimbProps {
  peak: Peak;
  difficulty: number;
  characterPreset: CharacterPreset;
  /** Caller-supplied so a retry after falling isn't byte-identical to the failed run. */
  seed: number;
  onSummit: (finalState: ClimbState, elapsedMs: number) => void;
  onFall: (finalState: ClimbState) => void;
  /** Reported after every answer (including timeouts, as incorrect), regardless of climb outcome
   * — the caller uses this to persist per-question-type stats. */
  onQuestionAnswered?: (typeId: string, correct: boolean, elapsedMs: number) => void;
}

/**
 * The core gameplay loop: generate a question, let the player answer (or
 * time out), apply the result to `climb.ts`'s state machine, show a reveal
 * beat, then either summit/fall out or move to the next question. Handles
 * all four `AnswerSpec` kinds: `choice` and `pickDate` are click-to-answer
 * (a click IS the discrete gesture); `setHands` and `number` need an
 * explicit Submit button, since dragging hands or typing a number has no
 * natural "this is my final answer" moment the way a click does. All four
 * route through the same `applyCorrect`/`applyMiss`/reveal/pose logic below
 * — only how the answer is captured and graded differs per kind.
 */
export default function Climb({
  peak,
  difficulty,
  characterPreset,
  seed,
  onSummit,
  onFall,
  onQuestionAnswered,
}: ClimbProps) {
  const [rng] = useState(() => mulberry32(seed));
  const [climbState, setClimbState] = useState<ClimbState>(() => createClimb(peak, difficulty));
  const [question, setQuestion] = useState<Question>(() =>
    generateQuestion(rng, { difficulty, peak }),
  );
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(undefined);
  const [draftTime, setDraftTime] = useState<TimeOfDay>(() => defaultDraftTime(question));
  const [draftNumber, setDraftNumber] = useState<number | ''>('');
  const [revealing, setRevealing] = useState(false);
  const [pose, setPose] = useState<Pose>('idle');
  const [timeLeftMs, setTimeLeftMs] = useState(question.timeLimitMs);

  // `Date.now()` is impure and refs can't be read or written during render
  // (only in effects/handlers), so both start times are set from a
  // mount-only effect rather than a `useRef(Date.now())` initializer —
  // that expression would re-evaluate on every render even though only the
  // first result is kept, and reading `.current` back to guard it would
  // itself be a render-time ref access.
  const questionStartRef = useRef(0);
  const climbStartRef = useRef(0);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const now = Date.now();
    questionStartRef.current = now;
    climbStartRef.current = now;
    return () => {
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    };
  }, []);

  const answer = question.answer;

  /** Shared tail of every answer path: apply the climb rules, start the
   * reveal beat, and either finish the climb or advance to the next
   * question once it ends. */
  function finishAnswer(correct: boolean, elapsedMs: number) {
    const fast = isFastAnswer(elapsedMs, question.timeLimitMs);
    const nextState = correct ? applyCorrect(climbState, fast) : applyMiss(climbState);

    setRevealing(true);
    setPose(correct ? (nextState.status === 'summited' ? 'cheer' : 'climb') : 'slip');
    setClimbState(nextState);
    onQuestionAnswered?.(question.typeId, correct, elapsedMs);

    revealTimeoutRef.current = setTimeout(() => {
      if (nextState.status === 'summited') {
        onSummit(nextState, Date.now() - climbStartRef.current);
        return;
      }
      if (nextState.status === 'fell') {
        onFall(nextState);
        return;
      }
      const nextQuestion = generateQuestion(rng, { difficulty, peak });
      questionStartRef.current = Date.now();
      setQuestion(nextQuestion);
      setTimeLeftMs(nextQuestion.timeLimitMs);
      setSelectedIndex(undefined);
      setDraftTime(defaultDraftTime(nextQuestion));
      setDraftNumber('');
      setRevealing(false);
      setPose('idle');
    }, REVEAL_MS);
  }

  function handleTimeout() {
    if (revealing) return;
    finishAnswer(false, Date.now() - questionStartRef.current);
  }

  // Ticks the countdown and, once it reaches zero, triggers the timeout
  // path from inside the interval callback itself rather than a second
  // effect reacting to `timeLeftMs` hitting 0 — calling `handleTimeout`
  // (several `setState`s) synchronously in an effect's own body causes
  // cascading renders; calling it from an async interval/timeout callback,
  // same as `finishAnswer`'s own `setTimeout` above, does not.
  useEffect(() => {
    if (revealing) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - questionStartRef.current;
      const remaining = Math.max(0, question.timeLimitMs - elapsed);
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        handleTimeout();
      }
    }, TICK_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealing, question]);

  function handleChoiceAnswer(index: number | undefined) {
    if (revealing || answer.kind !== 'choice') return;
    const elapsedMs = Date.now() - questionStartRef.current;
    const correct = index !== undefined && isCorrectChoice(answer, index);
    setSelectedIndex(index);
    finishAnswer(correct, elapsedMs);
  }

  function handleSetHandsSubmit() {
    if (revealing || answer.kind !== 'setHands') return;
    const elapsedMs = Date.now() - questionStartRef.current;
    finishAnswer(isCorrectSetHands(answer, draftTime), elapsedMs);
  }

  function handleNumberSubmit() {
    if (revealing || answer.kind !== 'number' || draftNumber === '') return;
    const elapsedMs = Date.now() - questionStartRef.current;
    finishAnswer(isCorrectNumber(answer, draftNumber), elapsedMs);
  }

  function handlePickDateAnswer(date: { year: number; monthIndex: number; day: number }) {
    if (revealing || answer.kind !== 'pickDate') return;
    const elapsedMs = Date.now() - questionStartRef.current;
    finishAnswer(isCorrectPickDate(answer, date), elapsedMs);
  }

  function renderAnswerSection() {
    switch (answer.kind) {
      case 'choice':
        return (
          <ChoiceGrid
            options={answer.options}
            selectedIndex={selectedIndex}
            correctIndex={revealing ? answer.correctIndex : undefined}
            disabled={revealing}
            onSelect={handleChoiceAnswer}
          />
        );
      case 'setHands':
        return (
          <div data-testid="climb-set-hands">
            <AnalogClock
              time={draftTime}
              precision={answer.precision}
              onHandChange={revealing ? undefined : setDraftTime}
            />
            <button
              type="button"
              data-testid="climb-submit"
              onClick={handleSetHandsSubmit}
              disabled={revealing}
            >
              Submit
            </button>
          </div>
        );
      case 'number':
        return (
          <div data-testid="climb-number">
            <NumberEntry value={draftNumber} onChange={setDraftNumber} unit={answer.unit} />
            <button
              type="button"
              data-testid="climb-submit"
              onClick={handleNumberSubmit}
              disabled={revealing || draftNumber === ''}
            >
              Submit
            </button>
          </div>
        );
      case 'pickDate':
        return (
          <DatePicker
            initialYear={answer.year}
            initialMonthIndex={answer.monthIndex}
            onChange={revealing ? undefined : handlePickDateAnswer}
          />
        );
    }
  }

  return (
    <main>
      <h1>{peak.name}</h1>
      <div data-testid="climb-hud" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <BoostMeter boost={climbState.boost} boostCapacity={climbState.boostCapacity} />
        <FallRiskMeter
          fallRisk={climbState.fallRisk}
          fallRiskCapacity={climbState.fallRiskCapacity}
        />
        <MiniMap position={climbState.position} height={climbState.height} />
      </div>
      <TimerBar fraction={timeLeftMs / question.timeLimitMs} />
      <PixelLayers
        layers={buildCharacterLayers(characterPreset, POSE_SPRITES[pose], { harness: true })}
        scale={CHARACTER_SCALE}
      />
      <p data-testid="climb-prompt">{question.prompt}</p>
      <div data-testid="climb-display">{renderDisplay(question.display)}</div>
      <div data-testid="climb-answer">{renderAnswerSection()}</div>
      {revealing && <p data-testid="climb-explain">{question.explainCorrect}</p>}
    </main>
  );
}
