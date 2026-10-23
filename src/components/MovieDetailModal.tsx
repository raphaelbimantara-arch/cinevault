import React, { useEffect, useMemo, useState } from 'react';
import { 
  X, 
  Users,
  Film,
  Building2,
  Calendar,
  Clock,
  HardDrive,
  Star,
  Check,
  Edit3,
  Save,
  Undo2
} from 'lucide-react';
import { Movie } from '../types';
import { ALL_GENRES, ALL_STUDIOS } from '../data/initialMovies';
import { getImageSource } from '../utils/googleDriveImage';
import { getMovieGenres } from '../utils/movieGenres';
import { useHorizontalSwipe } from '../utils/useHorizontalSwipe';

interface MovieDetailModalProps {
  movie: Movie | null;
  movies: Movie[];
  onClose: () => void;
  onNavigateMovie: (movie: Movie) => void;
  onSelectActor?: (actorName: string) => void;
  onFilterByAttribute?: (type: 'genre' | 'minutes' | 'size' | 'studio' | 'year', value: string | number) => void;
  onUpdateMovie?: (updatedMovie: Movie) => void;
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({
  movie,
  movies,
  onClose,
  onNavigateMovie,
  onSelectActor,
  onFilterByAttribute,
  onUpdateMovie,
}) => {
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editGenres, setEditGenres] = useState<string[]>([]);
  const [editStudio, setEditStudio] = useState('');
  const [editYear, setEditYear] = useState<number>(2024);
  const [editMinutes, setEditMinutes] = useState<number>(110);
  const [editSize, setEditSize] = useState('4.5 GB');
  const [editResolution, setEditResolution] = useState('1080p HD');
  const [editPosterUrl, setEditPosterUrl] = useState('');
  const [editBackdropUrl, setEditBackdropUrl] = useState('');
  const [editActors, setEditActors] = useState<string[]>([]);
  const [editCastCount, setEditCastCount] = useState('');
  const [editFavorite, setEditFavorite] = useState(false);
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
    const actors = new Map<string, string>();
    movies.flatMap((item) => item.actors).forEach((actor) => {
      const trimmed = actor.trim();
      if (trimmed && !actors.has(trimmed.toLowerCase())) {
        actors.set(trimmed.toLowerCase(), trimmed);
      }
    });
    return [...actors.values()].sort((a, b) => a.localeCompare(b));
  }, [movies]);

  const resolutionOptions = useMemo(() => {
    const resolutions = new Map<string, string>();
    ['720p HD', '960p HD', '1080p HD', ...movies.map((item) => item.resolution || '')].forEach((resolution) => {
      const trimmed = resolution.trim();
      if (trimmed && !resolutions.has(trimmed.toLowerCase())) {
        resolutions.set(trimmed.toLowerCase(), trimmed);
      }
    });
    return [...resolutions.values()].sort((a, b) => a.localeCompare(b));
  }, [movies]);

  const toggleGenre = (genre: string) => {
    setEditGenres((current) =>
      current.some((item) => item.toLowerCase() === genre.toLowerCase())
        ? current.filter((item) => item.toLowerCase() !== genre.toLowerCase())
        : [...current, genre]
    );
  };

  const toggleActor = (actor: string) => {
    setEditActors((current) =>
      current.some((item) => item.toLowerCase() === actor.toLowerCase())
        ? current.filter((item) => item.toLowerCase() !== actor.toLowerCase())
        : [...current, actor]
    );
  };

  const addActor = () => {
    const actor = newActor.trim();
    if (!actor) return;
    setEditActors((current) =>
      current.some((item) => item.toLowerCase() === actor.toLowerCase()) ? current : [...current, actor]
    );
    setNewActor('');
  };

  // Reset & sync states when movie changes
  useEffect(() => {
    if (movie) {
      setEditTitle(movie.title);
      setEditGenres(getMovieGenres(movie.genre));
      setEditStudio(movie.studio);
      setEditYear(movie.year);
      setEditMinutes(movie.minutes);
      setEditSize(movie.size);
      setEditResolution(movie.resolution || '1080p HD');
      setEditPosterUrl(movie.posterUrl);
      setEditBackdropUrl(movie.backdropUrl || '');
      setEditActors([...movie.actors]);
      setEditCastCount(movie.castCount === undefined ? '' : String(movie.castCount));
      setEditFavorite(movie.favorite === true);
      setNewActor('');
      setIsEditing(false);
      setEditSavedToast(null);
    }
  }, [movie?.id]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movie || !onUpdateMovie) return;
    if (!editTitle.trim()) {
      alert('Movie title cannot be empty.');
      return;
    }

    const sizeNum = parseFloat(editSize.replace(/[^\d.]/g, '')) || 4.5;
    const isTB = /tb/i.test(editSize);
    const sizeBytes = Math.round(sizeNum * (isTB ? 1000000 : 1000));

    const updated: Movie = {
      ...movie,
      title: editTitle.trim(),
      genre: editGenres.join(', ') || 'Drama',
      studio: editStudio.trim() || 'Independent Studio',
      year: Number(editYear) || 2024,
      minutes: Number(editMinutes) || 110,
      size: editSize.trim() || '4.5 GB',
      sizeBytes,
      resolution: editResolution.trim() || '1080p HD',
      posterUrl: getImageSource(editPosterUrl.trim() || movie.posterUrl),
      backdropUrl: getImageSource(editBackdropUrl.trim()),
      actors: editActors.length > 0 ? editActors : ['Cast'],
      castCount: editCastCount.trim() === '' ? undefined : Number(editCastCount),
      favorite: editFavorite,
    };

    onUpdateMovie(updated);
    setIsEditing(false);
    setEditSavedToast('Movie details updated successfully!');
    setTimeout(() => setEditSavedToast(null), 3500);
  };

  // ESC key listener to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomedImageUrl) {
          setZoomedImageUrl(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, zoomedImageUrl]);

  const movieIndex = movies.findIndex((item) => item.id === movie?.id);
  const swipeHandlers = useHorizontalSwipe(
    () => {
      if (movieIndex >= 0 && movieIndex < movies.length - 1) onNavigateMovie(movies[movieIndex + 1]);
    },
    () => {
      if (movieIndex > 0) onNavigateMovie(movies[movieIndex - 1]);
    },
    !isEditing && !zoomedImageUrl
  );

  if (!movie) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-6 pb-20 sm:pb-24 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-[#0f121b] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl my-auto text-left animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={swipeHandlers.onPointerDown}
        onPointerUp={swipeHandlers.onPointerUp}
        onPointerCancel={swipeHandlers.onPointerCancel}
        style={{ touchAction: 'pan-y' }}
      >
          {/* Modal Body Container */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
            {/* Left Column: Front & Back Posters */}
            <div className="md:col-span-5 bg-zinc-950/70 p-3 sm:p-4 flex gap-2 items-center justify-center border-b md:border-b-0 md:border-r border-zinc-800/80">
              <div 
                onClick={() => setZoomedImageUrl(movie.posterUrl)}
                className="w-1/2 aspect-[3/4] rounded-lg overflow-hidden shadow-xl border border-zinc-700/60 relative cursor-pointer group"
                title="Click to enlarge cover (phone width)"
              >
                <img
                  src={getImageSource(movie.posterUrl)}
                  alt={`${movie.title} - Front`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div 
                onClick={() => setZoomedImageUrl(movie.backdropUrl || movie.posterUrl)}
                className="w-1/2 aspect-[3/4] rounded-lg overflow-hidden shadow-xl border border-zinc-700/60 relative cursor-pointer group"
                title="Click to enlarge cover (phone width)"
              >
                <img
                  src={getImageSource(movie.backdropUrl || movie.posterUrl)}
                  alt={`${movie.title} - Back`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
            </div>

          {/* Right Column: Title and Details */}
          <div className="md:col-span-7 p-4 flex flex-col justify-between">
            {/* Success Toast */}
            {editSavedToast && (
              <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                <Save className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{editSavedToast}</span>
              </div>
            )}

            {isEditing ? (
              /* ===== EDIT MODE ===== */
              <form onSubmit={handleSaveEdit} className="space-y-3 w-full">
                <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-3 h-3" />
                  Edit Movie Details
                </div>

                {/* Title */}
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                    placeholder="Movie title"
                    required
                  />
                </div>

                <label className="flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={editFavorite}
                    onChange={(e) => setEditFavorite(e.target.checked)}
                    className="h-4 w-4 accent-amber-400"
                  />
                  <Star className={`h-4 w-4 ${editFavorite ? 'fill-amber-400 text-amber-400' : 'text-zinc-500'}`} />
                  Favorite
                </label>

                {/* Genres */}
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label className="block text-[10px] text-zinc-500 uppercase font-semibold">Genres</label>
                    <span className="text-[10px] text-zinc-500">{editGenres.length} selected</span>
                  </div>
                  <div className="grid max-h-36 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 p-2 sm:grid-cols-3">
                    {genreOptions.map((genre) => (
                      <label key={genre} className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800">
                        <input
                          type="checkbox"
                          checked={editGenres.some((item) => item.toLowerCase() === genre.toLowerCase())}
                          onChange={() => toggleGenre(genre)}
                          className="h-3.5 w-3.5 shrink-0 accent-amber-400"
                        />
                        <span className="truncate">{genre}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Studio */}
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Studio</label>
                  <input
                    type="text"
                    list="movie-detail-studios"
                    value={editStudio}
                    onChange={(e) => setEditStudio(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                    placeholder="e.g. Warner Bros. Pictures"
                  />
                  <datalist id="movie-detail-studios">
                    {studioOptions.map((studio) => <option key={studio} value={studio} />)}
                  </datalist>
                </div>

                {/* Year and Minutes */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Year</label>
                    <input
                      type="number"
                      value={editYear}
                      onChange={(e) => setEditYear(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                      placeholder="2024"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Minutes</label>
                    <input
                      type="number"
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                      placeholder="120"
                    />
                  </div>
                </div>

                {/* Size and Resolution */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Size</label>
                    <input
                      type="text"
                      value={editSize}
                      onChange={(e) => setEditSize(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                      placeholder="e.g. 14.5 GB"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Resolution</label>
                    <select
                      value={editResolution}
                      onChange={(e) => setEditResolution(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-amber-400/60 transition-colors"
                    >
                      {resolutionOptions.map((resolution) => (
                        <option key={resolution} value={resolution} className="bg-[#121520]">
                          {resolution}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Front Cover URL */}
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Front Cover URL</label>
                  <input
                    type="text"
                    value={editPosterUrl}
                    onChange={(e) => setEditPosterUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                    placeholder="Front cover image URL or Google Drive link"
                  />
                </div>

                {/* Back Cover URL */}
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Back Cover URL</label>
                  <input
                    type="text"
                    value={editBackdropUrl}
                    onChange={(e) => setEditBackdropUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                    placeholder="Back cover image URL or Google Drive link"
                  />
                </div>

                {/* Actors */}
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label className="block text-[10px] text-zinc-500 uppercase font-semibold">Actors</label>
                    <span className="text-[10px] text-zinc-500">{editActors.length} selected</span>
                  </div>
                  <div className="grid max-h-36 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 p-2 sm:grid-cols-3">
                    {actorOptions.map((actor) => (
                      <label key={actor} className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800">
                        <input
                          type="checkbox"
                          checked={editActors.some((item) => item.toLowerCase() === actor.toLowerCase())}
                          onChange={() => toggleActor(actor)}
                          className="h-3.5 w-3.5 shrink-0 accent-amber-400"
                        />
                        <span className="truncate">{actor}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newActor}
                      onChange={(e) => setNewActor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addActor();
                        }
                      }}
                      className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-400/60 focus:outline-none transition-colors"
                      placeholder="Add an actor not in the list"
                    />
                    <button
                      type="button"
                      onClick={addActor}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Cast Count (optional override)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editCastCount}
                    onChange={(e) => setEditCastCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                    placeholder={`Automatic (${editActors.length} selected)`}
                  />
                </div>

                {/* Save / Cancel buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors border border-zinc-700"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                    title="Close movie details"
                    aria-label="Close movie details"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </form>
            ) : (
              /* ===== VIEW MODE ===== */
              <>
                <div>
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <h2 className="min-w-0 truncate text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl">
                      {movie.title}
                    </h2>
                    {(movie.favorite || movie.reviewed) && (
                      <div className="flex shrink-0 items-center gap-2">
                        {movie.favorite && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300">
                            <Star aria-label="Favorite" title="Favorite" className="h-4 w-4 fill-amber-400 text-amber-400" />
                            Favorite
                          </span>
                        )}
                        {movie.reviewed && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-300">
                            <Check aria-label="Review" title="Review" className="h-4 w-4 text-rose-400" />
                            Review
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Rearranged Details */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div 
                  onClick={() => { if (onFilterByAttribute) { onClose(); onFilterByAttribute('year', movie.year); } }}
                  className="flex items-center gap-2 text-zinc-400 hover:text-amber-300 cursor-pointer transition-colors group"
                  title="Filter by year"
                >
                  <Calendar className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="font-mono">{movie.year}</span>
                </div>
                <div 
                  onClick={() => { if (onFilterByAttribute) { onClose(); onFilterByAttribute('studio', movie.studio); } }}
                  className="flex items-center gap-2 text-zinc-400 hover:text-amber-300 cursor-pointer transition-colors group"
                  title="Filter by studio"
                >
                  <Building2 className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="truncate">{movie.studio}</span>
                </div>
                <div 
                  onClick={() => { if (onFilterByAttribute) { onClose(); onFilterByAttribute('minutes', movie.minutes); } }}
                  className="flex items-center gap-2 text-zinc-400 hover:text-amber-300 cursor-pointer transition-colors group"
                  title="Filter by duration"
                >
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="font-mono">{movie.minutes} min</span>
                </div>
                <div 
                  onClick={() => { if (onFilterByAttribute) { onClose(); onFilterByAttribute('size', movie.size); } }}
                  className="flex items-center gap-2 text-zinc-400 hover:text-amber-300 cursor-pointer transition-colors group"
                  title="Filter by file size"
                >
                  <HardDrive className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="font-mono">{movie.size}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <Film className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold">{movie.resolution || 'Standard'}</span>
                </div>
                {/* Genre */}
                <div className="col-span-2 pt-1 border-t border-zinc-800/60">
                  <div className="flex flex-wrap items-center gap-2">
                    <Film className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-xs text-zinc-400">Genre:</span>
                    {getMovieGenres(movie.genre).map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => {
                          if (!onFilterByAttribute) return;
                          onClose();
                          onFilterByAttribute('genre', genre);
                        }}
                        className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-400/20"
                        title={`Filter library by ${genre}`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cast / Actors - Compact */}
              <div className="mt-3">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Starring Cast{(movie.castCount ?? movie.actors.length) > 1 && ` (${movie.castCount ?? movie.actors.length})`}
                </div>
                <div className="flex flex-wrap gap-1">
                  {movie.actors.map((actor) => (
                    <button
                      key={actor}
                      type="button"
                      onClick={() => onSelectActor?.(actor)}
                      className="px-2 py-0.5 text-[10px] rounded-md bg-zinc-800 hover:bg-amber-400 hover:text-zinc-950 text-zinc-300 border border-zinc-700 cursor-pointer transition-colors"
                      title={`View actor ${actor}`}
                    >
                      {actor}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
              {onUpdateMovie && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 transition-colors hover:border-amber-400 hover:bg-amber-400 hover:text-zinc-950"
                  title="Edit movie details"
                  aria-label="Edit movie details"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                title="Close movie details"
                aria-label="Close movie details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </>
            )}
          </div>
        </div>
      </div>

      {/* Phone-width Image Zoom / Lightbox Modal */}
      {zoomedImageUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setZoomedImageUrl(null);
          }}
        >
          <div 
            className="relative max-w-[360px] w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-zinc-700 bg-black animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoomedImageUrl(null);
              }}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 flex items-center justify-center transition-colors"
              title="Close image"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={getImageSource(zoomedImageUrl)}
              alt="Enlarged cover"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
};
