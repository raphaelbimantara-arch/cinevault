import React, { useMemo } from 'react';
import { Building2, Film, HardDrive, ChevronRight, Plus } from 'lucide-react';
import { Movie } from '../types';

interface StudiosPageProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onFilterByStudio: (studioName: string) => void;
  onOpenStudioDetail?: (studioName: string) => void;
  onTriggerAddStudio?: () => void;
}

interface StudioStat {
  name: string;
  movies: Movie[];
  totalSizeGB: number;
  genres: string[];
}

export const StudiosPage: React.FC<StudiosPageProps> = ({
  movies,
  onSelectMovie,
  onFilterByStudio,
  onOpenStudioDetail,
  onTriggerAddStudio,
}) => {
  const studioStats = useMemo(() => {
    const map = new Map<string, Movie[]>();

    movies.forEach((m) => {
      const s = m.studio.trim();
      if (!s) return;
      const list = map.get(s) || [];
      list.push(m);
      map.set(s, list);
    });

    const result: StudioStat[] = [];
    map.forEach((studioMovies, name) => {
      const totalMB = studioMovies.reduce((acc, m) => acc + (m.sizeBytes || 0), 0);
      const genres = Array.from(new Set(studioMovies.map((m) => m.genre)));

      result.push({
        name,
        movies: studioMovies,
        totalSizeGB: totalMB / 1000,
        genres,
      });
    });

    // Default alphabetical sort by studio name
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [movies]);

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="pb-4 border-b border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Studios & Production Archives
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Explore catalog archives categorized by production studio. Click any studio to filter movies in the library.
          </p>
        </div>

        {onTriggerAddStudio && (
          <button
            onClick={onTriggerAddStudio}
            className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
            title="Add New Studio to Archives"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Studio</span>
          </button>
        )}
      </div>

      {/* Studios Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {studioStats.map((studio) => {
          return (
            <div
              key={studio.name}
              className="bg-[#121520] border border-zinc-800/90 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700 transition-all hover:shadow-lg"
            >
              <div>
                {/* Header: Studio Monogram, Name, Counts */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/80 flex items-center justify-center text-amber-400 font-bold text-lg shrink-0">
                      <Building2 className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-100 text-base leading-snug">
                        {studio.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1 font-mono">
                        <span className="text-amber-400 font-medium">
                          {studio.movies.length} {studio.movies.length === 1 ? 'Film' : 'Films'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1 text-zinc-400">
                          <HardDrive className="w-3 h-3 text-zinc-500" />
                          {studio.totalSizeGB.toFixed(1)} GB
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Genres covered */}
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {studio.genres.map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800/60 text-zinc-400 border border-zinc-800"
                    >
                      {g}
                    </span>
                  ))}
                </div>

                {/* Prominent movie titles */}
                <div className="mt-4 space-y-1.5">
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Catalog Titles
                  </div>
                  <div className="space-y-1">
                    {studio.movies.slice(0, 3).map((m) => (
                      <div
                        key={m.id}
                        onClick={() => onSelectMovie(m)}
                        className="flex items-center justify-between p-1.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 cursor-pointer transition-colors group/item"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Film className="w-3 h-3 text-zinc-500 shrink-0 group-hover/item:text-amber-400" />
                          <span className="text-xs text-zinc-300 group-hover/item:text-white truncate">
                            {m.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                          {m.year}
                        </span>
                      </div>
                    ))}
                    {studio.movies.length > 3 && (
                      <div className="text-[10px] text-zinc-500 text-right pr-1">
                        +{studio.movies.length - 3} more titles
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions: Studio Details & View All in Library */}
              <div className="mt-5 pt-3 border-t border-zinc-800/70 grid grid-cols-2 gap-2">
                {onOpenStudioDetail && (
                  <button
                    onClick={() => onOpenStudioDetail(studio.name)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
                  >
                    <span>Studio Details</span>
                  </button>
                )}
                <button
                  onClick={() => onFilterByStudio(studio.name)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-semibold transition-colors ${
                    onOpenStudioDetail ? '' : 'col-span-2'
                  }`}
                >
                  <span>In Library</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
