import { useEffect, useState } from 'react';
import { getPeak } from './engine/peaks';
import { getCharacterPreset } from './ui/character/presets';
import CharacterPick from './ui/screens/CharacterPick';
import Climb from './ui/screens/Climb';
import Fell from './ui/screens/Fell';
import Intro from './ui/screens/Intro';
import Map from './ui/screens/Map';
import ProfileSelect from './ui/screens/ProfileSelect';
import Summit from './ui/screens/Summit';
import {
  createProfile,
  getProfile,
  recordFall,
  recordQuestionStat,
  recordSummit,
  setDifficulty,
} from './storage/profile';
import { loadSave, saveSave } from './storage/save';
import type { Profile, SaveFile } from './storage/types';

type Screen =
  | { name: 'intro' }
  | { name: 'profileSelect' }
  | { name: 'characterPick'; pendingName: string }
  | { name: 'map' }
  | { name: 'climb'; peakId: number; seed: number }
  | { name: 'summit'; peakId: number; elapsedMs: number }
  | { name: 'fell'; peakId: number };

function requireActiveProfile(save: SaveFile): Profile {
  const profile = save.activeProfileId ? getProfile(save, save.activeProfileId) : undefined;
  if (!profile) {
    throw new Error('requireActiveProfile: no active profile — unreachable from the screen flow');
  }
  return profile;
}

/**
 * The real game's screen-state machine, replacing the placeholder that
 * rendered `PreviewPlayer` directly. Navigation is plain app state, not a
 * router — same "screens are driven by app state" philosophy
 * `DebugRouter.tsx`'s doc comment already states for the dev-only pages.
 * `PreviewPlayer` moves to `/debug/preview`, its production job now
 * superseded by this real flow.
 */
export default function App() {
  const [save, setSave] = useState<SaveFile>(() => loadSave());
  const [screen, setScreen] = useState<Screen>({ name: 'intro' });

  useEffect(() => {
    saveSave(save);
  }, [save]);

  switch (screen.name) {
    case 'intro':
      return <Intro onContinue={() => setScreen({ name: 'profileSelect' })} />;

    case 'profileSelect':
      return (
        <ProfileSelect
          profiles={save.profiles}
          onSelectProfile={(profileId) => {
            setSave((current) => ({ ...current, activeProfileId: profileId }));
            setScreen({ name: 'map' });
          }}
          onCreateProfile={(name) => setScreen({ name: 'characterPick', pendingName: name })}
        />
      );

    case 'characterPick':
      return (
        <CharacterPick
          onPick={(characterId) => {
            setSave((current) => createProfile(current, screen.pendingName, characterId));
            setScreen({ name: 'map' });
          }}
        />
      );

    case 'map': {
      const profile = requireActiveProfile(save);
      return (
        <Map
          profile={profile}
          onSetDifficulty={(difficulty) =>
            setSave((current) => setDifficulty(current, profile.id, difficulty))
          }
          onSelectPeak={(peakId) => setScreen({ name: 'climb', peakId, seed: Date.now() })}
        />
      );
    }

    case 'climb': {
      const profile = requireActiveProfile(save);
      const peakId = screen.peakId;
      return (
        <Climb
          peak={getPeak(peakId)}
          difficulty={profile.settings.difficulty}
          characterPreset={getCharacterPreset(profile.characterId)}
          seed={screen.seed}
          onQuestionAnswered={(typeId, correct, elapsedMs) =>
            setSave((current) =>
              recordQuestionStat(current, profile.id, typeId, correct, elapsedMs),
            )
          }
          onSummit={(_finalState, elapsedMs) => {
            setSave((current) => recordSummit(current, profile.id, peakId, elapsedMs));
            setScreen({ name: 'summit', peakId, elapsedMs });
          }}
          onFall={() => {
            setSave((current) => recordFall(current, profile.id, peakId));
            setScreen({ name: 'fell', peakId });
          }}
        />
      );
    }

    case 'summit': {
      const profile = requireActiveProfile(save);
      return (
        <Summit
          peak={getPeak(screen.peakId)}
          characterPreset={getCharacterPreset(profile.characterId)}
          elapsedMs={screen.elapsedMs}
          onContinue={() => setScreen({ name: 'map' })}
        />
      );
    }

    case 'fell': {
      const profile = requireActiveProfile(save);
      const peakId = screen.peakId;
      return (
        <Fell
          peak={getPeak(peakId)}
          characterPreset={getCharacterPreset(profile.characterId)}
          onRetry={() => setScreen({ name: 'climb', peakId, seed: Date.now() })}
          onReturnToMap={() => setScreen({ name: 'map' })}
        />
      );
    }
  }
}
