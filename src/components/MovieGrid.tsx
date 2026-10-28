import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Film, Star, Check, Building2 } from 'lucide-react';
import { Movie } from '../types';
import { getImageSource } from '../utils/googleDriveImage';
import { useLongPress } from '../utils/useLongPress';

interface MovieGridProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  selectedMovieIds: Set<string>;
  activeMovieId?: string | null;
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
      className="w-full h-full object-contain transition-none"
      loading="lazy"
    />
  );
};

export const MovieGrid: React.FC<MovieGridProps> = ({
  movies,
  onSelectMovie,
  selectedMovieIds,
  activeMovieId,
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

  const viewportRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(560);

  React.useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const updateSize = () => {
      setViewportHeight(element.clientHeight || 560);
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  // Two complete rows are the design target. Poster height is derived from the
  // real viewport, leaving room for title/meta beneath each image.
  const gap = 8;
  const rowHeight = Math.max(150, Math.floor((viewportHeight - gap) / 2));
  const posterHeight = Math.max(82, rowHeight - 70);
  const rowCount = Math.ceil(movies.length / cols);
  const firstRow = Math.max(0, Math.floor(scrollTop / rowHeight) - 1);
  const visibleRows = Math.ceil(viewportHeight / rowHeight) + 2;
  const lastRow = Math.min(rowCount, firstRow + visibleRows);
  const visibleRowsData = useMemo(() => {
    const rows: Movie[][] = [];
    for (let row = firstRow; row < lastRow; row++) {
      rows.push(movies.slice(row * cols, Math.min((row + 1) * cols, movies.length)));
    }
    return rows;
  }, [movies, firstRow, lastRow, cols]);

  const handleMovieClick = (e: React.MouseEvent, movie: Movie) => {
    if (selectionMode) {
      if (e.shiftKey && lastSelectedIdRef.current) {
        const lastIndex = movies.findIndex((m) => m.id === lastSelectedIdRef.current);
        const currentIndex = movies.findIndex((m) => m.id === movie.id);
        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeIds = movies.slice(start, end + 1).map((m) => m.id);
          if (onSelectMultipleMovies) onSelectMultipleMovies(rangeIds);
          else rangeIds.forEach((id) => onToggleMovieSelection(id));
        }
      } else {
        onToggleMovieSelection(movie.id);
      }
      lastSelectedIdRef.current = movie.id;
    } else {
      onSelectMovie(movie);
    }
  };

  const renderCard = (movie: Movie) => {
    const isSelected = selectedMovieIds.has(movie.id);
    const isActive = activeMovieId === movie.id;
    return (
      <div
        key={movie.id}
        data-selection-id={movie.id}
        data-keyboard-letter={movie.title.trim().charAt(0).toUpperCase()}
        onClick={(e) => handleMovieClick(e, movie)}
        aria-label={`${movie.title}, ${movie.year}, ${movie.resolution || 'resolution not set'}`}
        className={`group relative flex h-full min-w-0 cursor-pointer flex-col overflow-hidden border select-none transition-colors duration-100 ${isActive ? 'border-[#59b4df] bg-[#5bb2dc] ring-1 ring-inset ring-[#59b4df]' : isSelected ? 'border-sky-400 bg-[#243746] ring-1 ring-inset ring-sky-400/50' : 'border-[#303030] bg-[#111111] hover:border-[#5a5a5a]'}`}
      >
        <div className={`relative w-full shrink-0 overflow-hidden pointer-events-none ${isActive ? 'bg-[#cfcfcf]' : 'bg-[#080808]'}`} style={{ height: posterHeight }}>
          <PosterImage src={getImageSource(movie.posterUrl)} alt={movie.title} />
          <div className="absolute bottom-2 left-2 z-10 flex h-5 w-5 items-center justify-center text-white/90 drop-shadow-md">
            {selectionMode ? (
              <span className={`flex h-4 w-4 items-center justify-center border ${isSelected ? 'border-sky-300 bg-sky-400 text-black' : 'border-white/80 bg-black/25'}`}>{isSelected && <Check className="h-3 w-3" />}</span>
            ) : <Check className="h-5 w-5" strokeWidth={2.5} />}
          </div>
          {movie.favorite && <Star className="absolute right-2 top-2 z-10 h-4 w-4 fill-amber-400 text-amber-400 drop-shadow-md" />}
        </div>
        <div className={`flex min-h-0 flex-1 flex-col gap-1 px-1.5 py-1.5 pointer-events-none ${isActive ? 'bg-[#5bb2dc] text-white' : 'bg-[#111111]'}`}>
          <div className="min-w-0">
            <h3 className={`line-clamp-1 text-[11px] font-extrabold leading-tight sm:text-xs ${isActive ? 'text-white' : 'text-[#dedede] group-hover:text-sky-300'}`} title={movie.title}>{movie.title}</h3>
            {movie.uncensored && <span className={`text-[8px] font-bold uppercase tracking-wide ${isActive ? 'text-white/90' : 'text-rose-400'}`}>Uncensored</span>}
          </div>
          <div className={`mt-auto flex min-w-0 items-center justify-between gap-1 text-[9px] font-semibold sm:text-[10px] ${isActive ? 'text-white' : 'text-[#a7a7a7]'}`}>
            <span className="truncate">{movie.resolution || '—'}</span><span>{movie.year || '—'}</span>
          </div>
          <div className={`flex min-w-0 items-center justify-between gap-1 text-[9px] sm:text-[10px] ${isActive ? 'text-white/90' : 'text-[#777777]'}`}>
            <span className="truncate">{movie.minutes ? `${movie.minutes}m` : '—'}</span><span className="max-w-[55%] truncate">{movie.studio || ''}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={viewportRef}
      onScroll={handleScroll}
      className="cv-grid-scroll h-full min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain select-none"
      style={{ scrollbarWidth: 'auto', scrollbarColor: '#71717a #18181b' }}
    >
      <div style={{ height: firstRow * rowHeight }} aria-hidden="true" />
      <div className="flex flex-col gap-2 px-0.5 pb-1">
        {visibleRowsData.map((row, rowIndex) => (
          <div key={firstRow + rowIndex} className="grid min-w-0 gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, height: rowHeight }}
            onPointerDown={longPressHandlers.onPointerDown}
            onPointerMove={longPressHandlers.onPointerMove}
            onPointerUp={longPressHandlers.onPointerUp}
            onPointerCancel={longPressHandlers.onPointerCancel}
            onContextMenu={longPressHandlers.onContextMenu}
            onClickCapture={longPressHandlers.onClickCapture}
          >
            {row.map(renderCard)}
          </div>
        ))}
      </div>
      <div style={{ height: Math.max(0, rowCount - lastRow) * rowHeight }} aria-hidden="true" />
    </div>
  );
};