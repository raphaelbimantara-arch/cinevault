import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  cols: number;
  onColsChange: (cols: number) => void;
}

const GRID_GAP = 8;
const OVERSCAN_ROWS = 3;

export const MovieCoverGrid: React.FC<MovieCoverGridProps> = ({
  movies,
  onSelectMovie,
  selectedMovieIds,
  onToggleMovieSelection,
  selectionMode,
  cols,
  onColsChange,
}) => {
  const longPressHandlers = useLongPress(onToggleMovieSelection, !selectionMode);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(700);
  const [containerWidth, setContainerWidth] = useState(1200);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const measure = () => {
      setContainerWidth(element.clientWidth || 1200);
      setViewportHeight(element.clientHeight || 700);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Keep the new layout predictable when the user changes cover size.
  useEffect(() => {
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [cols]);

  const cardWidth = Math.max(1, (containerWidth - GRID_GAP * (cols - 1)) / cols);
  const rowHeight = cardWidth * 1.5 + GRID_GAP;
  const rowCount = Math.ceil(movies.length / cols);
  const firstRow = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN_ROWS);
  const visibleRows = Math.ceil(viewportHeight / rowHeight) + OVERSCAN_ROWS * 2;
  const lastRow = Math.min(rowCount, firstRow + visibleRows);
  const visibleMovies = useMemo(
    () => movies.slice(firstRow * cols, lastRow * cols),
    [movies, firstRow, lastRow, cols],
  );

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

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
      <div className="flex flex-wrap items-center gap-3 mb-3 bg-[#121520] border border-zinc-800 rounded-xl p-3">
        <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider shrink-0">Cover size:</span>
        <input
          type="range"
          min="6"
          max="22"
          step="1"
          value={cols}
          onChange={(event) => onColsChange(Number(event.target.value))}
          aria-label="Covers per row"
          className="flex-1 min-w-[140px] max-w-md h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
        />
        <span className="text-xs text-amber-300 font-mono shrink-0">{cols} covers per row</span>
      </div>

      <div
        ref={viewportRef}
        onScroll={handleScroll}
        className="h-[calc(100vh-245px)] min-h-[320px] overflow-x-hidden overflow-y-scroll overscroll-contain select-none [scrollbar-width:thin] [scrollbar-color:#fbbf24_#27272a]"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div
          className="grid w-full min-w-0 content-start select-none"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            columnGap: `${GRID_GAP}px`,
            rowGap: `${GRID_GAP}px`,
            paddingTop: `${firstRow * rowHeight}px`,
            paddingBottom: `${Math.max(0, rowCount - lastRow) * rowHeight}px`,
          }}
          onPointerDown={longPressHandlers.onPointerDown}
          onPointerMove={longPressHandlers.onPointerMove}
          onPointerUp={longPressHandlers.onPointerUp}
          onPointerCancel={longPressHandlers.onPointerCancel}
          onContextMenu={longPressHandlers.onContextMenu}
          onClickCapture={longPressHandlers.onClickCapture}
        >
          {visibleMovies.map((movie) => {
            const selected = selectedMovieIds.has(movie.id);
            return (
              <button
                key={movie.id}
                type="button"
                data-selection-id={movie.id}
                data-keyboard-letter={movie.title.trim().charAt(0).toUpperCase()}
                onClick={() => selectionMode ? onToggleMovieSelection(movie.id) : onSelectMovie(movie)}
                aria-label={selectionMode ? `Select ${movie.title}` : `Open ${movie.title}`}
                aria-pressed={selected}
                className={`group relative block min-w-0 w-full overflow-hidden aspect-[2/3] cursor-pointer rounded-sm border bg-zinc-900 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 ${selected ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-zinc-800 hover:border-amber-500/70'}`}
              >
                <img
                  src={getImageSource(movie.posterUrl)}
                  alt={movie.uncensored ? `${movie.title} Uncensored` : movie.title}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {selectionMode && (
                  <span className={`absolute right-1 bottom-1 z-10 flex h-4 w-4 items-center justify-center rounded-sm border text-[10px] font-bold shadow ${selected ? 'border-amber-300 bg-amber-400 text-black' : 'border-white/70 bg-black/60 text-transparent'}`}>
                    ✓
                  </span>
                )}
                {movie.uncensored && (
                  <span className="absolute bottom-1 left-1 rounded-sm bg-black/85 px-1 py-0.5 text-[7px] font-bold uppercase tracking-wide text-rose-300 sm:text-[9px]">Uncensored</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
