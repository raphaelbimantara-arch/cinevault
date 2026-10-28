import React, { useEffect, useMemo, useState } from 'react';
import { X, Calendar, Film, Clock, User, Edit3, Save, Undo2, Star, Check, Plus, Trash2 } from 'lucide-react';
import { Movie } from '../types';
import { formatActorAliases, getActorAliases, getActorProfile, ActorProfile } from '../data/actorsData';
import { formatActorDob, getActorAge, getActorBirthYear, normalizeActorDob } from '../utils/actorDob';
import { ActorDobFields } from './ActorDobFields';
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
  const [editAliases, setEditAliases] = useState<string[]>([]);
  const [newAlias, setNewAlias] = useState('');
  const [editDob, setEditDob] = useState('');
  const [editDebutMovieTitle, setEditDebutMovieTitle] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editSavedToast, setEditSavedToast] = useState<string | null>(null);

  // Sync edit fields when actor changes
  useEffect(() => {
    if (actorName) {
      const p = getActorProfile(actorName);
      setEditName(actorName);
      setEditAliases(getActorAliases(p.alias));
      setNewAlias('');
      setEditDob(p.dob);
      setEditDebutMovieTitle(p.debutMovieTitle || '');
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

  // Put the manually selected debut movie first when it matches a catalog title.
  // Otherwise sort by earliest known release year; ties and missing years use title A–Z.
  const savedDebutMovieTitle = actorName
    ? (getActorProfile(actorName).debutMovieTitle || '').trim()
    : '';
  const actorMovies = useMemo(() => {
    if (!actorName) return [];

    const titleCompare = (a: Movie, b: Movie) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    const isValidYear = (movie: Movie) => Number.isFinite(movie.year) && movie.year > 0;

    return movies
      .filter((m) =>
        m.actors.some((a) => a.toLowerCase().trim() === actorName.toLowerCase().trim())
      )
      .sort((a, b) => {
        const aIsManualDebut = savedDebutMovieTitle !== '' &&
          a.title.trim().toLowerCase() === savedDebutMovieTitle.toLowerCase();
        const bIsManualDebut = savedDebutMovieTitle !== '' &&
          b.title.trim().toLowerCase() === savedDebutMovieTitle.toLowerCase();
        if (aIsManualDebut !== bIsManualDebut) return aIsManualDebut ? -1 : 1;

        const aHasYear = isValidYear(a);
        const bHasYear = isValidYear(b);
        if (aHasYear && bHasYear && a.year !== b.year) return a.year - b.year;
        if (aHasYear !== bHasYear) return aHasYear ? -1 : 1;
        return titleCompare(a, b);
      });
  }, [movies, actorName, savedDebutMovieTitle]);

  // Movies sliced by user-chosen display limit (10, 25, or 'all')
  const displayedMovies = useMemo(() => {
    if (displayLimit === 'all') return actorMovies;
    return actorMovies.slice(0, displayLimit);
  }, [actorMovies, displayLimit]);

  // Total minutes across this actor's filmography
  const totalMinutes = actorMovies.reduce((acc, m) => acc + (m.minutes || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  const durationFormatted = totalHours > 0
    ? `${totalMinutes} min (${totalHours}h ${remainingMinutes}m)`
    : `${totalMinutes} min`;
  const debutMovie = actorMovies.reduce<Movie | null>((earliest, current) => {
    if (!Number.isFinite(current.year)) return earliest;
    return !earliest || current.year < earliest.year ? current : earliest;
  }, null);
  const actorIndex = actorNames.findIndex((name) => name.toLowerCase() === actorName?.toLowerCase());
  useEffect(() => {
    if (!actorName || isEditing || zoomedPhotoUrl) return;

    const handleNavigationKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }

      if (event.key === 'ArrowRight' && actorIndex >= 0 && actorIndex < actorNames.length - 1) {
        event.preventDefault();
        onNavigateActor(actorNames[actorIndex + 1]);
      } else if (event.key === 'ArrowLeft' && actorIndex > 0) {
        event.preventDefault();
        onNavigateActor(actorNames[actorIndex - 1]);
      }
    };

    window.addEventListener('keydown', handleNavigationKeyDown);
    return () => window.removeEventListener('keydown', handleNavigationKeyDown);
  }, [actorName, actorIndex, actorNames, isEditing, onNavigateActor, zoomedPhotoUrl]);

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
  const actorAge = getActorAge(profile.dob);
  const birthYear = getActorBirthYear(profile.dob);
  const debutAge = debutMovie && birthYear !== null && debutMovie.year >= birthYear
    ? debutMovie.year - birthYear
    : null;

  // Enter edit mode: populate fields from current profile
  const handleStartEdit = () => {
    setEditName(actorName);
    setEditAliases(getActorAliases(profile.alias));
    setNewAlias('');
    setEditDob(profile.dob);
    setEditDebutMovieTitle(profile.debutMovieTitle || '');
    setEditPhotoUrl(profile.photoUrl);
    setEditSavedToast(null);
    setIsEditing(true);
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditSavedToast(null);
  };

  const handleSaveAlias = () => {
    const alias = newAlias.trim();
    if (!alias) return;
    if (alias.toLocaleLowerCase() === actorName.trim().toLocaleLowerCase()) {
      alert('An alias cannot be the same as the actor name.');
      return;
    }
    if (editAliases.some((existing) => existing.toLocaleLowerCase() === alias.toLocaleLowerCase())) {
      alert('This alias has already been added.');
      return;
    }
    const nextAliases = [...editAliases, alias];
    setEditAliases(nextAliases);
    setNewAlias('');
    onUpdateActor?.(actorName, {
      ...profile,
      alias: formatActorAliases(nextAliases),
    });
    setEditSavedToast('Alias saved.');
    setTimeout(() => setEditSavedToast(null), 3500);
  };

  const handleRemoveAlias = (alias: string) => {
    const nextAliases = editAliases.filter((item) => item !== alias);
    setEditAliases(nextAliases);
    onUpdateActor?.(actorName, {
      ...profile,
      alias: formatActorAliases(nextAliases),
    });
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
    const dob = normalizeActorDob(editDob);
    if (dob === null) {
      alert('Enter a valid date of birth: a month, a year, a month and year, a full date, or leave it blank.');
      return;
    }
    const updated: ActorProfile = {
      name: trimmedName,
      alias: formatActorAliases(editAliases),
      dob,
      debutMovieTitle: editDebutMovieTitle.trim(),
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
              <div className="flex-1 text-center sm:text-left w-full min-w-0">
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

                    {/* Aliases */}
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">Aliases</label>
                      <div className="space-y-2">
                        {editAliases.map((alias) => (
                          <div key={alias} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/70 px-2.5 py-1.5">
                            <span className="min-w-0 flex-1 break-words text-sm text-zinc-200">{alias}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAlias(alias)}
                              className="shrink-0 rounded p-1 text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                              aria-label={`Remove alias ${alias}`}
                              title="Remove alias"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newAlias}
                            onChange={(event) => setNewAlias(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                handleSaveAlias();
                              }
                            }}
                            className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 transition-colors focus:border-amber-400/60 focus:outline-none"
                            placeholder="Add another actor name"
                            aria-label="New actor alias"
                          />
                          <button
                            type="button"
                            onClick={handleSaveAlias}
                            disabled={!newAlias.trim()}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Save alias
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">Date of Birth</label>
                      <ActorDobFields value={editDob} onChange={setEditDob} actorName={actorName} />
                    </div>

                    {/* Debut movie title */}
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase text-zinc-500">Debut Movie Title</label>
                      <input
                        type="text"
                        value={editDebutMovieTitle}
                        onChange={(e) => setEditDebutMovieTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 transition-colors"
                        placeholder="Enter debut film title (optional)"
                      />
                      <p className="mt-1 text-[11px] text-zinc-500">Leave blank to keep the title empty. If a date of birth is saved, the earliest film in your catalog is shown automatically.</p>
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
                    <div className="mt-1 flex min-w-0 flex-col items-center gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                      <h2 className="w-full min-w-0 break-words text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-left sm:text-3xl">
                        {actorName}
                      </h2>
                      {(profile.favorite || profile.reviewed) && (
                        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 sm:justify-end">
                          {profile.favorite && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300">
                              <Star className="h-3 w-3 fill-current" /> Favorite
                            </span>
                          )}
                          {profile.reviewed && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-300">
                              <Check className="h-3 w-3" /> Review
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {getActorAliases(profile.alias).length > 0 && (
                      <div className="mt-1 w-full space-y-0.5">
                        {getActorAliases(profile.alias).map((alias) => (
                          <p key={alias} className="break-words text-sm text-zinc-400 sm:text-base">{alias}</p>
                        ))}
                      </div>
                    )}

                    {/* Badges: Date of Birth and Total Duration */}
                    <div className="mt-3.5 flex flex-wrap gap-2 justify-center sm:justify-start">
                      {/* DATE OF BIRTH */}
                      <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs sm:justify-start">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-zinc-400">Date of Birth:</span>
                        <span className="font-semibold text-zinc-100 font-mono">
                          {formatActorDob(profile.dob)}
                        </span>
                        <span aria-hidden="true" className="text-zinc-600">·</span>
                        <span className="text-zinc-400">Age:</span>
                        <span className="font-semibold text-zinc-100 font-mono">
                          {actorAge === null ? '—' : actorAge}
                        </span>
                      </div>
                      <div
                        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs"
                        title={profile.debutMovieTitle || (profile.dob && debutMovie ? `Based on first released film: ${debutMovie.title} (${debutMovie.year})` : 'No debut film set')}
                      >
                        <Film className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                        <span className="text-zinc-400">Debut age:</span>
                        <span className="font-mono font-semibold text-zinc-100">
                          {debutAge === null ? '—' : `${debutAge} years`}
                        </span>
                        {(profile.debutMovieTitle || (profile.dob && debutMovie)) && (
                          <span className="min-w-0 max-w-full break-words font-semibold text-amber-300">— {profile.debutMovieTitle || debutMovie?.title}</span>
                        )}
                        {!profile.debutMovieTitle && profile.dob && debutMovie && (
                          <span className="font-mono text-zinc-500">({debutMovie.year})</span>
                        )}
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
                  onClick={() => onSelectMovie(movie)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectMovie(movie);
                    }
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
