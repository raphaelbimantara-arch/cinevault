/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { ActorProfile, removeCustomActors, updateActorProfile } from './data/actorsData';
import { Movie, ViewMode, ActivePage, SortOption, ActiveFilter } from './types';
import { Check, RotateCcw, Star, Trash2, X } from 'lucide-react';
import { loadSharedCatalog, saveSharedCatalog } from './utils/sharedCatalog';
import { getMovieGenres } from './utils/movieGenres';

const STORAGE_KEY = 'cinevault_movies_library_v2';
const SHARED_TOKEN_STORAGE_KEY = 'cinevault_shared_catalog_token_v1';
type SharedCatalogStatus = 'disconnected' | 'loading' | 'connected' | 'empty' | 'error';
type ActionNotification = {
  message: string;
  action?: { label: string; onClick: () => void };
};

function readSharedToken(): string {
  try {
    return localStorage.getItem(SHARED_TOKEN_STORAGE_KEY) || '';
  } catch (error) {
    console.error('Failed to read shared catalog access key:', error);
    return '';
  }
}

export default function App() {
  // Load movies from localStorage or initial sample
  const [movies, setMovies] = useState<Movie[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading stored movies:', e);
    }
    return INITIAL_MOVIES;
  });
  const [sharedToken, setSharedToken] = useState(readSharedToken);
  const [sharedCatalogStatus, setSharedCatalogStatus] = useState<SharedCatalogStatus>(
    () => (readSharedToken() ? 'loading' : 'disconnected')
  );
  const [sharedCatalogError, setSharedCatalogError] = useState('');
  const [sharedCatalogReload, setSharedCatalogReload] = useState(0);
  const sharedCatalogSaveQueue = useRef<Promise<void>>(Promise.resolve());

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
    } catch (e) {
      console.error('Failed to save movies:', e);
    }
  }, [movies]);

  useEffect(() => {
    if (!sharedToken) {
      setSharedCatalogStatus('disconnected');
      return;
    }

    let cancelled = false;
    setSharedCatalogStatus('loading');
    setSharedCatalogError('');

    loadSharedCatalog(sharedToken)
      .then((sharedMovies) => {
        if (cancelled) return;
        if (sharedMovies.length > 0) {
          setMovies(sharedMovies);
          setSelectedMovieIds(new Set());
          setSharedCatalogStatus('connected');
        } else {
          setSharedCatalogStatus('empty');
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Failed to load shared catalog:', error);
        setSharedCatalogError(error instanceof Error ? error.message : 'Unable to load shared catalog.');
        setSharedCatalogStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [sharedToken, sharedCatalogReload]);

  useEffect(() => {
    if (!sharedToken || sharedCatalogStatus !== 'connected') return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      sharedCatalogSaveQueue.current = sharedCatalogSaveQueue.current
        .then(() => saveSharedCatalog(sharedToken, movies))
        .then(() => {
          if (!cancelled) setSharedCatalogError('');
        })
        .catch((error: unknown) => {
          console.error('Failed to save shared catalog:', error);
          if (!cancelled) {
            setSharedCatalogError(
              error instanceof Error ? error.message : 'Unable to save shared catalog.'
            );
          }
        });
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [movies, sharedToken, sharedCatalogStatus]);

  const handleConnectSharedCatalog = (token: string) => {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      setSharedCatalogError('Enter the Google Sheets access key.');
      return;
    }
    try {
      localStorage.setItem(SHARED_TOKEN_STORAGE_KEY, trimmedToken);
      setSharedCatalogError('');
      setSharedToken(trimmedToken);
      setSharedCatalogReload((reload) => reload + 1);
    } catch (error) {
      console.error('Failed to store shared catalog access key:', error);
      setSharedCatalogError('Unable to save the access key on this device.');
      setSharedCatalogStatus('error');
    }
  };

  const handleDisconnectSharedCatalog = () => {
    try {
      localStorage.removeItem(SHARED_TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to remove shared catalog access key:', error);
    }
    setSharedToken('');
    setSharedCatalogError('');
    setSharedCatalogStatus('disconnected');
  };

  const handleInitializeSharedCatalog = async () => {
    if (!sharedToken) return;
    setSharedCatalogStatus('loading');
    setSharedCatalogError('');
    try {
      await saveSharedCatalog(sharedToken, movies);
      setSharedCatalogStatus('connected');
    } catch (error) {
      console.error('Failed to initialize shared catalog:', error);
      setSharedCatalogError(
        error instanceof Error ? error.message : 'Unable to initialize shared catalog.'
      );
      setSharedCatalogStatus('empty');
    }
  };

  // Active page for bottom navigation
  const [activePage, setActivePage] = useState<ActivePage>('library');

  // Contextual Add tab: 'movie' | 'actor' | 'studio'
  const [addTab, setAddTab] = useState<'movie' | 'actor' | 'studio'>('movie');

  // Selected movie for detail modal
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedMovieIds, setSelectedMovieIds] = useState<Set<string>>(() => new Set());
  const [actionNotification, setActionNotification] = useState<ActionNotification | null>(null);
  const actionNotificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionNotificationRef = useRef<HTMLDivElement | null>(null);

  // Selected actor for actor detail modal
  const [selectedActorName, setSelectedActorName] = useState<string | null>(null);

  const showActionNotification = (
    message: string,
    action?: ActionNotification['action']
  ) => {
    if (actionNotificationTimer.current !== null) {
      clearTimeout(actionNotificationTimer.current);
    }
    setActionNotification({ message, action });
    actionNotificationTimer.current = setTimeout(() => {
      setActionNotification(null);
      actionNotificationTimer.current = null;
    }, 5000);
  };

  useEffect(() => () => {
    if (actionNotificationTimer.current !== null) clearTimeout(actionNotificationTimer.current);
  }, []);

  useEffect(() => {
    if (!actionNotification) return;
    const dismissOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && actionNotificationRef.current?.contains(event.target)) return;
      if (actionNotificationTimer.current !== null) {
        clearTimeout(actionNotificationTimer.current);
        actionNotificationTimer.current = null;
      }
      setActionNotification(null);
    };
    document.addEventListener('pointerdown', dismissOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', dismissOnOutsidePointer);
  }, [actionNotification]);

  // Selected studio for studio detail modal

  // Navigation handler that keeps bottom menu responsive and closes modals when switching tabs
  const handleNavigatePage = (page: ActivePage) => {
    setSelectedMovie(null);
    setSelectedActorName(null);
    setActivePage(page);
  };

  const handleTriggerAdd = (tab: 'movie' | 'actor' | 'studio' = 'movie') => {
    setSelectedMovie(null);
    setSelectedActorName(null);
    setAddTab(tab);
    setActivePage('add');
  };

  // View mode: 'grid' or 'list'
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Short menu: category
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const availableGenres = useMemo(() => {
    const genres = new Map<string, string>();
    [...ALL_GENRES, ...movies.flatMap((movie) => getMovieGenres(movie.genre))].forEach((genre) => {
      const normalized = genre.trim().toLowerCase();
      if (normalized && normalized !== 'all' && !genres.has(normalized)) {
        genres.set(normalized, genre.trim());
      }
    });
    return [...genres.values()].sort((a, b) => a.localeCompare(b));
  }, [movies]);

  // Alphabet multi-select filter
  const [selectedAlphabets, setSelectedAlphabets] = useState<string[]>(['All']);

  const handleToggleAlphabet = (char: string) => {
    if (char === 'All') {
      setSelectedAlphabets(['All']);
      return;
    }
    setSelectedAlphabets((prev) => {
      const isAll = prev.includes('All');
      if (isAll) {
        return [char];
      }
      if (prev.includes(char)) {
        const next = prev.filter((c) => c !== char);
        return next.length === 0 ? ['All'] : next;
      }
      return [...prev, char];
    });
  };

  // Search query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sort option: Alphabetical A-Z by default as requested!
  const [sortBy, setSortBy] = useState<SortOption>('alphabet-asc');

  // Active detail filter (when user clicks genre, studio, year, minutes, or size)
  const [activeMetadataFilter, setActiveMetadataFilter] = useState<ActiveFilter | null>(null);


  // Compute unique actors count
  const actorsCount = useMemo(() => {
    const set = new Set<string>();
    movies.forEach((m) => m.actors.forEach((a) => set.add(a.trim())));
    return set.size;
  }, [movies]);

  /**
   * CORE INTERACTION HANDLER:
   * "and if i clik genre, studio, year, minutes, size, it show the library with list or grid view,
   *  and short menu with all categories with aplphabet as default."
   */
  const handleFilterByAttribute = (
    type: 'genre' | 'studio' | 'year' | 'minutes' | 'size',
    value: string | number
  ) => {
    // 1. Close detail modal so library is immediately shown
    setSelectedMovie(null);

    // 2. Navigate directly to the library view
    setActivePage('library');

    // 3. Set sorting to Alphabetical (A-Z) by default!
    setSortBy('alphabet-asc');

    // 4. Reset alphabet & search query to clear conflicting narrow constraints
    setSelectedAlphabets(['All']);
    setSearchQuery('');

    // 5. Apply the specific filter
    if (type === 'genre') {
      const genreVal = String(value);
      setSelectedCategory(genreVal);
      setActiveMetadataFilter({
        type: 'genre',
        label: 'Genre',
        value: genreVal,
      });
    } else if (type === 'studio') {
      setSelectedCategory('All');
      setActiveMetadataFilter({
        type: 'studio',
        label: 'Studio',
        value: String(value),
      });
    } else if (type === 'year') {
      setSelectedCategory('All');
      setActiveMetadataFilter({
        type: 'year',
        label: 'Release Year',
        value: Number(value),
      });
    } else if (type === 'minutes') {
      setSelectedCategory('All');
      const targetMins = Number(value);
      setActiveMetadataFilter({
        type: 'minutes',
        label: 'Duration Bracket',
        value: `${targetMins} min (±20m)`,
      });
    } else if (type === 'size') {
      setSelectedCategory('All');
      const sizeStr = String(value);
      setActiveMetadataFilter({
        type: 'size',
        label: 'File Size',
        value: sizeStr,
      });
    }
  };

  // Quick handler to filter catalog by actor from Actors Page or Modal
  const handleFilterByActor = (actorName: string) => {
    setSelectedMovie(null);
    setActivePage('library');
    setSortBy('alphabet-asc');
    setSelectedAlphabets(['All']);
    setSelectedCategory('All');
    setActiveMetadataFilter({
      type: 'actor',
      label: 'Starring Actor',
      value: actorName,
    });
  };

  // Quick handler to filter catalog by studio
  const handleFilterByStudio = (studioName: string) => {
    handleFilterByAttribute('studio', studioName);
  };

  // Clear metadata filter
  const handleClearMetadataFilter = () => {
    setActiveMetadataFilter(null);
  };

  // Add new movie handler
  const handleAddMovie = (newMovie: Movie) => {
    setMovies((prev) => [newMovie, ...prev]);
    // Navigate to library view with default alphabetical sort
    setActivePage('library');
    setSortBy('alphabet-asc');
    setActiveMetadataFilter(null);
  };

  // Delete movie handler
  const handleDeleteMovie = (id: string) => {
    setMovies((prev) => prev.filter((m) => m.id !== id));
    showActionNotification('Film berhasil dihapus.');
    setSelectedMovieIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Bulk delete movies (for duplicate finder cleanup)
  const handleBulkDeleteMovies = (movieIds: string[]) => {
    if (movieIds.length === 0) return;
    const idSet = new Set(movieIds);
    setMovies((prev) => prev.filter((m) => !idSet.has(m.id)));
    setSelectedMovieIds((prev) => new Set([...prev].filter((id) => !idSet.has(id))));
    showActionNotification(`${movieIds.length} film berhasil dihapus.`);
  };

  const handleToggleMovieSelection = (movieId: string) => {
    setSelectedMovieIds((prev) => {
      const next = new Set(prev);
      if (next.has(movieId)) {
        next.delete(movieId);
      } else {
        next.add(movieId);
      }
      return next;
    });
  };

  const handleDeleteSelectedMovies = () => {
    const idsToDelete = movies
      .filter((movie) => selectedMovieIds.has(movie.id))
      .map((movie) => movie.id);
    if (idsToDelete.length === 0) return;
    if (!window.confirm(`Delete ${idsToDelete.length} selected movie(s)? This cannot be undone.`)) return;
    handleBulkDeleteMovies(idsToDelete);
    setSelectedMovieIds(new Set());
  };

  const handleUpdateSelectedMovies = (updates: Pick<Movie, 'favorite' | 'reviewed'>) => {
    const field = updates.favorite !== undefined ? 'favorite' : 'reviewed';
    const label = field === 'favorite' ? 'favorite' : 'reviewed';
    const selectedMovies = movies.filter((movie) => selectedMovieIds.has(movie.id));
    const alreadyMarked = selectedMovies
      .filter((movie) => movie[field] === true)
      .map((movie) => movie.id);
    const newlyMarkedCount = selectedMovies.length - alreadyMarked.length;
    setMovies((prev) =>
      prev.map((movie) => selectedMovieIds.has(movie.id) ? { ...movie, ...updates } : movie)
    );
    const message = alreadyMarked.length > 0
        ? `${newlyMarkedCount} film ditandai ${label}; ${alreadyMarked.length} sudah ${label}.`
        : `${newlyMarkedCount} film ditandai ${label}.`;
    showActionNotification(
      message,
      alreadyMarked.length > 0
        ? {
            label: field === 'favorite' ? 'Keluarkan dari favorite' : 'Hapus tanda review',
            onClick: () => handleRemoveSelectedMovieStatus(field, alreadyMarked),
          }
        : undefined
    );
    setSelectedMovieIds(new Set());
  };

  const handleRemoveSelectedMovieStatus = (field: 'favorite' | 'reviewed', movieIds: string[]) => {
    const ids = new Set(movieIds);
    setMovies((prev) => prev.map((movie) => {
      if (!ids.has(movie.id)) return movie;
      return field === 'favorite'
        ? { ...movie, favorite: false }
        : { ...movie, reviewed: false };
    }));
    showActionNotification(
      `${movieIds.length} film dikeluarkan dari ${field === 'favorite' ? 'favorite' : 'review'}.`
    );
  };

  // Update complete movie handler
  const handleUpdateMovie = (updatedMovie: Movie) => {
    setMovies((prev) =>
      prev.map((m) => (m.id === updatedMovie.id ? updatedMovie : m))
    );
    setSelectedMovie(updatedMovie);
  };

  const handleUpdateMovieFromList = (updatedMovie: Movie) => {
    setMovies((prev) =>
      prev.map((movie) => (movie.id === updatedMovie.id ? updatedMovie : movie))
    );
  };

  const handleToggleListTitleSort = () => {
    setSortBy((current) => current === 'alphabet-asc' ? 'alphabet-desc' : 'alphabet-asc');
  };

  // Update actor profile handler
  const handleUpdateActor = (oldName: string, updatedProfile: ActorProfile) => {
    updateActorProfile(oldName, updatedProfile);
    const oldTrimmed = oldName.trim();
    const newTrimmed = updatedProfile.name.trim();

    if (oldTrimmed.toLowerCase() !== newTrimmed.toLowerCase()) {
      setMovies((prev) =>
        prev.map((m) => {
          if (m.actors.some((a) => a.trim().toLowerCase() === oldTrimmed.toLowerCase())) {
            return {
              ...m,
              actors: m.actors.map((a) =>
                a.trim().toLowerCase() === oldTrimmed.toLowerCase() ? newTrimmed : a
              ),
            };
          }
          return m;
        })
      );
      setSelectedActorName(newTrimmed);
    }
  };

  const handleDeleteActors = (actorNames: string[]) => {
    const namesToDelete = new Set(actorNames.map((name) => name.trim().toLowerCase()));
    removeCustomActors(actorNames);
    setMovies((prev) =>
      prev.map((movie) => ({
        ...movie,
        actors: movie.actors.filter((name) => !namesToDelete.has(name.trim().toLowerCase())),
      }))
    );
    setSelectedActorName((current) =>
      current && namesToDelete.has(current.trim().toLowerCase()) ? null : current
    );
  };

  // Import movies from CSV handler
  const handleImportMovies = (imported: Movie[], mode: 'merge' | 'replace') => {
    if (mode === 'replace') {
      setMovies(imported);
      setSelectedMovieIds(new Set());
    } else {
      setMovies((prev) => {
        const existingMap = new Map<string, Movie>();
        prev.forEach((m) => existingMap.set(m.id, m));
        const titleMap = new Map<string, Movie>();
        prev.forEach((m) => titleMap.set(m.title.toLowerCase().trim(), m));

        imported.forEach((m) => {
          const lowerTitle = m.title.toLowerCase().trim();
          if (m.id && existingMap.has(m.id)) {
            // Update existing movie matching by ID
            const existing = existingMap.get(m.id)!;
            existingMap.set(m.id, { ...existing, ...m, id: m.id });
          } else if (titleMap.has(lowerTitle)) {
            // Update existing movie matching by Title
            const existing = titleMap.get(lowerTitle)!;
            existingMap.set(existing.id, { ...existing, ...m, id: existing.id });
          } else {
            // Append as new movie
            existingMap.set(m.id, m);
          }
        });

        return Array.from(existingMap.values());
      });
    }
  };

  // Reset to default initial catalog
  const handleResetCatalog = () => {
    if (window.confirm('Reset movie catalog to original default library?')) {
      setMovies(INITIAL_MOVIES);
      setSelectedMovieIds(new Set());
      localStorage.removeItem(STORAGE_KEY);
      setActiveMetadataFilter(null);
      setSelectedCategory('All');
      setSelectedAlphabets(['All']);
      setSearchQuery('');
      setSortBy('alphabet-asc');
    }
  };

  // Filter and sort movies pipeline
  const filteredAndSortedMovies = useMemo(() => {
    let result = [...movies];

    // 1. Filter by category
    if (selectedCategory !== 'All') {
      result = selectedCategory === '__favorites__'
        ? result.filter((movie) => movie.favorite === true)
        : selectedCategory === '__reviewed__'
          ? result.filter((movie) => movie.reviewed === true)
          : result.filter(
            (movie) => getMovieGenres(movie.genre).some((genre) => genre.toLowerCase() === selectedCategory.toLowerCase())
          );
    }

    // 2. Filter by Alphabet (supports multiple letters)
    if (!selectedAlphabets.includes('All') && selectedAlphabets.length > 0) {
      result = result.filter((m) => {
        return selectedAlphabets.some((char) => {
          if (char === '#') {
            return !/^[a-zA-Z]/i.test(m.title);
          }
          return m.title.toUpperCase().startsWith(char.toUpperCase());
        });
      });
    }

    // 3. Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.genre.toLowerCase().includes(q) ||
          m.studio.toLowerCase().includes(q) ||
          m.actors.some((a) => a.toLowerCase().includes(q)) ||
          String(m.year).includes(q)
      );
    }

    // 4. Filter by active metadata filter
    if (activeMetadataFilter) {
      const { type, value } = activeMetadataFilter;
      if (type === 'genre') {
        result = result.filter(
          (m) => getMovieGenres(m.genre).some((genre) => genre.toLowerCase() === String(value).toLowerCase())
        );
      } else if (type === 'studio') {
        result = result.filter(
          (m) => m.studio.toLowerCase() === String(value).toLowerCase()
        );
      } else if (type === 'year') {
        result = result.filter((m) => m.year === Number(value));
      } else if (type === 'minutes') {
        // e.g. "128 min (±20m)" -> extract target number
        const target = parseInt(String(value), 10);
        if (!isNaN(target)) {
          result = result.filter(
            (m) => m.minutes >= target - 20 && m.minutes <= target + 20
          );
        }
      } else if (type === 'size') {
        const valStr = String(value);
        const parsedValMB = parseFloat(valStr) * (valStr.includes('TB') ? 1000000 : 1000);
        // Match movies with similar size range (+- 40%) or matching string tier
        result = result.filter((m) => {
          if (m.size === valStr) return true;
          if (m.sizeBytes && parsedValMB) {
            return (
              m.sizeBytes >= parsedValMB * 0.6 &&
              m.sizeBytes <= parsedValMB * 1.5
            );
          }
          return m.size.toLowerCase().includes(valStr.toLowerCase());
        });
      } else if (type === 'actor') {
        result = result.filter((m) =>
          m.actors.some(
            (a) => a.toLowerCase() === String(value).toLowerCase()
          )
        );
      }
    }

    // 5. Sort movies (Alphabetical A-Z by default)
    result.sort((a, b) => {
      switch (sortBy) {
        case 'alphabet-asc':
          return a.title.localeCompare(b.title, undefined, { numeric: true });
        case 'alphabet-desc':
          return b.title.localeCompare(a.title, undefined, { numeric: true });
        case 'year-desc':
          return b.year - a.year;
        case 'year-asc':
          return a.year - b.year;
        case 'minutes-desc':
          return b.minutes - a.minutes;
        case 'minutes-asc':
          return a.minutes - b.minutes;
        case 'size-desc':
          return (b.sizeBytes || 0) - (a.sizeBytes || 0);
        case 'size-asc':
          return (a.sizeBytes || 0) - (b.sizeBytes || 0);
        case 'actor-asc':
          return (a.actors[0] || '').localeCompare(b.actors[0] || '');
        case 'actor-desc':
          return (b.actors[0] || '').localeCompare(a.actors[0] || '');
        case 'quality-desc':
          return (b.resolution || '').localeCompare(a.resolution || '');
        case 'quality-asc':
          return (a.resolution || '').localeCompare(b.resolution || '');
        default:
          return a.title.localeCompare(b.title);
      }
    });

    return result;
  }, [
    movies,
    selectedCategory,
    selectedAlphabets,
    searchQuery,
    activeMetadataFilter,
    sortBy,
  ]);

  const movieDetailNavigationMovies = useMemo(() => {
    if (!selectedMovie) return filteredAndSortedMovies;
    return filteredAndSortedMovies.some((movie) => movie.id === selectedMovie.id)
      ? filteredAndSortedMovies
      : movies;
  }, [filteredAndSortedMovies, movies, selectedMovie]);

  const actorNames = useMemo(() => {
    const names = new Map<string, string>();
    movies.flatMap((movie) => movie.actors).forEach((name) => {
      const trimmed = name.trim();
      if (trimmed && trimmed.toLowerCase() !== 'cast' && !names.has(trimmed.toLowerCase())) {
        names.set(trimmed.toLowerCase(), trimmed);
      }
    });
    return [...names.values()].sort((a, b) => a.localeCompare(b));
  }, [movies]);

  // Check if any filter is active
  const isFiltered =
    selectedCategory !== 'All' ||
    (!selectedAlphabets.includes('All') && selectedAlphabets.length > 0) ||
    searchQuery.trim() !== '' ||
    activeMetadataFilter !== null ||
    filteredAndSortedMovies.length !== movies.length;
  const selectedMovieCount = movies.filter((movie) => selectedMovieIds.has(movie.id)).length;

  return (
    <div className="min-h-screen bg-[#08090d] text-zinc-100 flex flex-col font-sans pb-24 selection:bg-amber-400 selection:text-black w-full max-w-full overflow-x-clip">
      {/* Top Bar Header */}
      <Navbar
        activePage={activePage}
        setActivePage={handleNavigatePage}
        movies={movies}
        filteredMovies={filteredAndSortedMovies}
        isFiltered={isFiltered}
        onTriggerAdd={handleTriggerAdd}
      />

      {actionNotification && (
        <div
          ref={actionNotificationRef}
          role="status"
          className="fixed left-1/2 top-[68px] z-[70] flex w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 flex-wrap items-center gap-3 rounded-xl border border-zinc-700 bg-[#151926]/95 px-4 py-3 text-sm text-zinc-100 shadow-xl backdrop-blur-md"
        >
          <span className="min-w-0 flex-1">{actionNotification.message}</span>
          {actionNotification.action && (
            <button
              type="button"
              onClick={actionNotification.action.onClick}
              className="rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/10"
            >
              {actionNotification.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (actionNotificationTimer.current !== null) {
                clearTimeout(actionNotificationTimer.current);
                actionNotificationTimer.current = null;
              }
              setActionNotification(null);
            }}
            aria-label="Tutup pemberitahuan"
            className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-clip">
        {activePage === 'library' && (
          <div className="space-y-6">
            <div className="sticky top-[56px] z-20 -mx-3 space-y-3 border-b border-zinc-800/80 bg-[#08090d]/95 px-3 py-2 backdrop-blur-md sm:top-[60px] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              {/* Short menu with all categories, Alphabet bar, Search, Sort, View Toggle */}
              <FilterToolbar
                viewMode={viewMode}
                setViewMode={setViewMode}
                selectedCategory={selectedCategory}
                genreOptions={availableGenres}
                setSelectedCategory={setSelectedCategory}
                selectedAlphabets={selectedAlphabets}
                onToggleAlphabet={handleToggleAlphabet}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                sortBy={sortBy}
                setSortBy={setSortBy}
                activeMetadataFilter={activeMetadataFilter}
                clearActiveMetadataFilter={handleClearMetadataFilter}
                totalFilteredCount={filteredAndSortedMovies.length}
                totalCatalogCount={movies.length}
              />

              {selectedMovieCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-[#121520] p-2.5 sm:p-3">
                  <span className="text-xs text-zinc-400">{selectedMovieCount} selected</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateSelectedMovies({ favorite: true })}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/20"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Add to favorites
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSelectedMovies({ reviewed: true })}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Mark reviewed
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteSelectedMovies}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete selected
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMovieIds(new Set())}
                    className="inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                    aria-label="Clear selected movies"
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Movies Display: Grid or List or Cover View */}
            {viewMode === 'grid' ? (
              <MovieGrid
                movies={filteredAndSortedMovies}
                onSelectMovie={setSelectedMovie}
                selectedMovieIds={selectedMovieIds}
                onToggleMovieSelection={handleToggleMovieSelection}
                selectionMode={selectedMovieCount > 0}
              />
            ) : viewMode === 'list' ? (
              <MovieList
                movies={filteredAndSortedMovies}
                onSelectMovie={setSelectedMovie}
                onUpdateMovie={handleUpdateMovieFromList}
                selectedMovieIds={selectedMovieIds}
                onToggleMovieSelection={handleToggleMovieSelection}
                selectionMode={selectedMovieCount > 0}
                sortDirection={sortBy === 'alphabet-asc' ? 'asc' : sortBy === 'alphabet-desc' ? 'desc' : null}
                onToggleTitleSort={handleToggleListTitleSort}
              />
            ) : (
              <MovieCoverGrid
                movies={filteredAndSortedMovies}
                onSelectMovie={setSelectedMovie}
                selectedMovieIds={selectedMovieIds}
                onToggleMovieSelection={handleToggleMovieSelection}
                selectionMode={selectedMovieCount > 0}
              />
            )}
          </div>
        )}

        {/* Page 2: Actors */}
        {activePage === 'actors' && (
          <ActorsPage
            movies={movies}
            viewMode={viewMode}
            onOpenActorDetail={(name) => setSelectedActorName(name)}
            onDeleteActors={handleDeleteActors}
            onNotify={showActionNotification}
            onTriggerAddActor={() => handleTriggerAdd('actor')}
          />
        )}

        {/* Page 3: Add Movies / Actors / Studios Data */}
        {activePage === 'add' && (
          <AddMoviePage
            initialTab={addTab}
            existingMovies={movies}
            onAddMovie={handleAddMovie}
            onAddActorSuccess={(actorName) => {
              setSelectedActorName(actorName);
              setActivePage('actors');
            }}
            onAddStudioSuccess={(studioName) => {
              handleFilterByAttribute('studio', studioName);
            }}
            onCancel={() => setActivePage('library')}
          />
        )}

        {/* Page 5: Settings (CSV Export/Import & Duplicate Finder) */}
        {activePage === 'settings' && (
          <SettingsPage
            movies={movies}
            sharedCatalogToken={sharedToken}
            sharedCatalogStatus={sharedCatalogStatus}
            sharedCatalogError={sharedCatalogError}
            onConnectSharedCatalog={handleConnectSharedCatalog}
            onDisconnectSharedCatalog={handleDisconnectSharedCatalog}
            onInitializeSharedCatalog={handleInitializeSharedCatalog}
            onImportMovies={handleImportMovies}
            onDeleteMovie={handleDeleteMovie}
            onBulkDeleteMovies={handleBulkDeleteMovies}
            onResetCatalog={handleResetCatalog}
            onSelectMovie={setSelectedMovie}
          />
        )}
      </main>

      {/* Movie Detail Modal (Shows Genre, Studio, Year, Minutes, Size with interactive filtering) */}
      <MovieDetailModal
        movie={selectedMovie}
        movies={movieDetailNavigationMovies}
        onClose={() => setSelectedMovie(null)}
        onNavigateMovie={setSelectedMovie}
        onFilterByAttribute={handleFilterByAttribute}
        onSelectActor={(actorName) => setSelectedActorName(actorName)}
        onUpdateMovie={handleUpdateMovie}
      />

      {/* Actor Detail Modal (Shows Picture, Date of Birth, and Movies Title) */}
      <ActorDetailModal
        actorName={selectedActorName}
        actorNames={actorNames}
        movies={movies}
        onClose={() => setSelectedActorName(null)}
        onNavigateActor={setSelectedActorName}
        onSelectMovie={(movie) => {
          setSelectedActorName(null);
          setSelectedMovie(movie);
        }}
        onUpdateActor={handleUpdateActor}
      />

      {/* Footer info & Reset option */}
      <footer className="mt-auto py-6 border-t border-zinc-800/60 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>CineVault Dark Movie Catalog</span>
            <span aria-hidden="true">·</span>
            <span>{movies.length} Master titles in library</span>
          </div>

          <button
            onClick={handleResetCatalog}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-amber-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Library</span>
          </button>
        </div>
      </footer>

      {/* Bottom Navigation for Movie Library, Actors, Add Movies Data */}
      <BottomNav
        activePage={activePage}
        setActivePage={handleNavigatePage}
        moviesCount={movies.length}
        actorsCount={actorsCount}
        onTriggerAdd={handleTriggerAdd}
      />
    </div>
  );
}
