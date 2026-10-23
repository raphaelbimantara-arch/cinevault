import React, { useEffect, useMemo, useState } from 'react';
import { X, Calendar, Film, HardDrive, Clock, User, Edit3, Save, Undo2, Star, Check } from 'lucide-react';
import { Movie } from '../types';
import { getActorProfile, ActorProfile } from '../data/actorsData';
import { getImageSource } from '../utils/googleDriveImage';
import { useHorizontalSwipe } from '../utils/useHorizontalSwipe';

interface ActorDetailModalProps {
  actorName: string | null;
  actorNames: string[];
  movies: Movie[];
  onClose: () => void;
  onNavigateActor: (actorName: string) => void;
  onSelectMovie: (movie: Movie) => void;
  onUpdateActor?: (oldName: string, updatedProfile: ActorProfile) => void;
}

export const ActorDetailModal: React.FC<ActorDetailModalProps> = ({
  actorName,
  actorNames,
  movies,
  onClose,
  onNavigateActor,
  onSelectMovie,
  onUpdateActor,
}) => {
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState<number | 'all'>('all');

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editSavedToast, setEditSavedToast] = useState<string | null>(null);

  // Sync edit fields when actor changes
  useEffect(() => {
    if (actorName) {
      const p = getActorProfile(actorName);
      setEditName(actorName);
      setEditDob(p.dob);
      setEditPhotoUrl(p.photoUrl);
      setIsEditing(false);
      setEditSavedToast(null);
    }
  }, [actorName]);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomedPhotoUrl) {
          setZoomedPhotoUrl(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, zoomedPhotoUrl]);

  // Find all movies in the catalog starring this actor, sorted alphabetically by title
  const actorMovies = useMemo(() => {
    if (!actorName) return [];
    return movies
      .filter((m) =>
        m.actors.some((a) => a.toLowerCase().trim() === actorName.toLowerCase().trim())
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [movies, actorName]);

  // Movies sliced by user-chosen display limit (10, 25, or 'all')
  const displayedMovies = useMemo(() => {
    if (displayLimit === 'all') return actorMovies;
    return actorMovies.slice(0, displayLimit);
  }, [actorMovies, displayLimit]);

  // Total size (in GB) and total minutes across this actor's filmography
  const totalSizeBytes = actorMovies.reduce((acc, m) => acc + (m.sizeBytes || 0), 0);
  const totalGB = (totalSizeBytes / 1000).toFixed(1);
  const totalMinutes = actorMovies.reduce((acc, m) => acc + (m.minutes || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  const durationFormatted = totalHours > 0
    ? `${totalMinutes} min (${totalHours}h ${remainingMinutes}m)`
    : `${totalMinutes} min`;

  const actorIndex = actorNames.findIndex((name) => name.toLowerCase() === actorName?.toLowerCase());
  const swipeHandlers = useHorizontalSwipe(
    () => {
      if (actorIndex >= 0 && actorIndex < actorNames.length - 1) onNavigateActor(actorNames[actorIndex + 1]);
    },
    () => {
      if (actorIndex > 0) onNavigateActor(actorNames[actorIndex - 1]);
    },
    !isEditing && !zoomedPhotoUrl
  );

  if (!actorName) return null;

  const profile = getActorProfile(actorName);

  // Enter edit mode: populate fields from current profile
  const handleStartEdit = () => {
    setEditName(actorName);
    setEditDob(profile.dob);
    setEditPhotoUrl(profile.photoUrl);
    setEditSavedToast(null);
    setIsEditing(true);
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditSavedToast(null);
  };

  // Save edited profile
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateActor) return;
    const trimmedName = editName.trim();
    if (!trimmedName) {
      alert('Actor name cannot be empty.');
      return;
    }
    const updated: ActorProfile = {
      name: trimmedName,
      dob: editDob.trim() || profile.dob,
      photoUrl: getImageSource(editPhotoUrl),
    };
    onUpdateActor(actorName, updated);
    setIsEditing(false);
    setEditSavedToast('Actor profile updated successfully!');
    setTimeout(() => setEditSavedToast(null), 3500);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-6 pb-20 sm:pb-24 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#0f121b] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl my-auto text-left animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={swipeHandlers.onPointerDown}
        onPointerUp={swipeHandlers.onPointerUp}
        onPointerCancel={swipeHandlers.onPointerCancel}
        style={{ touchAction: 'pan-y' }}
      >
          {/* Header Buttons: Edit + Close */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-2">
            {onUpdateActor && !isEditing && (
              <button
                onClick={handleStartEdit}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-800/70 hover:bg-amber-400 hover:text-zinc-950 text-zinc-300 border border-zinc-700 flex items-center justify-center transition-colors"
                title="Edit actor profile"
              >
                <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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

          {/* Modal Content */}
          <div className="p-4 sm:p-8">

            {/* Success Toast */}
            {editSavedToast && (
              <div className="mb-4 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                <Save className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{editSavedToast}</span>
              </div>
            )}

            {/* Top Section: Picture, Name, Date of Birth, Total Size, Total Duration */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 pb-5 sm:pb-6 border-b border-zinc-800">
              {/* Picture */}
              <div
                onClick={() => { if (profile.photoUrl) setZoomedPhotoUrl(profile.photoUrl); }}
                className="w-28 h-28 sm:w-40 sm:h-40 rounded-2xl overflow-hidden bg-zinc-900 border-2 border-zinc-700 shadow-xl shrink-0 relative group cursor-pointer"
                title="Click to enlarge photo (phone width)"
              >
                {profile.photoUrl ? (
                  <img
                    src={getImageSource(profile.photoUrl)}
                    alt={actorName}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : null}
                {/* Fallback avatar */}
                <div
                  className={`w-full h-full bg-gradient-to-tr from-amber-500/20 via-zinc-800 to-zinc-900 items-center justify-center ${
                    profile.photoUrl ? 'hidden' : 'flex'
                  }`}
                >
                  <User className="w-16 h-16 text-amber-400" />
                </div>
              </div>

              {/* Actor Information — View or Edit */}
              <div className="flex-1 text-center sm:text-left w-full">
                {isEditing ? (
                  /* ===== EDIT MODE ===== */
                  <form onSubmit={handleSaveEdit} className="space-y-3 w-full">
                    <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Edit3 className="w-3 h-3" />
                      Edit Actor Profile
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                        placeholder="Actor name"
                        required
                      />
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Date of Birth</label>
                      <input
                        type="text"
                        value={editDob}
                        onChange={(e) => setEditDob(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                        placeholder="e.g. January 15, 1985"
                      />
                    </div>

                    {/* Photo URL */}
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase font-semibold mb-1">Photo URL</label>
                      <input
                        type="text"
                        value={editPhotoUrl}
                        onChange={(e) => setEditPhotoUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                        placeholder="Image URL or Google Drive sharing link"
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
                        onClick={handleCancelEdit}
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
                    <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                      Actor Profile
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                      {actorName}
                    </h2>
                    {(profile.favorite || profile.reviewed) && (
                      <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                        {profile.favorite && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-semibold text-amber-300">
                            <Star className="h-3 w-3 fill-current" /> Favorite
                          </span>
                        )}
                        {profile.reviewed && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                            <Check className="h-3 w-3" /> Reviewed
                          </span>
                        )}
                      </div>
                    )}

                    {/* Badges: Date of Birth, Total Size, Total Duration */}
                    <div className="mt-3.5 flex flex-wrap gap-2 justify-center sm:justify-start">
                      {/* DATE OF BIRTH */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-zinc-400">Date of Birth:</span>
                        <span className="font-semibold text-zinc-100 font-mono">
                          {profile.dob}
                        </span>
                      </div>

                      {/* TOTAL SIZE */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs">
                        <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-zinc-400">Total Size:</span>
                        <span className="font-semibold text-amber-300 font-mono">
                          {totalGB} GB
                        </span>
                      </div>

                      {/* TOTAL DURATION */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-zinc-400">Total Duration:</span>
                        <span className="font-semibold text-amber-300 font-mono">
                          {durationFormatted}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

          {/* Bottom Section: Movies Title */}
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Film className="w-4 h-4 text-amber-400" />
                <span>Movies Title ({actorMovies.length})</span>
              </h3>

              {/* Option to show 10, 25, & All Movies */}
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="text-[11px] text-zinc-500">Show:</span>
                <div className="inline-flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                  {([10, 25, 'all'] as const).map((limit) => (
                    <button
                      key={String(limit)}
                      type="button"
                      onClick={() => setDisplayLimit(limit)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                        displayLimit === limit
                          ? 'bg-amber-400 text-zinc-950 font-bold shadow-sm'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {limit === 'all' ? 'All' : limit}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {displayedMovies.map((movie) => (
                <div
                  key={movie.id}
                  onClick={() => {
                    onClose();
                    onSelectMovie(movie);
                  }}
                  className="flex items-center gap-3 p-2 rounded-xl bg-[#141824] hover:bg-amber-500/15 border border-zinc-800/90 hover:border-amber-500/40 cursor-pointer transition-all group"
                  title={`Click to view movie details for "${movie.title}"`}
                >
                  {/* Thumbnail Cover on the left */}
                  <div className="w-8 h-11 sm:w-9 sm:h-12 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-700/60 shrink-0 shadow-sm relative">
                    <img
                      src={getImageSource(movie.posterUrl)}
                      alt={movie.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>

                  {/* Movie Title Only */}
                  <span className="font-semibold text-zinc-200 group-hover:text-amber-300 transition-colors text-sm truncate">
                    {movie.title}
                  </span>
                </div>
              ))}

              {actorMovies.length === 0 && (
                <div className="py-8 text-center text-xs text-zinc-500">
                  No catalog movies found for this actor.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Phone-width Image Zoom / Lightbox Modal */}
      {zoomedPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setZoomedPhotoUrl(null);
          }}
        >
          <div
            className="relative max-w-[360px] w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-zinc-700 bg-black animate-in fade-in zoom-in-95 duration-150 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setZoomedPhotoUrl(null);
              }}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 flex items-center justify-center transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={getImageSource(zoomedPhotoUrl)}
              alt="Enlarged actor photo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
};
