import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, Film, Pencil, Save, Star, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Movie, SortOption } from '../types';
import { useLongPress } from '../utils/useLongPress';
import { getMovieGenres } from '../utils/movieGenres';
import { getActorProfile } from '../data/actorsData';

type ListSortField = 'title' | 'year' | 'size' | 'minutes' | 'resolution' | 'actors' | 'studio' | 'genre';

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
  genre: string;
}

const toDraft = (movie: Movie): MovieEditDraft => ({
  title: movie.title,
  year: String(movie.year),
  size: movie.size.match(/\d+(?:[.,]\d+)?/)?.[0].replace('.', ',') || '',
  minutes: String(movie.minutes),
  resolution: movie.resolution || '',
  actors: movie.actors.join(', '),
  studio: movie.studio,
  genre: movie.genre,
});

const sanitizeSizeInput = (value: string) => {
  const numericValue = value.replace(/[^\d,]/g, '');
  const firstCommaIndex = numericValue.indexOf(',');
  if (firstCommaIndex < 0) return numericValue;
  return `${numericValue.slice(0, firstCommaIndex + 1)}${numericValue.slice(firstCommaIndex + 1).replace(/,/g, '')}`;
};

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
  const actorNames = [...new Set(
    catalogMovies.flatMap((movie) => movie.actors.map((actor) => actor.trim())).filter(Boolean),
  )].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const actorOptions: AutocompleteOption[] = actorNames.flatMap((name) => {
    const alias = getActorProfile(name).alias?.trim();
    return alias && alias.toLocaleLowerCase() !== name.toLocaleLowerCase()
      ? [{ label: name, value: name }, { label: `${alias} (${name})`, value: name }]
      : [name];
  });
  const studioOptions = [...new Set(
    catalogMovies.map((movie) => movie.studio.trim()).filter(Boolean),
  )].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const genreOptions = [...new Set(
    catalogMovies.flatMap((movie) => getMovieGenres(movie.genre)),
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
    genre: { asc: 'genre-asc', desc: 'genre-desc' },
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
      const sizeNumber = Number(draft.size.replace(',', '.'));
      if (!draft.title.trim()) {
        window.alert(`Movie title cannot be empty (${movie.title}).`);
        return;
      }
      if (!Number.isInteger(year) || year < 1 || !Number.isInteger(minutes) || minutes < 1) {
        window.alert(`Year and duration must be positive whole numbers (${movie.title}).`);
        return;
      }
      if (!draft.size || !Number.isFinite(sizeNumber) || sizeNumber <= 0) {
        window.alert(`Enter a valid movie size (${movie.title}).`);
        return;
      }

      const actors = draft.actors.split(/[|,;]/).map((actor) => actor.trim()).filter(Boolean);
      const genres = draft.genre.split(/[|,;]/).map((genre) => genre.trim()).filter(Boolean);
      updatedMovies.push({
        ...movie,
        title: draft.title.trim(),
        year,
        size: `${sizeNumber} GB`,
        sizeBytes: Math.round(sizeNumber * 1000),
        minutes,
        resolution: draft.resolution.trim() || undefined,
        actors: actors.length > 0 ? actors : ['Cast'],
        studio: draft.studio.trim() || movie.studio,
        genre: genres.length > 0 ? genres.join(', ') : movie.genre,
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
              className="w-[19%] overflow-hidden px-0.5 py-2 sm:px-3"
              aria-sort={
                sortBy === sortOptions.title.asc
                  ? 'ascending'
                  : sortBy === sortOptions.title.desc ? 'descending' : undefined
              }
            >
              <button
                type="button"
                onClick={() => onToggleSort('title')}
                className="hover:text-white"
                aria-label={`Sort by Title${sortBy === sortOptions.title.asc ? ' descending' : ' ascending'}`}
              >
                Title
              </button>
            </th>
            {renderSortHeader('year', 'Year', 'w-[8%] overflow-hidden px-0.5 py-2 text-center')}
            {renderSortHeader('size', 'Size', 'w-[10%] overflow-hidden px-0.5 py-2 text-center')}
            {renderSortHeader('minutes', 'Min', 'w-[7%] overflow-hidden px-0.5 py-2 text-center')}
            {renderSortHeader(
              'resolution',
              'Resolution',
              'w-[12%] overflow-hidden px-0.5 py-2 text-center',
              'Res.',
            )}
            {renderSortHeader('actors', 'Actor', 'w-[13%] overflow-hidden px-0.5 py-2 sm:px-3')}
            {renderSortHeader('studio', 'Studio', 'w-[13%] overflow-hidden px-0.5 py-2 sm:px-3')}
            {renderSortHeader('genre', 'Genre', 'w-[12%] overflow-hidden px-0.5 py-2 sm:px-3')}
            <th className="w-[6%] overflow-hidden px-0.5 py-2 text-right sm:px-2">
              {isEditing ? (
                <div className="inline-flex items-center justify-end gap-0.5">
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
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {movies.map((movie) => {
            const draft = drafts[movie.id];

            return (
              <tr
                key={movie.id}
                data-selection-id={isEditing ? undefined : movie.id}
                data-keyboard-letter={movie.title.trim().charAt(0).toUpperCase()}
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
                        onFocus={() => updateDraft(movie.id, 'title', '')}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => updateDraft(movie.id, 'title', event.target.value)}
                      />
                    ) : (
                      <div className="flex min-w-0 items-center gap-1 text-[9px] font-semibold text-zinc-100 transition-colors group-hover:text-amber-400 sm:text-sm" title={movie.uncensored ? `${movie.title} Uncensored` : movie.title}>
                        <span className="min-w-0 truncate">{movie.title}</span>
                        {movie.uncensored && (
                          <span className="shrink-0 text-[7px] font-bold uppercase tracking-wide text-rose-300 sm:text-[9px]">
                            Uncensored
                          </span>
                        )}
                      </div>
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
                      onFocus={() => updateDraft(movie.id, 'year', '')}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateDraft(movie.id, 'year', event.target.value)}
                    />
                  ) : movie.year}
                </td>
                <td className="overflow-hidden px-0.5 py-2 text-center font-mono text-[8px] text-zinc-300 sm:text-xs">
                  {isEditing && draft ? (
                    <div className="flex items-center gap-0.5">
                      <input
                        aria-label={`Edit size in GB for ${movie.title}`}
                        type="text"
                        inputMode="text"
                        pattern="[0-9,]*"
                        className={`${inputClassName} text-right`}
                        value={draft.size}
                        onFocus={() => updateDraft(movie.id, 'size', '')}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => updateDraft(movie.id, 'size', sanitizeSizeInput(event.target.value))}
                      />
                      <span className="shrink-0 text-[8px] text-zinc-400">GB</span>
                    </div>
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
                      onFocus={() => updateDraft(movie.id, 'minutes', '')}
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
                      clearOnFocus
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
                      clearOnFocus
                      onChange={(value) => updateDraft(movie.id, 'actors', value)}
                    />
                  ) : (
                    <span className="block truncate" title={movie.actors.join(', ')}>
                      {movie.actors.join(', ')}
                    </span>
                  )}
                </td>
                <td className={`px-0.5 py-2 text-[8px] text-zinc-300 sm:px-3 sm:text-xs ${isEditing ? 'relative z-20 overflow-visible' : 'overflow-hidden'}`}>
                  {isEditing && draft ? (
                    <AutocompleteInput
                      ariaLabel={`Edit studio for ${movie.title}`}
                      className={inputClassName}
                      value={draft.studio}
                      options={studioOptions}
                      clearOnFocus
                      onChange={(value) => updateDraft(movie.id, 'studio', value)}
                    />
                  ) : (
                    <span className="block truncate" title={movie.studio}>
                      {movie.studio}
                    </span>
                  )}
                </td>
                <td className={`px-0.5 py-2 text-[8px] text-zinc-300 sm:px-3 sm:text-xs ${isEditing ? 'relative z-20 overflow-visible' : 'overflow-hidden'}`}>
                  {isEditing && draft ? (
                    <AutocompleteInput
                      ariaLabel={`Edit genre for ${movie.title}`}
                      className={inputClassName}
                      value={draft.genre}
                      options={genreOptions}
                      tokenMode
                      clearOnFocus
                      onChange={(value) => updateDraft(movie.id, 'genre', value)}
                    />
                  ) : (
                    <span className="block truncate" title={movie.genre}>
                      {movie.genre}
                    </span>
                  )}
                </td>
                <td className="overflow-hidden px-0.5 py-2 sm:px-2">
                  {(movie.favorite || movie.reviewed) && (
                    <div className="flex items-center justify-end gap-1">
                      {movie.favorite && (
                        <Star aria-label="Favorite" title="Favorite" className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                      )}
                      {movie.reviewed && (
                        <Check aria-label="Review" title="Review" className="h-3 w-3 shrink-0 text-rose-400" />
                      )}
                    </div>
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
  options: AutocompleteOption[];
  tokenMode?: boolean;
  clearOnFocus?: boolean;
  onChange: (value: string) => void;
}

type AutocompleteOption = string | { label: string; value: string };

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  ariaLabel,
  className,
  value,
  options,
  tokenMode = false,
  clearOnFocus = false,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuId = useId();
  const query = tokenMode ? value.split(/[,;|]/).pop()?.trim() || '' : value.trim();
  const normalizedOptions = options.map((option) => typeof option === 'string'
    ? { label: option, value: option }
    : option);
  const suggestions = (query
    ? normalizedOptions.filter((option) => option.label.toLocaleLowerCase().startsWith(query.toLocaleLowerCase()))
    : normalizedOptions).slice(0, 8);

  const updateMenuPosition = () => {
    const input = inputRef.current;
    if (!input) return;
    const rect = input.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openBelow = spaceBelow >= spaceAbove;
    const maxHeight = Math.max(48, Math.min(192, (openBelow ? spaceBelow : spaceAbove) - 4));
    const top = openBelow ? rect.bottom + 4 : rect.top - maxHeight - 4;
    const width = Math.min(Math.max(rect.width, 160), window.innerWidth - 16);
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    setMenuPosition({ left, top, width, maxHeight });
  };

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [isOpen, value]);

  useEffect(() => {
    if (activeIndex >= 0) {
      document.getElementById(`${menuId}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, menuId]);

  const selectOption = (option: AutocompleteOption) => {
    const selectedValue = typeof option === 'string' ? option : option.value;
    if (!tokenMode) {
      onChange(selectedValue);
    } else {
      const lastSeparator = Math.max(value.lastIndexOf(','), value.lastIndexOf(';'), value.lastIndexOf('|'));
      if (lastSeparator < 0) {
        onChange(selectedValue);
      } else {
        const prefix = value.slice(0, lastSeparator + 1);
        const spacing = value.slice(lastSeparator + 1).match(/^\s*/)?.[0] || ' ';
        onChange(`${prefix}${spacing}${selectedValue}`);
      }
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <input
        ref={inputRef}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={menuId}
        aria-activedescendant={activeIndex >= 0 ? `${menuId}-option-${activeIndex}` : undefined}
        autoComplete="off"
        className={className}
        value={value}
        onFocus={() => {
          setActiveIndex(-1);
          if (clearOnFocus) onChange('');
          setIsOpen(true);
        }}
        onBlur={() => setIsOpen(false)}
        onChange={(event) => { onChange(event.target.value); setActiveIndex(-1); setIsOpen(true); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && suggestions.length > 0) {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((index) => index < 0 ? 0 : (index + 1) % suggestions.length);
          } else if (event.key === 'ArrowUp' && suggestions.length > 0) {
            event.preventDefault();
            setIsOpen(true);
            setActiveIndex((index) => index < 0 ? suggestions.length - 1 : (index - 1 + suggestions.length) % suggestions.length);
          } else if (event.key === 'Enter' && isOpen && activeIndex >= 0 && suggestions.length > 0) {
            event.preventDefault();
            selectOption(suggestions[activeIndex]);
          } else if (event.key === 'Escape') {
            setIsOpen(false);
          }
        }}
      />
      {isOpen && menuPosition && createPortal(
        <div
          id={menuId}
          role="listbox"
          className="overflow-y-auto rounded border border-zinc-700 bg-zinc-950 py-1 text-left shadow-xl"
          style={{
            position: 'fixed',
            zIndex: 1000,
            left: menuPosition.left,
            top: menuPosition.top,
            width: menuPosition.width,
            maxHeight: menuPosition.maxHeight,
          }}
        >
          {suggestions.length > 0 ? suggestions.map((option, index) => (
            <button
              key={`${option.label}-${option.value}`}
              id={`${menuId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`block w-full truncate px-2 py-1 text-left text-[10px] sm:text-xs ${activeIndex === index ? 'bg-zinc-800 text-white' : 'text-zinc-200 hover:bg-zinc-800'}`}
              title={option.label}
            >
              {option.label}
            </button>
          )) : query ? (
            <div className="whitespace-nowrap px-2 py-1 text-[9px] text-zinc-500 sm:text-xs">
              No match; this value will be added when saved.
            </div>
          ) : null}
        </div>,
        document.body,
      )}
    </div>
  );
};
