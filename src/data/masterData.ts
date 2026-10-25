// data/masterData.ts
/**
 * Master data store untuk Studio, Genre, dan Actor.
 * Sumber awal: ALL_STUDIOS, ALL_GENRES (initialMovies), KNOWN_ACTORS (actorsData).
 * Setelah dihapus -> persist ke localStorage -> tidak muncul lagi.
 */
import { ALL_GENRES, ALL_STUDIOS } from './initialMovies';
import { KNOWN_ACTORS } from './actorsData';

const STUDIOS_KEY = 'cinevault_master_studios_v1';
const GENRES_KEY = 'cinevault_master_genres_v1';
const ACTORS_KEY = 'cinevault_master_actors_v1';

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());

let studios: string[] = [];
let genres: string[] = [];
let actors: string[] = [];

function dedupeSort(list: string[]): string[] {
  const map = new Map<string, string>();
  list.forEach((item) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!map.has(key)) map.set(key, trimmed);
  });
  return [...map.values()].sort((a, b) => a.localeCompare(b));
}

function loadInitial() {
  try {
    const s = localStorage.getItem(STUDIOS_KEY);
    studios = s ? JSON.parse(s) : [...ALL_STUDIOS.filter((x) => x !== 'All Studios')];
  } catch {
    studios = [...ALL_STUDIOS.filter((x) => x !== 'All Studios')];
  }
  try {
    const g = localStorage.getItem(GENRES_KEY);
    genres = g ? JSON.parse(g) : [...ALL_GENRES.filter((x) => x !== 'All')];
  } catch {
    genres = [...ALL_GENRES.filter((x) => x !== 'All')];
  }
  try {
    const a = localStorage.getItem(ACTORS_KEY);
    actors = a ? JSON.parse(a) : Object.keys(KNOWN_ACTORS);
  } catch {
    actors = Object.keys(KNOWN_ACTORS);
  }
  studios = dedupeSort(studios);
  genres = dedupeSort(genres);
  actors = dedupeSort(actors);
}

loadInitial();

function persist() {
  try {
    localStorage.setItem(STUDIOS_KEY, JSON.stringify(studios));
    localStorage.setItem(GENRES_KEY, JSON.stringify(genres));
    localStorage.setItem(ACTORS_KEY, JSON.stringify(actors));
  } catch (e) {
    console.error('Failed to persist master data:', e);
  }
}

/* ---------- GETTERS ---------- */
export function getMasterStudios(): string[] {
  return [...studios];
}
export function getMasterGenres(): string[] {
  return [...genres];
}
export function getMasterActors(): string[] {
  return [...actors];
}

export function subscribeMasterData(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/* ---------- ADD ---------- */
export function addMasterStudio(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  if (studios.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return;
  studios = dedupeSort([...studios, trimmed]);
  persist();
  notify();
}

export function addMasterGenre(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  if (genres.some((g) => g.toLowerCase() === trimmed.toLowerCase())) return;
  genres = dedupeSort([...genres, trimmed]);
  persist();
  notify();
}

export function addMasterActor(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  if (actors.some((a) => a.toLowerCase() === trimmed.toLowerCase())) return;
  actors = dedupeSort([...actors, trimmed]);
  persist();
  notify();
}

/* ---------- DELETE ---------- */
export function deleteMasterStudio(name: string): void {
  const key = name.trim().toLowerCase();
  studios = studios.filter((s) => s.toLowerCase() !== key);
  persist();
  notify();
}

export function deleteMasterGenre(name: string): void {
  const key = name.trim().toLowerCase();
  genres = genres.filter((g) => g.toLowerCase() !== key);
  persist();
  notify();
}

export function deleteMasterActors(names: string[]): void {
  const keys = new Set(names.map((n) => n.trim().toLowerCase()));
  actors = actors.filter((a) => !keys.has(a.toLowerCase()));
  persist();
  notify();
}

/* ---------- RESET ---------- */
export function resetMasterData(): void {
  studios = dedupeSort(ALL_STUDIOS.filter((x) => x !== 'All Studios'));
  genres = dedupeSort(ALL_GENRES.filter((x) => x !== 'All'));
  actors = dedupeSort(Object.keys(KNOWN_ACTORS));
  persist();
  notify();
}