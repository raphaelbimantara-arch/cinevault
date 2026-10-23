import React, { useState, useMemo } from 'react';
import { Search, User, Plus, LayoutGrid, List, GalleryHorizontal, Trash2, X, ArrowUpDown, Star, Check, ChevronDown, ChevronUp, Pencil, Save, Undo2 } from 'lucide-react';
import { Movie, ViewMode } from '../types';
import { ActorProfile, getActorProfile, updateActorStatuses } from '../data/actorsData';
import { getImageSource } from '../utils/googleDriveImage';
import { useLongPress } from '../utils/useLongPress';

interface ActorsPageProps {
  movies: Movie[];
  viewMode: ViewMode;
  onOpenActorDetail: (actorName: string) => void;
  onDeleteActors: (actorNames: string[]) => void;
  onNotify: (message: string, action?: { label: string; onClick: () => void }) => void;
  onTriggerAddActor?: () => void;
  onUpdateActor: (oldName: string, updatedProfile: ActorProfile) => void;
}

interface ActorStat {
  name: string;
  alias: string;
  movies: Movie[];
  genres: string[];
  studios: string[];
  dob: string;
  sizeBytes: number;
  totalMinutes: number;
  photoUrl: string;
  favorite: boolean;
  reviewed: boolean;
}

type ActorSortOption = 'name' | 'name-desc' | 'alias' | 'alias-desc' | 'dob-asc' | 'dob-desc' | 'movies-desc' | 'movies-asc' | 'age-desc' | 'age-asc' | 'size-desc' | 'size-asc' | 'duration-desc' | 'duration-asc';
type ActorEditDraft = { name: string; alias: string; dob: string };

const ActorStatusMarkers: React.FC<{ favorite: boolean; reviewed: boolean }> = ({
  favorite,
  reviewed,
}) => (
  (favorite || reviewed) ? (
    <div className="flex shrink-0 items-center gap-1">
      {favorite && (
        <span title="Favorite" className="inline-flex items-center gap-0.5 text-[8px] font-semibold text-amber-300">
          <Star className="h-2.5 w-2.5 fill-current" />
          <span>Favorite</span>
        </span>
      )}
      {reviewed && (
        <span title="Review" className="inline-flex items-center gap-0.5 text-[8px] font-semibold text-rose-400">
          <Check className="h-2.5 w-2.5" />
          <span>Review</span>
        </span>
      )}
    </div>
  ) : null
);

const formatActorDob = (dob: string) => {
  const match = dob.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (!match) return dob;
  return `${match[2].padStart(2, '0')} ${match[1].slice(0, 3)} ${match[3]}`;
};

