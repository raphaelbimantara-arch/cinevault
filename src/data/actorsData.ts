import actorVictor from '../assets/images/actor_victor_lynch_1792589786228.jpg';
import actorElena from '../assets/images/actor_elena_rostova_1792589785628.jpg';

export interface ActorProfile {
  name: string;
  alias?: string;
  dob: string; // Date of Birth
  debutMovieTitle?: string; // Manually editable debut film title
  photoUrl: string;
  favorite?: boolean;
  reviewed?: boolean;
}

export function getActorAliases(alias?: string): string[] {
  if (!alias) return [];
  const aliases = (alias.includes('\n') ? alias.split(/\r?\n/) : alias.split(/[,;]/))
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Map(aliases.map((value) => [value.toLocaleLowerCase(), value])).values()];
}

export function formatActorAliases(aliases: string[]): string | undefined {
  const uniqueAliases = [...new Map(
    aliases.map((value) => value.trim()).filter(Boolean)
      .map((value) => [value.toLocaleLowerCase(), value]),
  ).values()];
  return uniqueAliases.length ? uniqueAliases.join('\n') : undefined;
}

export const KNOWN_ACTORS: Record<string, { dob: string; photoUrl: string }> = {
  'Victor Lynch': {
    dob: '',
    photoUrl: actorVictor,
  },
  'Elena Rostova': {
    dob: '',
    photoUrl: actorElena,
  },
  'Marcus Aurel': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
  },
  'Eliza Reed': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
  },
  'Robert Stone': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop',
  },
  'Ryan Gosling': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&auto=format&fit=crop',
  },
  'Harrison Ford': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=600&auto=format&fit=crop',
  },
  'Ana de Armas': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop',
  },
  'Timothée Chalamet': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=600&auto=format&fit=crop',
  },
  'Zendaya': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop',
  },
  'Rebecca Ferguson': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop',
  },
  'Matthew McConaughey': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop',
  },
  'Anne Hathaway': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1548142813-c348350df52b?q=80&w=600&auto=format&fit=crop',
  },
  'Jessica Chastain': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?q=80&w=600&auto=format&fit=crop',
  },
  'Cillian Murphy': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=600&auto=format&fit=crop',
  },
  'Emily Blunt': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=600&auto=format&fit=crop',
  },
  'Robert Downey Jr.': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=600&auto=format&fit=crop',
  },
  'John Travolta': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=600&auto=format&fit=crop',
  },
  'Uma Thurman': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=600&auto=format&fit=crop',
  },
  'Samuel L. Jackson': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?q=80&w=600&auto=format&fit=crop',
  },
  'Christian Bale': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=600&auto=format&fit=crop',
  },
  'Heath Ledger': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1463453091185-61582044d556?q=80&w=600&auto=format&fit=crop',
  },
  'Aaron Eckhart': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1496345875659-11f7dd282d1d?q=80&w=600&auto=format&fit=crop',
  },
  'Michelle Yeoh': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop',
  },
  'Stephanie Hsu': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=600&auto=format&fit=crop',
  },
  'Ke Huy Quan': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
  },
  'Miles Teller': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop',
  },
  'J.K. Simmons': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=600&auto=format&fit=crop',
  },
  'Song Kang-ho': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=600&auto=format&fit=crop',
  },
  'Ralph Fiennes': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop',
  },
  'Saoirse Ronan': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
  },
  'Cailee Spaeny': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop',
  },
  'Anya Volkov': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop',
  },
  'Liam Connor': {
    dob: '',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=600&auto=format&fit=crop',
  },
};

/**
 * Custom registered actors storage
 */
const CUSTOM_ACTORS_KEY = 'cinevault_custom_actors_v1';
const ACTOR_DOB_LOCAL_MIGRATION_KEY = 'cinevault_actor_dob_blank_migration_v2';

function clearLegacyLocalActorDobsOnce(): void {
  try {
    if (localStorage.getItem(ACTOR_DOB_LOCAL_MIGRATION_KEY) === 'done') return;
    const raw = localStorage.getItem(CUSTOM_ACTORS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, { dob?: string; [key: string]: unknown }>;
      Object.keys(parsed).forEach((name) => { parsed[name].dob = ''; });
      localStorage.setItem(CUSTOM_ACTORS_KEY, JSON.stringify(parsed));
    }
    localStorage.setItem(ACTOR_DOB_LOCAL_MIGRATION_KEY, 'done');
  } catch (error) {
    console.error('Failed to clear legacy actor DOB values:', error);
  }
}

clearLegacyLocalActorDobsOnce();

export function getCustomActors(): Record<
  string,
  { alias?: string; dob: string; debutMovieTitle?: string; photoUrl: string; favorite?: boolean; reviewed?: boolean }
