import { Movie } from '../types';
import { ActorProfile } from '../data/actorsData';

const CATALOG_API_URL =
  import.meta.env.VITE_CATALOG_API_URL ||
  'https://cinevault-delta-lake.vercel.app/api/movies';

async function requestCatalog(payload: {
  action: 'load' | 'save' | 'loadActors' | 'saveActor' | 'deleteActors' | 'saveActors' | 'clearDatabase';
  movies?: Movie[];
  actor?: ActorProfile;
  oldName?: string;
  updateDob?: boolean;
  actors?: ActorProfile[];
  names?: string[];
}, serializedPayload?: string, onUploadProgress?: (percent: number) => void): Promise<{
  movies?: Movie[];
  actors?: ActorProfile[];
  count?: number;
}> {
  const body = serializedPayload ?? JSON.stringify(payload);
  const response = await new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', CATALOG_API_URL);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onUploadProgress) {
        onUploadProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      }
    };
    xhr.onload = () => resolve(new Response(xhr.responseText, { status: xhr.status, statusText: xhr.statusText }));
    xhr.onerror = () => reject(new Error('Network error while uploading the catalog.'));
    xhr.onabort = () => reject(new Error('Catalog upload was cancelled.'));
    xhr.send(body);
  });
  if (response.ok) onUploadProgress?.(100);
  const text = await response.text();
  let result: any;

  try {
    // Coba ubah teks menjadi JSON
    result = JSON.parse(text);
  } catch (error) {
    // Jika gagal (karena server mengirim HTML), tampilkan pesan error yang rapi
    console.error('Invalid JSON response from server:', text.substring(0, 100));
    throw new Error('Server returned an invalid response. Please try again later.');
  }

  if (!response.ok) {
    throw new Error(result.error || `Shared catalog request failed (${response.status}).`);
  }
  
  return result;
}

export async function loadSharedCatalog(): Promise<Movie[]> {
  const result = await requestCatalog({ action: 'load' });
  if (!Array.isArray(result.movies)) {
    throw new Error('The shared catalog returned invalid movie data.');
  }
  return result.movies;
}

export async function saveSharedCatalog(
  movies: Movie[],
  serializedPayload?: string,
  onUploadProgress?: (percent: number) => void,
): Promise<void> {
  await requestCatalog({ action: 'save', movies }, serializedPayload, onUploadProgress);
}

export async function clearSharedDatabase(): Promise<void> {
  await requestCatalog({ action: 'clearDatabase' });
}

export async function loadSharedActors(): Promise<ActorProfile[]> {
  const result = await requestCatalog({ action: 'loadActors' });
  if (!Array.isArray(result.actors)) {
    throw new Error('The shared catalog returned invalid actor profiles.');
  }
  return result.actors;
}

export async function saveSharedActors(actors: ActorProfile[]): Promise<void> {
  await requestCatalog({ action: 'saveActors', actors });
}

export async function saveSharedActor(
  actor: ActorProfile,
  oldName?: string,
  updateDob = false,
): Promise<void> {
  await requestCatalog({ action: 'saveActor', actor, oldName, updateDob });
}

export async function deleteSharedActors(names: string[]): Promise<void> {
  await requestCatalog({ action: 'deleteActors', names });
}