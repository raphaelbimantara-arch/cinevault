import React from 'react';
import { Building2, Calendar, Check, Clock, Film, HardDrive, Star } from 'lucide-react';
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
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
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
            <div className="flex flex-1 flex-col justify-between p-2 sm:p-3">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center justify-between gap-1">
                  <h4
                    className="min-w-0 truncate text-xs font-bold text-zinc-100 transition-colors group-hover:text-amber-400 cursor-pointer sm:text-sm"
                    title={movie.title}
                  >
                    {movie.title}
                  </h4>
                  {(movie.favorite || movie.reviewed) && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      {movie.favorite && (
                        <Star aria-label="Favorite" title="Favorite" className="h-3 w-3 fill-amber-400 text-amber-400 sm:h-3.5 sm:w-3.5" />
                      )}
                      {movie.reviewed && (
                        <Check aria-label="Review" title="Review" className="h-3 w-3 text-rose-400 sm:h-3.5 sm:w-3.5" />
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-zinc-300 sm:text-xs">
                  <span
                    className="inline-flex shrink-0 items-center gap-1 font-mono"
                    title={`Year: ${movie.year}`}
                  >
                    <Calendar className="h-3 w-3 shrink-0 text-zinc-500" />
                    <span>{movie.year}</span>
                  </span>
                  <span
                    className="inline-flex shrink-0 items-center gap-1 font-mono"
                    title={`Duration: ${movie.minutes} min`}
                  >
                    <Clock className="h-3 w-3 shrink-0 text-zinc-500" />
                    <span>{movie.minutes}m</span>
                  </span>
                </div>

                <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2 text-[10px] text-zinc-300 sm:text-xs">
                  <span className="inline-flex min-w-0 items-center gap-1" title={movie.studio}>
                    <Building2 className="h-3 w-3 shrink-0 text-zinc-500" />
                    <span className="truncate">{movie.studio}</span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 font-mono" title={`File size: ${movie.size}`}>
                    <HardDrive className="h-3 w-3 shrink-0 text-zinc-500" />
                    <span>{movie.size}</span>
                  </span>
                </div>
              </div>

              <div className="mt-2 flex min-w-0 items-center gap-1 overflow-hidden border-t border-zinc-800/80 pt-2">
                {getMovieGenres(movie.genre).map((genre) => (
                  <span
                    key={genre}
                    className="max-w-[75px] truncate rounded border border-zinc-700/60 bg-zinc-800/70 px-1.5 py-0.5 text-[9px] text-zinc-300 sm:text-[10px]"
                    title={genre}
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
