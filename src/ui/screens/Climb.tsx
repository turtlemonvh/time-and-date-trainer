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
  type DisplaySpec,
  type Question,
} from '../../engine/questions';
import { mulberry32 } from '../../engine/rng';
import { buildCharacterLayers } from '../character/buildCharacterLayers';
import type { CharacterPreset } from '../character/presets';
import BoostMeter from '../hud/BoostMeter';
import FallRiskMeter from '../hud/FallRiskMeter';
import MiniMap from '../hud/MiniMap';
import TimerBar from '../hud/TimerBar';
import PixelLayers from '../pixel/PixelLayers';
import { bodyCheer, bodyClimb, bodyIdle, bodySlip } from '../pixel/sprites/body';
import AnalogClock from '../widgets/AnalogClock';
import CalendarMonth from '../widgets/CalendarMonth';
import ChoiceGrid from '../widgets/ChoiceGrid';

/** Matches the design spec's ~1.5s post-answer beat, applied to both correct and wrong answers
 * (the spec only calls it out for wrong ones, but the reveal/pose change needs the same beat
 * either way for legibility). */
const REVEAL_MS = 1500;
const TICK_MS = 100;
const CHARACTER_SCALE = 6;

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
 * time out), apply the result to `climb.ts`'s state machine, show a
 * reveal beat, then either summit/fall out or move to the next question.
 * Only handles `ChoiceAnswer` questions — the only kind any registered
 * generator produces today (M1b); `interactive`/`free` answer modes have
 * no generators yet (M5).
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
  const [revealing, setRevealing] = useState(false);
  const [pose, setPose] = useState<Pose>('idle');
  const [timeLeftMs, setTimeLeftMs] = useState(question.timeLimitMs);

  const questionStartRef = useRef(Date.now());
  const climbStartRef = useRef(Date.now());
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (revealing) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - questionStartRef.current;
      setTimeLeftMs(Math.max(0, question.timeLimitMs - elapsed));
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [revealing, question]);

  useEffect(() => {
    if (revealing || timeLeftMs > 0) return;
    handleAnswer(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftMs, revealing]);

  if (question.answer.kind !== 'choice') {
    // Every registered generator still produces a ChoiceAnswer today —
    // interactive/free-answer generators land in a later M5 task alongside
    // this screen's own rendering/grading for those kinds. Fail loud rather
    // than silently mis-grading if that invariant is ever broken before this
    // screen catches up.
    throw new Error(`Climb: unsupported answer kind "${question.answer.kind}"`);
  }
  const answer = question.answer;

  function handleAnswer(index: number | undefined) {
    if (revealing) return;
    const elapsedMs = Date.now() - questionStartRef.current;
    const correct = index !== undefined && isCorrectChoice(answer, index);
    const fast = isFastAnswer(elapsedMs, question.timeLimitMs);
    const nextState = correct ? applyCorrect(climbState, fast) : applyMiss(climbState);

    setSelectedIndex(index);
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
      setRevealing(false);
      setPose('idle');
    }, REVEAL_MS);
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
      <ChoiceGrid
        options={answer.options}
        selectedIndex={selectedIndex}
        correctIndex={revealing ? answer.correctIndex : undefined}
        disabled={revealing}
        onSelect={handleAnswer}
      />
      {revealing && <p data-testid="climb-explain">{question.explainCorrect}</p>}
    </main>
  );
}
