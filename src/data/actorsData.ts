import actorVictor from '../assets/images/actor_victor_lynch_1792589786228.jpg';
import actorElena from '../assets/images/actor_elena_rostova_1792589785628.jpg';

export interface ActorProfile {
  name: string;
  dob: string; // Date of Birth
  photoUrl: string;
  birthplace?: string;
}

export const KNOWN_ACTORS: Record<string, { dob: string; photoUrl: string; birthplace?: string }> = {
  'Victor Lynch': {
    dob: 'April 14, 1974',
    photoUrl: actorVictor,
    birthplace: 'Chicago, Illinois, USA',
  },
  'Elena Rostova': {
    dob: 'September 22, 1986',
    photoUrl: actorElena,
    birthplace: 'Prague, Czech Republic',
  },
  'Marcus Aurel': {
    dob: 'January 18, 1982',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
    birthplace: 'London, England',
  },
  'Eliza Reed': {
    dob: 'July 8, 1989',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Melbourne, Australia',
  },
  'Robert Stone': {
    dob: 'March 3, 1968',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Toronto, Canada',
  },
  'Ryan Gosling': {
    dob: 'November 12, 1980',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=600&auto=format&fit=crop',
    birthplace: 'London, Ontario, Canada',
  },
  'Harrison Ford': {
    dob: 'July 13, 1942',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Chicago, Illinois, USA',
  },
  'Ana de Armas': {
    dob: 'April 30, 1988',
    photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Havana, Cuba',
  },
  'Timothée Chalamet': {
    dob: 'December 27, 1995',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=600&auto=format&fit=crop',
    birthplace: 'New York City, New York, USA',
  },
  'Zendaya': {
    dob: 'September 1, 1996',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Oakland, California, USA',
  },
  'Rebecca Ferguson': {
    dob: 'October 19, 1983',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Stockholm, Sweden',
  },
  'Matthew McConaughey': {
    dob: 'November 4, 1969',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Uvalde, Texas, USA',
  },
  'Anne Hathaway': {
    dob: 'November 12, 1982',
    photoUrl: 'https://images.unsplash.com/photo-1548142813-c348350df52b?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Brooklyn, New York, USA',
  },
  'Jessica Chastain': {
    dob: 'March 24, 1977',
    photoUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Sacramento, California, USA',
  },
  'Cillian Murphy': {
    dob: 'May 25, 1976',
    photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Douglas, Cork, Ireland',
  },
  'Emily Blunt': {
    dob: 'February 23, 1983',
    photoUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=600&auto=format&fit=crop',
    birthplace: 'London, England',
  },
  'Robert Downey Jr.': {
    dob: 'April 4, 1965',
    photoUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Manhattan, New York, USA',
  },
  'John Travolta': {
    dob: 'February 18, 1954',
    photoUrl: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Englewood, New Jersey, USA',
  },
  'Uma Thurman': {
    dob: 'April 29, 1970',
    photoUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Boston, Massachusetts, USA',
  },
  'Samuel L. Jackson': {
    dob: 'December 21, 1948',
    photoUrl: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Washington, D.C., USA',
  },
  'Christian Bale': {
    dob: 'January 30, 1974',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Haverfordwest, Wales',
  },
  'Heath Ledger': {
    dob: 'April 4, 1979',
    photoUrl: 'https://images.unsplash.com/photo-1463453091185-61582044d556?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Perth, Australia',
  },
  'Aaron Eckhart': {
    dob: 'March 12, 1968',
    photoUrl: 'https://images.unsplash.com/photo-1496345875659-11f7dd282d1d?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Cupertino, California, USA',
  },
  'Michelle Yeoh': {
    dob: 'August 6, 1962',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Ipoh, Malaysia',
  },
  'Stephanie Hsu': {
    dob: 'November 25, 1990',
    photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Torrance, California, USA',
  },
  'Ke Huy Quan': {
    dob: 'August 20, 1971',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Saigon, South Vietnam',
  },
  'Miles Teller': {
    dob: 'February 20, 1987',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Downingtown, Pennsylvania, USA',
  },
  'J.K. Simmons': {
    dob: 'January 9, 1955',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Grosse Pointe, Michigan, USA',
  },
  'Song Kang-ho': {
    dob: 'January 17, 1967',
    photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Gimhae, South Korea',
  },
  'Ralph Fiennes': {
    dob: 'December 22, 1962',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Ipswich, Suffolk, England',
  },
  'Saoirse Ronan': {
    dob: 'April 12, 1994',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop',
    birthplace: 'The Bronx, New York, USA',
  },
  'Cailee Spaeny': {
    dob: 'July 24, 1998',
    photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Springfield, Missouri, USA',
  },
  'Anya Volkov': {
    dob: 'May 16, 1991',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Vienna, Austria',
  },
  'Liam Connor': {
    dob: 'October 5, 1985',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=600&auto=format&fit=crop',
    birthplace: 'Dublin, Ireland',
  },
};

/**
 * Custom registered actors storage
 */
const CUSTOM_ACTORS_KEY = 'cinevault_custom_actors_v1';

export function getCustomActors(): Record<string, { dob: string; photoUrl: string; birthplace?: string }> {
  try {
    const raw = localStorage.getItem(CUSTOM_ACTORS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load custom actors', e);
  }
  return {};
}

export function registerCustomActor(profile: ActorProfile): void {
  try {
    const current = getCustomActors();
    current[profile.name.trim()] = {
      dob: profile.dob,
      photoUrl: profile.photoUrl,
      birthplace: profile.birthplace,
    };
    localStorage.setItem(CUSTOM_ACTORS_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save custom actor', e);
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

    if (oldTrimmed !== newTrimmed && current[oldTrimmed]) {
      delete current[oldTrimmed];
    }

    current[newTrimmed] = {
      dob: updatedProfile.dob,
      photoUrl: updatedProfile.photoUrl,
      birthplace: updatedProfile.birthplace,
    };

    localStorage.setItem(CUSTOM_ACTORS_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to update custom actor profile', e);
  }
}

/**
 * Helper to get or generate an actor profile with picture and date of birth
 */
export function getActorProfile(name: string): ActorProfile {
  const trimmed = name.trim();
  const custom = getCustomActors();
  if (custom[trimmed]) {
    return {
      name: trimmed,
      dob: custom[trimmed].dob,
      photoUrl: custom[trimmed].photoUrl,
      birthplace: custom[trimmed].birthplace,
    };
  }

  if (KNOWN_ACTORS[trimmed]) {
    return {
      name: trimmed,
      dob: KNOWN_ACTORS[trimmed].dob,
      photoUrl: KNOWN_ACTORS[trimmed].photoUrl,
      birthplace: KNOWN_ACTORS[trimmed].birthplace,
    };
  }

  // Deterministic fallback generator for custom/new actors
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash << 5) - hash + trimmed.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const year = 1965 + (absHash % 35);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = months[absHash % 12];
  const day = 1 + (absHash % 28);

  return {
    name: trimmed,
    dob: `${month} ${day}, ${year}`,
    photoUrl: '', // Will render stylish initials avatar if empty
    birthplace: 'International Cinema',
  };
}
