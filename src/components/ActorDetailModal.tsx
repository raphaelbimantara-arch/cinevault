import React, { useEffect, useMemo } from 'react';
import { X, Calendar, Film, HardDrive, Clock, User } from 'lucide-react';
import { Movie } from '../types';
import { getActorProfile } from '../data/actorsData';

interface ActorDetailModalProps {
  actorName: string | null;
  movies: Movie[];
  onClose: () => void;
  onSelectMovie: (movie: Movie) => void;
}

export const ActorDetailModal: React.FC<ActorDetailModalProps> = ({
  actorName,
  movies,
  onClose,
  onSelectMovie,
}) => {
  const [zoomedPhotoUrl, setZoomedPhotoUrl] = React.useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = React.useState<number | 'all'>('all');

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

  if (!actorName) return null;

  const profile = getActorProfile(actorName);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-6 pb-20 sm:pb-24 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#0f121b] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl my-auto text-left animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/80 flex items-center justify-center transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Modal Content */}
          <div className="p-4 sm:p-8">
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
                    src={profile.photoUrl}
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

            {/* Actor Information */}
            <div className="flex-1 text-center sm:text-left">
              <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                Actor Profile
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                {actorName}
              </h2>

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
                      src={movie.posterUrl}
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
              src={zoomedPhotoUrl}
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
