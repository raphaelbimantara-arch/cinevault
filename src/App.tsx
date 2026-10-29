/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { startTransition, useState, useEffect, useMemo, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { FilterToolbar } from './components/FilterToolbar';
import { MovieGrid } from './components/MovieGrid';
import { MovieList } from './components/MovieList';
import { MovieCoverGrid } from './components/MovieCoverGrid';
import { MovieDetailModal } from './components/MovieDetailModal';
import { ActorDetailModal } from './components/ActorDetailModal';
import { ActorsPage } from './components/ActorsPage';
import { AddMoviePage } from './components/AddMoviePage';
import { SettingsPage } from './components/SettingsPage';
import { ALL_GENRES, INITIAL_MOVIES } from './data/initialMovies';
import { ActorProfile, applyDeletedActorNames, applySharedActorProfiles, formatActorAliases, getActorAliases, getActorProfile, getCustomActors, removeCustomActors, updateActorProfile } from './data/actorsData';
import { Movie, ViewMode, ActivePage, SortOption, ActiveFilter } from './types';
import { Check, RotateCcw, Star, Trash2, X } from 'lucide-react';
import { clearSharedDatabase, deleteSharedActors, loadSharedActors, loadSharedCatalog, saveSharedActor, saveSharedActors, saveSharedCatalog } from './utils/sharedCatalog';
import { getMovieGenres } from './utils/movieGenres';
import { getImageSource } from './utils/googleDriveImage';
import {
  getMasterStudios,
  getMasterGenres,
  getMasterActors,
  subscribeMasterData,
  deleteMasterStudio,
  deleteMasterGenre,
  deleteMasterActors,
  resetMasterData,
} from './data/masterData';

const STORAGE_KEY = 'cinevault_movies_library_v2';
const MOVIE_COVER_COLS_STORAGE_KEY = 'cinevault_movie_cover_cols_v1';
const GRID_COLS_STORAGE_KEY = 'cinevault_grid_cols_v1';
const PENDING_ACTOR_DELETIONS_KEY = 'cinevault_pending_actor_deletions_v1';
const DELETED_ACTOR_NAMES_KEY = 'cinevault_deleted_actor_names_v1';

function getPendingActorDeletions(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_ACTOR_DELETIONS_KEY) || '[]');
    return Array.isArray(value) ? value.filter((name): name is string => typeof name === 'string' && name.trim()) : [];
  } catch { return []; }
}

function getDeletedActorNames(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(DELETED_ACTOR_NAMES_KEY) || '[]');
    return Array.isArray(value) ? value.filter((name): name is string => typeof name === 'string' && name.trim()) : [];
  } catch { return []; }
}

function addDeletedActorNames(names: string[]): void {
  const combined = [...getDeletedActorNames(), ...names.map((name) => name.trim()).filter(Boolean)];
  const unique = [...new Map(combined.map((name) => [name.toLowerCase(), name])).values()];
  try { localStorage.setItem(DELETED_ACTOR_NAMES_KEY, JSON.stringify(unique)); } catch (error) { console.error('Could not persist deleted actor names:', error); }
}

function addPendingActorDeletions(names: string[]): void {
  const combined = [...getPendingActorDeletions(), ...names.map((name) => name.trim()).filter(Boolean)];
  const unique = [...new Map(combined.map((name) => [name.toLowerCase(), name])).values()];
  try { localStorage.setItem(PENDING_ACTOR_DELETIONS_KEY, JSON.stringify(unique)); } catch (error) { console.error('Could not persist pending actor deletions:', error); }
}

function removePendingActorDeletions(names: string[]): void {
  const removed = new Set(names.map((name) => name.trim().toLowerCase()));
  try { localStorage.setItem(PENDING_ACTOR_DELETIONS_KEY, JSON.stringify(getPendingActorDeletions().filter((name) => !removed.has(name.trim().toLowerCase())))); } catch (error) { console.error('Could not update pending actor deletions:', error); }
}
type SharedCatalogStatus = 'disconnected' | 'loading' | 'connected' | 'empty' | 'error';
type ActionNotification = {
  message: string;
  action?: { label: string; onClick: () => void };
};
type AppNavigationSnapshot = {
  page: ActivePage;
  movieId: string | null;
  actorName: string | null;
};

function rahJ91ZuNL8Y2px8iYciYeHN8sfSh5eXH8(state: unknown): AppNavigationSnapshot | null {
  if (!state || typeof state !== 'object' || !('cinevaultSnapshot' in state)) return null;
  const snapshot = (state as { cinevaultSnapshot?: unknown }).cinevaultSnapshot;
  if (!snapshot || typeof snapshot !== 'object') return null;
  const candidate = snapshot as Partial<AppNavigationSnapshot>;
  if (!['library', 'actors', 'add', 'settings'].includes(candidate.page || '')) return null;
  if (candidate.movieId !== null && typeof candidate.movieId !== 'string') return null;
  if (candidate.actorName !== null && typeof candidate.actorName !== 'string') return null;
  return {
    page: candidate.page as ActivePage,
    movieId: candidate.movieId ?? null,
    actorName: candidate.actorName ?? null,
  };
}

