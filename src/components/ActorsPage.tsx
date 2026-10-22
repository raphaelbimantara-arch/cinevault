import React, { useState, useMemo } from 'react';
import { Search, User, Plus, LayoutGrid, List, GalleryHorizontal, Trash2, X, CheckSquare, ArrowUpDown, Image } from 'lucide-react';
import { Movie, ViewMode } from '../types';
import { getActorProfile } from '../data/actorsData';
import { getImageSource } from '../utils/googleDriveImage';
import { useLongPress } from '../utils/useLongPress';

interface ActorsPageProps {
  movies: Movie[];
  viewMode: ViewMode;
  onOpenActorDetail: (actorName: string) => void;
  onDeleteActors: (actorNames: string[]) => void;
  onTriggerAddActor?: () => void;
}

interface ActorStat {
  name: string;
  movies: Movie[];
  genres: string[];
  studios: string[];
  dob: string;
  photoUrl: string;
}

type ActorSortOption = 'name' | 'movies-desc' | 'movies-asc' | 'age-desc' | 'age-asc';

const ALPHABET_LIST = [
  'All',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '#'
];

export const ActorsPage: React.FC<ActorsPageProps> = ({
  movies,
  viewMode,
  onOpenActorDetail,
  onDeleteActors,
  onTriggerAddActor,
}) => {
  const [actorViewMode, setActorViewMode] = useState<ViewMode | 'photos'>(viewMode);
  const [search, setSearch] = useState('');
  const [actorSort, setActorSort] = useState<ActorSortOption>('name');
  const [selectedAlphabets, setSelectedAlphabets] = useState<string[]>(['All']);
  const [cols, setCols] = useState(4);
  const [selectedActorNames, setSelectedActorNames] = useState<Set<string>>(() => new Set());
  const selectionMode = selectedActorNames.size > 0;
  const longPressHandlers = useLongPress((name) => {
    setSelectedActorNames((prev) => new Set(prev).add(name));
  }, !selectionMode);

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

  // Extract all unique actors and compute their catalog filmography + profile info
  const actorStats = useMemo(() => {
    const map = new Map<string, Movie[]>();

    movies.forEach((m) => {
      m.actors.forEach((act) => {
        const trimmed = act.trim();
        if (!trimmed) return;
        const list = map.get(trimmed) || [];
        list.push(m);
        map.set(trimmed, list);
      });
    });

    const result: ActorStat[] = [];
    map.forEach((actorMovies, name) => {
      const genres = Array.from(new Set(actorMovies.map((m) => m.genre)));
      const studios = Array.from(new Set(actorMovies.map((m) => m.studio)));
      const profile = getActorProfile(name);

      result.push({
        name,
        movies: actorMovies,
        genres,
        studios,
        dob: profile.dob,
        photoUrl: profile.photoUrl,
      });
    });

    // Default alphabetical sort
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [movies]);

  // Filter actors by search query and multi-alphabet selection
  const filteredActors = useMemo(() => {
    let result = actorStats;

    // Multi-alphabet filter
    if (!selectedAlphabets.includes('All') && selectedAlphabets.length > 0) {
      result = result.filter((a) => {
        return selectedAlphabets.some((char) => {
          if (char === '#') {
            return !/^[a-zA-Z]/i.test(a.name);
          }
          return a.name.toUpperCase().startsWith(char.toUpperCase());
        });
      });
    }

    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.movies.some((m) => m.title.toLowerCase().includes(q))
      );
    }

    return [...result].sort((a, b) => {
      if (actorSort === 'movies-desc') {
        return b.movies.length - a.movies.length || a.name.localeCompare(b.name);
      }
      if (actorSort === 'movies-asc') {
        return a.movies.length - b.movies.length || a.name.localeCompare(b.name);
      }
      if (actorSort === 'age-desc' || actorSort === 'age-asc') {
        const dobA = Date.parse(a.dob);
        const dobB = Date.parse(b.dob);
        const hasInvalidDateA = Number.isNaN(dobA);
        const hasInvalidDateB = Number.isNaN(dobB);
        if (hasInvalidDateA !== hasInvalidDateB) return hasInvalidDateA ? 1 : -1;
        if (hasInvalidDateA) return a.name.localeCompare(b.name);
        const ageOrder = actorSort === 'age-desc'
          ? dobA - dobB
          : dobB - dobA;
        return ageOrder || a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
  }, [actorStats, search, selectedAlphabets, actorSort]);

  const handleToggleActorSelection = (name: string) => {
    setSelectedActorNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleSelectVisibleActors = () => {
    setSelectedActorNames((prev) => {
      const next = new Set(prev);
      filteredActors.forEach((actor) => next.add(actor.name));
      return next;
    });
  };

  const handleDeleteSelectedActors = () => {
    const namesToDelete = actorStats
      .filter((actor) => selectedActorNames.has(actor.name))
      .map((actor) => actor.name);
    if (namesToDelete.length === 0) return;
    if (!window.confirm(`Delete ${namesToDelete.length} selected actor(s) from the directory and movie credits? This cannot be undone.`)) return;
    onDeleteActors(namesToDelete);
    setSelectedActorNames(new Set());
  };

  return (
    <div className="space-y-5">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Actors Directory
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Browse starring talent across your catalog. Click any actor to view picture, date of birth, and movie titles.
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-2.5">
          <div className="col-span-2 flex min-w-0 items-center gap-1 rounded-xl border border-zinc-800 bg-[#121520] px-2 py-1.5 sm:col-span-1">
            <ArrowUpDown className="h-3 w-3 text-amber-400 shrink-0" />
            <select
              value={actorSort}
              onChange={(event) => setActorSort(event.target.value as ActorSortOption)}
              aria-label="Sort actors"
              className="w-full min-w-0 cursor-pointer bg-transparent text-xs text-zinc-200 focus:outline-none sm:max-w-[125px]"
            >
              <option value="name" className="bg-[#121520]">Name (A–Z)</option>
              <option value="movies-desc" className="bg-[#121520]">Movies (Most)</option>
              <option value="movies-asc" className="bg-[#121520]">Movies (Fewest)</option>
              <option value="age-desc" className="bg-[#121520]">Age (Oldest)</option>
              <option value="age-asc" className="bg-[#121520]">Age (Youngest)</option>
            </select>
          </div>
          <div className="relative col-span-2 min-w-0 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actors or movies..."
              className="w-full min-w-0 bg-[#121520] border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          {onTriggerAddActor && (
            <button
              onClick={onTriggerAddActor}
              className="flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-2 py-1.5 text-xs font-bold text-zinc-950 shadow-sm transition-colors hover:bg-amber-300 sm:shrink-0 sm:px-3"
              title="Add New Actor to Directory"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Actor</span>
            </button>
          )}

          {/* View toggle */}
          <div className="col-span-1 flex min-w-0 items-center justify-center rounded-xl border border-zinc-800 bg-[#121520] p-1 sm:col-span-1 sm:justify-start">
            <button
              onClick={() => setActorViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg transition-colors ${
                actorViewMode === 'grid'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActorViewMode('list')}
              title="List View"
              className={`p-1.5 rounded-lg transition-colors ${
                actorViewMode === 'list'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActorViewMode('cover')}
              title="Cover View"
              className={`p-1.5 rounded-lg transition-colors ${
                actorViewMode === 'cover'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <GalleryHorizontal className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActorViewMode('photos')}
              title="Photos Only"
              aria-label="Photos Only"
              className={`p-1.5 rounded-lg transition-colors ${
                actorViewMode === 'photos'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Image className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Alphabet: Filter Bar - Multi-select */}
      <div className="flex flex-wrap items-center gap-1 py-1.5 border border-zinc-800/80 bg-[#0d0f16]/80 px-2.5 rounded-xl">
        <div className="flex items-center gap-1.5 pr-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">
            Alphabet:
          </span>
          {!selectedAlphabets.includes('All') && selectedAlphabets.length > 1 && (
            <span className="text-[10px] bg-amber-400/20 text-amber-300 font-mono px-1.5 py-0.5 rounded border border-amber-500/30">
              {selectedAlphabets.length} selected
            </span>
          )}
        </div>
        {ALPHABET_LIST.map((char) => {
          const isSelected = char === 'All'
            ? selectedAlphabets.includes('All') || selectedAlphabets.length === 0
            : selectedAlphabets.includes(char);
          return (
            <button
              key={char}
              onClick={() => handleToggleAlphabet(char)}
              className={`min-w-6 px-1.5 py-0.5 rounded text-xs font-mono transition-colors text-center ${
                isSelected
                  ? 'bg-amber-400 text-zinc-950 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
              title={char === 'All' ? 'Show all actors' : `Toggle letter ${char}`}
            >
              {char}
            </button>
          );
        })}
        {!selectedAlphabets.includes('All') && selectedAlphabets.length > 0 && (
          <button
            onClick={() => handleToggleAlphabet('All')}
            className="text-xs text-zinc-400 hover:text-amber-400 ml-2 px-2 py-0.5 rounded-lg border border-zinc-800 bg-zinc-900 font-mono transition-colors"
            title="Reset alphabet filter to All"
          >
            Clear ({selectedAlphabets.length})
          </button>
        )}
      </div>

      {/* Actors Count & Active Alphabet Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400 px-1">
        <span>
          Showing <strong className="text-zinc-200 font-mono">{filteredActors.length}</strong> of <span className="font-mono">{actorStats.length}</span> actors
          {!selectedAlphabets.includes('All') && selectedAlphabets.length > 0 && (
            <> · Starts with <strong className="text-amber-400 font-mono">"{[...selectedAlphabets].sort().join(', ')}"</strong></>
          )}
        </span>

        {((!selectedAlphabets.includes('All') && selectedAlphabets.length > 0) || search) && (
          <button
            onClick={() => {
              setSelectedAlphabets(['All']);
              setSearch('');
            }}
            className="text-zinc-400 hover:text-amber-400 underline underline-offset-2 transition-colors"
          >
            Reset filter
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-[#121520] p-2.5 sm:p-3">
        <button
          type="button"
          onClick={handleSelectVisibleActors}
          disabled={filteredActors.length === 0}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckSquare className="h-3.5 w-3.5" />
          Select visible ({filteredActors.length})
        </button>
        {selectionMode && (
          <>
            <span className="text-xs text-zinc-400">{selectedActorNames.size} selected</span>
            <button
              type="button"
              onClick={handleDeleteSelectedActors}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedActorNames(new Set())}
              className="inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              aria-label="Clear selected actors"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          </>
        )}
      </div>

      {/* Actors Cards Grid */}
      {(actorViewMode === 'cover' || actorViewMode === 'photos') && (
        <div className="flex min-w-0 flex-wrap items-center gap-3 mb-4 bg-[#121520] border border-zinc-800 rounded-xl p-3">
          <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Layout Size:</span>
          <input
            type="range"
            min="1"
            max="6"
            value={cols}
            onChange={(e) => setCols(Number(e.target.value))}
            aria-label="Actors per row"
            className="w-full sm:w-48 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <span className="text-xs text-zinc-500 font-mono">{cols} per row</span>
        </div>
      )}

      <div
        className={`grid min-w-0 w-full gap-2 sm:gap-4 ${
          actorViewMode === 'cover' || actorViewMode === 'photos'
            ? ''
            : actorViewMode === 'list'
              ? 'grid-cols-1'
              : 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3'
        }`}
        style={actorViewMode === 'cover' || actorViewMode === 'photos'
          ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
          : undefined}
        onPointerDown={longPressHandlers.onPointerDown}
        onPointerMove={longPressHandlers.onPointerMove}
        onPointerUp={longPressHandlers.onPointerUp}
        onPointerCancel={longPressHandlers.onPointerCancel}
        onContextMenu={longPressHandlers.onContextMenu}
        onClickCapture={longPressHandlers.onClickCapture}
      >
        {filteredActors.map((actor) => {
          return (
            <div
              key={actor.name}
              data-selection-id={actor.name}
              aria-label={`Open ${actor.name}`}
              onClick={() => selectionMode
                ? handleToggleActorSelection(actor.name)
                : onOpenActorDetail(actor.name)}
              className={`relative min-w-0 overflow-hidden border border-zinc-800/90 bg-[#121520] hover:border-amber-500/40 hover:bg-[#151926] transition-all hover:shadow-xl cursor-pointer group ${
                actorViewMode === 'photos'
                  ? 'aspect-square rounded-xl'
                  : actorViewMode === 'cover'
                    ? 'rounded-xl p-1.5 sm:p-2'
                    : 'rounded-2xl p-2 sm:p-4'
              }`}
            >
              {actorViewMode === 'photos' ? (
                <>
                  {actor.photoUrl ? (
                    <img
                      src={getImageSource(actor.photoUrl)}
                      alt={actor.name}
                      referrerPolicy="no-referrer"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                        const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                      className="absolute inset-0 h-full w-full bg-zinc-900 object-contain"
                    />
                  ) : null}
                  <div className={`absolute inset-0 items-center justify-center bg-gradient-to-tr from-amber-500/20 via-zinc-800 to-zinc-900 ${
                    actor.photoUrl ? 'hidden' : 'flex'
                  }`}>
                    <User className="h-1/2 w-1/2 text-amber-400" />
                  </div>
                </>
              ) : (
                <div className={`flex min-w-0 items-center ${actorViewMode === 'cover' ? 'flex-col' : 'gap-2 sm:gap-3.5'}`}>
                  {selectionMode && (
                    <input
                      type="checkbox"
                      checked={selectedActorNames.has(actor.name)}
                      onChange={() => handleToggleActorSelection(actor.name)}
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`Select ${actor.name}`}
                      className={`z-10 h-4 w-4 shrink-0 cursor-pointer accent-amber-400 ${
                        actorViewMode === 'cover' ? 'absolute left-1 top-1' : 'absolute left-2 top-2 sm:left-3 sm:top-3'
                      }`}
                    />
                  )}
                {/* Header: Picture and Name */}
                  <div className={`relative shrink-0 overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900 shadow-md ${
                    actorViewMode === 'cover' ? 'aspect-square w-full' : 'h-10 w-10 sm:h-14 sm:w-14'
                  }`}>
                    {actor.photoUrl ? (
                      <img
                        src={getImageSource(actor.photoUrl)}
                        alt={actor.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                        className="relative z-10 h-full w-full bg-zinc-900 object-contain group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : null}
                    <div className={`absolute inset-0 items-center justify-center bg-gradient-to-tr from-amber-500/20 to-zinc-800 ${
                      actor.photoUrl ? 'hidden' : 'flex'
                    }`}>
                      <User className="w-6 h-6 text-amber-400" />
                    </div>
                  </div>

                  <div className={`min-w-0 ${actorViewMode === 'cover' ? 'w-full pt-1 text-center' : 'flex-1'}`}>
                    <h3 className={`truncate font-bold text-zinc-100 group-hover:text-amber-400 transition-colors ${
                      actorViewMode === 'cover' ? 'text-[9px] sm:text-xs' : 'text-xs sm:text-base'
                    }`}>
                      {actor.name}
                    </h3>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredActors.length === 0 && (
        <div className="py-16 text-center text-zinc-500">
          No actors found {!selectedAlphabets.includes('All') && selectedAlphabets.length > 0 ? `starting with "${[...selectedAlphabets].sort().join(', ')}"` : ''} {search ? `matching "${search}"` : ''}.
        </div>
      )}
    </div>
  );
};
