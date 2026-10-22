import React, { useEffect } from 'react';
import { X, Building2, Film, HardDrive, MapPin, Calendar, ChevronRight, Filter } from 'lucide-react';
import { Movie } from '../types';

interface StudioDetailModalProps {
  studioName: string | null;
  movies: Movie[];
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
  onFilterByStudio: (studioName: string) => void;
}

// Known studio metadata presets
const STUDIO_META: Record<string, { hq: string; founded: number }> = {
  'A24': { hq: 'New York City, New York, USA', founded: 2012 },
  'CyberPulse Studio': { hq: 'Tokyo, Japan', founded: 2018 },
  'Paramount Pictures': { hq: 'Hollywood, California, USA', founded: 1912 },
  'Sony Pictures': { hq: 'Culver City, California, USA', founded: 1989 },
  'Summit Films': { hq: 'Santa Monica, California, USA', founded: 1991 },
  'Universal Pictures': { hq: 'Universal City, California, USA', founded: 1912 },
  'Warner Bros. Pictures': { hq: 'Burbank, California, USA', founded: 1923 },
  '20th Century Studios': { hq: 'Century City, Los Angeles, USA', founded: 1935 },
};

export const StudioDetailModal: React.FC<StudioDetailModalProps> = ({
  studioName,
  movies,
  onClose,
  onSelectMovie,
  onFilterByStudio,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!studioName) return null;

  const studioMovies = movies.filter(
    (m) => m.studio.trim().toLowerCase() === studioName.trim().toLowerCase()
  );

  const totalSizeMB = studioMovies.reduce((acc, m) => acc + (m.sizeBytes || 0), 0);
  const totalSizeGB = (totalSizeMB / 1000).toFixed(1);
  const genres = Array.from(new Set(studioMovies.map((m) => m.genre)));

  const meta = STUDIO_META[studioName] || {
    hq: 'Global Production Archive',
    founded: 1990,
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-6 pb-20 sm:pb-24 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#0f121b] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl my-auto text-left animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 flex items-center justify-center transition-colors"
          title="Close (Esc)"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Modal Content */}
        <div className="p-4 sm:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 pb-5 sm:pb-6 border-b border-zinc-800">
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-950 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-2xl sm:text-3xl shrink-0 shadow-lg">
              <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                Production Studio
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                {studioName}
              </h2>

              <div className="mt-2.5 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-zinc-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  {meta.hq}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  Est. {meta.founded}
                </span>
              </div>
            </div>
          </div>

          {/* Stats & Genres Bar */}
          <div className="py-4 border-b border-zinc-800 grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-[#141824] border border-zinc-800/80">
              <div className="text-[10px] uppercase font-semibold text-zinc-400">Master Films</div>
              <div className="text-base font-bold text-amber-300 font-mono mt-0.5">
                {studioMovies.length}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#141824] border border-zinc-800/80">
              <div className="text-[10px] uppercase font-semibold text-zinc-400">Total Archive</div>
              <div className="text-base font-bold text-zinc-100 font-mono mt-0.5">
                {totalSizeGB} GB
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#141824] border border-zinc-800/80">
              <div className="text-[10px] uppercase font-semibold text-zinc-400">Genres</div>
              <div className="text-base font-bold text-zinc-100 font-mono mt-0.5">
                {genres.length}
              </div>
            </div>
          </div>

          {/* Genres Tags */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mr-1">
              Genres:
            </span>
            {genres.map((g) => (
              <span
                key={g}
                className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-300 border border-zinc-700/60"
              >
                {g}
              </span>
            ))}
          </div>

          {/* Catalog Titles List */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                <Film className="w-4 h-4 text-amber-400" />
                <span>Catalog Movies ({studioMovies.length})</span>
              </div>
              <span className="text-[11px] text-zinc-500">
                Click movie to view movie details
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {studioMovies.map((movie) => (
                <div
                  key={movie.id}
                  onClick={() => onSelectMovie(movie)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#141824] hover:bg-[#1a2030] border border-zinc-800 hover:border-amber-500/40 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-12 rounded overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700/50">
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-zinc-100 group-hover:text-amber-300 truncate transition-colors">
                        {movie.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                        <span>{movie.year}</span>
                        <span aria-hidden="true">·</span>
                        <span>{movie.genre}</span>
                        <span aria-hidden="true">·</span>
                        <span>{movie.minutes}m</span>
                        <span aria-hidden="true">·</span>
                        <span>{movie.size}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-amber-400 group-hover:text-amber-300 flex items-center gap-1 shrink-0 ml-2">
                    <span>Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                onFilterByStudio(studioName);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
            >
              <Filter className="w-3.5 h-3.5 text-amber-400" />
              <span>Filter Library by Studio</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