export default function App() {
  const [movies, setMovies] = useState<Movie[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) { console.error(e); }
    return INITIAL_MOVIES;
  });
  const moviesRef = useRef(movies);
  moviesRef.current = movies;

  const [sharedCatalogStatus, setSharedCatalogStatus] = useState<SharedCatalogStatus>('loading');
  const [sharedCatalogError, setSharedCatalogError] = useState('');
  const [sharedCatalogReload, setSharedCatalogReload] = useState(0);
  const sharedCatalogSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const sharedActorSaveQueue = useRef<Promise<void>>(Promise.resolve());
  const [actorProfileRevision, setActorProfileRevision] = useState(0);

  // Master data state
  const [masterStudios, setMasterStudios] = useState<string[]>(() => getMasterStudios());
  const [masterGenres, setMasterGenres] = useState<string[]>(() => getMasterGenres());
  const [masterActors, setMasterActors] = useState<string[]>(() => getMasterActors());

  useEffect(() => {
    return subscribeMasterData(() => {
      setMasterStudios(getMasterStudios());
      setMasterGenres(getMasterGenres());
      setMasterActors(getMasterActors());
    });
  }, []);

  useEffect(() => {
    // Debounce catalog persistence so rapid edits and bulk updates do not
    // serialize the entire catalog on every intermediate render.
    const timer = window.setTimeout(() => {
      try {
        const deleted = new Set(getDeletedActorNames().map((name) => name.trim().toLowerCase()));
        const sanitized = deleted.size ? movies.map((movie) => ({ ...movie, actors: movie.actors.filter((name) => !deleted.has(name.trim().toLowerCase())) })) : movies;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      } catch (e) { console.error(e); }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [movies]);

  useEffect(() => {
    let cancelled = false;
    setSharedCatalogStatus('loading');
    setSharedCatalogError('');

    loadSharedCatalog()
      .then(async (sharedMovies) => {
        if (cancelled) return;
        if (sharedMovies.length > 0) {
          setMovies(sharedMovies);
          setSelectedMovieIds(new Set());
        }
        // Retry deletions made while offline before importing any server-side actor profiles.
        const pendingActorDeletions = getPendingActorDeletions();
        if (pendingActorDeletions.length) {
          try {
            await deleteSharedActors(pendingActorDeletions);
            removePendingActorDeletions(pendingActorDeletions);
          } catch (error) {
            console.error('Pending actor deletions will retry on the next refresh:', error);
          }
        }
        // Actor-only catalogs must still populate the directory even when there are zero movies.
        const sharedActorData = await loadSharedActors();
        if (cancelled) return;
        if (sharedActorData.deletedActorNames.length) {
          addDeletedActorNames(sharedActorData.deletedActorNames);
          const deleted = new Set([...getDeletedActorNames(), ...sharedActorData.deletedActorNames].map((name) => name.trim().toLowerCase()));
          applyDeletedActorNames(sharedActorData.deletedActorNames);
          setMovies((prev) => prev.map((movie) => ({ ...movie, actors: movie.actors.filter((name) => !deleted.has(name.trim().toLowerCase())) })));
        }
        const deletedActorKeys = new Set(getDeletedActorNames().map((name) => name.trim().toLowerCase()));
        if (deletedActorKeys.size) {
          setMovies((prev) => prev.map((movie) => ({ ...movie, actors: movie.actors.filter((name) => !deletedActorKeys.has(name.trim().toLowerCase())) })));
          applyDeletedActorNames(getDeletedActorNames());
        }
        applySharedActorProfiles(sharedActorData.actors.filter((actor) => !deletedActorKeys.has(actor.name.trim().toLowerCase())));
        setActorProfileRevision((revision) => revision + 1);
        setSharedCatalogStatus(sharedMovies.length > 0 ? 'connected' : (sharedActorData.actors.length > 0 ? 'connected' : 'empty'));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Failed to load shared catalog:', error);
        setSharedCatalogError(error instanceof Error ? error.message : 'Unable to load shared catalog.');
        setSharedCatalogStatus('error');
      });

    return () => { cancelled = true; };
  }, [sharedCatalogReload]);

  const handleInitializeSharedCatalog = async () => {
    setSharedCatalogStatus('loading'); setSharedCatalogError('');
    try {
      await saveSharedCatalog(movies);
      const actorSnapshot = Object.entries(getCustomActors()).map(([name, profile]) => ({ name, ...profile }));
      enqueueSharedActorUpdate(() => saveSharedActors(actorSnapshot));
      await sharedActorSaveQueue.current;
      setSharedCatalogStatus('connected');
    } catch (error) {
      console.error(error);
      setSharedCatalogError(error instanceof Error ? error.message : 'Unable to initialize shared catalog.');
      setSharedCatalogStatus('empty');
    }
  };

  const handleSaveSharedCatalog = async (onUploadProgress?: (percent: number) => void): Promise<number> => {
    if (movies.length === 0) throw new Error('There are no movies on this device to save.');
    const movieSnapshot = movies;
    const actorSnapshot = Object.entries(getCustomActors()).map(([name, profile]) => ({ name, ...profile }));
    startTransition(() => { setSharedCatalogStatus('loading'); setSharedCatalogError(''); });
    try {
      await sharedCatalogSaveQueue.current;
      await saveSharedCatalog(movieSnapshot, undefined, onUploadProgress);
      onUploadProgress?.(98);
      enqueueSharedActorUpdate(() => saveSharedActors(actorSnapshot));
      await sharedActorSaveQueue.current;
      onUploadProgress?.(99);
      setSharedCatalogStatus('connected');
      return movieSnapshot.length;
    } catch (error) {
      console.error(error);
      setSharedCatalogError(error instanceof Error ? error.message : 'Unable to save.');
      setSharedCatalogStatus('error');
      throw error instanceof Error ? error : new Error('Unknown error');
    }
  };

  const handleDeleteAllDatabase = async (): Promise<void> => {
    setSharedCatalogStatus('loading'); setSharedCatalogError('');
    try {
      await sharedCatalogSaveQueue.current;
      await sharedActorSaveQueue.current;
      await clearSharedDatabase();
      setMovies([]);
      moviesRef.current = [];
      setSelectedMovieIds(new Set());
      setSelectedMovie(null);
      removeCustomActors(Object.keys(getCustomActors()));
      resetMasterData();
      setActorProfileRevision((revision) => revision + 1);
      setSharedCatalogStatus('empty');
    } catch (error) {
      setSharedCatalogError(error instanceof Error ? error.message : 'Unable to delete database.');
      setSharedCatalogStatus('error');
      throw error instanceof Error ? error : new Error('Unknown error');
    }
  };

  const handleRefreshSharedCatalog = async (): Promise<number> => {
    setSharedCatalogStatus('loading'); setSharedCatalogError('');
    try {
      await sharedCatalogSaveQueue.current; await sharedActorSaveQueue.current;
      const pendingActorDeletions = getPendingActorDeletions();
      if (pendingActorDeletions.length) {
        await deleteSharedActors(pendingActorDeletions);
        removePendingActorDeletions(pendingActorDeletions);
      }
      const sharedMovies = await loadSharedCatalog();
      const sharedActorData = await loadSharedActors();
      addDeletedActorNames(sharedActorData.deletedActorNames);
      const deleted = new Set(getDeletedActorNames().map((name) => name.trim().toLowerCase()));
      applyDeletedActorNames(getDeletedActorNames());
      setMovies(sharedMovies.map((movie) => ({ ...movie, actors: movie.actors.filter((name) => !deleted.has(name.trim().toLowerCase())) })));
      applySharedActorProfiles(sharedActorData.actors.filter((actor) => !deleted.has(actor.name.trim().toLowerCase())));
      setActorProfileRevision((rev) => rev + 1);
      setSelectedMovieIds(new Set());
      setSharedCatalogStatus(sharedMovies.length > 0 || sharedActorData.actors.length > 0 ? 'connected' : 'empty');
      return sharedMovies.length;
    } catch (error) {
      setSharedCatalogError(error instanceof Error ? error.message : 'Unable to refresh.');
      setSharedCatalogStatus('error');
      throw error instanceof Error ? error : new Error('Unknown error');
    }
  };

  const [activePage, setActivePage] = useState<ActivePage>('library');
  const [addTab, setAddTab] = useState<'movie' | 'actor' | 'studio' | 'delete'>('movie');
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedMovieIds, setSelectedMovieIds] = useState<Set<string>>(() => new Set());
  const [actionNotification, setActionNotification] = useState<ActionNotification | null>(null);
  const actionNotificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionNotificationRef = useRef<HTMLDivElement | null>(null);
  const [selectedActorName, setSelectedActorName] = useState<string | null>(null);
  const navigationSnapshotRef = useRef<AppNavigationSnapshot | null>(null);
  const skipNavigationPushRef = useRef(false);
  const closingOverlayWithHistoryRef = useRef(false);
  const replaceActorHistoryOnNextChangeRef = useRef(false);

  useEffect(() => {
    const initialSnapshot: AppNavigationSnapshot = { page: 'library', movieId: null, actorName: null };
    const existingState = window.history.state;
    const state = existingState && typeof existingState === 'object' ? existingState : {};
    window.history.replaceState({ ...state, cinevaultSnapshot: initialSnapshot }, '');
    navigationSnapshotRef.current = initialSnapshot;

    const handlePopState = (event: PopStateEvent) => {
      closingOverlayWithHistoryRef.current = false;
      const snapshot = rahJ91ZuNL8Y2px8iYciYeHN8sfSh5eXH8(event.state);
      if (!snapshot) {
        const fallback = navigationSnapshotRef.current || initialSnapshot;
        window.history.pushState({ cinevaultSnapshot: fallback }, '');
        return;
      }
      skipNavigationPushRef.current = true;
      setActivePage(snapshot.page);
      setSelectedMovie(snapshot.movieId ? moviesRef.current.find((movie) => movie.id === snapshot.movieId) || null : null);
      setSelectedActorName(snapshot.actorName);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const snapshot: AppNavigationSnapshot = { page: activePage, movieId: selectedMovie?.id || null, actorName: selectedActorName };
    const previous = navigationSnapshotRef.current;
    if (skipNavigationPushRef.current) {
      skipNavigationPushRef.current = false;
      navigationSnapshotRef.current = snapshot;
      return;
    }
    if (previous && previous.page === snapshot.page && previous.movieId === snapshot.movieId && previous.actorName === snapshot.actorName) return;
    if (replaceActorHistoryOnNextChangeRef.current && previous?.actorName && snapshot.actorName && previous.page === snapshot.page && previous.movieId === snapshot.movieId) {
      replaceActorHistoryOnNextChangeRef.current = false;
      window.history.replaceState({ cinevaultSnapshot: snapshot }, '');
      navigationSnapshotRef.current = snapshot;
      return;
    }
    replaceActorHistoryOnNextChangeRef.current = false;
    window.history.pushState({ cinevaultSnapshot: snapshot }, '');
    navigationSnapshotRef.current = snapshot;
  }, [activePage, selectedMovie?.id, selectedActorName]);

  const handleCloseMovieDetail = () => {
    // Closing the movie detail should always return to the library, never to the previously viewed movie.
    setSelectedMovie(null);
    closingOverlayWithHistoryRef.current = false;
  };

  const handleCloseActorDetail = () => {
    const snapshot = rahJ91ZuNL8Y2px8iYciYeHN8sfSh5eXH8(window.history.state);
    if (selectedActorName && snapshot?.actorName === selectedActorName && !closingOverlayWithHistoryRef.current) {
      closingOverlayWithHistoryRef.current = true;
      window.history.back();
    } else if (!closingOverlayWithHistoryRef.current) {
      setSelectedActorName(null);
    }
  };

  const showActionNotification = (message: string, action?: ActionNotification['action']) => {
    if (actionNotificationTimer.current !== null) clearTimeout(actionNotificationTimer.current);
    setActionNotification({ message, action });
    actionNotificationTimer.current = setTimeout(() => { setActionNotification(null); actionNotificationTimer.current = null; }, 5000);
  };

  const enqueueSharedActorUpdate = (operation: () => Promise<void>) => {
    sharedActorSaveQueue.current = sharedActorSaveQueue.current.then(operation).catch((error: unknown) => {
      console.error('Failed to sync actor profile:', error);
      showActionNotification(error instanceof Error ? `Actor profile could not sync: ${error.message}` : 'Actor profile could not sync.');
    });
  };

  useEffect(() => () => { if (actionNotificationTimer.current !== null) clearTimeout(actionNotificationTimer.current); }, []);

  useEffect(() => {
    if (!actionNotification) return;
    const dismissOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && actionNotificationRef.current?.contains(event.target)) return;
      if (actionNotificationTimer.current !== null) { clearTimeout(actionNotificationTimer.current); actionNotificationTimer.current = null; }
      setActionNotification(null);
    };
    document.addEventListener('pointerdown', dismissOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', dismissOnOutsidePointer);
  }, [actionNotification]);

  const handleNavigatePage = (page: ActivePage) => {
    setSelectedMovie(null); setSelectedActorName(null); startTransition(() => setActivePage(page));
  };

  const handleTriggerAdd = (tab: 'movie' | 'actor' | 'studio' | 'delete' = 'movie') => {
    setSelectedMovie(null); setSelectedActorName(null); setAddTab(tab); startTransition(() => setActivePage('add'));
  };

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [gridCols, setGridCols] = useState<number>(() => {
    try { const saved = Number(localStorage.getItem(GRID_COLS_STORAGE_KEY)); return Number.isInteger(saved) && saved >= 2 && saved <= 15 ? saved : 7; } catch { return 7; }
  });

  useEffect(() => { try { localStorage.setItem(GRID_COLS_STORAGE_KEY, String(gridCols)); } catch (e) { console.error(e); } }, [gridCols]);

  const [movieCoverCols, setMovieCoverCols] = useState(() => {
    try { const savedCols = Number(localStorage.getItem(MOVIE_COVER_COLS_STORAGE_KEY)); return Number.isInteger(savedCols) && savedCols >= 6 && savedCols <= 22 ? savedCols : 10; } catch { return 10; }
  });

  useEffect(() => { try { localStorage.setItem(MOVIE_COVER_COLS_STORAGE_KEY, String(movieCoverCols)); } catch (e) { console.error(e); } }, [movieCoverCols]);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const availableGenres = useMemo(() => {
    const genres = new Map<string, string>();
    [...masterGenres, ...movies.flatMap((movie) => getMovieGenres(movie.genre))].forEach((genre) => {
      const normalized = genre.trim().toLowerCase();
      if (normalized && normalized !== 'all' && !genres.has(normalized)) genres.set(normalized, genre.trim());
    });
    return [...genres.values()].sort((a, b) => a.localeCompare(b));
  }, [movies, masterGenres]);

  const [selectedAlphabets, setSelectedAlphabets] = useState<string[]>(['All']);
  const [pendingMovieJumpLetter, setPendingMovieJumpLetter] = useState<string | null>(null);
  const handleToggleAlphabet = (char: string) => {
    if (char === 'All') { setSelectedAlphabets(['All']); return; }
    setSelectedAlphabets((prev) => {
      const isAll = prev.includes('All');
      if (isAll) return [char];
      if (prev.includes(char)) { const next = prev.filter((c) => c !== char); return next.length === 0 ? ['All'] : next; }
      return [...prev, char];
    });
  };

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeToSearchPrefix, setTypeToSearchPrefix] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('alphabet-asc');
  const [activeMetadataFilter, setActiveMetadataFilter] = useState<ActiveFilter | null>(null);

  const libraryTypeSearchRef = useRef({ value: '', lastAt: 0 });
  useEffect(() => {
    if (activePage !== 'library' || selectedMovie || selectedActorName) {
      libraryTypeSearchRef.current = { value: '', lastAt: 0 };
      return;
    }
    const handleLibraryTypeSearch = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1 || !/[a-z0-9]/i.test(event.key) ||
        (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)))) return;
      const now = Date.now();
      const value = now - libraryTypeSearchRef.current.lastAt > 900 ? event.key : libraryTypeSearchRef.current.value + event.key;
      libraryTypeSearchRef.current = { value, lastAt: now };
      setTypeToSearchPrefix(value.toLowerCase());
      setSelectedAlphabets(['All']); setSelectedCategory('All'); setSearchQuery(''); setActiveMetadataFilter(null); setSortBy('alphabet-asc');
    };
    window.addEventListener('keydown', handleLibraryTypeSearch);
    return () => window.removeEventListener('keydown', handleLibraryTypeSearch);
  }, [activePage, selectedMovie, selectedActorName]);

  const actorsCount = useMemo(() => {
    const set = new Set<string>();
    movies.forEach((m) => m.actors.forEach((a) => set.add(a.trim())));
    return set.size;
  }, [movies]);

  const handleFilterByAttribute = (type: 'genre' | 'studio' | 'year' | 'minutes' | 'size' | 'resolution', value: string | number) => {
    setSelectedMovie(null); setActivePage('library'); setSortBy('alphabet-asc'); setSelectedAlphabets(['All']); setSearchQuery('');
    if (type === 'genre') { const genreVal = String(value); setSelectedCategory(genreVal); setActiveMetadataFilter({ type: 'genre', label: 'Genre', value: genreVal }); }
    else if (type === 'studio') { setSelectedCategory('All'); setActiveMetadataFilter({ type: 'studio', label: 'Studio', value: String(value) }); }
    else if (type === 'year') { setSelectedCategory('All'); setActiveMetadataFilter({ type: 'year', label: 'Release Year', value: Number(value) }); }
    else if (type === 'minutes') { setSelectedCategory('All'); const targetMins = Number(value); setActiveMetadataFilter({ type: 'minutes', label: 'Duration Bracket', value: `${targetMins} min (±20m)` }); }
    else if (type === 'size') { setSelectedCategory('All'); const sizeStr = String(value); setActiveMetadataFilter({ type: 'size', label: 'File Size', value: sizeStr }); }
    else if (type === 'resolution') { setSelectedCategory('All'); setActiveMetadataFilter({ type: 'resolution', label: 'Resolution', value: String(value) }); }
  };

  const handleFilterByActor = (actorName: string) => {
    setSelectedMovie(null); setActivePage('library'); setSortBy('alphabet-asc'); setSelectedAlphabets(['All']); setSelectedCategory('All');
    setActiveMetadataFilter({ type: 'actor', label: 'Starring Actor', value: actorName });
  };

  const handleClearMetadataFilter = () => { setActiveMetadataFilter(null); };

  const handleAddMovie = (newMovie: Movie) => {
    const now = new Date().toISOString();
    const timestampedMovie = { ...newMovie, addedDate: newMovie.addedDate || now, modifiedDate: newMovie.modifiedDate || now };
    setMovies((prev) => [timestampedMovie, ...prev]); setActivePage('library'); setSortBy('alphabet-asc'); setActiveMetadataFilter(null);
  };

  const handleDeleteMovie = async (id: string) => {
    setMovies((prev) => prev.filter((m) => m.id !== id)); showActionNotification('Movie successfully deleted.');
    setSelectedMovieIds((prev) => { const next = new Set(prev); next.delete(id); return next; });

    try {
      await fetch('https://cinevault-delta-lake.vercel.app/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', movieId: id })
      });
    } catch (error) {
      console.error('Failed to delete from database:', error);
    }
  };

  const handleBulkDeleteMovies = async (movieIds: string[]) => {
    if (movieIds.length === 0) return; const idSet = new Set(movieIds);
    setMovies((prev) => prev.filter((m) => !idSet.has(m.id)));
    setSelectedMovieIds((prev) => new Set([...prev].filter((id) => !idSet.has(id))));
    showActionNotification(`${movieIds.length} movies successfully deleted.`);

    for (const id of movieIds) {
      try {
        await fetch('https://cinevault-delta-lake.vercel.app/api/movies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', movieId: id })
        });
      } catch (error) {
        console.error('Failed to delete movie from database:', error);
      }
    }
  };

  const handleToggleMovieSelection = (movieId: string) => {
    setSelectedMovieIds((prev) => { const next = new Set(prev); if (next.has(movieId)) next.delete(movieId); else next.add(movieId); return next; });
  };

  const handleSelectMultipleMovies = (movieIds: string[]) => {
    setSelectedMovieIds((prev) => { const next = new Set(prev); movieIds.forEach((id) => next.add(id)); return next; });
  };

  const handleDeleteSelectedMovies = () => {
    const idsToDelete = movies.filter((movie) => selectedMovieIds.has(movie.id)).map((movie) => movie.id);
    if (idsToDelete.length === 0) return;
    if (!window.confirm(`Delete ${idsToDelete.length} selected movie(s)? This cannot be undone.`)) return;
    handleBulkDeleteMovies(idsToDelete); setSelectedMovieIds(new Set());
  };

  const handleUpdateSelectedMovies = (updates: Pick<Movie, 'favorite' | 'reviewed'>) => {
    const field = updates.favorite !== undefined ? 'favorite' : 'reviewed';
    const label = field === 'favorite' ? 'favorite' : 'reviewed';
    const selectedMovies = movies.filter((movie) => selectedMovieIds.has(movie.id));
    const alreadyMarked = selectedMovies.filter((movie) => movie[field] === true).map((movie) => movie.id);
    const newlyMarkedCount = selectedMovies.length - alreadyMarked.length;
    setMovies((prev) => prev.map((movie) => selectedMovieIds.has(movie.id) ? { ...movie, ...updates, modifiedDate: new Date().toISOString() } : movie));
    const message = alreadyMarked.length > 0 ? `${newlyMarkedCount} movies marked as ${label}; ${alreadyMarked.length} were already ${label}.` : `${newlyMarkedCount} movies marked as ${label}.`;
    showActionNotification(message, alreadyMarked.length > 0 ? { label: field === 'favorite' ? 'Remove from favorites' : 'Remove review mark', onClick: () => handleRemoveSelectedMovieStatus(field, alreadyMarked) } : undefined);
  };

  const handleRemoveSelectedMovieStatus = (field: 'favorite' | 'reviewed', movieIds: string[]) => {
    const ids = new Set(movieIds);
    setMovies((prev) => prev.map((movie) => {
      if (!ids.has(movie.id)) return movie;
      return field === 'favorite' ? { ...movie, favorite: false, modifiedDate: new Date().toISOString() } : { ...movie, reviewed: false, modifiedDate: new Date().toISOString() };
    }));
    showActionNotification(`${movieIds.length} movies removed from ${field === 'favorite' ? 'favorites' : 'review'}.`);
  };

  const handleUpdateMovie = (updatedMovie: Movie) => {
    const now = new Date().toISOString();
    const current = moviesRef.current.find((movie) => movie.id === updatedMovie.id);
    const savedMovie = { ...updatedMovie, addedDate: current?.addedDate || updatedMovie.addedDate || '', modifiedDate: now };
    setMovies((prev) => prev.map((m) => (m.id === savedMovie.id ? savedMovie : m))); setSelectedMovie(savedMovie);
  };

  const handleUpdateMovieFromList = (updatedMovie: Movie) => {
    const now = new Date().toISOString();
    const current = moviesRef.current.find((movie) => movie.id === updatedMovie.id);
    const savedMovie = { ...updatedMovie, addedDate: current?.addedDate || updatedMovie.addedDate || '', modifiedDate: now };
    setMovies((prev) => prev.map((movie) => (movie.id === savedMovie.id ? savedMovie : movie)));
  };

  const handleToggleListSort = (field: 'title' | 'year' | 'size' | 'minutes' | 'resolution' | 'actors' | 'studio' | 'genre' | 'frontCover' | 'backCover' | 'dateAdded' | 'dateModified') => {
    if (field === 'frontCover' || field === 'backCover') {
      const missing = field === 'frontCover' ? 'poster-missing-first' : 'backdrop-missing-first';
      const available = field === 'frontCover' ? 'poster-available-first' : 'backdrop-available-first';
      setSortBy((current) => current === missing ? available : missing);
      return;
    }
    const options = { title: ['alphabet-asc', 'alphabet-desc'], year: ['year-asc', 'year-desc'], size: ['size-asc', 'size-desc'], minutes: ['minutes-asc', 'minutes-desc'], resolution: ['quality-asc', 'quality-desc'], actors: ['actor-asc', 'actor-desc'], studio: ['studio-asc', 'studio-desc'], genre: ['genre-asc', 'genre-desc'], dateAdded: ['date-added-asc', 'date-added-desc'], dateModified: ['date-modified-asc', 'date-modified-desc'] } as const;
    const [ascending, descending] = options[field]; setSortBy((current) => current === ascending ? descending : ascending);
  };

  const handleUpdateActor = (oldName: string, updatedProfile: ActorProfile) => {
    updateActorProfile(oldName, updatedProfile); setActorProfileRevision((revision) => revision + 1);
    if (sharedCatalogStatus === 'connected') enqueueSharedActorUpdate(() => saveSharedActor(updatedProfile, oldName, true));
    const oldTrimmed = oldName.trim(); const newTrimmed = updatedProfile.name.trim();
    if (oldTrimmed !== newTrimmed) {
      setMovies((prev) => prev.map((m) => {
        if (m.actors.some((a) => a.trim().toLowerCase() === oldTrimmed.toLowerCase())) {
          return { ...m, actors: m.actors.map((a) => a.trim().toLowerCase() === oldTrimmed.toLowerCase() ? newTrimmed : a), modifiedDate: new Date().toISOString() };
        }
        return m;
      }));
      replaceActorHistoryOnNextChangeRef.current = true;
      setSelectedActorName(newTrimmed);
    }
  };

  const handleMergeActors = (primaryName: string, mergedNames: string[]) => {
    const primaryProfile = getActorProfile(primaryName); const mergedProfiles = mergedNames.map((name) => getActorProfile(name));
    const aliases = [...getActorAliases(primaryProfile.alias), ...mergedProfiles.flatMap((profile, index) => [...getActorAliases(profile.alias), mergedNames[index]])].filter((alias) => alias.toLowerCase() !== primaryName.trim().toLowerCase());
    updateActorProfile(primaryName, { ...primaryProfile, alias: formatActorAliases(aliases), favorite: primaryProfile.favorite === true || mergedProfiles.some((p) => p.favorite === true), reviewed: primaryProfile.reviewed === true || mergedProfiles.some((p) => p.reviewed === true) });
    removeCustomActors(mergedNames); setActorProfileRevision((revision) => revision + 1);
    if (sharedCatalogStatus === 'connected') {
      const updatedPrimary = getActorProfile(primaryName);
      enqueueSharedActorUpdate(async () => { await saveSharedActor(updatedPrimary, primaryName); await deleteSharedActors(mergedNames); });
    }
    const mergedNameSet = new Set([primaryName, ...mergedNames].map((name) => name.trim().toLowerCase()));
    setMovies((previousMovies) => previousMovies.map((movie) => {
      const nextActors = movie.actors.map((name) => mergedNameSet.has(name.trim().toLowerCase()) ? primaryName : name);
      const seenActors = new Set<string>(); const uniqueActors = nextActors.filter((name) => { const key = name.trim().toLowerCase(); if (seenActors.has(key)) return false; seenActors.add(key); return true; });
      return uniqueActors.length === movie.actors.length && uniqueActors.every((name, index) => name === movie.actors[index]) ? movie : { ...movie, actors: uniqueActors };
    }));
  };

  const handleDeleteActors = (actorNames: string[]) => {
    const namesToDelete = new Set(actorNames.map((name) => name.trim().toLowerCase()));
    removeCustomActors(actorNames);
    deleteMasterActors(actorNames);
    setActorProfileRevision((revision) => revision + 1);
    // Write a server-side deletion tombstone even if the connection status is stale; this
    // prevents old offline snapshots from restoring the actor on the next successful sync.
    addDeletedActorNames(actorNames);
    addPendingActorDeletions(actorNames);
    enqueueSharedActorUpdate(async () => {
      await deleteSharedActors(actorNames);
      removePendingActorDeletions(actorNames);
      showActionNotification(`${actorNames.length} actor(s) deleted locally and from the online database.`);
    });
    setMovies((prev) => prev.map((movie) => ({ ...movie, actors: movie.actors.filter((name) => !namesToDelete.has(name.trim().toLowerCase())) })));
    setSelectedActorName((current) => current && namesToDelete.has(current.trim().toLowerCase()) ? null : current);
    showActionNotification(`${actorNames.length} actor(s) removed locally; syncing deletion to the online database.`);
  };

  const handleDeleteStudio = (studioName: string) => {
    const key = studioName.trim().toLowerCase();
    deleteMasterStudio(studioName);
    setMovies((prev) =>
      prev.map((m) => (m.studio.trim().toLowerCase() === key ? { ...m, studio: 'Unknown Studio' } : m))
    );
    showActionNotification(`Studio "${studioName}" deleted from master & all movies.`);
  };

  const handleDeleteGenre = (genreName: string) => {
    const key = genreName.trim().toLowerCase();
    deleteMasterGenre(genreName);
    setMovies((prev) =>
      prev.map((m) => {
        const genres = getMovieGenres(m.genre);
        const filtered = genres.filter((g) => g.toLowerCase() !== key);
        if (filtered.length === genres.length) return m;
        return { ...m, genre: filtered.join(', ') };
      })
    );
    showActionNotification(`Genre "${genreName}" deleted from master & all movies.`);
  };

  const handleImportMovies = (imported: Movie[], mode: 'merge' | 'replace') => {
    if (mode === 'replace') {
      setMovies(imported); setSelectedMovieIds(new Set());
      return;
    }

    // Merge by normalized title. Existing catalog IDs are retained for matching titles;
    // unmatched existing movies remain untouched and new titles are appended.
    const normalizeTitle = (value: string) => value
      .normalize('NFKC')
      .trim()
      .toLocaleLowerCase()
      .replace(/\s+/g, ' ');

    setMovies((prev) => {
      const result = [...prev];
      const indexByTitle = new Map<string, number>();
      result.forEach((movie, index) => {
        const key = normalizeTitle(movie.title || '');
        if (key && !indexByTitle.has(key)) indexByTitle.set(key, index);
      });

      imported.forEach((incoming, incomingIndex) => {
        const key = normalizeTitle(incoming.title || '');
        if (!key) return;
        const existingIndex = indexByTitle.get(key);
        if (existingIndex !== undefined) {
          const existing = result[existingIndex];
          result[existingIndex] = {
            ...existing,
            ...incoming,
            id: existing.id,
            title: incoming.title.trim() || existing.title,
            // Avoid replacing useful existing metadata with parser-generated empty values.
            genre: incoming.genre?.trim() && incoming.genre !== 'Drama' ? incoming.genre : existing.genre,
            studio: incoming.studio?.trim() && incoming.studio !== 'Independent Studio' ? incoming.studio : existing.studio,
            year: incoming.year || existing.year,
            minutes: incoming.minutes || existing.minutes,
            size: incoming.size?.trim() && incoming.size !== '4.5 GB' ? incoming.size : existing.size,
            sizeBytes: incoming.sizeBytes || existing.sizeBytes,
            resolution: incoming.resolution?.trim() && incoming.resolution !== '1080p HD' ? incoming.resolution : existing.resolution,
            posterUrl: incoming.posterUrl?.trim() && !incoming.posterUrl.includes('images.unsplash.com/photo-1489599849927-2ee91cede3ba') && !incoming.posterUrl.includes('images.unsplash.com/photo-1514565131-fce0801e5785') && !incoming.posterUrl.includes('images.unsplash.com/photo-1536440136628-849c177e76a1') ? incoming.posterUrl : existing.posterUrl,
            backdropUrl: incoming.backdropUrl?.trim() ? incoming.backdropUrl : existing.backdropUrl,
            actors: incoming.actors?.length && !(incoming.actors.length === 1 && incoming.actors[0] === 'Cast') ? incoming.actors : existing.actors,
            addedDate: existing.addedDate || (incoming.addedDate && incoming.addedDate !== new Date().toISOString().split('T')[0] ? incoming.addedDate : ''),
            modifiedDate: new Date().toISOString(),
          };
        } else {
          let newId = incoming.id || `excel-${Date.now()}-${incomingIndex}`;
          if (result.some((movie) => movie.id === newId)) newId = `import-${Date.now()}-${incomingIndex}`;
          const now = new Date().toISOString();
          const newMovie = { ...incoming, id: newId, addedDate: incoming.addedDate || now, modifiedDate: incoming.modifiedDate || now };
          result.push(newMovie);
          indexByTitle.set(key, result.length - 1);
        }
      });
      return result;
    });
  };

  const handleResetCatalog = () => {
    if (window.confirm('Reset movie catalog to original default library?')) {
      setMovies(INITIAL_MOVIES); setSelectedMovieIds(new Set()); localStorage.removeItem(STORAGE_KEY); resetMasterData(); setActiveMetadataFilter(null); setSelectedCategory('All'); setSelectedAlphabets(['All']); setSearchQuery(''); setSortBy('alphabet-asc');
    }
  };

  const filteredAndSortedMovies = useMemo(() => {
    let result = [...movies];
    if (selectedCategory !== 'All') {
      result = selectedCategory === '__favorites__' ? result.filter((movie) => movie.favorite === true) : selectedCategory === '__reviewed__' ? result.filter((movie) => movie.reviewed === true) : selectedCategory === '__uncensored__' ? result.filter((movie) => movie.uncensored === true) : result.filter((movie) => getMovieGenres(movie.genre).some((genre) => genre.toLowerCase() === selectedCategory.toLowerCase()));
    }
    if (!selectedAlphabets.includes('All') && selectedAlphabets.length > 0) {
      result = result.filter((m) => selectedAlphabets.some((char) => char === '#' ? !/^[a-zA-Z]/i.test(m.title) : m.title.toUpperCase().startsWith(char.toUpperCase())));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((m) => m.title.toLowerCase().includes(q) || m.genre.toLowerCase().includes(q) || m.studio.toLowerCase().includes(q) || m.actors.some((a) => a.toLowerCase().includes(q)) || String(m.year).includes(q));
    }
    if (activeMetadataFilter) {
      const { type, value } = activeMetadataFilter;
      if (type === 'genre') result = result.filter((m) => getMovieGenres(m.genre).some((genre) => genre.toLowerCase() === String(value).toLowerCase()));
      else if (type === 'studio') result = result.filter((m) => m.studio.toLowerCase() === String(value).toLowerCase());
      else if (type === 'year') result = result.filter((m) => m.year === Number(value));
      else if (type === 'minutes') { const target = parseInt(String(value), 10); if (!isNaN(target)) result = result.filter((m) => m.minutes >= target - 20 && m.minutes <= target + 20); }
      else if (type === 'size') {
        const valStr = String(value); const parsedValMB = parseFloat(valStr) * (valStr.includes('TB') ? 1000000 : 1000);
        result = result.filter((m) => { if (m.size === valStr) return true; if (m.sizeBytes && parsedValMB) return (m.sizeBytes >= parsedValMB * 0.6 && m.sizeBytes <= parsedValMB * 1.5); return m.size.toLowerCase().includes(valStr.toLowerCase()); });
      }
      else if (type === 'resolution') result = result.filter((m) => (m.resolution || '').toLowerCase() === String(value).toLowerCase());
      else if (type === 'actor') result = result.filter((m) => m.actors.some((a) => a.toLowerCase() === String(value).toLowerCase()));
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case 'alphabet-asc': return a.title.localeCompare(b.title, undefined, { numeric: true });
        case 'alphabet-desc': return b.title.localeCompare(a.title, undefined, { numeric: true });
        case 'year-desc': return b.year - a.year; case 'year-asc': return a.year - b.year;
        case 'minutes-desc': return b.minutes - a.minutes; case 'minutes-asc': return a.minutes - b.minutes;
        case 'size-desc': return (b.sizeBytes || 0) - (a.sizeBytes || 0); case 'size-asc': return (a.sizeBytes || 0) - (b.sizeBytes || 0);
        case 'actor-asc': return a.actors.join(', ').localeCompare(b.actors.join(', '), undefined, { numeric: true });
        case 'actor-desc': return b.actors.join(', ').localeCompare(a.actors.join(', '), undefined, { numeric: true });
        case 'quality-desc': return (b.resolution || '').localeCompare(a.resolution || ''); case 'quality-asc': return (a.resolution || '').localeCompare(b.resolution || '');
        case 'studio-desc': return b.studio.localeCompare(a.studio, undefined, { numeric: true }); case 'studio-asc': return a.studio.localeCompare(b.studio, undefined, { numeric: true });
        case 'genre-desc': return b.genre.localeCompare(a.genre, undefined, { numeric: true }); case 'genre-asc': return a.genre.localeCompare(b.genre, undefined, { numeric: true });
        case 'poster-missing-first': return Number(Boolean(a.posterUrl?.trim())) - Number(Boolean(b.posterUrl?.trim()));
        case 'poster-available-first': return Number(Boolean(b.posterUrl?.trim())) - Number(Boolean(a.posterUrl?.trim()));
        case 'backdrop-missing-first': return Number(Boolean(a.backdropUrl?.trim())) - Number(Boolean(b.backdropUrl?.trim()));
        case 'backdrop-available-first': return Number(Boolean(b.backdropUrl?.trim())) - Number(Boolean(a.backdropUrl?.trim()));
        case 'date-added-asc': return !a.addedDate ? (!b.addedDate ? a.title.localeCompare(b.title) : 1) : !b.addedDate ? -1 : a.addedDate.localeCompare(b.addedDate) || a.title.localeCompare(b.title);
        case 'date-added-desc': return !a.addedDate ? (!b.addedDate ? a.title.localeCompare(b.title) : 1) : !b.addedDate ? -1 : b.addedDate.localeCompare(a.addedDate) || a.title.localeCompare(b.title);
        case 'date-modified-asc': return !a.modifiedDate ? (!b.modifiedDate ? a.title.localeCompare(b.title) : 1) : !b.modifiedDate ? -1 : a.modifiedDate.localeCompare(b.modifiedDate) || a.title.localeCompare(b.title);
        case 'date-modified-desc': return !a.modifiedDate ? (!b.modifiedDate ? a.title.localeCompare(b.title) : 1) : !b.modifiedDate ? -1 : b.modifiedDate.localeCompare(a.modifiedDate) || a.title.localeCompare(b.title);
        default: return a.title.localeCompare(b.title);
      }
    });
    return result;
  }, [movies, selectedCategory, selectedAlphabets, searchQuery, typeToSearchPrefix, activeMetadataFilter, sortBy]);

  useEffect(() => {
    if (!typeToSearchPrefix || activePage !== 'library' || selectedMovie || selectedActorName) return;
    const targetIndex = filteredAndSortedMovies.findIndex((movie) => movie.title.trim().toLowerCase().startsWith(typeToSearchPrefix));
    if (targetIndex < 0) return;
    const frame = window.requestAnimationFrame(() => {
      const targetTitle = filteredAndSortedMovies[targetIndex].title.trim().toLowerCase();
      const item = Array.from(document.querySelectorAll<HTMLElement>('[data-keyboard-title]')).find((el) => el.dataset.keyboardTitle === targetTitle);
      if (item) { item.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      const viewport = document.querySelector<HTMLElement>('[data-movie-scroll-viewport]');
      if (!viewport) return;
      if (viewMode === 'grid') viewport.scrollTo({ top: Math.max(0, Math.floor(targetIndex / gridCols) * 340), behavior: 'smooth' });
      else if (viewMode === 'cover') {
        const width = viewport.clientWidth || 1200;
        const rowHeight = ((width - 8 * (movieCoverCols - 1)) / movieCoverCols) * 1.5 + 8;
        viewport.scrollTo({ top: Math.max(0, Math.floor(targetIndex / movieCoverCols) * rowHeight), behavior: 'smooth' });
      } else {
        const row = document.querySelector<HTMLElement>(`[data-keyboard-title="${CSS.escape(targetTitle)}"]`);
        row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [typeToSearchPrefix, activePage, selectedMovie, selectedActorName, filteredAndSortedMovies, viewMode, gridCols, movieCoverCols]);

  const movieDetailNavigationMovies = useMemo(() => {
    if (!selectedMovie) return filteredAndSortedMovies;
    return filteredAndSortedMovies.some((movie) => movie.id === selectedMovie.id) ? filteredAndSortedMovies : movies;
  }, [filteredAndSortedMovies, movies, selectedMovie]);

  const actorNames = useMemo(() => {
    // The Actor menu and the add-film actor suggestions must share the same
    // canonical list. Never surface names that have a persisted deletion tombstone.
    const deletedNames = new Set(getDeletedActorNames().map((name) => name.trim().toLowerCase()));
    const names = new Map<string, string>();
    [...masterActors, ...movies.flatMap((movie) => movie.actors)].forEach((name) => {
      const trimmed = name.trim();
      const key = trimmed.toLowerCase();
      if (trimmed && key !== 'cast' && !deletedNames.has(key) && !names.has(key)) names.set(key, trimmed);
    });
    return [...names.values()].sort((a, b) => a.localeCompare(b));
  }, [movies, masterActors, actorProfileRevision]);

  const isFiltered = selectedCategory !== 'All' || (!selectedAlphabets.includes('All') && selectedAlphabets.length > 0) || searchQuery.trim() !== '' || activeMetadataFilter !== null || filteredAndSortedMovies.length !== movies.length;
  const selectedMovieCount = movies.filter((movie) => selectedMovieIds.has(movie.id)).length;

  return (
    <div className="min-h-screen bg-[#08090d] text-zinc-100 flex flex-col font-sans pb-24 selection:bg-amber-400 selection:text-black w-full max-w-full overflow-x-clip">
      <Navbar activePage={activePage} setActivePage={handleNavigatePage} movies={movies} filteredMovies={filteredAndSortedMovies} isFiltered={isFiltered} onTriggerAdd={handleTriggerAdd} />
      {actionNotification && (
        <div ref={actionNotificationRef} role="status" className="fixed left-1/2 top-[68px] z-[70] flex w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 flex-wrap items-center gap-3 rounded-xl border border-zinc-700 bg-[#151926]/95 px-4 py-3 text-sm text-zinc-100 shadow-xl backdrop-blur-md">
          <span className="min-w-0 flex-1">{actionNotification.message}</span>
          {actionNotification.action && <button type="button" onClick={actionNotification.action.onClick} className="rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/10">{actionNotification.action.label}</button>}
          <button type="button" onClick={() => { if (actionNotificationTimer.current !== null) { clearTimeout(actionNotificationTimer.current); actionNotificationTimer.current = null; } setActionNotification(null); }} className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
      )}
      <main className="flex-1 w-full max-w-none px-3 sm:px-4 py-3 sm:py-4 overflow-x-clip">
        {activePage === 'library' && (
          <div className="w-full min-w-0 space-y-2">
            <div className="sticky top-[56px] z-20 -mx-3 space-y-3 border-b border-zinc-800/80 bg-[#08090d]/95 px-3 py-2 backdrop-blur-md sm:top-[60px] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              <FilterToolbar viewMode={viewMode} setViewMode={setViewMode} gridCols={gridCols} setGridCols={setGridCols} selectedCategory={selectedCategory} genreOptions={availableGenres} setSelectedCategory={setSelectedCategory} selectedAlphabets={selectedAlphabets} onToggleAlphabet={handleToggleAlphabet} searchQuery={searchQuery} setSearchQuery={(value) => { setTypeToSearchPrefix(null); setSearchQuery(value); }} sortBy={sortBy} setSortBy={setSortBy} activeMetadataFilter={activeMetadataFilter} clearActiveMetadataFilter={handleClearMetadataFilter} totalFilteredCount={filteredAndSortedMovies.length} totalCatalogCount={movies.length} />
              {selectedMovieCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-[#121520] p-2.5 sm:p-3">
                  <span className="text-xs text-zinc-400">{selectedMovieCount} selected</span>
                  <button type="button" onClick={() => handleUpdateSelectedMovies({ favorite: true })} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"><Star className="h-3.5 w-3.5" />Add to favorites</button>
                  <button type="button" onClick={() => handleUpdateSelectedMovies({ reviewed: true })} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"><Check className="h-3.5 w-3.5" />Mark reviewed</button>
                  <button type="button" onClick={handleDeleteSelectedMovies} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"><Trash2 className="h-3.5 w-3.5" />Delete selected</button>
                  <button type="button" onClick={() => setSelectedMovieIds(new Set())} className="inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-white"><X className="h-3.5 w-3.5" />Clear</button>
                </div>
              )}
            </div>
            {viewMode === 'grid' ? (
              <MovieGrid movies={filteredAndSortedMovies} onSelectMovie={setSelectedMovie} selectedMovieIds={selectedMovieIds} onToggleMovieSelection={handleToggleMovieSelection} onSelectMultipleMovies={handleSelectMultipleMovies} selectionMode={selectedMovieCount > 0} cols={gridCols} />
            ) : viewMode === 'list' ? (
              <MovieList movies={filteredAndSortedMovies} catalogMovies={movies} onSelectMovie={setSelectedMovie} onUpdateMovie={handleUpdateMovieFromList} selectedMovieIds={selectedMovieIds} onToggleMovieSelection={handleToggleMovieSelection} selectionMode={selectedMovieCount > 0} sortBy={sortBy} onToggleSort={handleToggleListSort} />
            ) : (
              <MovieCoverGrid movies={filteredAndSortedMovies} onSelectMovie={setSelectedMovie} selectedMovieIds={selectedMovieIds} onToggleMovieSelection={handleToggleMovieSelection} selectionMode={selectedMovieCount > 0} cols={movieCoverCols} onColsChange={setMovieCoverCols} />
            )}
          </div>
        )}
        {activePage === 'actors' && (
          <ActorsPage movies={movies} viewMode={viewMode} actorProfileRevision={actorProfileRevision} keyboardAlphabetEnabled={!selectedActorName && !selectedMovie} onOpenActorDetail={(name) => setSelectedActorName(name)} onSelectMovie={(movie) => setSelectedMovie(movie)} onDeleteActors={handleDeleteActors} onNotify={showActionNotification} onTriggerAddActor={() => handleTriggerAdd('actor')} onUpdateActor={(oldName, updatedProfile) => { handleUpdateActor(oldName, updatedProfile); setSelectedActorName(null); }} onActorProfilesChanged={(actorNames) => { if (sharedCatalogStatus !== 'connected') return; enqueueSharedActorUpdate(async () => { for (const actorName of actorNames) { await saveSharedActor(getActorProfile(actorName)); } }); }} />
        )}
        {activePage === 'add' && (
          <AddMoviePage
            initialTab={addTab}
            existingMovies={movies}
            existingGenres={availableGenres}
            existingStudios={masterStudios}
            existingActors={actorNames}
            onAddMovie={handleAddMovie}
            onDeleteMovie={handleDeleteMovie}
            onDeleteActors={handleDeleteActors}
            onDeleteStudio={handleDeleteStudio}
            onDeleteGenre={handleDeleteGenre}
            onAddActorSuccess={(actorName) => { if (sharedCatalogStatus === 'connected') { const actorProfile = getActorProfile(actorName); enqueueSharedActorUpdate(() => saveSharedActor(actorProfile)); } setSelectedActorName(actorName); setActivePage('actors'); }}
            onAddStudioSuccess={(studioName) => { handleFilterByAttribute('studio', studioName); }}
            onCancel={() => setActivePage('library')}
          />
        )}
        {activePage === 'settings' && (
          <SettingsPage movies={movies} sharedCatalogToken={''} sharedCatalogStatus={sharedCatalogStatus} sharedCatalogError={sharedCatalogError} onConnectSharedCatalog={() => {}} onDisconnectSharedCatalog={() => {}} onInitializeSharedCatalog={handleInitializeSharedCatalog} onSaveSharedCatalog={handleSaveSharedCatalog} onRefreshSharedCatalog={handleRefreshSharedCatalog} onDeleteAllDatabase={handleDeleteAllDatabase} onImportMovies={handleImportMovies} onImportActors={(profiles) => { for (const profile of profiles) { const existingName = Object.keys(getCustomActors()).find((name) => name.trim().toLowerCase() === profile.name.trim().toLowerCase()) || profile.name; handleUpdateActor(existingName, { ...profile, name: profile.name }); } }} onDeleteMovie={handleDeleteMovie} onBulkDeleteMovies={handleBulkDeleteMovies} onMergeActors={handleMergeActors} onResetCatalog={handleResetCatalog} onSelectMovie={setSelectedMovie} />
        )}
      </main>
      <MovieDetailModal movie={selectedMovie} movies={movieDetailNavigationMovies} onClose={handleCloseMovieDetail} onNavigateMovie={setSelectedMovie} onFilterByAttribute={handleFilterByAttribute} onSelectActor={(actorName) => { setSelectedMovie(null); setSelectedActorName(actorName); }} onUpdateMovie={handleUpdateMovie} onDeleteMovie={handleDeleteMovie} onNotify={showActionNotification} />
      <ActorDetailModal actorName={selectedActorName} actorNames={actorNames} movies={movies} onClose={handleCloseActorDetail} onNavigateActor={setSelectedActorName} onSelectMovie={(movie) => { setSelectedActorName(null); setSelectedMovie(movie); }} onUpdateActor={handleUpdateActor} />
      <footer className="mt-auto py-6 border-t border-zinc-800/60 text-center text-xs text-zinc-500">
        <div className="w-full px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2"><span>CineVault Dark Movie Catalog</span><span aria-hidden="true">·</span><span>{movies.length} Master titles in library</span></div>

        </div>
      </footer>
      <BottomNav activePage={activePage} setActivePage={handleNavigatePage} moviesCount={movies.length} actorsCount={actorsCount} onTriggerAdd={handleTriggerAdd} />
    </div>
  );
}