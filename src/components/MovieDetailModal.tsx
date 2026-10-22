import React, { useEffect, useState } from 'react';
import { 
  X, 
  Trash2,
  Users,
  Film,
  Building2,
  Calendar,
  Clock,
  HardDrive,
  Globe,
  Loader2,
  Check,
  Search,
  Sparkles,
  Edit3,
  Save,
  Undo2
} from 'lucide-react';
import { Movie } from '../types';
import { searchMovieGenreOnline, OnlineGenreResult } from '../utils/onlineGenreSearch';
import { getImageSource } from '../utils/googleDriveImage';

interface MovieDetailModalProps {
  movie: Movie | null;
  onClose: () => void;
  onSelectActor?: (actorName: string) => void;
  onDeleteMovie?: (movieId: string) => void;
  onFilterByAttribute?: (type: 'genre' | 'minutes' | 'size' | 'studio' | 'year', value: string | number) => void;
  onUpdateMovieGenre?: (movieId: string, newGenre: string) => void;
  onUpdateMovie?: (updatedMovie: Movie) => void;
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({
  movie,
  onClose,
  onSelectActor,
  onDeleteMovie,
  onFilterByAttribute,
  onUpdateMovieGenre,
  onUpdateMovie,
}) => {
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editStudio, setEditStudio] = useState('');
  const [editYear, setEditYear] = useState<number>(2024);
  const [editMinutes, setEditMinutes] = useState<number>(110);
  const [editSize, setEditSize] = useState('4.5 GB');
  const [editResolution, setEditResolution] = useState('1080p HD');
  const [editPosterUrl, setEditPosterUrl] = useState('');
  const [editActors, setEditActors] = useState('');
  const [editSavedToast, setEditSavedToast] = useState<string | null>(null);

  // Online Genre Search State
  const [isSearchingGenre, setIsSearchingGenre] = useState(false);
  const [showGenreSearchPanel, setShowGenreSearchPanel] = useState(false);
  const [onlineResults, setOnlineResults] = useState<OnlineGenreResult[]>([]);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [genreUpdatedToast, setGenreUpdatedToast] = useState<string | null>(null);

  // Reset & sync states when movie changes
  useEffect(() => {
    if (movie) {
      setEditTitle(movie.title);
      setEditGenre(movie.genre);
      setEditStudio(movie.studio);
      setEditYear(movie.year);
      setEditMinutes(movie.minutes);
      setEditSize(movie.size);
      setEditResolution(movie.resolution || '1080p HD');
      setEditPosterUrl(movie.posterUrl);
      setEditActors(movie.actors.join(', '));
      setIsEditing(false);
      setEditSavedToast(null);
    }
    setShowGenreSearchPanel(false);
    setOnlineResults([]);
    setSearchStatus(null);
    setGenreUpdatedToast(null);
  }, [movie?.id]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movie || !onUpdateMovie) return;
    if (!editTitle.trim()) {
      alert('Movie title cannot be empty.');
      return;
    }

    const actorList = editActors
      .split(/[|,;]/)
      .map((a) => a.trim())
      .filter(Boolean);

    const sizeNum = parseFloat(editSize.replace(/[^\d.]/g, '')) || 4.5;
    const isTB = /tb/i.test(editSize);
    const sizeBytes = Math.round(sizeNum * (isTB ? 1000000 : 1000));

    const updated: Movie = {
      ...movie,
      title: editTitle.trim(),
      genre: editGenre.trim() || 'Drama',
      studio: editStudio.trim() || 'Independent Studio',
      year: Number(editYear) || 2024,
      minutes: Number(editMinutes) || 110,
      size: editSize.trim() || '4.5 GB',
      sizeBytes,
      resolution: editResolution.trim() || '1080p HD',
      posterUrl: getImageSource(editPosterUrl.trim() || movie.posterUrl),
      actors: actorList.length > 0 ? actorList : ['Cast'],
    };

