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
  deletedActorNames?: string[];
}> {
  const body = serializedPayload ?? JSON.stringify(payload);
  const response = await new Promise<Response>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', CATALOG_API_URL);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.upload.onprogress = (event) => {
      // Upload transfer is only the first phase; server-side database progress is
      // reported separately by the streamed response below.
      if (event.lengthComputable && onUploadProgress && payload.action === 'save') {
        onUploadProgress(Math.min(2, Math.round((event.loaded / event.total) * 2)));
      }
    };
    let processedResponseLength = 0;
    let pendingProgressText = '';
    const processProgressLines = (chunk: string) => {
      pendingProgressText += chunk;
      const lines = pendingProgressText.split('\n');
      pendingProgressText = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (event.type === 'progress' && typeof event.percent === 'number') onUploadProgress?.(Math.min(97, event.percent));
          if (event.type === 'error') {
            // Final error is also parsed below; don't resolve the request early.
          }
        } catch { /* Ignore incomplete/non-progress response fragments. */ }
      }
    };
    xhr.onprogress = () => {
      if (payload.action !== 'save') return;
      const newText = xhr.responseText.slice(processedResponseLength);
      processedResponseLength = xhr.responseText.length;
      processProgressLines(newText);
    };
    xhr.onload = () => resolve(new Response(xhr.responseText, { status: xhr.status, statusText: xhr.statusText }));
    xhr.onerror = () => reject(new Error('Network error while uploading the catalog.'));
    xhr.onabort = () => reject(new Error('Catalog upload was cancelled.'));
    xhr.send(body);
  });
  // Progress is driven by streamed server events; completion is reported by the caller only after actor-profile sync.
  const text = await response.text();
  let result: any;

  try {
    if (payload.action === 'save') {
      const events = text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
      const failure = events.find((event) => event.type === 'error');
      if (failure) throw new Error(failure.error || 'Database save failed.');
      result = events.find((event) => event.type === 'complete');
      if (!result) throw new Error('The server ended the save process without confirming completion.');
      onUploadProgress?.(97);
    } else {
      result = JSON.parse(text);
    }
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Database failed:') || error.message.includes('without confirming completion') || error.message === 'Database save failed.')) throw error;
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

export async function loadSharedActors(): Promise<{ actors: ActorProfile[]; deletedActorNames: string[] }> {
  const result = await requestCatalog({ action: 'loadActors' });
  if (!Array.isArray(result.actors)) {
    throw new Error('The shared catalog returned invalid actor profiles.');
  }
  return { actors: result.actors, deletedActorNames: Array.isArray(result.deletedActorNames) ? result.deletedActorNames : [] };
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