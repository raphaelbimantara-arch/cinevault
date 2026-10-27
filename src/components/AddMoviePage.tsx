import React, { useState, useEffect, useMemo } from 'react';
import {
  Film,
  Building2,
  Calendar,
  Plus,
  Check,
  User,
  Tv,
  MapPin,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Movie } from '../types';
import { registerCustomActor, ActorProfile, getCustomActors, getActorAliases, KNOWN_ACTORS } from '../data/actorsData';
import { getImageSource } from '../utils/googleDriveImage';
import { addMasterActor, addMasterStudio, addMasterGenre } from '../data/masterData';

// Imported generated images for presets
import posterScifi from '../assets/images/poster_scifi_odyssey_1792588295227.jpg';
import posterNoir from '../assets/images/poster_noir_detective_1792588296109.jpg';
import posterCyberpunk from '../assets/images/poster_cyberpunk_tokyo_1792588297850.jpg';
import posterSummit from '../assets/images/poster_drama_summit_1792588297246.jpg';

interface AddDataPageProps {
  initialTab?: 'movie' | 'actor' | 'studio' | 'delete';
  onAddMovie: (newMovie: Movie) => void;
  onAddActorSuccess?: (actorName: string) => void;
  onAddStudioSuccess?: (studioName: string) => void;
  onCancel: () => void;
  existingMovies: Movie[];
  existingGenres: string[];
  existingStudios: string[];
  existingActors: string[];
  onDeleteMovie: (id: string) => Promise<void> | void;
  onDeleteActors: (names: string[]) => void;
  onDeleteStudio: (studioName: string) => void;
  onDeleteGenre: (genreName: string) => void;
}

