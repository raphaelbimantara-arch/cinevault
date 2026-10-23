import React, { useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ, Check, Film, Pencil, Save, Star, X } from 'lucide-react';
import { Movie } from '../types';
import { useLongPress } from '../utils/useLongPress';

interface MovieListProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onUpdateMovie: (movie: Movie) => void;
  selectedMovieIds: Set<string>;
  onToggleMovieSelection: (movieId: string) => void;
  selectionMode: boolean;
  sortDirection: 'asc' | 'desc' | null;
  onToggleTitleSort: () => void;
}

interface MovieEditDraft {
  title: string;
  year: string;
  size: string;
  minutes: string;
  resolution: string;
  actors: string;
}

export const MovieList: React.FC<MovieListProps> = ({
  movies,
  onSelectMovie,
  onUpdateMovie,
  selectedMovieIds,
  onToggleMovieSelection,
  selectionMode,
  sortDirection,
  onToggleTitleSort,
}) => {
  const [editingMovieId, setEditingMovieId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MovieEditDraft | null>(null);
  const longPressHandlers = useLongPress(onToggleMovieSelection, !selectionMode);

  const startEditing = (movie: Movie) => {
    setEditingMovieId(movie.id);
    setDraft({
      title: movie.title,
      year: String(movie.year),
      size: movie.size,
      minutes: String(movie.minutes),
      resolution: movie.resolution || '',
      actors: movie.actors.join(', '),
    });
  };

  const cancelEditing = () => {
    setEditingMovieId(null);
    setDraft(null);
  };

  const saveEditing = (movie: Movie) => {
    if (!draft || !draft.title.trim()) {
      window.alert('Movie title cannot be empty.');
      return;
    }

    const year = Number(draft.year);
    const minutes = Number(draft.minutes);
    const size = draft.size.trim();
    const sizeNumber = parseFloat(size.replace(/[^\d.]/g, ''));
    if (!Number.isInteger(year) || year < 1 || !Number.isInteger(minutes) || minutes < 1) {
      window.alert('Year and duration must be positive whole numbers.');
      return;
    }
    if (!size || !Number.isFinite(sizeNumber) || sizeNumber <= 0) {
      window.alert('Enter a valid movie size.');
      return;
    }
    const sizeMultiplier = /tb/i.test(size) ? 1000000 : /mb/i.test(size) ? 1 : 1000;
    const sizeBytes = Math.round(sizeNumber * sizeMultiplier);
    const actors = draft.actors.split(/[|,;]/).map((actor) => actor.trim()).filter(Boolean);

    onUpdateMovie({
      ...movie,
      title: draft.title.trim(),
      year,
      size,
      sizeBytes,
      minutes,
      resolution: draft.resolution.trim() || undefined,
      actors,
    });
    cancelEditing();
  };

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
      className="max-h-[calc(100vh-16rem)] min-h-[18rem] overflow-auto rounded-xl border border-zinc-800/80 bg-[#121520] shadow-lg"
      onPointerDown={longPressHandlers.onPointerDown}
      onPointerMove={longPressHandlers.onPointerMove}
      onPointerUp={longPressHandlers.onPointerUp}
      onPointerCancel={longPressHandlers.onPointerCancel}
      onContextMenu={longPressHandlers.onContextMenu}
      onClickCapture={longPressHandlers.onClickCapture}
    >
      <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-zinc-800 bg-[#0d0f16] text-[9px] font-semibold uppercase tracking-wide text-zinc-400 sm:text-[10px]">
            <th
              className="w-[24%] px-1.5 py-2 sm:px-3"
              aria-sort={sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : undefined}
            >
              <button
                type="button"
                onClick={onToggleTitleSort}
                className="inline-flex items-center gap-1 hover:text-white"
                aria-label={`Sort title ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
              >
                Title
                {sortDirection === 'asc' && <ArrowUpAZ className="h-3 w-3" />}
                {sortDirection === 'desc' && <ArrowDownAZ className="h-3 w-3" />}
              </button>
            </th>
            <th className="w-[8%] px-1 py-2 text-center">Year</th>
            <th className="w-[12%] px-1 py-2 text-center">Size</th>
            <th className="w-[8%] px-1 py-2 text-center">Min</th>
            <th className="w-[16%] px-1 py-2 text-center">Resolution</th>
            <th className="w-[21%] px-1.5 py-2 sm:px-3">Actor</th>
            <th className="w-[11%] px-1 py-2 text-center">Edit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {movies.map((movie) => {
            const isEditing = editingMovieId === movie.id && draft !== null;
            const inputClassName = 'w-full min-w-0 rounded border border-zinc-700 bg-zinc-950 px-1.5 py-1 text-[10px] text-zinc-100 focus:border-amber-400 focus:outline-none sm:text-xs';

            return (
              <tr
                key={movie.id}
                data-selection-id={isEditing ? undefined : movie.id}
                onClick={() => selectionMode
                  ? onToggleMovieSelection(movie.id)
                  : onSelectMovie(movie)}
                className={`group cursor-pointer transition-colors hover:bg-[#181d2c] ${isEditing ? 'bg-[#181d2c]' : ''}`}
              >
                <td className="px-1.5 py-2 sm:px-3">
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
                    {isEditing ? (
                      <input
                        aria-label={`Edit title for ${movie.title}`}
                        className={inputClassName}
                        value={draft.title}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                      />
                    ) : (
                      <div className="min-w-0 truncate text-[9px] font-semibold text-zinc-100 transition-colors group-hover:text-amber-400 sm:text-sm" title={movie.title}>
                        {movie.title}
                      </div>
                    )}
                    {!isEditing && movie.favorite && (
                      <Star aria-label="Favorite" title="Favorite" className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                    )}
                    {!isEditing && movie.reviewed && (
                      <Check aria-label="Review" title="Review" className="h-3 w-3 shrink-0 text-rose-400" />
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-1 py-2 text-center font-mono text-[9px] text-zinc-300 sm:text-xs">
                  {isEditing ? (
                    <input
                      aria-label={`Edit year for ${movie.title}`}
                      type="number"
                      className={inputClassName}
                      value={draft.year}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => setDraft({ ...draft, year: event.target.value })}
                    />
                  ) : movie.year}
                </td>
                <td className="whitespace-nowrap px-1 py-2 text-center font-mono text-[9px] text-zinc-300 sm:text-xs">
                  {isEditing ? (
                    <input
                      aria-label={`Edit size for ${movie.title}`}
                      className={inputClassName}
                      value={draft.size}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => setDraft({ ...draft, size: event.target.value })}
                    />
                  ) : movie.size}
                </td>
                <td className="whitespace-nowrap px-1 py-2 text-center font-mono text-[9px] text-zinc-300 sm:text-xs">
                  {isEditing ? (
                    <input
                      aria-label={`Edit duration for ${movie.title}`}
                      type="number"
                      min="1"
                      className={inputClassName}
                      value={draft.minutes}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => setDraft({ ...draft, minutes: event.target.value })}
                    />
                  ) : `${movie.minutes}m`}
                </td>
                <td className="px-1 py-2 text-center text-[8px] text-zinc-300 sm:text-xs">
                  {isEditing ? (
                    <input
                      aria-label={`Edit resolution for ${movie.title}`}
                      className={inputClassName}
                      value={draft.resolution}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => setDraft({ ...draft, resolution: event.target.value })}
                    />
                  ) : (
                    <span className="block truncate" title={movie.resolution || '—'}>
                      {movie.resolution || '—'}
                    </span>
                  )}
                </td>
                <td className="px-1.5 py-2 text-[8px] text-zinc-300 sm:px-3 sm:text-xs">
                  {isEditing ? (
                    <input
                      aria-label={`Edit actors for ${movie.title}`}
                      className={inputClassName}
                      value={draft.actors}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => setDraft({ ...draft, actors: event.target.value })}
                    />
                  ) : (
                    <span className="block truncate" title={movie.actors.join(', ')}>
                      {movie.actors.join(', ')}
                    </span>
                  )}
                </td>
                <td className="px-1 py-2 text-center">
                  {isEditing ? (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); saveEditing(movie); }}
                        title="Save changes"
                        aria-label={`Save edits for ${movie.title}`}
                        className="rounded p-1 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <Save className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); cancelEditing(); }}
                        title="Cancel editing"
                        aria-label={`Cancel edits for ${movie.title}`}
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => { event.stopPropagation(); startEditing(movie); }}
                      title="Edit movie"
                      aria-label={`Edit ${movie.title}`}
                      className="rounded p-1.5 text-zinc-400 hover:bg-amber-500/10 hover:text-amber-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
