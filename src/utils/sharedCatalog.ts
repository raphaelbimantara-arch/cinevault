import { Movie } from '../types';
import { ActorProfile } from '../data/actorsData';

const CATALOG_API_URL =
  import.meta.env.VITE_CATALOG_API_URL ||
  'https://cinevault-delta-lake.vercel.app/api/movies';

async function requestCatalog(payload: {
  action: 'load' | 'save' | 'loadActors' | 'saveActor' | 'deleteActors' | 'saveActors';
  token: string;
  movies?: Movie[];
  actor?: ActorProfile;
  oldName?: string;
  actors?: ActorProfile[];
  names?: string[];
}, serializedPayload?: string): Promise<{
  movies?: Movie[];
  actors?: ActorProfile[];
  count?: number;
}> {
  const response = await fetch(CATALOG_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: serializedPayload ?? JSON.stringify(payload),
  });
  const result = (await response.json()) as {
    movies?: Movie[];
    actors?: ActorProfile[];
    count?: number;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(result.error || `Shared catalog request failed (${response.status}).`);
  }
  return result;
}

export async function loadSharedCatalog(token: string): Promise<Movie[]> {
  const result = await requestCatalog({ action: 'load', token });
  if (!Array.isArray(result.movies)) {
    throw new Error('The shared catalog returned invalid movie data.');
  }
  return result.movies;
}

export async function saveSharedCatalog(
  token: string,
  movies: Movie[],
  serializedPayload?: string,
): Promise<void> {
  await requestCatalog({ action: 'save', token, movies }, serializedPayload);
}

export async function loadSharedActors(token: string): Promise<ActorProfile[]> {
  const result = await requestCatalog({ action: 'loadActors', token });
  if (!Array.isArray(result.actors)) {
    throw new Error('The shared catalog returned invalid actor profiles.');
  }
  return result.actors;
}

export async function saveSharedActors(token: string, actors: ActorProfile[]): Promise<void> {
  await requestCatalog({ action: 'saveActors', token, actors });
}

export async function saveSharedActor(
  token: string,
  actor: ActorProfile,
  oldName?: string,
): Promise<void> {
  await requestCatalog({ action: 'saveActor', token, actor, oldName });
}

export async function deleteSharedActors(token: string, names: string[]): Promise<void> {
  await requestCatalog({ action: 'deleteActors', token, names });
}