    onUpdateMovie(updated);
    setIsEditing(false);
    setEditSavedToast('Movie details updated successfully!');
    setTimeout(() => setEditSavedToast(null), 3500);
  };

  const handleSearchGenreOnline = async () => {
    if (!movie) return;
    setShowGenreSearchPanel(true);
    setIsSearchingGenre(true);
    setSearchStatus('Searching online genre databases (iTunes, TVMaze, Wikipedia)...');
    setGenreUpdatedToast(null);

    try {
      const results = await searchMovieGenreOnline(movie.title);
      setOnlineResults(results);
      if (results.length === 0) {
        setSearchStatus(`No specific genre found automatically for "${movie.title}". You can select from popular genres below:`);
      } else {
        const totalSuggested = results.flatMap((r) => r.genres).length;
        setSearchStatus(`Found ${totalSuggested} online genre suggestions for "${movie.title}":`);
      }
    } catch (err) {
      console.error('Error searching genre:', err);
      setSearchStatus('Unable to reach online database. Please select from popular genres:');
    } finally {
      setIsSearchingGenre(false);
    }
  };

  const handleApplyGenre = (newGenre: string) => {
    if (!movie || !onUpdateMovieGenre) return;
    onUpdateMovieGenre(movie.id, newGenre);
    setGenreUpdatedToast(`Genre successfully updated to "${newGenre}"!`);
    setTimeout(() => {
      setGenreUpdatedToast(null);
    }, 3500);
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

  if (!movie) return null;

  return (
    <div 
      className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-6 pb-20 sm:pb-24 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-[#0f121b] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl my-auto text-left animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Top Header Bar with Edit, Delete, and Close Buttons */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-2">
            {onUpdateMovie && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-800/70 hover:bg-amber-400 hover:text-zinc-950 text-zinc-300 border border-zinc-700 flex items-center justify-center transition-colors"
                title="Edit movie details"
              >
                <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
            {onDeleteMovie && !isEditing && (
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete "${movie.title}" from catalog?`)) {
                    onDeleteMovie(movie.id);
                    onClose();
                  }
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center transition-colors"
                title="Delete movie from library"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 flex items-center justify-center transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

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
                onClick={() => setZoomedImageUrl(movie.posterUrl)}
                className="w-1/2 aspect-[3/4] rounded-lg overflow-hidden shadow-xl border border-zinc-700/60 relative cursor-pointer group"
                title="Click to enlarge cover (phone width)"
              >
                <img
                  src={getImageSource(movie.posterUrl)}
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

                {/* Genre */}
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Genre</label>
                  <input
                    type="text"
                    value={editGenre}
                    onChange={(e) => setEditGenre(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                    placeholder="e.g. Sci-Fi, Drama"
                  />
                </div>

                {/* Studio */}
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Studio</label>
                  <input
                    type="text"
                    value={editStudio}
                    onChange={(e) => setEditStudio(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                    placeholder="e.g. Warner Bros. Pictures"
                  />
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
                    <input
                      type="text"
                      value={editResolution}
                      onChange={(e) => setEditResolution(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                      placeholder="e.g. 1080p HD"
                    />
                  </div>
                </div>

                {/* Poster URL */}
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Poster URL</label>
                  <input
                    type="text"
                    value={editPosterUrl}
                    onChange={(e) => setEditPosterUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                    placeholder="Image URL or Google Drive sharing link"
                  />
                </div>

                {/* Actors */}
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Actors (separated by comma)</label>
                  <input
                    type="text"
                    value={editActors}
                    onChange={(e) => setEditActors(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                    placeholder="e.g. Actor One, Actor Two, Actor Three"
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
                </div>
              </form>
            ) : (
              /* ===== VIEW MODE ===== */
              <>
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight truncate">
                    {movie.title}
                  </h2>

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
                {/* Genre with Online Internet Search */}
                <div className="col-span-2 pt-1 border-t border-zinc-800/60">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div 
                      onClick={() => { if (onFilterByAttribute) { onClose(); onFilterByAttribute('genre', movie.genre); } }}
                      className="flex items-center gap-2 text-zinc-400 hover:text-amber-300 cursor-pointer transition-colors group"
                      title="Filter library by this genre"
                    >
                      <Film className="w-4 h-4 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-xs text-zinc-400">Genre:</span>
                      <span className="font-semibold text-amber-300 text-xs px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20">
                        {movie.genre}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSearchGenreOnline}
                      disabled={isSearchingGenre}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-amber-400 hover:text-zinc-950 text-zinc-300 text-[11px] font-semibold transition-all border border-zinc-700 hover:border-amber-400 shadow-sm"
                      title="Search for this movie's genre online by title"
                    >
                      {isSearchingGenre ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>{isSearchingGenre ? 'Searching Online...' : 'Search Genre Online'}</span>
                    </button>
                  </div>

                  {/* Toast for successful update */}
                  {genreUpdatedToast && (
                    <div className="mt-2 p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center gap-1.5 animate-in fade-in duration-150">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{genreUpdatedToast}</span>
                    </div>
                  )}

                  {/* Online Genre Search Results Panel */}
                  {showGenreSearchPanel && (
                    <div className="mt-2.5 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-150 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-1.5 border-b border-zinc-800">
                        <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>Online Search Results ({movie.title})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowGenreSearchPanel(false)}
                          className="text-zinc-500 hover:text-zinc-300 text-[10px]"
                        >
                          Close
                        </button>
                      </div>

                      {searchStatus && (
                        <p className="text-[11px] text-zinc-400">
                          {searchStatus}
                        </p>
                      )}

                      {/* Online Results Found */}
                      {onlineResults.length > 0 && (
                        <div className="space-y-2">
                          {onlineResults.map((res, idx) => (
                            <div key={idx} className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                                <span className="font-medium text-zinc-300 truncate">
                                  {res.matchedTitle} {res.year ? `(${res.year})` : ''}
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono text-[9px]">
                                  {res.source}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {res.genres.map((g) => (
                                  <button
                                    key={g}
                                    type="button"
                                    onClick={() => handleApplyGenre(g)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                                      movie.genre.toLowerCase() === g.toLowerCase()
                                        ? 'bg-amber-400 text-zinc-950'
                                        : 'bg-zinc-800 hover:bg-amber-400 hover:text-zinc-950 text-zinc-200 border border-zinc-700'
                                    }`}
                                    title={`Click to apply genre "${g}" to this movie`}
                                  >
                                    {movie.genre.toLowerCase() === g.toLowerCase() && <Check className="w-3 h-3" />}
                                    <span>{g}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quick Popular Genre Selection */}
                      <div className="pt-2 border-t border-zinc-800/80">
                        <span className="text-[10px] text-zinc-500 uppercase font-semibold block mb-1">
                          Popular Genre Suggestions:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {[
                            'Sci-Fi', 'Action', 'Thriller', 'Drama', 'Horror', 
                            'Comedy', 'Cyberpunk', 'Crime', 'Fantasy', 'Anime', 'Adventure'
                          ].map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => handleApplyGenre(g)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                movie.genre.toLowerCase() === g.toLowerCase()
                                  ? 'bg-amber-400 text-zinc-950 font-bold'
                                  : 'bg-zinc-800/70 hover:bg-zinc-700 text-zinc-300'
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cast / Actors - Compact */}
              <div className="mt-3">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                  Starring Cast
                </div>
                <div className="flex flex-wrap gap-1">
                  {movie.actors.map((actor) => (
                    <span
                      key={actor}
                      onClick={() => {
                        if (onSelectActor) {
                          onClose();
                          onSelectActor(actor);
                        }
                      }}
                      className="px-2 py-0.5 text-[10px] rounded-md bg-zinc-800 hover:bg-amber-400 hover:text-zinc-950 text-zinc-300 border border-zinc-700 cursor-pointer transition-colors"
                      title={`View actor ${actor}`}
                    >
                      {actor}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions - Very Compact */}
            <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
              <span className="text-[10px] text-zinc-500">
                Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-[9px] text-zinc-400 font-mono">Esc</kbd>
              </span>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors"
              >
                Back
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
              title="Close (Esc)"
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
