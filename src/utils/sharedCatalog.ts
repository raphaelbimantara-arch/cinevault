import { Movie } from '../types';

const CATALOG_API_URL =
  import.meta.env.VITE_CATALOG_API_URL ||
  'https://cinevault-delta-lake.vercel.app/api/movies';

async function requestCatalog(payload: {
  action: 'load' | 'save';
  token: string;
  movies?: Movie[];
}, serializedPayload?: string): Promise<{ movies?: Movie[]; count?: number }> {
  const response = await fetch(CATALOG_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: serializedPayload ?? JSON.stringify(payload),
  });
  const result = (await response.json()) as {
    movies?: Movie[];
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
