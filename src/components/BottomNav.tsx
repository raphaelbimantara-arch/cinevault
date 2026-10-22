import React from 'react';
import { Film, Users, Building2, PlusCircle, User, Settings } from 'lucide-react';
import { ActivePage } from '../types';

interface BottomNavProps {
  activePage: ActivePage;
  setActivePage: (page: ActivePage) => void;
  moviesCount: number;
  actorsCount: number;
  studiosCount: number;
  onTriggerAdd: (tab?: 'movie' | 'actor' | 'studio') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activePage,
  setActivePage,
  moviesCount,
  actorsCount,
  studiosCount,
  onTriggerAdd,
}) => {
  // Contextual Add button details
  const getAddConfig = () => {
    switch (activePage) {
      case 'actors':
        return {
          label: 'Add Actor',
          icon: <User className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />,
          action: () => onTriggerAdd('actor'),
        };
      case 'studios':
        return {
          label: 'Add Studio',
          icon: <Building2 className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />,
          action: () => onTriggerAdd('studio'),
        };
      case 'add':
        return {
          label: 'Add Data',
          icon: <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />,
          action: () => setActivePage('add'),
        };
      case 'library':
      default:
        return {
          label: 'Add Movies',
          icon: <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5 mb-1" />,
          action: () => onTriggerAdd('movie'),
        };
    }
  };

  const addConfig = getAddConfig();

  return (
    <nav 
      aria-label="Bottom Navigation" 
      className="fixed bottom-0 inset-x-0 z-[60] bg-[#090b10]/95 backdrop-blur-lg border-t border-zinc-800/90 px-2 sm:px-3 py-2 sm:py-2.5 shadow-2xl"
    >
      <div className="max-w-2xl mx-auto grid grid-cols-5 gap-1 sm:gap-1.5">
        {/* Page 1: Movie Library */}
        <button
          onClick={() => setActivePage('library')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 relative ${
            activePage === 'library'
              ? 'text-amber-400 bg-amber-400/10 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Film className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5 sm:mb-1" />
          <span className="text-[10px] sm:text-xs tracking-tight whitespace-nowrap">
            Library
          </span>
          <span className="text-[9px] text-zinc-500 font-mono tabular-nums leading-none mt-0.5">
            {moviesCount}
          </span>
          {activePage === 'library' && (
            <span className="absolute -top-2 w-7 h-0.5 bg-amber-400 rounded-full" />
          )}
        </button>

        {/* Page 2: Actors */}
        <button
          onClick={() => setActivePage('actors')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 relative ${
            activePage === 'actors'
              ? 'text-amber-400 bg-amber-400/10 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Users className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5 sm:mb-1" />
          <span className="text-[10px] sm:text-xs tracking-tight whitespace-nowrap">
            Actors
          </span>
          <span className="text-[9px] text-zinc-500 font-mono tabular-nums leading-none mt-0.5">
            {actorsCount}
          </span>
          {activePage === 'actors' && (
            <span className="absolute -top-2 w-7 h-0.5 bg-amber-400 rounded-full" />
          )}
        </button>

        {/* Page 3: Studios */}
        <button
          onClick={() => setActivePage('studios')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 relative ${
            activePage === 'studios'
              ? 'text-amber-400 bg-amber-400/10 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Building2 className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5 sm:mb-1" />
          <span className="text-[10px] sm:text-xs tracking-tight whitespace-nowrap">
            Studios
          </span>
          <span className="text-[9px] text-zinc-500 font-mono tabular-nums leading-none mt-0.5">
            {studiosCount}
          </span>
          {activePage === 'studios' && (
            <span className="absolute -top-2 w-7 h-0.5 bg-amber-400 rounded-full" />
          )}
        </button>

        {/* Page 4: Contextual Add Action */}
        <button
          onClick={addConfig.action}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 relative ${
            activePage === 'add'
              ? 'text-amber-400 bg-amber-400/10 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
          title={`Click to ${addConfig.label}`}
        >
          {addConfig.icon}
          <span className="text-[10px] sm:text-xs tracking-tight whitespace-nowrap">
            {addConfig.label}
          </span>
          <span className="text-[9px] text-amber-500/80 font-mono leading-none mt-0.5">
            + New
          </span>
          {activePage === 'add' && (
            <span className="absolute -top-2 w-7 h-0.5 bg-amber-400 rounded-full" />
          )}
        </button>

        {/* Page 5: Settings (CSV & Data Kembar) */}
        <button
          onClick={() => setActivePage('settings')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 relative ${
            activePage === 'settings'
              ? 'text-amber-400 bg-amber-400/10 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
          title="Settings: Export & Import CSV, Duplicate Finder"
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5 sm:mb-1" />
          <span className="text-[10px] sm:text-xs tracking-tight whitespace-nowrap">
            Settings
          </span>
          <span className="text-[9px] text-zinc-500 font-mono leading-none mt-0.5">
            CSV & Tools
          </span>
          {activePage === 'settings' && (
            <span className="absolute -top-2 w-7 h-0.5 bg-amber-400 rounded-full" />
          )}
        </button>
      </div>
    </nav>
  );
};
