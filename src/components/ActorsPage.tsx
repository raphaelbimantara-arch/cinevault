import React, { useState, useMemo } from 'react';
import { Search, User, Plus, LayoutGrid, List, GalleryHorizontal } from 'lucide-react';
import { Movie, ViewMode } from '../types';
import { getActorProfile } from '../data/actorsData';
import { getImageSource } from '../utils/googleDriveImage';

interface ActorsPageProps {
  movies: Movie[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onSelectMovie: (movie: Movie) => void;
  onFilterByActor: (actorName: string) => void;
  onOpenActorDetail: (actorName: string) => void;
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

const ALPHABET_LIST = [
  'All',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '#'
];

const GRID_COLS_MAP: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

export const ActorsPage: React.FC<ActorsPageProps> = ({
  movies,
  viewMode,
  setViewMode,
  onSelectMovie,
  onFilterByActor,
  onOpenActorDetail,
  onTriggerAddActor,
}) => {
  const [search, setSearch] = useState('');
  const [selectedAlphabets, setSelectedAlphabets] = useState<string[]>(['All']);
  const [cols, setCols] = useState(4);

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

    return result;
  }, [actorStats, search, selectedAlphabets]);

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

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actors or movies..."
              className="w-full bg-[#121520] border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          {onTriggerAddActor && (
            <button
              onClick={onTriggerAddActor}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
              title="Add New Actor to Directory"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Actor</span>
            </button>
          )}

          {/* View toggle */}
          <div className="flex items-center bg-[#121520] border border-zinc-800 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cover')}
              title="Cover View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'cover'
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
      <div className="flex items-center gap-1 overflow-x-auto py-1.5 scrollbar-none border border-zinc-800/80 bg-[#0d0f16]/80 px-2.5 rounded-xl">
        <div className="flex items-center gap-1.5 shrink-0 pr-2">
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
              className={`min-w-6 px-1.5 py-0.5 rounded text-xs font-mono transition-colors shrink-0 text-center ${
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
            className="text-xs text-zinc-400 hover:text-amber-400 ml-2 px-2 py-0.5 rounded-lg border border-zinc-800 bg-zinc-900 shrink-0 font-mono transition-colors"
            title="Reset alphabet filter to All"
          >
            Clear ({selectedAlphabets.length})
          </button>
        )}
      </div>

      {/* Actors Count & Active Alphabet Status */}
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
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

      {/* Actors Cards Grid */}
      {viewMode === 'cover' && (
        <div className="flex items-center gap-3 mb-4 bg-[#121520] border border-zinc-800 rounded-xl p-3">
          <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Layout Size:</span>
          <input
            type="range"
            min="1"
            max="6"
            value={cols}
            onChange={(e) => setCols(Number(e.target.value))}
            className="w-48 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <span className="text-xs text-zinc-500 font-mono">{cols} per row</span>
        </div>
      )}

      <div className={`grid ${viewMode === 'cover' ? GRID_COLS_MAP[cols] : viewMode === 'list' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'} gap-4`}>
        {filteredActors.map((actor) => {
          return (
            <div
              key={actor.name}
              onClick={() => onOpenActorDetail(actor.name)}
              className="bg-[#121520] border border-zinc-800/90 rounded-2xl p-4 flex flex-col justify-between hover:border-amber-500/40 hover:bg-[#151926] transition-all hover:shadow-xl cursor-pointer group"
            >
              <div>
                {/* Header: Picture and Name */}
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700/80 shrink-0 relative shadow-md">
                    {actor.photoUrl ? (
                      <img
                        src={getImageSource(actor.photoUrl)}
                        alt={actor.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-zinc-800 flex items-center justify-center -z-10">
                      <User className="w-6 h-6 text-amber-400" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-zinc-100 group-hover:text-amber-400 transition-colors truncate text-base">
                      {actor.name}
                    </h3>
                  </div>
                </div>
              </div>
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
