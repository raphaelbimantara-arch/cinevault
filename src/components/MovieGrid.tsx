import React from 'react';
import { Clock, HardDrive, Building2, Calendar, Film } from 'lucide-react';
import { Movie } from '../types';

interface MovieGridProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onFilterByAttribute: (type: 'genre' | 'studio' | 'year' | 'minutes' | 'size', value: string | number) => void;
}

export const MovieGrid: React.FC<MovieGridProps> = ({
  movies,
  onSelectMovie,
  onFilterByAttribute,
}) => {
  if (movies.length === 0) {
    return (
      <div className="py-20 text-center rounded-2xl border border-dashed border-zinc-800 bg-[#0d0f16]/60">
        <Film className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-zinc-300">No movies match your criteria</h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
          Try clearing your search query, changing the category, or selecting another letter in the alphabet bar.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {movies.map((movie) => {
        return (
          <div
            key={movie.id}
            className="group relative flex flex-col bg-[#121520] rounded-xl border border-zinc-800/80 overflow-hidden hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-200"
          >
            {/* Poster container with aspect 3:4 */}
            <div 
              onClick={() => onSelectMovie(movie)}
              className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-900 cursor-pointer"
            >
              <img
                src={movie.posterUrl}
                alt={movie.title}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Fallback if image fails
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* Fallback box */}
              <div 
                className="hidden absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-4 flex-col justify-end text-left"
              >
                <Film className="w-8 h-8 text-amber-400 mb-2" />
                <span className="text-xs font-bold text-white line-clamp-2">{movie.title}</span>
                <span className="text-[10px] text-zinc-400 mt-1">{movie.year} · {movie.genre}</span>
              </div>

              {/* Scrim overlay with quick info on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity" />


              {/* Resolution badge top-left */}
              {movie.resolution && (
                <div className="absolute top-2 left-2 bg-zinc-900/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider text-zinc-300 border border-zinc-700">
                  {movie.resolution}
                </div>
              )}

              {/* Bottom poster overlay info */}
              <div className="absolute bottom-2 inset-x-2 flex items-center justify-between text-[11px] text-zinc-300 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  {movie.minutes}m
                </span>
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-zinc-400" />
                  {movie.size}
                </span>
              </div>
            </div>

            {/* Card Content & Interactive Metadata Links */}
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <h4 
                  onClick={() => onSelectMovie(movie)}
                  className="text-sm font-bold text-zinc-100 group-hover:text-amber-400 transition-colors line-clamp-1 cursor-pointer"
                  title={movie.title}
                >
                  {movie.title}
                </h4>

                <div className="flex items-center justify-between mt-1 text-[10px] sm:text-[11px] text-zinc-400">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFilterByAttribute('studio', movie.studio);
                    }}
                    className="hover:text-amber-400 truncate max-w-[80px] sm:max-w-[100px] text-left transition-colors flex items-center gap-1"
                    title={`Filter by Studio: ${movie.studio}`}
                  >
                    <Building2 className="w-2.5 h-2.5 shrink-0 text-zinc-500" />
                    <span className="truncate">{movie.studio}</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFilterByAttribute('year', movie.year);
                    }}
                    className="hover:text-amber-400 font-mono transition-colors flex items-center gap-0.5 shrink-0 text-[10px] sm:text-[11px]"
                    title={`Filter by Year: ${movie.year}`}
                  >
                    <Calendar className="w-2.5 h-2.5 text-zinc-500" />
                    <span>{movie.year}</span>
                  </button>
                </div>
              </div>

              {/* Bottom Quick interactive attributes: Genre, Minutes, Size */}
              <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-1 text-[9px] sm:text-[10px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilterByAttribute('genre', movie.genre);
                  }}
                  className="px-1.5 py-0.5 rounded bg-zinc-800/70 text-zinc-300 hover:text-white hover:bg-amber-500/20 hover:border-amber-500/40 border border-zinc-700/60 transition-colors truncate max-w-[60px]"
                  title={`Filter by Genre: ${movie.genre}`}
                >
                  {movie.genre}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFilterByAttribute('minutes', movie.minutes);
                    }}
                    className="text-zinc-400 hover:text-amber-400 font-mono transition-colors"
                    title={`Filter by duration: ~${movie.minutes} min`}
                  >
                    {movie.minutes}m
                  </button>
                  <span className="text-zinc-600">·</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFilterByAttribute('size', movie.size);
                    }}
                    className="text-zinc-400 hover:text-amber-400 font-mono transition-colors"
                    title={`Filter by file size: ${movie.size}`}
                  >
                    {movie.size}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
