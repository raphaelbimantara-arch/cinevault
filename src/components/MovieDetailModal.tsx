import React, { useEffect, useMemo, useState } from 'react';
import { 
  X, 
  Film,
  Building2,
  Calendar,
  Clock,
  HardDrive,
  Star,
  Check,
  Edit3,
  Save,
  Trash2,
  Undo2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Movie } from '../types';
import { ALL_GENRES, ALL_STUDIOS } from '../data/initialMovies';
import { getImageSource } from '../utils/googleDriveImage';
import { getMovieGenres } from '../utils/movieGenres';
import { useHorizontalSwipe } from '../utils/useHorizontalSwipe';
import { useLongPress } from '../utils/useLongPress';
import { getActorProfile } from '../data/actorsData';

interface MovieDetailModalProps {
  movie: Movie | null;
  movies: Movie[];
  actorNames: string[];
  onClose: () => void;
  onNavigateMovie: (movie: Movie) => void;
  onSelectActor?: (actorName: string) => void;
  onFilterByAttribute?: (type: 'genre' | 'minutes' | 'size' | 'studio' | 'year' | 'resolution', value: string | number) => void;
  onUpdateMovie?: (updatedMovie: Movie) => void;
  onDeleteMovie?: (movieId: string) => void;
  onNotify?: (message: string) => void;
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({
  movie,
  movies,
  actorNames,
  onClose,
  onNavigateMovie,
  onSelectActor,
  onFilterByAttribute,
  onUpdateMovie,
  onDeleteMovie,
  onNotify,
}) => {
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [showLongPressActions, setShowLongPressActions] = useState(false);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editGenres, setEditGenres] = useState<string[]>([]);
  const [editStudio, setEditStudio] = useState('');
  const [editYear, setEditYear] = useState<string>('2024');
  const [editMinutes, setEditMinutes] = useState<string>('110');
  const [editSize, setEditSize] = useState('4.5');
  const [editResolution, setEditResolution] = useState('1080p HD');
  const [editPosterUrl, setEditPosterUrl] = useState('');
  const [editBackdropUrl, setEditBackdropUrl] = useState('');
  const [editActors, setEditActors] = useState<string[]>([]);
  const [editCastCount, setEditCastCount] = useState('');
  const [editFavorite, setEditFavorite] = useState(false);
  const [editUncensored, setEditUncensored] = useState(false);
  const [newActor, setNewActor] = useState('');
  const [editSavedToast, setEditSavedToast] = useState<string | null>(null);

  const genreOptions = useMemo(() => {
    const genres = new Map<string, string>();
    [...ALL_GENRES, ...movies.flatMap((item) => getMovieGenres(item.genre))].forEach((genre) => {
      const trimmed = genre.trim();
      if (trimmed && trimmed.toLowerCase() !== 'all' && !genres.has(trimmed.toLowerCase())) {
        genres.set(trimmed.toLowerCase(), trimmed);
      }
    });
    return [...genres.values()].sort((a, b) => a.localeCompare(b));
  }, [movies]);

  const studioOptions = useMemo(() => {
    const studios = new Map<string, string>();
    [...ALL_STUDIOS, ...movies.map((item) => item.studio)].forEach((studio) => {
      const trimmed = studio.trim();
      if (trimmed && trimmed.toLowerCase() !== 'all studios' && !studios.has(trimmed.toLowerCase())) {
        studios.set(trimmed.toLowerCase(), trimmed);
      }
    });
    return [...studios.values()].sort((a, b) => a.localeCompare(b));
  }, [movies]);