const getActorAge = (dob: string) => {
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayPending = today.getMonth() < birthDate.getMonth()
    || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate());
  if (birthdayPending) age -= 1;
  return age;
};

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
  onNotify,
  onTriggerAddActor,
  onUpdateActor,
}) => {
  const [actorViewMode, setActorViewMode] = useState<ViewMode>(viewMode);
  const [search, setSearch] = useState('');
  const [actorSort, setActorSort] = useState<ActorSortOption>('name');
  const [selectedAlphabets, setSelectedAlphabets] = useState<string[]>(['All']);
  const [isAlphabetOpen, setIsAlphabetOpen] = useState(false);
  const [cols, setCols] = useState(4);
  const [selectedActorNames, setSelectedActorNames] = useState<Set<string>>(() => new Set());
  const [actorStatusRevision, setActorStatusRevision] = useState(0);
  const [isEditingList, setIsEditingList] = useState(false);
  const [actorDrafts, setActorDrafts] = useState<Record<string, ActorEditDraft>>({});
  const toggleActorSort = (ascending: ActorSortOption, descending: ActorSortOption) => {
    setActorSort((current) => current === ascending ? descending : ascending);
  };
  const selectionMode = selectedActorNames.size > 0;
  const longPressHandlers = useLongPress((name) => {
    setSelectedActorNames((prev) => new Set(prev).add(name));
  }, !selectionMode);
  const setActorView = (mode: ViewMode) => {
    if (mode !== 'grid') {
      setSearch('');
      setActorSort('name');
    }
    setActorViewMode(mode);
  };

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
        alias: profile.alias || '',
        movies: actorMovies,
        genres,
        studios,
        dob: profile.dob,
        sizeBytes: actorMovies.reduce(
          (total, movie) => total + (movie.sizeBytes ?? (Number.parseFloat(movie.size) || 0) * 1000),
          0,
        ),
        totalMinutes: actorMovies.reduce((total, movie) => total + (movie.minutes || 0), 0),
        photoUrl: profile.photoUrl,
        favorite: profile.favorite === true,
        reviewed: profile.reviewed === true,
      });
    });

    // Default alphabetical sort
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [movies, actorStatusRevision]);

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
          a.alias.toLowerCase().includes(q) ||
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
      if (actorSort === 'dob-asc' || actorSort === 'dob-desc') {
        const dobA = Date.parse(a.dob);
        const dobB = Date.parse(b.dob);
        const hasInvalidDateA = Number.isNaN(dobA);
        const hasInvalidDateB = Number.isNaN(dobB);
        if (hasInvalidDateA !== hasInvalidDateB) return hasInvalidDateA ? 1 : -1;
        if (hasInvalidDateA) return a.name.localeCompare(b.name);
        const dobOrder = actorSort === 'dob-asc' ? dobA - dobB : dobB - dobA;
        return dobOrder || a.name.localeCompare(b.name);
      }
      if (actorSort === 'size-desc' || actorSort === 'size-asc') {
        const sizeOrder = actorSort === 'size-desc' ? b.sizeBytes - a.sizeBytes : a.sizeBytes - b.sizeBytes;
        return sizeOrder || a.name.localeCompare(b.name);
      }
      if (actorSort === 'duration-desc' || actorSort === 'duration-asc') {
        const durationOrder = actorSort === 'duration-desc'
          ? b.totalMinutes - a.totalMinutes
          : a.totalMinutes - b.totalMinutes;
        return durationOrder || a.name.localeCompare(b.name);
      }
      if (actorSort === 'alias' || actorSort === 'alias-desc') {
        const aliasOrder = actorSort === 'alias'
          ? a.alias.localeCompare(b.alias, undefined, { sensitivity: 'base' })
          : b.alias.localeCompare(a.alias, undefined, { sensitivity: 'base' });
        return aliasOrder || a.name.localeCompare(b.name);
      }
      return actorSort === 'name-desc'
        ? b.name.localeCompare(a.name, undefined, { sensitivity: 'base' })
        : a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }, [actorStats, search, selectedAlphabets, actorSort]);

  const startListEditing = () => {
    setActorDrafts(Object.fromEntries(filteredActors.map((actor) => [
      actor.name,
      { name: actor.name, alias: actor.alias, dob: actor.dob },
    ])));
    setSelectedActorNames(new Set());
    setIsEditingList(true);
  };

  const cancelListEditing = () => {
    setIsEditingList(false);
    setActorDrafts({});
  };

  const updateActorDraft = (name: string, field: keyof ActorEditDraft, value: string) => {
    setActorDrafts((drafts) => ({
      ...drafts,
      [name]: { ...drafts[name], [field]: value },
    }));
  };

  const saveListEditing = () => {
    const draftedActors = actorStats.filter((actor) => actorDrafts[actor.name]);
    const updatedNames = actorStats.map((actor) => actorDrafts[actor.name]?.name.trim() || actor.name);
    if (updatedNames.some((name) => !name)) {
      window.alert('Actor name cannot be empty.');
      return;
    }
    const normalizedNames = updatedNames.map((name) => name.toLowerCase());
    if (new Set(normalizedNames).size !== normalizedNames.length) {
      window.alert('Actor names must be unique.');
      return;
    }
    const existingNames = new Set(actorStats.map((actor) => actor.name.toLowerCase()));
    if (draftedActors.some((actor) => {
      const updatedName = actorDrafts[actor.name]?.name.trim().toLowerCase();
      return updatedName && updatedName !== actor.name.toLowerCase() && existingNames.has(updatedName);
    })) {
      window.alert('An actor with that name already exists.');
      return;
    }

    draftedActors.forEach((actor) => {
      const draft = actorDrafts[actor.name];
      if (!draft) return;
      const name = draft.name.trim();
      const alias = draft.alias.trim();
      const dob = draft.dob.trim();
      if (name === actor.name && alias === actor.alias && dob === actor.dob) return;

      const profile = getActorProfile(actor.name);
      onUpdateActor(actor.name, {
        ...profile,
        name,
        alias: alias || undefined,
        dob: dob || profile.dob,
      });
    });
    setActorStatusRevision((revision) => revision + 1);
    cancelListEditing();
    onNotify('Actor list updated.');
  };

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

  const handleDeleteSelectedActors = () => {
    const namesToDelete = actorStats
      .filter((actor) => selectedActorNames.has(actor.name))
      .map((actor) => actor.name);
    if (namesToDelete.length === 0) return;
    if (!window.confirm(`Delete ${namesToDelete.length} selected actor(s) from the directory and movie credits? This cannot be undone.`)) return;
    onDeleteActors(namesToDelete);
    onNotify(`${namesToDelete.length} aktor berhasil dihapus.`);
    setSelectedActorNames(new Set());
  };

  const handleUpdateSelectedActorStatus = (field: 'favorite' | 'reviewed') => {
    const selectedNames = actorStats
      .filter((actor) => selectedActorNames.has(actor.name))
      .map((actor) => actor.name);
    const alreadyMarked = actorStats
      .filter((actor) => selectedActorNames.has(actor.name) && actor[field])
      .map((actor) => actor.name);
    const newlyMarkedCount = selectedNames.length - alreadyMarked.length;
    const label = field === 'favorite' ? 'favorite' : 'reviewed';

    try {
      updateActorStatuses(
        selectedNames,
        field === 'favorite' ? { favorite: true } : { reviewed: true }
      );
      setActorStatusRevision((revision) => revision + 1);
      const message = alreadyMarked.length > 0
          ? `${newlyMarkedCount} aktor ditandai ${label}; ${alreadyMarked.length} sudah ${label}.`
          : `${newlyMarkedCount} aktor ditandai ${label}.`;
      onNotify(
        message,
        alreadyMarked.length > 0
          ? {
              label: field === 'favorite' ? 'Keluarkan dari favorite' : 'Hapus tanda review',
              onClick: () => handleRemoveSelectedActorStatus(field, alreadyMarked),
            }
          : undefined
      );
      setSelectedActorNames(new Set());
    } catch (error) {
      console.error('Failed to update selected actor statuses:', error);
      onNotify('Status aktor tidak dapat disimpan. Silakan coba lagi.');
    }
  };

  const handleRemoveSelectedActorStatus = (field: 'favorite' | 'reviewed', actorNames: string[]) => {
    try {
      updateActorStatuses(
        actorNames,
        field === 'favorite' ? { favorite: false } : { reviewed: false }
      );
      setActorStatusRevision((revision) => revision + 1);
      onNotify(`${actorNames.length} aktor dikeluarkan dari ${field === 'favorite' ? 'favorite' : 'review'}.`);
      setSelectedActorNames(new Set());
    } catch (error) {
      console.error('Failed to remove selected actor statuses:', error);
      onNotify('Status aktor tidak dapat dihapus. Silakan coba lagi.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="sticky top-[56px] z-20 -mx-3 space-y-2 border-b border-zinc-800/80 bg-[#08090d]/95 px-3 py-2 backdrop-blur-md sm:top-[60px] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      {/* Top Page Header */}
      <div className={`flex justify-between border-b border-zinc-800 pb-2 ${
        actorViewMode === 'grid'
          ? 'flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4'
          : 'flex-row items-center gap-1.5'
      }`}>
        <div>
          <h2 className={`font-bold text-white tracking-tight ${
            actorViewMode === 'grid' ? 'text-xl sm:text-2xl' : 'text-base sm:text-xl'
          }`}>
            {actorViewMode === 'grid' ? 'Actors Directory' : 'Actors'}
          </h2>
        </div>

        <div className={actorViewMode === 'grid'
          ? 'grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-2.5'
          : 'flex w-auto shrink-0 items-center gap-1'}>
          {actorViewMode === 'grid' && (
          <div className="col-span-2 flex min-w-0 items-center gap-1 rounded-xl border border-zinc-800 bg-[#121520] px-2 py-1.5 sm:col-span-1">
            <ArrowUpDown className="h-3 w-3 text-amber-400 shrink-0" />
            <select
              value={actorSort}
              onChange={(event) => setActorSort(event.target.value as ActorSortOption)}
              aria-label="Sort actors"
              className="w-full min-w-0 cursor-pointer bg-transparent text-xs text-zinc-200 focus:outline-none sm:max-w-[125px]"
            >
              <option value="name" className="bg-[#121520]">Name (A–Z)</option>
              <option value="name-desc" className="bg-[#121520]">Name (Z–A)</option>
              <option value="alias" className="bg-[#121520]">Alias (A–Z)</option>
              <option value="alias-desc" className="bg-[#121520]">Alias (Z–A)</option>
              <option value="movies-desc" className="bg-[#121520]">Movies (Most)</option>
              <option value="movies-asc" className="bg-[#121520]">Movies (Fewest)</option>
              <option value="age-desc" className="bg-[#121520]">Age (Oldest)</option>
              <option value="age-asc" className="bg-[#121520]">Age (Youngest)</option>
              <option value="size-desc" className="bg-[#121520]">Size (Largest)</option>
              <option value="size-asc" className="bg-[#121520]">Size (Smallest)</option>
              <option value="duration-desc" className="bg-[#121520]">Duration (Longest)</option>
              <option value="duration-asc" className="bg-[#121520]">Duration (Shortest)</option>
            </select>
          </div>
          )}
          {actorViewMode === 'list' && (
            <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
              {isEditingList ? (
                <>
                  <button
                    type="button"
                    onClick={saveListEditing}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-300 sm:flex-none"
                  >
                    <Save className="h-3.5 w-3.5" /> Save
                  </button>
                  <button
                    type="button"
                    onClick={cancelListEditing}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 sm:flex-none"
                  >
                    <Undo2 className="h-3.5 w-3.5" /> Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={startListEditing}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-amber-500/50 hover:text-amber-300 sm:w-auto"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              )}
            </div>
          )}
          {actorViewMode === 'grid' && <div className="relative col-span-2 min-w-0 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actors or movies..."
              className="w-full min-w-0 bg-[#121520] border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>}
          {onTriggerAddActor && (
            <button
              onClick={onTriggerAddActor}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-2 py-1.5 text-xs font-bold text-zinc-950 shadow-sm transition-colors hover:bg-amber-300 sm:shrink-0 sm:px-3 ${
                actorViewMode === 'grid' ? '' : 'h-8 w-8 shrink-0 p-1.5'
              }`}
              title="Add New Actor to Directory"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className={actorViewMode === 'grid' ? '' : 'hidden'}>Add Actor</span>
            </button>
          )}

          {/* View toggle */}
          <div className={`col-span-1 flex min-w-0 items-center justify-center rounded-xl border border-zinc-800 bg-[#121520] p-1 sm:col-span-1 sm:justify-start ${
            actorViewMode === 'grid' ? '' : 'shrink-0'
          }`}>
            <button
              disabled={isEditingList}
              onClick={() => setActorView('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                actorViewMode === 'grid'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              disabled={isEditingList}
              onClick={() => setActorView('list')}
              title="List View"
              className={`p-1.5 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                actorViewMode === 'list'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              disabled={isEditingList}
              onClick={() => setActorView('cover')}
              title="Cover View"
              className={`p-1.5 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                actorViewMode === 'cover'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <GalleryHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Alphabet: Filter Bar - Multi-select */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#0d0f16]/80 px-2.5 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsAlphabetOpen((open) => !open)}
            aria-expanded={isAlphabetOpen}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200"
          >
            Alphabet
            {isAlphabetOpen
              ? <ChevronUp className="h-3.5 w-3.5" />
              : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {!selectedAlphabets.includes('All') && selectedAlphabets.length > 1 && (
            <span className="text-[10px] bg-amber-400/20 text-amber-300 font-mono px-1.5 py-0.5 rounded border border-amber-500/30">
              {selectedAlphabets.length} selected
            </span>
          )}
        </div>
        {isAlphabetOpen && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
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
          </div>
        )}
        {isAlphabetOpen && !selectedAlphabets.includes('All') && selectedAlphabets.length > 0 && (
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
          {actorViewMode === 'grid' ? 'Showing ' : ''}
          <strong className="text-zinc-200 font-mono">{filteredActors.length}</strong>
          {actorViewMode === 'grid'
            ? <> of <span className="font-mono">{actorStats.length}</span> actors</>
            : <> / <span className="font-mono">{actorStats.length}</span></>}
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

      {selectionMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-800 bg-[#121520] p-2.5 sm:p-3">
          <span className="text-xs text-zinc-400">{selectedActorNames.size} selected</span>
          <button
            type="button"
            onClick={() => handleUpdateSelectedActorStatus('favorite')}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/20"
          >
            <Star className="h-3.5 w-3.5" />
            Add to favorites
          </button>
          <button
            type="button"
            onClick={() => handleUpdateSelectedActorStatus('reviewed')}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
          >
            <Check className="h-3.5 w-3.5" />
            Mark reviewed
          </button>
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
        </div>
      )}

      {/* Actors Cards Grid */}
      {actorViewMode === 'cover' && (
        <div className="flex min-w-0 flex-nowrap items-center gap-2 bg-[#121520] border border-zinc-800 rounded-xl px-2 py-1.5">
          <span className="shrink-0 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Cols</span>
          <input
            type="range"
            min="1"
            max="6"
            value={cols}
            onChange={(e) => setCols(Number(e.target.value))}
            aria-label="Actors per row"
            className="h-1.5 w-32 max-w-full bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400 sm:w-48"
          />
          <span className="shrink-0 text-[10px] text-zinc-500 font-mono">{cols} / row</span>
        </div>
      )}
      </div>

      {actorViewMode === 'list' ? (
        <div
          className="max-h-[calc(100vh-16rem)] min-h-[18rem] overflow-x-hidden overflow-y-auto rounded-xl border border-zinc-800/80 bg-[#121520] shadow-lg"
          onPointerDown={isEditingList ? undefined : longPressHandlers.onPointerDown}
          onPointerMove={isEditingList ? undefined : longPressHandlers.onPointerMove}
          onPointerUp={isEditingList ? undefined : longPressHandlers.onPointerUp}
          onPointerCancel={isEditingList ? undefined : longPressHandlers.onPointerCancel}
          onContextMenu={isEditingList ? undefined : longPressHandlers.onContextMenu}
          onClickCapture={isEditingList ? undefined : longPressHandlers.onClickCapture}
        >
          <table className="w-full table-fixed border-collapse text-left">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-zinc-800 bg-[#0d0f16] text-[8px] font-semibold uppercase tracking-wide text-zinc-400 sm:text-[10px]">
                <th className="w-[23%] px-1 py-2 sm:px-3">
                  <button type="button" disabled={isEditingList} onClick={() => toggleActorSort('name', 'name-desc')} className="w-full text-left disabled:cursor-default">Actor</button>
                </th>
                <th className="w-[14%] px-0.5 py-2 sm:px-2">
                  <button type="button" disabled={isEditingList} onClick={() => toggleActorSort('alias', 'alias-desc')} className="w-full text-left disabled:cursor-default">Alias</button>
                </th>
                <th className="w-[16%] px-0.5 py-2 text-center sm:px-2">
                  <button type="button" disabled={isEditingList} onClick={() => toggleActorSort('dob-asc', 'dob-desc')} className="w-full text-center disabled:cursor-default">DOB</button>
                </th>
                <th className="w-[8%] px-0.5 py-2 text-center sm:px-1">
                  <button type="button" disabled={isEditingList} onClick={() => toggleActorSort('age-asc', 'age-desc')} className="w-full text-center disabled:cursor-default">Age</button>
                </th>
                <th className="w-[12%] px-0.5 py-2 text-center sm:px-2">
                  <button type="button" disabled={isEditingList} onClick={() => toggleActorSort('size-asc', 'size-desc')} className="w-full text-center disabled:cursor-default">Size</button>
                </th>
                <th className="w-[15%] px-0.5 py-2 text-center sm:px-2">
                  <button type="button" disabled={isEditingList} onClick={() => toggleActorSort('duration-asc', 'duration-desc')} className="w-full text-center disabled:cursor-default">Min</button>
                </th>
                <th className="w-[12%] px-0.5 py-2 text-center sm:px-2">
                  <button type="button" disabled={isEditingList} onClick={() => toggleActorSort('movies-asc', 'movies-desc')} className="w-full text-center disabled:cursor-default">Movies</button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {filteredActors.map((actor) => {
                const draft = actorDrafts[actor.name];
                const size = `${(actor.sizeBytes / 1000).toFixed(1)} GB`;
                const age = getActorAge(actor.dob);
                return (
                  <tr
                    key={actor.name}
                    data-selection-id={isEditingList ? undefined : actor.name}
                    onClick={() => {
                      if (isEditingList) return;
                      if (selectionMode) handleToggleActorSelection(actor.name);
                      else onOpenActorDetail(actor.name);
                    }}
                    className={`group cursor-pointer transition-colors hover:bg-[#181d2c] ${isEditingList ? 'bg-[#181d2c]' : ''}`}
                  >
                    <td className="overflow-hidden px-1 py-2 sm:px-3">
                      <div className="flex min-w-0 items-center gap-1">
                        {selectionMode && !isEditingList && (
                          <input
                            type="checkbox"
                            checked={selectedActorNames.has(actor.name)}
                            onChange={() => handleToggleActorSelection(actor.name)}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Select ${actor.name}`}
                            className="h-3 w-3 shrink-0 cursor-pointer accent-amber-400 sm:h-3.5 sm:w-3.5"
                          />
                        )}
                        {isEditingList && draft ? (
                          <input
                            aria-label={`Edit name for ${actor.name}`}
                            className="w-full min-w-0 rounded border border-zinc-700 bg-zinc-950 px-1 py-1 text-[8px] text-zinc-100 focus:border-amber-400 focus:outline-none sm:text-xs"
                            value={draft.name}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => updateActorDraft(actor.name, 'name', event.target.value)}
                          />
                        ) : (
                          <span className="min-w-0 truncate text-[8px] font-semibold text-zinc-100 group-hover:text-amber-400 sm:text-sm" title={actor.name}>
                            {actor.name}{actor.favorite && <Star className="ml-1 inline h-2.5 w-2.5 fill-amber-400 text-amber-400" />}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="overflow-hidden px-0.5 py-2 text-[8px] text-zinc-300 sm:px-2 sm:text-xs">
                      {isEditingList && draft ? (
                        <input
                          aria-label={`Edit alias for ${actor.name}`}
                          className="w-full min-w-0 rounded border border-zinc-700 bg-zinc-950 px-1 py-1 text-[8px] text-zinc-100 focus:border-amber-400 focus:outline-none sm:text-xs"
                          value={draft.alias}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => updateActorDraft(actor.name, 'alias', event.target.value)}
                        />
                      ) : <span className="block truncate" title={actor.alias}>{actor.alias || '—'}</span>}
                    </td>
                    <td className="overflow-hidden px-0.5 py-2 text-center font-mono text-[7px] text-zinc-300 sm:px-2 sm:text-xs">
                      {isEditingList && draft ? (
                        <input
                          aria-label={`Edit date of birth for ${actor.name}`}
                          className="w-full min-w-0 rounded border border-zinc-700 bg-zinc-950 px-0.5 py-1 text-center text-[7px] text-zinc-100 focus:border-amber-400 focus:outline-none sm:px-1 sm:text-xs"
                          value={draft.dob}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => updateActorDraft(actor.name, 'dob', event.target.value)}
                        />
                      ) : <span className="block truncate" title={actor.dob}>{formatActorDob(actor.dob)}</span>}
                    </td>
                    <td className="overflow-hidden px-0.5 py-2 text-center font-mono text-[7px] text-zinc-300 sm:px-1 sm:text-xs" title={age === null ? 'Age unavailable' : `${age} years`}>
                      {age === null ? '—' : age}
                    </td>
                    <td className="overflow-hidden px-0.5 py-2 text-center font-mono text-[7px] text-zinc-300 sm:px-2 sm:text-xs" title={size}>{size}</td>
                    <td className="overflow-hidden px-0.5 py-2 text-center font-mono text-[7px] text-zinc-300 sm:px-2 sm:text-xs" title={`${actor.totalMinutes} minutes`}>{actor.totalMinutes} min</td>
                    <td className="overflow-hidden px-0.5 py-2 text-center font-mono text-[8px] text-zinc-300 sm:px-2 sm:text-xs">{actor.movies.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
      <div
        className={`grid min-w-0 w-full gap-2 sm:gap-4 ${
          actorViewMode === 'cover'
            ? ''
            : 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3'
        }`}
        style={actorViewMode === 'cover'
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
                actorViewMode === 'cover'
                  ? 'rounded-xl p-1.5 sm:p-2'
                  : 'rounded-2xl p-2 sm:p-4'
              }`}
            >
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
                    <div className="flex min-w-0 items-center justify-between gap-1">
                      <h3 className={`min-w-0 truncate font-bold text-zinc-100 transition-colors group-hover:text-amber-400 ${
                        actorViewMode === 'cover' ? 'text-[9px] sm:text-xs' : 'text-xs sm:text-base'
                      }`}>
                        {actor.name}{actorViewMode === 'grid' && ` (${actor.movies.length})`}
                      </h3>
                      <ActorStatusMarkers favorite={actor.favorite} reviewed={actor.reviewed} />
                    </div>
                  </div>
                </div>
            </div>
          );
        })}
      </div>
      )}

      {filteredActors.length === 0 && (
        <div className="py-16 text-center text-zinc-500">
          No actors found {!selectedAlphabets.includes('All') && selectedAlphabets.length > 0 ? `starting with "${[...selectedAlphabets].sort().join(', ')}"` : ''} {search ? `matching "${search}"` : ''}.
        </div>
      )}
    </div>
  );
};
