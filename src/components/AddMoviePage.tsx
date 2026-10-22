import React, { useState, useEffect } from 'react';
import { 
  Film, 
  Building2, 
  Calendar, 
  Clock, 
  HardDrive, 
  Plus, 
  Check, 
  User, 
  MapPin, 
  Tv
} from 'lucide-react';
import { Movie } from '../types';
import { ALL_GENRES, ALL_STUDIOS } from '../data/initialMovies';
import { registerCustomActor, ActorProfile } from '../data/actorsData';

// Imported generated images for presets
import posterScifi from '../assets/images/poster_scifi_odyssey_1792588295227.jpg';
import posterNoir from '../assets/images/poster_noir_detective_1792588296109.jpg';
import posterCyberpunk from '../assets/images/poster_cyberpunk_tokyo_1792588297850.jpg';
import posterSummit from '../assets/images/poster_drama_summit_1792588297246.jpg';

import actorVictor from '../assets/images/actor_victor_lynch_1792589786228.jpg';
import actorElena from '../assets/images/actor_elena_rostova_1792589785628.jpg';

interface AddDataPageProps {
  initialTab?: 'movie' | 'actor' | 'studio';
  onAddMovie: (newMovie: Movie) => void;
  onAddActorSuccess?: (actorName: string) => void;
  onAddStudioSuccess?: (studioName: string) => void;
  onCancel: () => void;
  existingMovies: Movie[];
}

