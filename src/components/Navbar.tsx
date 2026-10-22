import React from 'react';
import { Film, Filter, Settings } from 'lucide-react';
import { ActivePage, Movie } from '../types';

interface NavbarProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  movies: Movie[];
  filteredMovies?: Movie[];
  isFiltered?: boolean;
  onTriggerAdd?: (tab?: 'movie' | 'actor' | 'studio') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  setActivePage,
  movies,
  filteredMovies,
  isFiltered = false,
}) => {
  // Calculate total library size
  const totalGB = movies.reduce((acc, m) => acc + (m.sizeBytes || 0), 0) / 1000;

  // Calculate current/filtered size
  const currentMovies = isFiltered && filteredMovies ? filteredMovies : movies;
  const currentGB = currentMovies.reduce((acc, m) => acc + (m.sizeBytes || 0), 0) / 1000;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 sm:gap-8 px-3 sm:px-6 py-3 sm:py-3.5 bg-[#0a0c12]/90 backdrop-blur-md border-b border-zinc-800/80 w-full max-w-full">
      {/* Zone 1: Single text wordmark */}
      <div 
        onClick={() => setActivePage('library')}
        className="flex items-center gap-2.5 cursor-pointer group shrink-0"
      >
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-colors duration-200">
          <Film className="w-4 h-4" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
          Cine<span className="text-amber-400">Vault</span>
        </span>
      </div>

      {/* Zone 2: Clean single-line navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
        <button
          onClick={() => setActivePage('library')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activePage === 'library' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Movie Library ({movies.length})
        </button>
        <button
          onClick={() => setActivePage('actors')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activePage === 'actors' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Actors
        </button>
        <button
          onClick={() => setActivePage('studios')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
            activePage === 'studios' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          Studios
        </button>
        <button
          onClick={() => setActivePage('settings')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
            activePage === 'settings' ? 'text-amber-400 font-semibold' : ''
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </button>
      </nav>

      {/* Zone 3: Storage & Catalog metrics and quick settings */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <button
          onClick={() => setActivePage('settings')}
          className={`p-1.5 rounded-lg border transition-colors ${
            activePage === 'settings'
              ? 'bg-amber-400 text-zinc-950 border-amber-400 shadow-sm'
              : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
          }`}
          title="Settings (Export & Import CSV, Duplicate Finder)"
        >
          <Settings className="w-4 h-4" />
        </button>
        <div 
          className={`flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-mono tabular-nums px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg shadow-sm whitespace-nowrap transition-colors ${
            isFiltered 
              ? 'bg-amber-500/10 border border-amber-500/40 text-amber-200' 
              : 'bg-zinc-900/90 border border-zinc-800 text-zinc-300'
          }`}
          title={isFiltered ? `${currentMovies.length} of ${movies.length} movies (${currentGB.toFixed(1)} GB of ${totalGB.toFixed(1)} GB)` : undefined}
        >
          {isFiltered ? (
            <Filter className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 animate-pulse shrink-0" />
          ) : (
            <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
          )}
          <span>
            {isFiltered ? (
              <>
                <strong className="text-amber-400 font-semibold">{currentMovies.length}</strong>{' '}
                {currentMovies.length === 1 ? 'Movie' : 'Movies'} &{' '}
                <strong className="text-amber-400 font-semibold">{currentGB.toFixed(1)} GB</strong>
              </>
            ) : (
              <>
                <strong className="text-white font-semibold">{movies.length}</strong> Movies &{' '}
                <strong className="text-white font-semibold">{totalGB.toFixed(1)} GB</strong>
              </>
            )}
          </span>
        </div>
      </div>
    </header>
  );
};
