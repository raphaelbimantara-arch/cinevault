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
  studio: string;
}

const toDraft = (movie: Movie): MovieEditDraft => ({
  title: movie.title,
  year: String(movie.year),
  size: movie.size,
  minutes: String(movie.minutes),
  resolution: movie.resolution || '',
  actors: movie.actors.join(', '),
  studio: movie.studio,
});

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
  const [isEditing, setIsEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, MovieEditDraft>>({});
  const longPressHandlers = useLongPress(onToggleMovieSelection, !selectionMode);
  const inputClassName = 'w-full min-w-0 rounded border border-zinc-700 bg-zinc-950 px-0.5 py-1 text-[8px] text-zinc-100 focus:border-amber-400 focus:outline-none sm:px-1.5 sm:text-xs';

  const startEditing = () => {
    setDrafts(Object.fromEntries(movies.map((movie) => [movie.id, toDraft(movie)])));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDrafts({});
  };

  const updateDraft = (movieId: string, field: keyof MovieEditDraft, value: string) => {
    setDrafts((current) => ({
      ...current,
      [movieId]: { ...current[movieId], [field]: value },
    }));
  };

  const saveEditing = () => {
    const updatedMovies: Movie[] = [];

    for (const movie of movies) {
      const draft = drafts[movie.id];
      if (!draft) continue;

      const year = Number(draft.year);
      const minutes = Number(draft.minutes);
      const size = draft.size.trim();
      const sizeNumber = parseFloat(size.replace(/[^\d.]/g, ''));
      if (!draft.title.trim()) {
        window.alert(`Movie title cannot be empty (${movie.title}).`);
        return;
      }
      if (!Number.isInteger(year) || year < 1 || !Number.isInteger(minutes) || minutes < 1) {
        window.alert(`Year and duration must be positive whole numbers (${movie.title}).`);
        return;
      }
      if (!size || !Number.isFinite(sizeNumber) || sizeNumber <= 0) {
        window.alert(`Enter a valid movie size (${movie.title}).`);
        return;
      }

      const sizeMultiplier = /tb/i.test(size) ? 1000000 : /mb/i.test(size) ? 1 : 1000;
      const actors = draft.actors.split(/[|,;]/).map((actor) => actor.trim()).filter(Boolean);
      updatedMovies.push({
        ...movie,
        title: draft.title.trim(),
        year,
        size,
        sizeBytes: Math.round(sizeNumber * sizeMultiplier),
        minutes,
        resolution: draft.resolution.trim() || undefined,
        actors: actors.length > 0 ? actors : ['Cast'],
        studio: draft.studio.trim() || movie.studio,
      });
    }

    updatedMovies.forEach(onUpdateMovie);
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
      className="max-h-[calc(100vh-16rem)] min-h-[18rem] overflow-x-hidden overflow-y-auto rounded-xl border border-zinc-800/80 bg-[#121520] shadow-lg"
      onPointerDown={longPressHandlers.onPointerDown}
      onPointerMove={longPressHandlers.onPointerMove}
      onPointerUp={longPressHandlers.onPointerUp}
      onPointerCancel={longPressHandlers.onPointerCancel}
      onContextMenu={longPressHandlers.onContextMenu}
      onClickCapture={longPressHandlers.onClickCapture}
    >
      <table className="w-full table-fixed border-collapse text-left">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-zinc-800 bg-[#0d0f16] text-[9px] font-semibold uppercase tracking-wide text-zinc-400 sm:text-[10px]">
            <th
              className="w-[23%] overflow-hidden px-0.5 py-2 sm:px-3"
              aria-sort={sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : undefined}
            >
              <div className="flex items-center justify-between gap-1">
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
                {isEditing ? (
                  <div className="inline-flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={saveEditing}
                      title="Save all changes"
                      aria-label="Save all movie edits"
                      className="rounded p-1 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <Save className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      title="Cancel editing"
                      aria-label="Cancel all movie edits"
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={startEditing}
                    title="Edit list"
                    aria-label="Edit movie list"
                    className="rounded p-1 text-zinc-400 hover:bg-amber-500/10 hover:text-amber-300"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </th>
            <th className="w-[10%] overflow-hidden px-0.5 py-2 text-center">Year</th>
            <th className="w-[12%] overflow-hidden px-0.5 py-2 text-center">Size</th>
            <th className="w-[8%] overflow-hidden px-0.5 py-2 text-center">Min</th>
            <th className="w-[13%] overflow-hidden px-0.5 py-2 text-center">
              <span className="sm:hidden">Res.</span>
              <span className="hidden sm:inline">Resolution</span>
            </th>
            <th className="w-[17%] overflow-hidden px-0.5 py-2 sm:px-3">Actor</th>
            <th className="w-[17%] overflow-hidden px-0.5 py-2 sm:px-3">Studio</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {movies.map((movie) => {
            const draft = drafts[movie.id];

            return (
              <tr
                key={movie.id}
                data-selection-id={isEditing ? undefined : movie.id}
                onClick={() => {
                  if (isEditing) return;
                  if (selectionMode) onToggleMovieSelection(movie.id);
                  else onSelectMovie(movie);
                }}
                className={`group cursor-pointer transition-colors hover:bg-[#181d2c] ${isEditing ? 'bg-[#181d2c]' : ''}`}
              >
                <td className="overflow-hidden px-0.5 py-2 sm:px-3">
                  <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                    {selectionMode && !isEditing && (
                      <input
                        type="checkbox"
                        checked={selectedMovieIds.has(movie.id)}
                        onChange={() => onToggleMovieSelection(movie.id)}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Select ${movie.title}`}
                        className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-amber-400"
                      />
                    )}
                    {isEditing && draft ? (
                      <input
                        aria-label={`Edit title for ${movie.title}`}
                        className={inputClassName}
                        value={draft.title}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => updateDraft(movie.id, 'title', event.target.value)}
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
                <td className="overflow-hidden px-0.5 py-2 text-center font-mono text-[8px] text-zinc-300 sm:text-xs">
                  {isEditing && draft ? (
                    <input
                      aria-label={`Edit year for ${movie.title}`}
                      type="number"
                      className={inputClassName}
                      value={draft.year}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateDraft(movie.id, 'year', event.target.value)}
                    />
                  ) : movie.year}
                </td>
                <td className="overflow-hidden px-0.5 py-2 text-center font-mono text-[8px] text-zinc-300 sm:text-xs">
                  {isEditing && draft ? (
                    <input
                      aria-label={`Edit size for ${movie.title}`}
                      className={inputClassName}
                      value={draft.size}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateDraft(movie.id, 'size', event.target.value)}
                    />
                  ) : movie.size}
                </td>
                <td className="overflow-hidden px-0.5 py-2 text-center font-mono text-[8px] text-zinc-300 sm:text-xs">
                  {isEditing && draft ? (
                    <input
                      aria-label={`Edit duration for ${movie.title}`}
                      type="number"
                      min="1"
                      className={inputClassName}
                      value={draft.minutes}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateDraft(movie.id, 'minutes', event.target.value)}
                    />
                  ) : `${movie.minutes}m`}
                </td>
                <td className="overflow-hidden px-0.5 py-2 text-center text-[8px] text-zinc-300 sm:text-xs">
                  {isEditing && draft ? (
                    <input
                      aria-label={`Edit resolution for ${movie.title}`}
                      className={inputClassName}
                      value={draft.resolution}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateDraft(movie.id, 'resolution', event.target.value)}
                    />
                  ) : (
                    <span className="block truncate" title={movie.resolution || '—'}>
                      {movie.resolution || '—'}
                    </span>
                  )}
                </td>
                <td className="overflow-hidden px-0.5 py-2 text-[8px] text-zinc-300 sm:px-3 sm:text-xs">
                  {isEditing && draft ? (
                    <input
                      aria-label={`Edit actors for ${movie.title}`}
                      className={inputClassName}
                      value={draft.actors}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateDraft(movie.id, 'actors', event.target.value)}
                    />
                  ) : (
                    <span className="block truncate" title={movie.actors.join(', ')}>
                      {movie.actors.join(', ')}
                    </span>
                  )}
                </td>
                <td className="overflow-hidden px-0.5 py-2 text-[8px] text-zinc-300 sm:px-3 sm:text-xs">
                  {isEditing && draft ? (
                    <input
                      aria-label={`Edit studio for ${movie.title}`}
                      className={inputClassName}
                      value={draft.studio}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateDraft(movie.id, 'studio', event.target.value)}
                    />
                  ) : (
                    <span className="block truncate" title={movie.studio}>
                      {movie.studio}
                    </span>
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