const PRESET_POSTERS = [
  { label: 'Sci-Fi Galaxy', url: posterScifi },
  { label: 'Noir Detective', url: posterNoir },
  { label: 'Cyberpunk Anime', url: posterCyberpunk },
  { label: 'Alpine Drama', url: posterSummit },
  { label: 'Cinematic Cinema', url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=980&auto=format&fit=crop' },
  { label: 'Urban Thriller', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=980&auto=format&fit=crop' },
];

const PRESET_ACTOR_PHOTOS = [
  { label: 'Victor Lynch', url: actorVictor },
  { label: 'Elena Rostova', url: actorElena },
  { label: 'Studio Headshot 1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop' },
  { label: 'Studio Headshot 2', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop' },
  { label: 'Studio Headshot 3', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=600&auto=format&fit=crop' },
  { label: 'Studio Headshot 4', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600&auto=format&fit=crop' },
];

// USER REQUEST: resolution only for 720p HD, 1080p HD, 960p HD
const ALLOWED_RESOLUTIONS = ['1080p HD', '960p HD', '720p HD'] as const;

export const AddMoviePage: React.FC<AddDataPageProps> = ({
  initialTab = 'movie',
  onAddMovie,
  onAddActorSuccess,
  onAddStudioSuccess,
  onCancel,
  existingMovies,
}) => {
  const [activeTab, setActiveTab] = useState<'movie' | 'actor' | 'studio'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // MOVIE FORM STATE
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Sci-Fi');
  const [studio, setStudio] = useState('Warner Bros. Pictures');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [minutes, setMinutes] = useState<number>(128);
  const [sizeStr, setSizeStr] = useState('12.4 GB');
  const [resolution, setResolution] = useState<(typeof ALLOWED_RESOLUTIONS)[number]>('1080p HD');
  const [actorsInput, setActorsInput] = useState('');
  const [posterUrl, setPosterUrl] = useState(PRESET_POSTERS[0].url);
  const [customPoster, setCustomPoster] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // ACTOR FORM STATE
  const [actorName, setActorName] = useState('');
  const [actorDob, setActorDob] = useState('June 15, 1985');
  const [actorBirthplace, setActorBirthplace] = useState('New York, USA');
  const [actorPhotoUrl, setActorPhotoUrl] = useState(PRESET_ACTOR_PHOTOS[0].url);
  const [actorCustomPhoto, setActorCustomPhoto] = useState('');
  const [actorMovieTitle, setActorMovieTitle] = useState('');
  const [actorSuccess, setActorSuccess] = useState(false);

  // STUDIO FORM STATE
  const [studioName, setStudioName] = useState('');
  const [studioHq, setStudioHq] = useState('Los Angeles, California, USA');
  const [studioYear, setStudioYear] = useState(1995);
  const [studioSuccess, setStudioSuccess] = useState(false);

  // Parse numerical size for sorting
  const parseSizeToMB = (str: string): number => {
    const num = parseFloat(str) || 0;
    if (str.toUpperCase().includes('GB')) return num * 1000;
    if (str.toUpperCase().includes('TB')) return num * 1000000;
    return num;
  };

  const handleMovieSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalPoster = customPoster.trim() ? customPoster.trim() : posterUrl;
    const actorsList = actorsInput
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    const newMovie: Movie = {
      id: `movie-${Date.now()}`,
      title: title.trim(),
      genre: genre.trim() || 'Drama',
      studio: studio.trim() || 'Independent',
      year: Number(year) || new Date().getFullYear(),
      minutes: Number(minutes) || 120,
      size: sizeStr.trim() || '8.0 GB',
      sizeBytes: parseSizeToMB(sizeStr),
      resolution, // 720p HD, 1080p HD, or 960p HD
      posterUrl: finalPoster,
      actors: actorsList.length > 0 ? actorsList : ['Lead Actor'],
      addedDate: new Date().toISOString().split('T')[0],
    };

    onAddMovie(newMovie);
    setSavedSuccess(true);
  };

  const handleActorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actorName.trim()) return;

    const finalPhoto = actorCustomPhoto.trim() ? actorCustomPhoto.trim() : actorPhotoUrl;
    const profile: ActorProfile = {
      name: actorName.trim(),
      dob: actorDob.trim() || 'January 1, 1980',
      photoUrl: finalPhoto,
      birthplace: actorBirthplace.trim() || 'International Cinema',
    };

    // Register into persistent actor store
    registerCustomActor(profile);

    // If an initial movie title is entered, attach this actor to an existing or dummy movie
    if (actorMovieTitle.trim()) {
      const match = existingMovies.find(
        (m) => m.title.toLowerCase() === actorMovieTitle.trim().toLowerCase()
      );
      if (match) {
        if (!match.actors.includes(profile.name)) {
          match.actors.push(profile.name);
        }
      }
    }

    setActorSuccess(true);
    if (onAddActorSuccess) {
      setTimeout(() => onAddActorSuccess(profile.name), 800);
    }
  };

  const handleStudioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioName.trim()) return;

    setStudioSuccess(true);
    if (onAddStudioSuccess) {
      setTimeout(() => onAddStudioSuccess(studioName.trim()), 800);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header with Contextual Tabs */}
      <div className="pb-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Catalog Creator Hub
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Add movies, actors, or production studios into your catalog.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 w-full sm:w-auto p-1 bg-[#121520] border border-zinc-800 rounded-xl gap-1">
          <button
            onClick={() => setActiveTab('movie')}
            className={`px-2 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-colors ${
              activeTab === 'movie'
                ? 'bg-amber-400 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Film className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Movie</span>
          </button>
          <button
            onClick={() => setActiveTab('actor')}
            className={`px-2 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-colors ${
              activeTab === 'actor'
                ? 'bg-amber-400 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Actor</span>
          </button>
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-2 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-colors ${
              activeTab === 'studio'
                ? 'bg-amber-400 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Studio</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ADD MOVIE */}
      {activeTab === 'movie' && (
        <div className="max-w-2xl mx-auto">
          {/* Form Container */}
          <form onSubmit={handleMovieSubmit} className="space-y-4 bg-[#121520] border border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xl">
            {savedSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
                <Check className="w-4 h-4 shrink-0" />
                <span>Movie successfully added to library with {resolution} resolution!</span>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Movie Title <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Blade Runner 2099"
                className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            {/* Row 1: Genre & Studio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Genre <span className="text-amber-400">*</span>
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/60"
                >
                  {ALL_GENRES.filter((g) => g !== 'All').map((g) => (
                    <option key={g} value={g} className="bg-[#121520]">
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Studio <span className="text-amber-400">*</span>
                </label>
                <select
                  value={studio}
                  onChange={(e) => setStudio(e.target.value)}
                  className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/60"
                >
                  {ALL_STUDIOS.filter((s) => s !== 'All Studios').map((s) => (
                    <option key={s} value={s} className="bg-[#121520]">
                      {s}
                    </option>
                  ))}
                  <option value="A24" className="bg-[#121520]">A24</option>
                  <option value="Independent / Other" className="bg-[#121520]">Independent / Other</option>
                </select>
              </div>
            </div>

            {/* Row 2: Year, Minutes, Size */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Year <span className="text-amber-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1900"
                  max="2035"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Minutes <span className="text-amber-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="10"
                  max="600"
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  File Size <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sizeStr}
                  onChange={(e) => setSizeStr(e.target.value)}
                  placeholder="14.2 GB"
                  className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            {/* Row 3: RESOLUTION ONLY FOR 720p HD, 1080p HD, 960p HD */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Resolution (HD Standards Only) <span className="text-amber-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {ALLOWED_RESOLUTIONS.map((resOption) => {
                  const isSelected = resolution === resOption;
                  return (
                    <button
                      type="button"
                      key={resOption}
                      onClick={() => setResolution(resOption)}
                      className={`py-2 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors ${
                        isSelected
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400 ring-1 ring-amber-400/30'
                          : 'bg-[#0a0c12] text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
                      }`}
                    >
                      <Tv className="w-3.5 h-3.5" />
                      <span>{resOption}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Starring Cast */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Starring Actors (comma separated)
              </label>
              <input
                type="text"
                value={actorsInput}
                onChange={(e) => setActorsInput(e.target.value)}
                placeholder="e.g. Victor Lynch, Elena Rostova, Robert Stone"
                className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            {/* Poster URL (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Poster Image URL (Optional)
              </label>
              <input
                type="url"
                value={customPoster}
                onChange={(e) => setCustomPoster(e.target.value)}
                placeholder="https://example.com/poster.jpg (optional)"
                className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            {/* Submit Actions */}
            <div className="pt-4 flex items-center gap-3">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-amber-400/10 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Movie to Catalog</span>
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: ADD ACTOR */}
      {activeTab === 'actor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form onSubmit={handleActorSubmit} className="lg:col-span-7 space-y-4">
            {actorSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
                <Check className="w-4 h-4 shrink-0" />
                <span>Actor profile successfully registered in Actors Directory!</span>
              </div>
            )}

            {/* Actor Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Actor Full Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                value={actorName}
                onChange={(e) => setActorName(e.target.value)}
                placeholder="e.g. Leonardo DiCaprio"
                className="w-full bg-[#121520] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            {/* Date of Birth & Birthplace */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Date of Birth <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={actorDob}
                    onChange={(e) => setActorDob(e.target.value)}
                    placeholder="e.g. November 11, 1974"
                    className="w-full bg-[#121520] border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Birthplace / Origin
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={actorBirthplace}
                    onChange={(e) => setActorBirthplace(e.target.value)}
                    placeholder="e.g. Los Angeles, California, USA"
                    className="w-full bg-[#121520] border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>
            </div>

            {/* Associate with existing movie */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Associate With Catalog Movie (Optional)
              </label>
              <select
                value={actorMovieTitle}
                onChange={(e) => setActorMovieTitle(e.target.value)}
                className="w-full bg-[#121520] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/60"
              >
                <option value="">-- None or select movie --</option>
                {existingMovies.map((m) => (
                  <option key={m.id} value={m.title} className="bg-[#121520]">
                    {m.title} ({m.year})
                  </option>
                ))}
              </select>
            </div>

            {/* Headshot Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Select Headshot Portrait
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PRESET_ACTOR_PHOTOS.map((p) => {
                  const isSelected = (!actorCustomPhoto && actorPhotoUrl === p.url);
                  return (
                    <button
                      type="button"
                      key={p.label}
                      onClick={() => {
                        setActorPhotoUrl(p.url);
                        setActorCustomPhoto('');
                      }}
                      className={`relative rounded-xl overflow-hidden border aspect-square group ${
                        isSelected
                          ? 'border-amber-400 ring-2 ring-amber-400/40'
                          : 'border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <img
                        src={p.url}
                        alt={p.label}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>

              <div className="mt-2.5">
                <span className="text-[11px] text-zinc-400">Or custom portrait photo URL:</span>
                <input
                  type="url"
                  value={actorCustomPhoto}
                  onChange={(e) => setActorCustomPhoto(e.target.value)}
                  placeholder="https://example.com/portrait.jpg"
                  className="mt-1 w-full bg-[#121520] border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-4 flex items-center gap-3">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-amber-400/10 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Actor to Directory</span>
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Actor Card Preview */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-xs space-y-3 sticky top-24">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Actor Profile Preview</span>
                <span className="text-amber-400 text-[10px] font-mono">Live</span>
              </div>

              <div className="bg-[#121520] rounded-2xl border border-amber-500/40 p-4 shadow-2xl flex flex-col gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700 shrink-0">
                    <img
                      src={actorCustomPhoto.trim() ? actorCustomPhoto.trim() : actorPhotoUrl}
                      alt="Actor Preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white text-base truncate">
                      {actorName || 'New Actor'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span className="truncate">{actorDob || 'DOB'}</span>
                    </div>
                    {actorBirthplace && (
                      <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                        {actorBirthplace}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 text-xs text-zinc-400">
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase">
                    Assigned Movies
                  </div>
                  <div className="text-zinc-200 mt-0.5 font-medium">
                    {actorMovieTitle || 'None specified yet'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ADD STUDIO */}
      {activeTab === 'studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form onSubmit={handleStudioSubmit} className="lg:col-span-7 space-y-4">
            {studioSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
                <Check className="w-4 h-4 shrink-0" />
                <span>Studio "{studioName}" registered in Studios Archive!</span>
              </div>
            )}

            {/* Studio Name */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Studio Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                placeholder="e.g. DreamWorks Pictures"
                className="w-full bg-[#121520] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            {/* Headquarters & Founded Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Headquarters / City
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={studioHq}
                    onChange={(e) => setStudioHq(e.target.value)}
                    placeholder="e.g. Burbank, California, USA"
                    className="w-full bg-[#121520] border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Founded Year
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="number"
                    min="1880"
                    max="2035"
                    value={studioYear}
                    onChange={(e) => setStudioYear(Number(e.target.value))}
                    className="w-full bg-[#121520] border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-4 flex items-center gap-3">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-amber-400/10 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Studio to Archives</span>
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Studio Preview Card */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full max-w-xs space-y-3 sticky top-24">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Studio Archive Preview</span>
                <span className="text-amber-400 text-[10px] font-mono">Live</span>
              </div>

              <div className="bg-[#121520] rounded-2xl border border-amber-500/40 p-5 shadow-2xl flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center text-amber-400">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {studioName || 'New Studio'}
                    </h3>
                    <div className="text-xs text-zinc-400 font-mono mt-0.5">
                      Est. {studioYear}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800 text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{studioHq}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
