import React, { useState } from 'react';
import { Film } from 'lucide-react';
import { Movie } from '../types';
import { getImageSource } from '../utils/googleDriveImage';

interface MovieCoverGridProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onFilterByAttribute: (type: 'genre' | 'studio' | 'year' | 'minutes' | 'size', value: string | number) => void;
}

const GRID_COLS_MAP: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

export const MovieCoverGrid: React.FC<MovieCoverGridProps> = ({
  movies,
  onSelectMovie,
}) => {
  const [cols, setCols] = useState(4);

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
          max="6"
          value={cols}
          onChange={(e) => setCols(Number(e.target.value))}
          className="flex-1 min-w-[120px] max-w-xs h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
        />
        <span className="text-xs text-zinc-500 font-mono shrink-0">{cols} per row</span>
      </div>

      <div className={`grid ${cols === 1 ? 'grid-cols-1' : cols === 2 ? 'grid-cols-2' : `grid-cols-2 sm:grid-cols-3 md:${GRID_COLS_MAP[cols]}`} gap-3 sm:gap-6`}>
        {movies.map((movie) => (
          <div
            key={movie.id}
            onClick={() => onSelectMovie(movie)}
            className="group relative cursor-pointer"
          >
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
