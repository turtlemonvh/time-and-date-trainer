import { useState } from 'react';
import CharacterPick from '../screens/CharacterPick';
import Intro from '../screens/Intro';
import Map from '../screens/Map';
import ProfileSelect from '../screens/ProfileSelect';
import type { Profile } from '../../storage/types';

const SAMPLE_PROFILES: Profile[] = [
  {
    id: 'a',
    name: 'Riley',
    characterId: 'sunny',
    createdAt: Date.now(),
    settings: { difficulty: 4 },
    progress: {
      1: { summited: true, bestTimeMs: 92000, attempts: 2 },
      2: { summited: false, bestTimeMs: null, attempts: 1 },
    },
    stats: {},
  },
  {
    id: 'b',
    name: 'Sam',
    characterId: 'boulder',
    createdAt: Date.now(),
    settings: { difficulty: 6 },
    progress: {},
    stats: {},
  },
];

/**
 * Dev-only gallery for M4 screens, rendered standalone (not wired into the
 * real app-state navigation `App.tsx` drives) — the point is visual QA of
 * each screen as it's built, one section per screen. The real end-to-end
 * flow is verified separately by playing the actual game.
 */
export default function DebugScreensPage() {
  const [introContinued, setIntroContinued] = useState(false);
  const [showEmptyProfiles, setShowEmptyProfiles] = useState(false);
  const [profileAction, setProfileAction] = useState<string | null>(null);
  const [pickedCharacterId, setPickedCharacterId] = useState<string | null>(null);
  const [mapProfile, setMapProfile] = useState(SAMPLE_PROFILES[0]);
  const [mapAction, setMapAction] = useState<string | null>(null);

  return (
    <main>
      <h1>Debug: screens</h1>
      <p>Dev-only. Not shipped to production — see CONTRIBUTING for how to reach this page.</p>

      <h2>Intro</h2>
      <p data-testid="screens-intro-status">{introContinued ? 'Continued' : 'Not continued yet'}</p>
      <Intro onContinue={() => setIntroContinued(true)} />

      <h2>ProfileSelect</h2>
      <p>
        <label htmlFor="screens-empty-profiles">
          <input
            id="screens-empty-profiles"
            type="checkbox"
            checked={showEmptyProfiles}
            onChange={(event) => setShowEmptyProfiles(event.target.checked)}
          />{' '}
          No existing profiles
        </label>
      </p>
      <p data-testid="screens-profile-action">{profileAction ?? 'No action yet'}</p>
      <ProfileSelect
        profiles={showEmptyProfiles ? [] : SAMPLE_PROFILES}
        onSelectProfile={(id) => setProfileAction(`Selected: ${id}`)}
        onCreateProfile={(name) => setProfileAction(`Creating: ${name}`)}
      />

      <h2>CharacterPick</h2>
      <p data-testid="screens-picked-character">
        {pickedCharacterId ? `Picked: ${pickedCharacterId}` : 'Nothing picked yet'}
      </p>
      <CharacterPick onPick={setPickedCharacterId} />

      <h2>Map</h2>
      <p data-testid="screens-map-action">{mapAction ?? 'No action yet'}</p>
      <Map
        profile={mapProfile}
        onSetDifficulty={(difficulty) => {
          setMapProfile((profile) => ({
            ...profile,
            settings: { ...profile.settings, difficulty },
          }));
          setMapAction(`Set difficulty: ${difficulty}`);
        }}
        onSelectPeak={(peakId) => setMapAction(`Selected peak: ${peakId}`)}
      />
    </main>
  );
}
