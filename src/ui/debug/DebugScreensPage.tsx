import { useState } from 'react';
import CharacterPick from '../screens/CharacterPick';

/**
 * Dev-only gallery for M4 screens, rendered standalone (not wired into the
 * real app-state navigation `App.tsx` drives) — the point is visual QA of
 * each screen as it's built, one section per screen. The real end-to-end
 * flow is verified separately by playing the actual game.
 */
export default function DebugScreensPage() {
  const [pickedCharacterId, setPickedCharacterId] = useState<string | null>(null);

  return (
    <main>
      <h1>Debug: screens</h1>
      <p>Dev-only. Not shipped to production — see CONTRIBUTING for how to reach this page.</p>

      <h2>CharacterPick</h2>
      <p data-testid="screens-picked-character">
        {pickedCharacterId ? `Picked: ${pickedCharacterId}` : 'Nothing picked yet'}
      </p>
      <CharacterPick onPick={setPickedCharacterId} />
    </main>
  );
}
