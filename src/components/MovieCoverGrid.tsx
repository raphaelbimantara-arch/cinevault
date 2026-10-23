import React, { useState } from 'react';
import { Film } from 'lucide-react';
import { Movie } from '../types';
import { getImageSource } from '../utils/googleDriveImage';
import { useLongPress } from '../utils/useLongPress';

interface MovieCoverGridProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  selectedMovieIds: Set<string>;
  onToggleMovieSelection: (movieId: string) => void;
  selectionMode: boolean;
}

export const MovieCoverGrid: React.FC<MovieCoverGridProps> = ({
  movies,
  onSelectMovie,
  selectedMovieIds,
  onToggleMovieSelection,
  selectionMode,
}) => {
  const [cols, setCols] = useState(4);
  const longPressHandlers = useLongPress(onToggleMovieSelection, !selectionMode);

  if (movies.length === 0) {
    return (
      <div className="py-20 text-center rounded-2xl border border-dashed border-zinc-800 bg-[#0d0f16]/60">
        <Film className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-zinc-300">No movies match your criteria</h3>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6 bg-[#121520] border border-zinc-800 rounded-xl p-3">
        <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider shrink-0">Layout Size:</span>
        <input
          type="range"
          min="1"
          max="7"
          value={cols}
          onChange={(e) => setCols(Number(e.target.value))}
          aria-label="Movies per row"
          className="flex-1 min-w-[120px] max-w-xs h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
        />
        <span className="text-xs text-zinc-500 font-mono shrink-0">{cols} per row</span>
      </div>

      <div
        className="grid w-full min-w-0 gap-2 sm:gap-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        onPointerDown={longPressHandlers.onPointerDown}
        onPointerMove={longPressHandlers.onPointerMove}
        onPointerUp={longPressHandlers.onPointerUp}
        onPointerCancel={longPressHandlers.onPointerCancel}
        onContextMenu={longPressHandlers.onContextMenu}
        onClickCapture={longPressHandlers.onClickCapture}
      >
        {movies.map((movie) => (
          <div
            key={movie.id}
            data-selection-id={movie.id}
            onClick={() => onSelectMovie(movie)}
            className="group relative min-w-0 cursor-pointer"
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
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-900 border border-zinc-800 shadow-lg group-hover:border-amber-500/50 transition-all duration-300">
              <img
                src={getImageSource(movie.posterUrl)}
                alt={movie.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-transparent group-hover:bg-black/20 transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