> {
  try {
    const raw = localStorage.getItem(CUSTOM_ACTORS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load custom actors', e);
  }
  return {};
}

export function applySharedActorProfiles(profiles: ActorProfile[]): void {
  try {
    const current = getCustomActors();
    const currentNames = new Map(
      Object.keys(current).map((name) => [name.trim().toLowerCase(), name])
    );
    profiles.forEach((profile) => {
      const name = profile.name.trim();
      if (!name) return;
      const existingName = currentNames.get(name.toLowerCase());
      if (existingName && existingName !== name) delete current[existingName];
      current[name] = {
        alias: profile.alias?.trim() || undefined,
        dob: profile.dob || '',
        debutMovieTitle: profile.debutMovieTitle || '',
        photoUrl: profile.photoUrl || '',
        favorite: profile.favorite,
        reviewed: profile.reviewed,
      };
      currentNames.set(name.toLowerCase(), name);
    });
    localStorage.setItem(CUSTOM_ACTORS_KEY, JSON.stringify(current));
  } catch (error) {
    console.error('Failed to apply shared actor profiles:', error);
    throw error;
  }
}

export function registerCustomActor(profile: ActorProfile): void {
  try {
    const current = getCustomActors();
    current[profile.name.trim()] = {
      alias: profile.alias?.trim() || undefined,
      dob: profile.dob,
      debutMovieTitle: profile.debutMovieTitle || '',
      photoUrl: profile.photoUrl,
      favorite: profile.favorite,
      reviewed: profile.reviewed,
    };
    localStorage.setItem(CUSTOM_ACTORS_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save custom actor', e);
  }
}

export function removeCustomActors(names: string[]): void {
  try {
    const namesToRemove = new Set(names.map((name) => name.trim().toLowerCase()));
    const current = getCustomActors();
    let changed = false;
    Object.keys(current).forEach((name) => {
      if (namesToRemove.has(name.trim().toLowerCase())) {
        delete current[name];
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(CUSTOM_ACTORS_KEY, JSON.stringify(current));
    }
  } catch (error) {
    console.error('Failed to remove custom actor profiles:', error);
  }
}

/**
 * Update an existing actor profile in localStorage
 */
export function updateActorProfile(oldName: string, updatedProfile: ActorProfile): void {
  try {
    const current = getCustomActors();
    const oldTrimmed = oldName.trim();
    const newTrimmed = updatedProfile.name.trim();
    const previousProfile = getActorProfile(oldTrimmed);
    const existingName = Object.keys(current).find(
      (name) => name.toLowerCase() === oldTrimmed.toLowerCase()
    );

    if (oldTrimmed !== newTrimmed && existingName) {
      delete current[existingName];
    }

    current[newTrimmed] = {
      alias: updatedProfile.alias?.trim() || undefined,
      dob: updatedProfile.dob,
      debutMovieTitle: updatedProfile.debutMovieTitle || '',
      photoUrl: updatedProfile.photoUrl,
      favorite: updatedProfile.favorite ?? previousProfile.favorite,
      reviewed: updatedProfile.reviewed ?? previousProfile.reviewed,
    };

    localStorage.setItem(CUSTOM_ACTORS_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to update custom actor profile', e);
  }
}

export function updateActorStatuses(
  names: string[],
  updates: Pick<ActorProfile, 'favorite' | 'reviewed'>
): void {
  try {
    const current = getCustomActors();
    names.forEach((name) => {
      const trimmed = name.trim();
      const existingKey = Object.keys(current).find(
        (key) => key.toLowerCase() === trimmed.toLowerCase()
      );
      const profile = getActorProfile(existingKey || trimmed);
      current[existingKey || trimmed] = {
        alias: profile.alias,
        dob: profile.dob,
        debutMovieTitle: profile.debutMovieTitle || '',
        photoUrl: profile.photoUrl,
        favorite: updates.favorite ?? profile.favorite,
        reviewed: updates.reviewed ?? profile.reviewed,
      };
    });
    localStorage.setItem(CUSTOM_ACTORS_KEY, JSON.stringify(current));
  } catch (error) {
    console.error('Failed to update actor statuses:', error);
    throw error;
  }
}

/**
 * Helper to get or generate an actor profile with picture and date of birth
 */
export function getActorProfile(name: string): ActorProfile {
  const trimmed = name.trim();
  const custom = getCustomActors();
  const customName = Object.keys(custom).find(
    (actorName) => actorName.toLowerCase() === trimmed.toLowerCase()
  );
  return createActorProfile(trimmed, customName ? custom[customName] : undefined);
}

export function getActorProfiles(names: string[]): Map<string, ActorProfile> {
  const customProfiles = new Map(
    Object.entries(getCustomActors()).map(([name, profile]) => [name.trim().toLowerCase(), profile])
  );
  const profiles = new Map<string, ActorProfile>();
  names.forEach((name) => {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    if (trimmed && !profiles.has(key)) {
      profiles.set(key, createActorProfile(trimmed, customProfiles.get(key)));
    }
  });
  return profiles;
}

function createActorProfile(
  trimmed: string,
  customProfile?: ReturnType<typeof getCustomActors>[string],
): ActorProfile {
  if (customProfile) {
    return {
      name: trimmed,
      alias: customProfile.alias,
      dob: customProfile.dob,
      debutMovieTitle: customProfile.debutMovieTitle || '',
      photoUrl: customProfile.photoUrl,
      favorite: customProfile.favorite,
      reviewed: customProfile.reviewed,
    };
  }

  if (KNOWN_ACTORS[trimmed]) {
    return {
      name: trimmed,
      alias: customProfile?.alias,
      dob: KNOWN_ACTORS[trimmed].dob,
      debutMovieTitle: '',
      photoUrl: KNOWN_ACTORS[trimmed].photoUrl,
      favorite: customProfile?.favorite,
      reviewed: customProfile?.reviewed,
    };
  }

  // Do not infer or generate dates of birth. New actors start with an empty DOB.
  return {
    name: trimmed,
    dob: '',
    debutMovieTitle: '',
    photoUrl: '', // Will render stylish initials avatar if empty
  };
}
