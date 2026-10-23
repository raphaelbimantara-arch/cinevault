import React from 'react';
import { Check, Film, Star } from 'lucide-react';
import { Movie } from '../types';
import { useLongPress } from '../utils/useLongPress';

interface MovieListProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  selectedMovieIds: Set<string>;
  onToggleMovieSelection: (movieId: string) => void;
  selectionMode: boolean;
}

export const MovieList: React.FC<MovieListProps> = ({
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
      className="bg-[#121520] rounded-xl border border-zinc-800/80 overflow-hidden shadow-lg"
      onPointerDown={longPressHandlers.onPointerDown}
      onPointerMove={longPressHandlers.onPointerMove}
      onPointerUp={longPressHandlers.onPointerUp}
      onPointerCancel={longPressHandlers.onPointerCancel}
      onContextMenu={longPressHandlers.onContextMenu}
      onClickCapture={longPressHandlers.onClickCapture}
    >
      <table className="w-full table-fixed text-left border-collapse">
        <thead>
          <tr className="border-b border-zinc-800 bg-[#0d0f16]/90 text-[8px] sm:text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
            <th className="w-[27%] py-2 px-1.5 sm:px-3">Title</th>
            <th className="w-[9%] py-2 px-1 text-center">Year</th>
            <th className="w-[14%] py-2 px-1 text-center">Size</th>
            <th className="w-[10%] py-2 px-1 text-center">Min</th>
            <th className="w-[19%] py-2 px-1 text-center">Resolution</th>
            <th className="w-[21%] py-2 px-1.5 sm:px-3">Actor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {movies.map((movie) => (
            <tr
              key={movie.id}
              data-selection-id={movie.id}
              onClick={() => selectionMode
                ? onToggleMovieSelection(movie.id)
                : onSelectMovie(movie)}
              className="group hover:bg-[#181d2c] transition-colors cursor-pointer"
            >
              <td className="py-2 px-1.5 sm:px-3">
                <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                  {selectionMode && (
                    <input
                      type="checkbox"
                      checked={selectedMovieIds.has(movie.id)}
                      onChange={() => onToggleMovieSelection(movie.id)}
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`Select ${movie.title}`}
                      className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-amber-400"
                    />
                  )}
                  <div className="truncate font-semibold text-[9px] sm:text-sm text-zinc-100 group-hover:text-amber-400 transition-colors" title={movie.title}>
                    {movie.title}
                  </div>
                  {movie.favorite && (
                    <span title="Favorite" className="inline-flex shrink-0 items-center gap-0.5 text-[8px] text-amber-300">
                      <Star className="h-3 w-3 fill-current" />
                      <span className="hidden sm:inline">Favorite</span>
                    </span>
                  )}
                  {movie.reviewed && (
                    <span title="Review" className="inline-flex shrink-0 items-center gap-0.5 text-[8px] text-rose-400">
                      <Check className="h-3 w-3" />
                      <span className="hidden sm:inline">Review</span>
                    </span>
                  )}
                </div>
              </td>
              <td className="py-2 px-1 text-center whitespace-nowrap font-mono text-[9px] sm:text-xs text-zinc-300">
                {movie.year}
              </td>
              <td className="py-2 px-1 text-center whitespace-nowrap font-mono text-[9px] sm:text-xs text-zinc-300">
                {movie.size}
              </td>
              <td className="py-2 px-1 text-center whitespace-nowrap font-mono text-[9px] sm:text-xs text-zinc-300">
                {movie.minutes}m
              </td>
              <td className="py-2 px-1 text-center text-[8px] sm:text-xs text-zinc-300">
                <span className="block truncate" title={movie.resolution || '—'}>
                  {movie.resolution || '—'}
                </span>
              </td>
              <td className="py-2 px-1.5 sm:px-3 text-[8px] sm:text-xs text-zinc-300">
                <span className="block truncate" title={movie.actors.join(', ')}>
                  {movie.actors.join(', ')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
