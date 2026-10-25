import React, { useRef, useState } from 'react';
import { Film, Star, Check, Building2 } from 'lucide-react';
import { Movie } from '../types';
import { getImageSource } from '../utils/googleDriveImage';
import { useLongPress } from '../utils/useLongPress';

interface MovieGridProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  selectedMovieIds: Set<string>;
  onToggleMovieSelection: (movieId: string) => void;
  onSelectMultipleMovies?: (movieIds: string[]) => void;
  selectionMode: boolean;
  cols?: number;
}

const formatStorageSize = (sizeInMB: number) => {
  if (isNaN(sizeInMB) || sizeInMB <= 0) return '0.00 GB';
  const sizeInGB = sizeInMB / 1000;
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: sizeInGB < 1000 ? 2 : 0,
    maximumFractionDigits: sizeInGB < 1000 ? 2 : 0,
  }).format(sizeInGB) + ' GB';
};

// Komponen kecil untuk menangani error gambar poster
const PosterImage = ({ src, alt }: { src: string; alt: string }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800/50 text-zinc-500">
        <Film className="w-8 h-8 mb-2 opacity-50" />
        <span className="text-[10px] uppercase font-bold tracking-wider">No Poster</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setHasError(true)}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      loading="lazy"
    />
  );
};

export const MovieGrid: React.FC<MovieGridProps> = ({
  movies,
  onSelectMovie,
  selectedMovieIds,
  onToggleMovieSelection,
  onSelectMultipleMovies,
  selectionMode,
  cols = 7,
}) => {
  const longPressHandlers = useLongPress(onToggleMovieSelection, !selectionMode);
  const lastSelectedIdRef = useRef<string | null>(null);

  if (movies.length === 0) {
    return (
      <div className="py-20 text-center rounded-2xl border border-dashed border-zinc-800 bg-[#0d0f16]/60">
        <Film className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-zinc-300">No movies found</h3>
      </div>
    );
  }

  const handleMovieClick = (e: React.MouseEvent, movie: Movie) => {
    if (selectionMode) {
      if (e.shiftKey && lastSelectedIdRef.current) {
        const lastIndex = movies.findIndex((m) => m.id === lastSelectedIdRef.current);
        const currentIndex = movies.findIndex((m) => m.id === movie.id);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeIds = movies.slice(start, end + 1).map((m) => m.id);
          
          if (onSelectMultipleMovies) {
            onSelectMultipleMovies(rangeIds);
          } else {
            rangeIds.forEach((id) => onToggleMovieSelection(id));
          }
        }
      } else {
        onToggleMovieSelection(movie.id);
      }
      lastSelectedIdRef.current = movie.id;
    } else {
      onSelectMovie(movie);
    }
  };

  return (
    <div
      className="grid gap-3 sm:gap-4 select-none"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      onPointerDown={longPressHandlers.onPointerDown}
      onPointerMove={longPressHandlers.onPointerMove}
      onPointerUp={longPressHandlers.onPointerUp}
      onPointerCancel={longPressHandlers.onPointerCancel}
      onContextMenu={longPressHandlers.onContextMenu}
      onClickCapture={longPressHandlers.onClickCapture}
    >
      {movies.map((movie) => {
        const isSelected = selectedMovieIds.has(movie.id);
        return (
          <div
            key={movie.id}
            data-selection-id={movie.id}
            data-keyboard-letter={movie.title.trim().charAt(0).toUpperCase()}
            onClick={(e) => handleMovieClick(e, movie)}
            // PERUBAHAN 1: rounded-xl diganti menjadi rounded-md agar lebih kotak
            className={`group relative flex flex-col cursor-pointer rounded-sm overflow-hidden bg-[#121520] border transition-all duration-200 select-none ${
              isSelected ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-zinc-800 hover:border-zinc-600'
            }`}
          >
            {/* Area Poster */}
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900 shrink-0 pointer-events-none">
              
              {/* PERUBAHAN 2: Menggunakan komponen PosterImage untuk fallback */}
              <PosterImage 
                src={getImageSource(movie.posterUrl)} 
                alt={movie.title} 
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

              {selectionMode && (
                <div className="absolute top-2 left-2 z-10">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shadow-sm ${isSelected ? 'bg-amber-400 border-amber-400' : 'bg-black/50 border-white/50'}`}>
                    {isSelected && <Check className="w-3.5 h-3.5 text-black" />}
                  </div>
                </div>
              )}
            </div>

            {/* Area Info */}
            <div className="p-2.5 flex flex-col gap-1.5 flex-1 bg-[#121520] pointer-events-none">
              
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex flex-col gap-0.5">
                  <h3 
                    className="text-[10px] sm:text-xs font-bold text-zinc-100 leading-tight line-clamp-2 group-hover:text-amber-400 transition-colors" 
                    title={movie.title}
                  >
                    {movie.title}
                  </h3>
                  {movie.uncensored && (
                    <span className="text-[8px] font-bold text-rose-500 uppercase tracking-wider">
                      Uncensored
                    </span>
                  )}
                </div>

                <div className="shrink-0 mt-0.5">
                  {movie.favorite ? (
                    <div className="w-3.5 h-3.5 rounded-full bg-zinc-700 flex items-center justify-center">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    </div>
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-zinc-700/50 flex items-center justify-center">
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-[8px] sm:text-[10px] text-zinc-400 font-mono">
                <span>{movie.year}</span>
                <span aria-hidden="true">·</span>
                <span>{movie.minutes}m</span>
                <span aria-hidden="true">·</span>
                <span className="text-zinc-300">{formatStorageSize(Number(movie.sizeBytes) || 0)}</span>
              </div>
              
              <div className="flex items-center gap-1 text-[8px] sm:text-[10px] text-zinc-500 truncate mt-0.5">
                <Building2 className="w-3 h-3 shrink-0" />
                <span className="truncate">{movie.studio}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};