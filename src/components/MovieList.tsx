import React, { useState } from 'react';
import { Check, Film, Pencil, Save, Star, X } from 'lucide-react';
import { Movie, SortOption } from '../types';
import { useLongPress } from '../utils/useLongPress';

type ListSortField = 'title' | 'year' | 'size' | 'minutes' | 'resolution' | 'actors' | 'studio';

interface MovieListProps {
  movies: Movie[];
  catalogMovies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onUpdateMovie: (movie: Movie) => void;
  selectedMovieIds: Set<string>;
  onToggleMovieSelection: (movieId: string) => void;
  selectionMode: boolean;
  sortBy: SortOption;
  onToggleSort: (field: ListSortField) => void;
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
  catalogMovies,
  onSelectMovie,
  onUpdateMovie,
  selectedMovieIds,
  onToggleMovieSelection,
  selectionMode,
  sortBy,
  onToggleSort,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, MovieEditDraft>>({});
  const longPressHandlers = useLongPress(onToggleMovieSelection, !selectionMode);
  const inputClassName = 'w-full min-w-0 rounded border border-zinc-700 bg-zinc-950 px-0.5 py-1 text-[8px] text-zinc-100 focus:border-amber-400 focus:outline-none sm:px-1.5 sm:text-xs';
  const resolutionOptions = [...new Set(
    catalogMovies.map((movie) => movie.resolution?.trim()).filter((resolution): resolution is string => Boolean(resolution)),
  )].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const actorOptions = [...new Set(
    catalogMovies.flatMap((movie) => movie.actors.map((actor) => actor.trim())).filter(Boolean),
  )].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

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

  const sortOptions: Record<ListSortField, { asc: SortOption; desc: SortOption }> = {
    title: { asc: 'alphabet-asc', desc: 'alphabet-desc' },
    year: { asc: 'year-asc', desc: 'year-desc' },
    size: { asc: 'size-asc', desc: 'size-desc' },
    minutes: { asc: 'minutes-asc', desc: 'minutes-desc' },
    resolution: { asc: 'quality-asc', desc: 'quality-desc' },
    actors: { asc: 'actor-asc', desc: 'actor-desc' },
    studio: { asc: 'studio-asc', desc: 'studio-desc' },
  };

  const renderSortHeader = (
    field: ListSortField,
    label: string,
    className: string,
    mobileLabel?: string,
  ) => {
    const direction = sortBy === sortOptions[field].asc
      ? 'ascending'
      : sortBy === sortOptions[field].desc ? 'descending' : undefined;
    return (
      <th className={className} aria-sort={direction}>
        <button
          type="button"
          onClick={() => onToggleSort(field)}
          className="hover:text-white"
          aria-label={`Sort by ${label}${direction === 'ascending' ? ' descending' : ' ascending'}`}
        >
          {mobileLabel ? (
            <>
              <span className="sm:hidden">{mobileLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </>
          ) : label}
        </button>
      </th>
    );
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
              aria-sort={
                sortBy === sortOptions.title.asc
                  ? 'ascending'
                  : sortBy === sortOptions.title.desc ? 'descending' : undefined
              }
            >
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => onToggleSort('title')}
                  className="hover:text-white"
                  aria-label={`Sort by Title${sortBy === sortOptions.title.asc ? ' descending' : ' ascending'}`}
                >
                  Title
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
            {renderSortHeader('year', 'Year', 'w-[10%] overflow-hidden px-0.5 py-2 text-center')}
            {renderSortHeader('size', 'Size', 'w-[12%] overflow-hidden px-0.5 py-2 text-center')}
            {renderSortHeader('minutes', 'Min', 'w-[8%] overflow-hidden px-0.5 py-2 text-center')}
            {renderSortHeader(
              'resolution',
              'Resolution',
              'w-[13%] overflow-hidden px-0.5 py-2 text-center',
              'Res.',
            )}
            {renderSortHeader('actors', 'Actor', 'w-[17%] overflow-hidden px-0.5 py-2 sm:px-3')}
            {renderSortHeader('studio', 'Studio', 'w-[17%] overflow-hidden px-0.5 py-2 sm:px-3')}
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
                      type="text"
                      inputMode="numeric"
                      className={`${inputClassName} appearance-none`}
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
                      type="text"
                      inputMode="numeric"
                      className={`${inputClassName} appearance-none`}
                      value={draft.minutes}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateDraft(movie.id, 'minutes', event.target.value)}
                    />
                  ) : `${movie.minutes}m`}
                </td>
                <td className={`px-0.5 py-2 text-center text-[8px] text-zinc-300 sm:text-xs ${isEditing ? 'relative z-20 overflow-visible' : 'overflow-hidden'}`}>
                  {isEditing && draft ? (
                    <AutocompleteInput
                      ariaLabel={`Edit resolution for ${movie.title}`}
                      className={inputClassName}
                      value={draft.resolution}
                      options={resolutionOptions}
                      onChange={(value) => updateDraft(movie.id, 'resolution', value)}
                    />
                  ) : (
                    <span className="block truncate" title={movie.resolution || '—'}>
                      {movie.resolution || '—'}
                    </span>
                  )}
                </td>
                <td className={`px-0.5 py-2 text-[8px] text-zinc-300 sm:px-3 sm:text-xs ${isEditing ? 'relative z-20 overflow-visible' : 'overflow-hidden'}`}>
                  {isEditing && draft ? (
                    <AutocompleteInput
                      ariaLabel={`Edit actors for ${movie.title}`}
                      className={inputClassName}
                      value={draft.actors}
                      options={actorOptions}
                      tokenMode
                      onChange={(value) => updateDraft(movie.id, 'actors', value)}
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

interface AutocompleteInputProps {
  ariaLabel: string;
  className: string;
  value: string;
  options: string[];
  tokenMode?: boolean;
  onChange: (value: string) => void;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  ariaLabel,
  className,
  value,
  options,
  tokenMode = false,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const query = tokenMode ? value.split(/[,;|]/).pop()?.trim() || '' : value.trim();
  const suggestions = query
    ? options.filter((option) => option.toLocaleLowerCase().startsWith(query.toLocaleLowerCase())).slice(0, 8)
    : options.slice(0, 8);

  const selectOption = (option: string) => {
    if (!tokenMode) {
      onChange(option);
    } else {
      const lastSeparator = Math.max(value.lastIndexOf(','), value.lastIndexOf(';'), value.lastIndexOf('|'));
      if (lastSeparator < 0) {
        onChange(option);
      } else {
        const prefix = value.slice(0, lastSeparator + 1);
        const spacing = value.slice(lastSeparator + 1).match(/^\s*/)?.[0] || ' ';
        onChange(`${prefix}${spacing}${option}`);
      }
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <input
        aria-label={ariaLabel}
        autoComplete="off"
        className={className}
        value={value}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onChange={(event) => { onChange(event.target.value); setIsOpen(true); }}
      />
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-36 min-w-full max-w-[min(14rem,80vw)] overflow-y-auto rounded border border-zinc-700 bg-zinc-950 py-1 text-left shadow-xl">
          {suggestions.length > 0 ? suggestions.map((option) => (
            <button
              key={option}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option)}
              className="block w-full truncate px-2 py-1 text-left text-[10px] text-zinc-200 hover:bg-zinc-800 sm:text-xs"
              title={option}
            >
              {option}
            </button>
          )) : query ? (
            <div className="whitespace-nowrap px-2 py-1 text-[9px] text-zinc-500 sm:text-xs">
              No match; this value will be added when saved.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