const PRESET_POSTERS = [
  { label: 'Sci-Fi Galaxy', url: posterScifi },
  { label: 'Noir Detective', url: posterNoir },
  { label: 'Cyberpunk Anime', url: posterCyberpunk },
  { label: 'Alpine Drama', url: posterSummit },
  { label: 'Cinematic Cinema', url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=980&auto=format&fit=crop' },
  { label: 'Urban Thriller', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?q=80&w=980&auto=format&fit=crop' },
];

const ALLOWED_RESOLUTIONS = ['1080p HD', '960p HD', '720p HD'] as const;

export const AddMoviePage: React.FC<AddDataPageProps> = ({
  initialTab = 'movie',
  onAddMovie,
  onAddActorSuccess,
  onAddStudioSuccess,
  onCancel,
  existingMovies,
  existingGenres,
  existingStudios,
  existingActors,
  onDeleteMovie,
  onDeleteActors,
  onDeleteStudio,
  onDeleteGenre,
}) => {
  const [activeTab, setActiveTab] = useState<'movie' | 'actor' | 'studio' | 'delete'>(initialTab);

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
  const [studioYear, setStudioYear] = useState<string>('1995');
  const [studioSuccess, setStudioSuccess] = useState(false);

  // DELETE STATE
  const [deleteSubTab, setDeleteSubTab] = useState<'movie' | 'actor' | 'studio' | 'genre'>('movie');
  const [selectedMovieToDelete, setSelectedMovieToDelete] = useState<string>('');
  const [selectedActorsToDelete, setSelectedActorsToDelete] = useState<Set<string>>(new Set());
  const [selectedStudioToDelete, setSelectedStudioToDelete] = useState<string>('');
  const [selectedGenreToDelete, setSelectedGenreToDelete] = useState<string>('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');
  const [searchDeleteQuery, setSearchDeleteQuery] = useState('');

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

  const handleMovieSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalPoster = getImageSource(customPoster.trim() || posterUrl);
    const actorsList = actorsInput
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    const safeYear = parseInt(year, 10) || new Date().getFullYear();
    const safeMinutes = parseInt(minutes, 10) || 120;

    const cleanSizeString = String(sizeStr).replace(',', '.').replace(/[^0-9.]/g, '');
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
      sizeBytes,
      resolution,
      posterUrl: finalPoster,
      actors: actorsList.length > 0 ? actorsList : ['Lead Actor'],
      addedDate: new Date().toISOString().split('T')[0],
    };

    // Register into master data
    genre.split(',').map((g) => g.trim()).filter(Boolean).forEach((g) => addMasterGenre(g));
    if (newMovie.studio) addMasterStudio(newMovie.studio);
    actorsList.forEach((a) => addMasterActor(a));

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

    addMasterActor(profile.name);
    registerCustomActor(profile);
    setActorSuccess(true);
    if (onAddActorSuccess) {
      setTimeout(() => onAddActorSuccess(profile.name), 800);
    }
  };

  const handleStudioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studioName.trim()) return;

    addMasterStudio(studioName.trim());
    setStudioSuccess(true);
    if (onAddStudioSuccess) {
      setTimeout(() => onAddStudioSuccess(studioName.trim()), 800);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full">
      {/* Page Header with Contextual Tabs */}
      <div className="pb-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Catalog Creator Hub
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Add or delete movies, actors, studios, and genres from your catalog.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-4 w-full sm:w-auto p-1 bg-[#121520] border border-zinc-800 rounded-xl gap-1">
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
          <button
            onClick={() => setActiveTab('delete')}
            className={`px-2 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-colors ${
              activeTab === 'delete'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Delete</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ADD MOVIE */}
      {activeTab === 'movie' && (
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleMovieSubmit} className="space-y-4 bg-[#121520] border border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xl">
            {savedSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
                <Check className="w-4 h-4 shrink-0" />
                <span>Movie successfully added to library with {resolution} resolution!</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LEFT COLUMN: MAIN INFO */}
              <div className="space-y-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Genre
                    </label>
                    <input
                      type="text"
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      placeholder="e.g. Action, Sci-Fi"
                      className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-200 focus:outline-none focus:border-amber-500/60 placeholder:text-zinc-600"
                    />
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
                      {existingStudios.map((s) => (
                        <option key={s} value={s} className="bg-[#121520]">{s}</option>
                      ))}
                      <option value="Independent / Other" className="bg-[#121520]">Independent / Other</option>
                    </select>
                  </div>
                </div>

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
                      onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, ''))}
                      onFocus={(e) => e.target.select()}
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
                      onChange={(e) => setMinutes(e.target.value.replace(/[^0-9]/g, ''))}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-amber-500/60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Size (GB) <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      inputMode="decimal"
                      value={sizeStr}
                      onChange={(e) => setSizeStr(e.target.value.replace(/[^0-9.]/g, ''))}
                      onFocus={(e) => e.target.select()}
                      placeholder="e.g. 2.19"
                      className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-amber-500/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Resolution (HD Standards)
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
                              : 'bg-[#0a0c12] text-zinc-400 border-zinc-800 hover:text-zinc-200'
                          }`}
                        >
                          <Tv className="w-3.5 h-3.5" />
                          <span>{resOption}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: ACTOR & POSTER */}
              <div className="space-y-4">
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
                    placeholder="e.g. Victor Lynch, Elena Rostova"
                    className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
                  />
                  <datalist id="actor-suggestions-add">
                    {actorSuggestions.map((name, index) => (
                      <option key={index} value={name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Poster Image URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={customPoster}
                    onChange={(e) => setCustomPoster(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="Paste an image URL"
                    className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
                  />
                  <p className="mt-1.5 text-[11px] text-zinc-500">
                    For Google Drive, set General access to "Anyone with the link".
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Or Pick a Preset Poster
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {PRESET_POSTERS.map((p) => (
                      <button
                        type="button"
                        key={p.label}
                        onClick={() => {
                          setCustomPoster('');
                          setPosterUrl(p.url);
                        }}
                        className={`shrink-0 w-12 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          posterUrl === p.url && !customPoster
                            ? 'border-amber-400 ring-2 ring-amber-400/30'
                            : 'border-zinc-800 opacity-60 hover:opacity-100'
                        }`}
                        title={p.label}
                      >
                        <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-4 border-t border-zinc-800/60 mt-4 flex items-center gap-3">
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
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleActorSubmit} className="space-y-4 bg-[#121520] border border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xl">
            {actorSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
                <Check className="w-4 h-4 shrink-0" />
                <span>Actor profile successfully registered!</span>
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
                placeholder="Paste an image URL"
                className="w-full bg-[#121520] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/60"
              />
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
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleStudioSubmit} className="space-y-4 bg-[#121520] border border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xl">
            {studioSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
                <Check className="w-4 h-4 shrink-0" />
                <span>Studio "{studioName}" registered!</span>
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
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={studioYear}
                    onChange={(e) => setStudioYear(e.target.value.replace(/[^0-9]/g, ''))}
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
        </div>
      )}

      {/* TAB 4: DELETE DATA */}
      {activeTab === 'delete' && (
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="grid grid-cols-4 gap-2 p-1 bg-[#121520] border border-zinc-800 rounded-xl">
            {(['movie', 'actor', 'studio', 'genre'] as const).map((sub) => (
              <button
                key={sub}
                onClick={() => {
                  setDeleteSubTab(sub);
                  setDeleteConfirmText('');
                  setSearchDeleteQuery('');
                  setDeleteSuccess('');
                }}
                className={`py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  deleteSubTab === sub
                    ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/30 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Deleted data cannot be recovered. Type <b className="font-mono">DELETE</b> to confirm.</span>
          </div>

          {deleteSuccess && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
              <Check className="w-4 h-4 shrink-0" />
              <span>{deleteSuccess}</span>
            </div>
          )}

          <div className="bg-[#121520] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Type "DELETE" to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 font-mono focus:outline-none focus:border-rose-500/60"
              />
            </div>

            {deleteSubTab === 'movie' && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={searchDeleteQuery}
                  onChange={(e) => setSearchDeleteQuery(e.target.value)}
                  placeholder="Search movie title..."
                  className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100"
                />
                <div className="max-h-72 overflow-y-auto rounded-xl border border-zinc-800 divide-y divide-zinc-800">
                  {existingMovies
                    .filter((m) => m.title.toLowerCase().includes(searchDeleteQuery.toLowerCase()))
                    .map((movie) => (
                      <label key={movie.id} className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800/40 cursor-pointer">
                        <input
                          type="radio"
                          name="movie-delete"
                          checked={selectedMovieToDelete === movie.id}
                          onChange={() => setSelectedMovieToDelete(movie.id)}
                          className="accent-rose-500"
                        />
                        <img src={movie.posterUrl} alt="" className="w-8 h-11 rounded object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-zinc-100 truncate">{movie.title}</p>
                          <p className="text-[11px] text-zinc-500">{movie.year} · {movie.studio}</p>
                        </div>
                      </label>
                    ))}
                </div>
                <button
                  type="button"
                  disabled={!selectedMovieToDelete || deleteConfirmText !== 'DELETE'}
                  onClick={async () => {
                    const movie = existingMovies.find((m) => m.id === selectedMovieToDelete);
                    await onDeleteMovie(selectedMovieToDelete);
                    setDeleteSuccess(`Movie "${movie?.title}" deleted successfully.`);
                    setSelectedMovieToDelete('');
                    setDeleteConfirmText('');
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" /> Delete Selected Movie
                </button>
              </div>
            )}

            {deleteSubTab === 'actor' && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={searchDeleteQuery}
                  onChange={(e) => setSearchDeleteQuery(e.target.value)}
                  placeholder="Search actor..."
                  className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100"
                />
                <div className="max-h-72 overflow-y-auto rounded-xl border border-zinc-800 divide-y divide-zinc-800">
                  {existingActors
                    .filter((a) => a.toLowerCase().includes(searchDeleteQuery.toLowerCase()))
                    .map((actor) => (
                      <label key={actor} className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800/40 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedActorsToDelete.has(actor)}
                          onChange={(e) => {
                            const next = new Set(selectedActorsToDelete);
                            if (e.target.checked) next.add(actor);
                            else next.delete(actor);
                            setSelectedActorsToDelete(next);
                          }}
                          className="accent-rose-500"
                        />
                        <span className="text-sm text-zinc-100">{actor}</span>
                      </label>
                    ))}
                </div>
                <button
                  type="button"
                  disabled={selectedActorsToDelete.size === 0 || deleteConfirmText !== 'DELETE'}
                  onClick={() => {
                    const names = [...selectedActorsToDelete];
                    onDeleteActors(names);
                    setDeleteSuccess(`${names.length} actor(s) deleted successfully.`);
                    setSelectedActorsToDelete(new Set());
                    setDeleteConfirmText('');
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" /> Delete {selectedActorsToDelete.size} Actor(s)
                </button>
              </div>
            )}

            {deleteSubTab === 'studio' && (
              <div className="space-y-3">
                <select
                  value={selectedStudioToDelete}
                  onChange={(e) => setSelectedStudioToDelete(e.target.value)}
                  className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-200"
                >
                  <option value="">-- Select Studio --</option>
                  {existingStudios.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500">
                  Studio will be deleted from master data and all related movies will be set to "Unknown Studio".
                </p>
                <button
                  type="button"
                  disabled={!selectedStudioToDelete || deleteConfirmText !== 'DELETE'}
                  onClick={() => {
                    onDeleteStudio(selectedStudioToDelete);
                    setDeleteSuccess(`Studio "${selectedStudioToDelete}" deleted successfully.`);
                    setSelectedStudioToDelete('');
                    setDeleteConfirmText('');
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" /> Delete Selected Studio
                </button>
              </div>
            )}

            {deleteSubTab === 'genre' && (
              <div className="space-y-3">
                <select
                  value={selectedGenreToDelete}
                  onChange={(e) => setSelectedGenreToDelete(e.target.value)}
                  className="w-full bg-[#0a0c12] border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-200"
                >
                  <option value="">-- Select Genre --</option>
                  {existingGenres.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500">
                  Genre will be deleted from master data and removed from all related movies.
                </p>
                <button
                  type="button"
                  disabled={!selectedGenreToDelete || deleteConfirmText !== 'DELETE'}
                  onClick={() => {
                    onDeleteGenre(selectedGenreToDelete);
                    setDeleteSuccess(`Genre "${selectedGenreToDelete}" deleted successfully.`);
                    setSelectedGenreToDelete('');
                    setDeleteConfirmText('');
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" /> Delete Selected Genre
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};