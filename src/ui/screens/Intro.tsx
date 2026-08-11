export interface IntroProps {
  onContinue: () => void;
}

/**
 * The story-crawl welcome screen — the Climber's Guild framing from the
 * design spec (no magic: you're a recruit signing a logbook, earning
 * badges by summiting peaks). Shown once per app load, not gated behind
 * any "first ever visit" flag — that's simpler and there's no schema field
 * for it.
 */
export default function Intro({ onContinue }: IntroProps) {
  return (
    <main>
      <h1>Timescaler</h1>
      <p>
        Welcome to the Climber&apos;s Guild! Ten peaks are waiting, each one testing a different
        skill with clocks and calendars.
      </p>
      <p>
        Answer questions correctly to climb faster. Miss too many and you&apos;ll slip back down —
        but any peak you&apos;ve already summited stays yours forever.
      </p>
      <p>Sign the logbook, pick your gear, and start climbing.</p>
      <button type="button" data-testid="intro-continue" onClick={onContinue}>
        Get Started
      </button>
    </main>
  );
}
