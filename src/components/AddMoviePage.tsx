import React, { useState, useEffect, useMemo } from 'react';
import {
  Film,
  Building2,
  Calendar,
  Clock,
  HardDrive,
  Plus,
  Check,
  User,
  Tv,
  MapPin
} from 'lucide-react';
import { Movie } from '../types';
import { ALL_GENRES, ALL_STUDIOS } from '../data/initialMovies';
import { registerCustomActor, ActorProfile, getCustomActors, getActorAliases, KNOWN_ACTORS } from '../data/actorsData';
import { getImageSource } from '../utils/googleDriveImage';

// Imported generated images for presets
import posterScifi from '../assets/images/poster_scifi_odyssey_1792588295227.jpg';
import posterNoir from '../assets/images/poster_noir_detective_1792588296109.jpg';
import posterCyberpunk from '../assets/images/poster_cyberpunk_tokyo_1792588297850.jpg';
import posterSummit from '../assets/images/poster_drama_summit_1792588297246.jpg';

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
  const [genre, setGenre] = useState('');
  const [studio, setStudio] = useState('Warner Bros. Pictures');
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [minutes, setMinutes] = useState<string>('128');
  const [sizeStr, setSizeStr] = useState('12.4');
  const [resolution, setResolution] = useState<(typeof ALLOWED_RESOLUTIONS)[number]>('1080p HD');
  const [actorsInput, setActorsInput] = useState('');
  const [posterUrl, setPosterUrl] = useState(PRESET_POSTERS[0].url);
  const [customPoster, setCustomPoster] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // ACTOR FORM STATE
  const [actorName, setActorName] = useState('');
  const [actorDob, setActorDob] = useState('June 15, 1985');
  const [actorPhotoUrl, setActorPhotoUrl] = useState('');
  const [actorSuccess, setActorSuccess] = useState(false);

  // STUDIO FORM STATE
  const [studioName, setStudioName] = useState('');
  const [studioHq, setStudioHq] = useState('Los Angeles, California, USA');
  const [studioYear, setStudioYear] = useState<number>(1995);
  const [studioSuccess, setStudioSuccess] = useState(false);

  // GET ACTOR SUGGESTIONS FOR AUTOCOMPLETE
  const actorSuggestions = useMemo(() => {
    const customProfiles = getCustomActors();
    const names = new Set<string>();
    
    Object.keys(KNOWN_ACTORS).forEach(name => names.add(name));
    
    Object.entries(customProfiles).forEach(([name, profile]) => {
      names.add(name);
      if (profile.alias) {
        getActorAliases(profile.alias).forEach(alias => names.add(alias));
      }
    });

    existingMovies.forEach(m => m.actors.forEach(a => names.add(a)));

    return Array.from(names).sort();
  }, [existingMovies]);

  // Parse numerical size for sorting (Menggunakan titik)
  const parseSizeToMB = (str: string): number => {
    const num = parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
    if (str.toUpperCase().includes('GB')) return num * 1000;
    if (str.toUpperCase().includes('TB')) return num * 1000000;
    return num;
  };

  const handleMovieSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalPoster = getImageSource(customPoster.trim() || posterUrl);
    const actorsList = actorsInput
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    // Pastikan tahun dan menit bulat
    const safeYear = parseInt(String(year).replace(/[^0-9]/g, ''), 10) || new Date().getFullYear();
    const safeMinutes = parseInt(String(minutes).replace(/[^0-9]/g, ''), 10) || 120;

    // Perhitungan size dengan titik
    const cleanSizeString = String(sizeStr).replace(/[^0-9.]/g, '');
    const numericSize = parseFloat(cleanSizeString) || 4.5;
    const sizeBytes = Math.round(numericSize * 1000);
    const finalSizeString = `${numericSize} GB`;

    const newMovie: Movie = {
      id: `movie-${Date.now()}`,
      title: title.trim(),
      genre: genre.trim(),
      studio: studio.trim() || 'Independent',
      year: safeYear,
      minutes: safeMinutes,
      size: finalSizeString,
      sizeBytes: parseSizeToMB(finalSizeString),
      resolution,
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

    const profile: ActorProfile = {
      name: actorName.trim(),
      dob: actorDob.trim() || 'January 1, 1980',
      photoUrl: getImageSource(actorPhotoUrl),
    };

    registerCustomActor(profile);
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
                onFocus={(e) => e.target.select()}
                placeholder="e.g. Blade Runner 2099"
                className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
              />
            </div>

            {/* Row 1: Genre & Studio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Genre <span className="text-zinc-500">(optional)</span>
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/60"
                >
                  <option value="" className="bg-[#121520]">No genre</option>
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
                  type="text"
                  required
                  inputMode="numeric"
                  maxLength={4}
                  value={year}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setYear(val);
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="YYYY"
                  className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Minutes <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  value={minutes}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setMinutes(val);
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="120"
                  className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  File Size (GB) <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  inputMode="decimal"
                  value={sizeStr}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setSizeStr(val);
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder="e.g. 2.19"
                  className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            {/* Row 3: RESOLUTION */}
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

            {/* Starring Cast with Autocomplete */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Starring Actors (comma separated)
              </label>
              <input
                type="text"
                list="actor-suggestions-add"
                value={actorsInput}
                onChange={(e) => setActorsInput(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="e.g. Victor Lynch, Elena Rostova, Robert Stone"
                className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
              />
              <datalist id="actor-suggestions-add">
                {actorSuggestions.map((name, index) => (
                  <option key={index} value={name} />
                ))}
              </datalist>
            </div>

            {/* Poster URL */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Poster Image URL (Optional)
              </label>
              <input
                type="text"
                value={customPoster}
                onChange={(e) => setCustomPoster(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Paste an image URL or Google Drive sharing link"
                className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
              />
              <p className="mt-1.5 text-[11px] text-zinc-500">
                For Google Drive, set General access to “Anyone with the link” as Viewer.
              </p>
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

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Actor Full Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                value={actorName}
                onChange={(e) => setActorName(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="e.g. Leonardo DiCaprio"
                className="w-full bg-[#121520] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
              />
            </div>

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
                  onFocus={(e) => e.target.select()}
                  placeholder="e.g. November 11, 1974"
                  className="w-full bg-[#121520] border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-sm text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Actor Photo URL (Optional)
              </label>
              <input
                type="text"
                value={actorPhotoUrl}
                onChange={(e) => setActorPhotoUrl(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="Paste an image URL or Google Drive sharing link"
                className="w-full bg-[#121520] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
              />
              <p className="mt-1.5 text-[11px] text-zinc-500">
                For Google Drive, set General access to “Anyone with the link” as Viewer.
              </p>
            </div>

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

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Studio Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                value={studioName}
                onChange={(e) => setStudioName(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="e.g. DreamWorks Pictures"
                className="w-full bg-[#121520] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
              />
            </div>

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
                    onFocus={(e) => e.target.select()}
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
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-[#121520] border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>
            </div>

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