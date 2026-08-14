import type { AnswerSpec, DisplaySpec, Question } from '../engine/questions';
import AnalogClock from './widgets/AnalogClock';
import CalendarMonth from './widgets/CalendarMonth';
import ChoiceGrid from './widgets/ChoiceGrid';
import NumberEntry from './widgets/NumberEntry';

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

/**
 * The correct answer, rendered through the same widget `Climb.tsx` uses for
 * that answer kind — non-interactive and pre-filled with the target, since
 * this is a reference tool showing "what this looks like," not a live
 * question to solve. `ChoiceGrid` is disabled by omitting `onSelect`;
 * `NumberEntry` (which has no `disabled` prop of its own) is wrapped in a
 * plain `<fieldset disabled>` rather than adding one just for this.
 */
function renderRevealedAnswer(answer: AnswerSpec) {
  switch (answer.kind) {
    case 'choice':
      return <ChoiceGrid options={answer.options} correctIndex={answer.correctIndex} disabled />;
    case 'setHands':
      return <AnalogClock time={answer.target} precision={answer.precision} />;
    case 'number':
      return (
        <fieldset disabled style={{ border: 'none', padding: 0, margin: 0 }}>
          <NumberEntry value={answer.target} onChange={() => {}} unit={answer.unit} />
        </fieldset>
      );
    case 'pickDate':
      return (
        <CalendarMonth
          year={answer.year}
          monthIndex={answer.monthIndex}
          highlightDay={answer.day}
        />
      );
  }
}

export interface SampleQuestionProps {
  question: Question;
}

/**
 * Renders a real `Question` the way a player actually sees it — the real
 * display widget (clock face, calendar) plus the real answer widget with
 * the correct answer revealed — rather than `questionDisplay.ts`'s
 * text-only `describeDisplay`/`describeAnswer` dump (that stays as-is for
 * `DebugQuestionsPage`, whose whole point is a compact raw-data listing).
 */
export default function SampleQuestion({ question }: SampleQuestionProps) {
  const displayWidget = renderDisplay(question.display);
  return (
    <div data-testid="sample-question">
      <p data-testid="sample-question-prompt" style={{ textAlign: 'center', fontWeight: 700 }}>
        {question.prompt}
      </p>
      {displayWidget && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
          {displayWidget}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {renderRevealedAnswer(question.answer)}
      </div>
      <p
        data-testid="sample-question-explain"
        style={{ textAlign: 'center', color: 'var(--text-dim)' }}
      >
        {question.explainCorrect}
      </p>
    </div>
  );
}
