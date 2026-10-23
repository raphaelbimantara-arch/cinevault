import React from 'react';
import { Building2, Calendar, Check, Film, Star } from 'lucide-react';
import { Movie } from '../types';
import { getImageSource } from '../utils/googleDriveImage';
import { useLongPress } from '../utils/useLongPress';
import { getMovieGenres } from '../utils/movieGenres';

interface MovieGridProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  selectedMovieIds: Set<string>;
  onToggleMovieSelection: (movieId: string) => void;
  selectionMode: boolean;
}

export const MovieGrid: React.FC<MovieGridProps> = ({
  movies,
  onSelectMovie,
  selectedMovieIds,
  onToggleMovieSelection,
  selectionMode,
}) => {
  const longPressHandlers = useLongPress(onToggleMovieSelection, !selectionMode);

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
    <div
      className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
      onPointerDown={longPressHandlers.onPointerDown}
      onPointerMove={longPressHandlers.onPointerMove}
      onPointerUp={longPressHandlers.onPointerUp}
      onPointerCancel={longPressHandlers.onPointerCancel}
      onContextMenu={longPressHandlers.onContextMenu}
      onClickCapture={longPressHandlers.onClickCapture}
    >
      {movies.map((movie) => {
        return (
          <div
            key={movie.id}
            data-selection-id={movie.id}
            onClick={() => selectionMode
              ? onToggleMovieSelection(movie.id)
              : onSelectMovie(movie)}
            className="group relative flex flex-col bg-[#121520] rounded-xl border border-zinc-800/80 overflow-hidden hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-200"
          >
            {selectionMode && (
              <label
                onClick={(event) => event.stopPropagation()}
                className="absolute right-2 top-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-zinc-600 bg-zinc-950/85 shadow backdrop-blur-sm"
                title={`Select ${movie.title}`}
              >
                <input
                  type="checkbox"
                  checked={selectedMovieIds.has(movie.id)}
                  onChange={() => onToggleMovieSelection(movie.id)}
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Select ${movie.title}`}
                  className="h-4 w-4 cursor-pointer accent-amber-400"
                />
              </label>
            )}
            {/* Poster container with aspect 3:4 */}
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-900 cursor-pointer">
              <img
                src={getImageSource(movie.posterUrl)}
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
                className="hidden absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black items-center justify-center"
              >
                <Film className="w-8 h-8 text-amber-400" />
              </div>

            </div>

            {/* Card Content & Interactive Metadata Links */}
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex min-w-0 items-center justify-between gap-1">
                  <h4
                    className="min-w-0 truncate text-sm font-bold text-zinc-100 transition-colors group-hover:text-amber-400 cursor-pointer"
                    title={movie.title}
                  >
                    {movie.title}
                  </h4>
                  {(movie.favorite || movie.reviewed) && (
                    <div className="flex shrink-0 items-center gap-1">
                      {movie.favorite && (
                        <span title="Favorite" className="inline-flex items-center gap-0.5 text-[8px] font-semibold text-amber-300">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          <span>Favorite</span>
                        </span>
                      )}
                      {movie.reviewed && (
                        <span title="Review" className="inline-flex items-center gap-0.5 text-[8px] font-semibold text-rose-400">
                          <Check className="h-2.5 w-2.5" />
                          <span>Review</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-1 text-[10px] sm:text-[11px] text-zinc-400">
                  <span
                    className="truncate max-w-[80px] sm:max-w-[100px] text-left flex items-center gap-1"
                    title={movie.studio}
                  >
                    <Building2 className="w-2.5 h-2.5 shrink-0 text-zinc-500" />
                    <span className="truncate">{movie.studio}</span>
                  </span>

                  <span
                    className="font-mono flex items-center gap-0.5 shrink-0 text-[10px] sm:text-[11px]"
                    title={`Year: ${movie.year}`}
                  >
                    <Calendar className="w-2.5 h-2.5 text-zinc-500" />
                    <span>{movie.year}</span>
                  </span>
                </div>
              </div>

              {/* Bottom Quick interactive attributes: Genre, Minutes, Size */}
              <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-1 text-[9px] sm:text-[10px]">
                <div className="flex min-w-0 items-center gap-1 overflow-hidden">
                  {getMovieGenres(movie.genre).map((genre) => (
                    <span
                      key={genre}
                      className="px-1.5 py-0.5 rounded bg-zinc-800/70 text-zinc-300 border border-zinc-700/60 truncate max-w-[60px]"
                      title={genre}
                    >
                      {genre}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-zinc-400 font-mono" title={`Duration: ${movie.minutes} min`}>
                    {movie.minutes}m
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-400 font-mono" title={`File size: ${movie.size}`}>
                    {movie.size}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