  const actorOptions = useMemo(() => {
    const actorStats = new Map<string, { name: string; count: number; lastUsed: number }>();
    actorNames.forEach((name) => {
      const trimmed = name.trim();
      if (trimmed) actorStats.set(trimmed.toLowerCase(), { name: trimmed, count: 0, lastUsed: 0 });
    });
    movies.forEach((m) => {
      const dateVal = new Date(m.addedDate || 0).getTime();
      m.actors.forEach((actor) => {
        const trimmed = actor.trim();
        if (!trimmed) return;
        const key = trimmed.toLowerCase();
        const existing = actorStats.get(key) || { name: trimmed, count: 0, lastUsed: 0 };
        actorStats.set(key, {
          name: trimmed,
          count: existing.count + 1,
          lastUsed: Math.max(existing.lastUsed, dateVal),
        });
      });
    });
    return [...actorStats.values()]
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        if (b.lastUsed !== a.lastUsed) return b.lastUsed - a.lastUsed;
        return a.name.localeCompare(b.name);
      })
      .map((stat) => stat.name);
  }, [movies, actorNames]);

  // In the edit form, always include the movie's existing actors in the options,
  // and keep selected actors at the top so they are immediately visible.
  const editActorOptions = useMemo(() => {
    const selectedByKey = new Map(editActors.map((name) => [name.trim().toLowerCase(), name.trim()]));
    const allByKey = new Map<string, string>();
    [...editActors, ...actorOptions].forEach((name) => {
      const trimmed = name.trim();
      if (trimmed && !allByKey.has(trimmed.toLowerCase())) allByKey.set(trimmed.toLowerCase(), trimmed);
    });
    return [...allByKey.values()].sort((a, b) => {
      const aSelected = selectedByKey.has(a.toLowerCase());
      const bSelected = selectedByKey.has(b.toLowerCase());
      if (aSelected !== bSelected) return aSelected ? -1 : 1;
      return a.localeCompare(b);
    });
  }, [actorOptions, editActors]);

  const resolutionOptions = useMemo(() => {
    const resolutions = new Map<string, string>();
    ['720p HD', '960p HD', '1080p HD', ...movies.map((item) => item.resolution || '')].forEach((resolution) => {
      const trimmed = resolution.trim();
      if (trimmed && !resolutions.has(trimmed.toLowerCase())) resolutions.set(trimmed.toLowerCase(), trimmed);
    });
    return [...resolutions.values()].sort((a, b) => a.localeCompare(b));
  }, [movies]);

  const toggleGenre = (genre: string) => {
    setEditGenres((current) => current.some((item) => item.toLowerCase() === genre.toLowerCase()) ? current.filter((item) => item.toLowerCase() !== genre.toLowerCase()) : [...current, genre]);
  };

  const toggleActor = (actor: string) => {
    setEditActors((current) => current.some((item) => item.toLowerCase() === actor.toLowerCase()) ? current.filter((item) => item.toLowerCase() !== actor.toLowerCase()) : [...current, actor]);
  };

  const addActor = () => {
    const actor = newActor.trim();
    if (!actor || !actorOptions.some((name) => name.toLowerCase() === actor.toLowerCase())) return;
    setEditActors((current) => current.some((item) => item.toLowerCase() === actor.toLowerCase()) ? current : [...current, actorOptions.find((name) => name.toLowerCase() === actor.toLowerCase())!]);
    setNewActor('');
  };

  useEffect(() => {
    if (movie) {
      setShowLongPressActions(false);
      setEditTitle(movie.title);
      setEditGenres(getMovieGenres(movie.genre));
      setEditStudio(movie.studio);
      setEditYear(String(movie.year));
      setEditMinutes(String(movie.minutes));
      let rawSize = movie.size.replace(/[^0-9.]/g, '');
      setEditSize(rawSize || '4.5');
      setEditResolution(movie.resolution || '1080p HD');
      setEditPosterUrl(movie.posterUrl);
      setEditBackdropUrl(movie.backdropUrl || '');
      setEditActors([...movie.actors]);
      setEditCastCount(movie.castCount === undefined ? '' : String(movie.castCount));
      setEditFavorite(movie.favorite === true);
      setEditUncensored(movie.uncensored === true);
      setNewActor('');
      setIsEditing(false);
      setEditSavedToast(null);
    }
  }, [movie?.id]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movie || !onUpdateMovie) return;
    if (!editTitle.trim()) { alert('Movie title cannot be empty.'); return; }

    const safeYear = parseInt(String(editYear).replace(/[^0-9]/g, ''), 10) || 2024;
    const safeMinutes = parseInt(String(editMinutes).replace(/[^0-9]/g, ''), 10) || 110;
    const cleanSizeString = String(editSize).replace(',', '.').replace(/[^0-9.]/g, '');
    const numericSize = parseFloat(cleanSizeString) || 4.5;
    const sizeBytes = Math.round(numericSize * 1000);
    const finalSizeString = `${numericSize} GB`;

    const updated: Movie = {
      ...movie,
      title: editTitle.trim(),
      genre: editGenres.join(', '),
      studio: editStudio.trim() || 'Independent Studio',
      year: safeYear,
      minutes: safeMinutes,
      size: finalSizeString,
      sizeBytes,
      resolution: editResolution.trim() || '1080p HD',
      posterUrl: getImageSource(editPosterUrl.trim() || movie.posterUrl),
      backdropUrl: getImageSource(editBackdropUrl.trim()),
      actors: editActors.length > 0 ? editActors : ['Cast'],
      castCount: editCastCount.trim() === '' ? undefined : Number(editCastCount),
      favorite: editFavorite,
      uncensored: editUncensored,
    };

    onUpdateMovie(updated);
    setIsEditing(false);
    setEditSavedToast('Movie details updated successfully!');
    setTimeout(() => setEditSavedToast(null), 3500);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomedImageUrl) setZoomedImageUrl(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, zoomedImageUrl]);

  const movieIndex = movies.findIndex((item) => item.id === movie?.id);
  
  const handlePrev = () => { if (movieIndex > 0) onNavigateMovie(movies[movieIndex - 1]); };
  const handleNext = () => { if (movieIndex >= 0 && movieIndex < movies.length - 1) onNavigateMovie(movies[movieIndex + 1]); };

  useEffect(() => {
    if (!movie || zoomedImageUrl) return;
    const handleNavigationKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); handleNext(); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); handlePrev(); }
    };
    window.addEventListener('keydown', handleNavigationKeyDown);
    return () => window.removeEventListener('keydown', handleNavigationKeyDown);
  }, [movie, movieIndex, movies, onNavigateMovie, zoomedImageUrl]);

  const swipeHandlers = useHorizontalSwipe(handleNext, handlePrev, !isEditing && !zoomedImageUrl);
  const longPressHandlers = useLongPress(() => setShowLongPressActions(true), !isEditing && !zoomedImageUrl);

  if (!movie) return null;

  return (
    <div className={isEditing ? "fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-6 pb-20 sm:pb-24 bg-black/85 backdrop-blur-md overflow-y-auto" : "fixed inset-y-0 right-0 z-40 flex justify-end bg-black/20"} onClick={onClose}>
      <div 
        className={`relative w-full ${isEditing ? 'max-w-[1200px] h-auto' : 'max-w-[460px] h-full'} bg-[#0f121b] border border-zinc-800 ${isEditing ? 'rounded-2xl my-auto' : 'rounded-none'} overflow-visible shadow-2xl text-left animate-in fade-in slide-in-from-right-3 duration-150 transition-all`}
        data-selection-id={movie.id}
        onClick={(e) => e.stopPropagation()}
        onClickCapture={(event) => {
          if (event.target instanceof Element && event.target.closest('[data-long-press-actions]')) return;
          longPressHandlers.onClickCapture(event);
        }}
        onPointerDown={(event) => {
          swipeHandlers.onPointerDown(event);
          longPressHandlers.onPointerDown(event);
        }}
        onPointerMove={longPressHandlers.onPointerMove}
        onPointerUp={(event) => {
          swipeHandlers.onPointerUp(event);
          longPressHandlers.onPointerUp();
        }}
        onPointerCancel={(event) => {
          swipeHandlers.onPointerCancel(event);
          longPressHandlers.onPointerCancel();
        }}
        onContextMenu={longPressHandlers.onContextMenu}
        style={{ touchAction: 'pan-y' }}
      >
        {!isEditing && (
          <div className="absolute right-3 top-3 z-[60] flex items-center gap-2">
            {onUpdateMovie && (
              <button type="button" onClick={(event) => { event.stopPropagation(); setIsEditing(true); }} className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-black/75 text-zinc-200 shadow-lg hover:border-amber-400 hover:bg-amber-400 hover:text-black" title="Edit movie details" aria-label="Edit movie details">
                <Edit3 className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={(event) => { event.stopPropagation(); onClose(); }} className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-black/75 text-zinc-200 shadow-lg hover:bg-amber-400 hover:text-black" title="Close movie details" aria-label="Close movie details">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        {
            movieIndex > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="absolute -left-14 sm:-left-20 top-1/2 -translate-y-1/2 z-50 flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400 hover:bg-amber-400 hover:text-zinc-950 transition-all border border-zinc-700/50 backdrop-blur-md shadow-lg cursor-pointer"
                title="Previous movie"
              >
                <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            )}

            {movieIndex >= 0 && movieIndex < movies.length - 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute -right-14 sm:-right-20 top-1/2 -translate-y-1/2 z-50 flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400 hover:bg-amber-400 hover:text-zinc-950 transition-all border border-zinc-700/50 backdrop-blur-md shadow-lg cursor-pointer"
                title="Next movie"
              >
                <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            )}

        {showLongPressActions && (
          <div data-long-press-actions className="flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-[#151926] px-3 py-2 sm:px-5 rounded-t-2xl" onPointerDown={(event) => event.stopPropagation()}>
            <span className="mr-auto text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Movie actions</span>
            <button type="button" onClick={() => { onUpdateMovie?.({ ...movie, favorite: !movie.favorite }); onNotify?.(movie.favorite ? 'Removed from favorite.' : 'Marked as favorite.'); setShowLongPressActions(false); }} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20"><Star className="h-3.5 w-3.5" />{movie.favorite ? 'Remove favorite' : 'Favorite'}</button>
            <button type="button" onClick={() => { onUpdateMovie?.({ ...movie, reviewed: !movie.reviewed }); onNotify?.(movie.reviewed ? 'Review mark removed.' : 'Marked for review.'); setShowLongPressActions(false); }} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"><Check className="h-3.5 w-3.5" />{movie.reviewed ? 'Remove review' : 'Review'}</button>
            <button type="button" onClick={() => { if (!window.confirm(`Delete "${movie.title}"? This cannot be undone.`)) return; onDeleteMovie?.(movie.id); setShowLongPressActions(false); onClose(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"><Trash2 className="h-3.5 w-3.5" />Delete</button>
            <button type="button" onClick={() => setShowLongPressActions(false)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800 hover:text-white">Close</button>
          </div>
        )}

        <div className={`grid ${isEditing ? 'grid-cols-1 md:grid-cols-12' : 'grid-cols-1'} gap-0 rounded-none overflow-hidden h-full`}>
          <div className={`${isEditing ? 'md:col-span-3' : 'col-span-1'} bg-zinc-950/70 p-3 sm:p-4 flex gap-2 items-center justify-center border-b md:border-b-0 md:border-r border-zinc-800/80 relative group/slider`}>
            
            <div onClick={() => setZoomedImageUrl(movie.posterUrl)} className="w-1/2 aspect-[3/4] rounded-lg overflow-hidden shadow-xl border border-zinc-700/60 relative cursor-pointer group" title="Click to enlarge cover">
              <img src={getImageSource(movie.posterUrl)} alt={`${movie.title} - Front`} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            </div>
            <div onClick={() => setZoomedImageUrl(movie.backdropUrl || movie.posterUrl)} className="w-1/2 aspect-[3/4] rounded-lg overflow-hidden shadow-xl border border-zinc-700/60 relative cursor-pointer group" title="Click to enlarge cover">
              <img src={getImageSource(movie.backdropUrl || movie.posterUrl)} alt={`${movie.title} - Back`} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            </div>

          </div>

          <div className={`${isEditing ? 'md:col-span-9' : 'col-span-1'} p-4 flex flex-col justify-between h-full overflow-y-auto custom-scrollbar`}>
            {editSavedToast && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                <Save className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{editSavedToast}</span>
              </div>
            )}

            {isEditing ? (
              <form onSubmit={handleSaveEdit} className="w-full space-y-4">
                <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-3 h-3" /> Edit Movie Details
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Title</label>
                      <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onFocus={(e) => e.target.select()} className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white focus:border-amber-400/60 outline-none" placeholder="Movie title" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Year</label>
                        <input type="text" inputMode="numeric" maxLength={4} value={editYear} onChange={(e) => setEditYear(e.target.value.replace(/[^0-9]/g, ''))} onFocus={(e) => e.target.select()} className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white font-mono outline-none" placeholder="2024" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Minutes</label>
                        <input type="text" inputMode="numeric" value={editMinutes} onChange={(e) => setEditMinutes(e.target.value.replace(/[^0-9]/g, ''))} onFocus={(e) => e.target.select()} className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white font-mono outline-none" placeholder="120" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Size (GB)</label>
                        <input type="text" inputMode="decimal" value={editSize} onChange={(e) => setEditSize(e.target.value.replace(/[^0-9.]/g, ''))} onFocus={(e) => e.target.select()} className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white font-mono outline-none" placeholder="14.5" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Resolution</label>
                        <select value={editResolution} onChange={(e) => setEditResolution(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white outline-none">
                          {resolutionOptions.map((resolution) => <option key={resolution} value={resolution} className="bg-[#121520]">{resolution}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Studio</label>
                      <input type="text" list="movie-detail-studios" value={editStudio} onChange={(e) => setEditStudio(e.target.value)} onFocus={(e) => e.target.select()} className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white outline-none" placeholder="e.g. Warner Bros." />
                      <datalist id="movie-detail-studios">{studioOptions.map((studio) => <option key={studio} value={studio} />)}</datalist>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <label className="block text-[10px] text-zinc-500 uppercase font-semibold">Actors</label>
                        <span className="text-[10px] text-zinc-500">{editActors.length} selected</span>
                      </div>
                      <div className="grid max-h-[14rem] grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 p-2">
                        {editActorOptions.map((actor) => (
                          <label key={actor} className={`flex min-w-0 cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-xs hover:bg-zinc-800 ${editActors.some((item) => item.toLowerCase() === actor.toLowerCase()) ? 'bg-amber-400/10 text-amber-300' : 'text-zinc-300'}`}>
                            <input type="checkbox" checked={editActors.some((item) => item.toLowerCase() === actor.toLowerCase())} onChange={() => toggleActor(actor)} className="h-3.5 w-3.5 shrink-0 accent-amber-400" />
                            <span className="truncate">{actor}</span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <select
                          value={newActor}
                          onChange={(e) => setNewActor(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addActor(); } }}
                          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none"
                          aria-label="Select an actor from the Actor menu"
                        >
                          <option value="">Select actor...</option>
                          {actorOptions.filter((name) => !editActors.some((selected) => selected.toLowerCase() === name.toLowerCase())).map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                        <button type="button" onClick={addActor} disabled={!newActor} className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50">Add</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Cast Count (Optional)</label>
                      <input type="text" inputMode="numeric" value={editCastCount} onChange={(e) => setEditCastCount(e.target.value.replace(/[^0-9]/g, ''))} onFocus={(e) => e.target.select()} className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white outline-none" placeholder="Auto" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200"><input type="checkbox" checked={editFavorite} onChange={(e) => setEditFavorite(e.target.checked)} className="h-3.5 w-3.5 accent-amber-400" /><Star className={`h-3.5 w-3.5 ${editFavorite ? 'fill-amber-400 text-amber-400' : 'text-zinc-500'}`} />Favorite</label>
                      <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200"><input type="checkbox" checked={editUncensored} onChange={(e) => setEditUncensored(e.target.checked)} className="h-3.5 w-3.5 accent-rose-400" />Uncensored</label>
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Front Cover URL</label>
                      <input type="text" value={editPosterUrl} onChange={(e) => setEditPosterUrl(e.target.value)} onFocus={(e) => e.target.select()} className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white outline-none text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Back Cover URL</label>
                      <input type="text" value={editBackdropUrl} onChange={(e) => setEditBackdropUrl(e.target.value)} onFocus={(e) => e.target.select()} className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white outline-none text-xs" />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <label className="block text-[10px] text-zinc-500 uppercase font-semibold">Genres</label>
                        <span className="text-[10px] text-zinc-500">{editGenres.length} selected</span>
                      </div>
                      <div className="grid max-h-32 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 p-2">
                        {genreOptions.map((genre) => (
                          <label key={genre} className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800">
                            <input type="checkbox" checked={editGenres.some((item) => item.toLowerCase() === genre.toLowerCase())} onChange={() => toggleGenre(genre)} className="h-3.5 w-3.5 shrink-0 accent-amber-400" />
                            <span className="truncate">{genre}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-zinc-800/60 sticky bottom-0 bg-[#0f121b] py-2">
                  <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs transition-colors shadow-sm"><Save className="w-3.5 h-3.5" />Save Changes</button>
                  <button type="button" onClick={() => setIsEditing(false)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors border border-zinc-700"><Undo2 className="w-3.5 h-3.5" />Cancel</button>
                </div>
              </form>
            ) : (
              /* ===== VIEW MODE ===== */
              <>
                <div>
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <h2 className="flex min-w-0 items-center gap-2 text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl">
                      <span className="min-w-0 truncate">{movie.title}</span>
                      {movie.uncensored && <span className="shrink-0 rounded-md border border-rose-500/40 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-300 sm:text-[10px]">Uncensored</span>}
                    </h2>
                    {(movie.favorite || movie.reviewed) && (
                      <div className="flex shrink-0 items-center gap-2">
                        {movie.favorite && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300"><Star aria-label="Favorite" title="Favorite" className="h-4 w-4 fill-amber-400 text-amber-400" />Favorite</span>}
                        {movie.reviewed && <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-300"><Check aria-label="Review" title="Review" className="h-4 w-4 text-rose-400" />Review</span>}
                      </div>
                    )}
                  </div>

                  {/* PERUBAHAN: text-xs diubah menjadi text-sm agar font informasi lebih besar */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div onClick={() => { if (onFilterByAttribute) { onClose(); onFilterByAttribute('year', movie.year); } }} className="flex items-center gap-2 text-zinc-400 hover:text-amber-300 cursor-pointer transition-colors group" title="Filter by year">
                  <Calendar className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" /><span className="font-mono">{movie.year}</span>
                </div>
                <div onClick={() => { if (onFilterByAttribute) { onClose(); onFilterByAttribute('studio', movie.studio); } }} className="flex items-center gap-2 text-zinc-400 hover:text-amber-300 cursor-pointer transition-colors group" title="Filter by studio">
                  <Building2 className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" /><span className="truncate">{movie.studio}</span>
                </div>
                <div onClick={() => { if (onFilterByAttribute) { onClose(); onFilterByAttribute('minutes', movie.minutes); } }} className="flex items-center gap-2 text-zinc-400 hover:text-amber-300 cursor-pointer transition-colors group" title="Filter by duration">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" /><span className="font-mono">{movie.minutes} min</span>
                </div>
                <div onClick={() => { if (onFilterByAttribute) { onClose(); onFilterByAttribute('size', movie.size); } }} className="flex items-center gap-2 text-zinc-400 hover:text-amber-300 cursor-pointer transition-colors group" title="Filter by file size">
                  <HardDrive className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" /><span className="font-mono">{movie.size}</span>
                </div>
                <button type="button" onClick={() => { if (!movie.resolution || !onFilterByAttribute) return; onClose(); onFilterByAttribute('resolution', movie.resolution); }} disabled={!movie.resolution || !onFilterByAttribute} className="flex min-w-0 items-center gap-2 text-left text-zinc-400 transition-colors enabled:cursor-pointer enabled:hover:text-amber-300 disabled:cursor-default" title={movie.resolution ? 'Show movies with this resolution' : 'Resolution unavailable'}>
                  <Film className="w-4 h-4 shrink-0 text-amber-400" /><span className="truncate text-sm font-semibold">{movie.resolution || 'Standard'}</span>
                </button>
                <div className="col-span-2 pt-1 border-t border-zinc-800/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <Film className="w-4 h-4 text-amber-400 shrink-0" />
                    {/* PERUBAHAN: text-xs diubah menjadi text-sm */}
                    <span className="text-sm text-zinc-400">Genre:</span>
                    {getMovieGenres(movie.genre).map((genre) => (
                      <button key={genre} type="button" onClick={() => { if (!onFilterByAttribute) return; onClose(); onFilterByAttribute('genre', genre); }} className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-400/20" title={`Filter library by ${genre}`}>{genre}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Starring Cast{(movie.castCount ?? movie.actors.length) > 1 && ` (${movie.castCount ?? movie.actors.length})`}</div>
                {/* PERUBAHAN: Font diperbesar (text-xs) dan padding ditambah (px-2.5 py-1.5) */}
                <div className="flex flex-wrap gap-2">
                  {movie.actors.map((actor) => {
                    const hasDob = Boolean(getActorProfile(actor).dob?.trim());
                    return (
                      <button
                        key={actor}
                        type="button"
                        onClick={() => onSelectActor?.(actor)}
                        className={`px-2.5 py-1.5 text-xs rounded-md bg-zinc-800 hover:bg-amber-400 hover:text-zinc-950 ${hasDob ? 'text-amber-400' : 'text-zinc-300'} border border-zinc-700 cursor-pointer transition-colors w-fit whitespace-nowrap`}
                        title={`View actor ${actor}`}
                      >
                        {actor}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>


          </>
            )}
          </div>
        </div>
      </div>

      {zoomedImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer" onClick={(e) => { e.stopPropagation(); setZoomedImageUrl(null); }}>
          <div className="relative max-w-[360px] w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-zinc-700 bg-black animate-in fade-in zoom-in-95 duration-150 cursor-default" onClick={(e) => e.stopPropagation()}>
            <button onClick={(e) => { e.stopPropagation(); setZoomedImageUrl(null); }} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center"><X className="w-4 h-4" /></button>
            <img src={getImageSource(zoomedImageUrl)} alt="Enlarged cover" referrerPolicy="no-referrer" className="w-full h-full object-cover bg-black" />
          </div>
        </div>
      )}
    </div>
  );
};