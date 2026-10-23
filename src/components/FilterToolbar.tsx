import React, { useState } from 'react';
import { 
  LayoutGrid, 
  List, 
  GalleryHorizontal,
  Search, 
  X, 
  ArrowUpDown,
  FilterX,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ViewMode, SortOption, ActiveFilter } from '../types';

interface FilterToolbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedCategory: string;
  genreOptions: string[];
  setSelectedCategory: (cat: string) => void;
  selectedAlphabets: string[];
  onToggleAlphabet: (letter: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  activeMetadataFilter: ActiveFilter | null;
  clearActiveMetadataFilter: () => void;
  totalFilteredCount: number;
  totalCatalogCount: number;
}

const ALPHABET_LIST = [
  'All',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '#'
];

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  viewMode,
  setViewMode,
  selectedCategory,
  genreOptions,
  setSelectedCategory,
  selectedAlphabets,
  onToggleAlphabet,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  activeMetadataFilter,
  clearActiveMetadataFilter,
  totalFilteredCount,
  totalCatalogCount,
}) => {
  const isMultiAlphabetActive = !selectedAlphabets.includes('All') && selectedAlphabets.length > 0;
  const [isAlphabetOpen, setIsAlphabetOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Search, Genre, Sort, and View Mode */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
        {/* Search Input */}
        <div className="relative w-full sm:flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movies, actors..."
            className="w-full bg-[#121520] border border-zinc-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/60 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Controls Row: Sort on the left, categories on the right */}
        <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
          {/* Sort dropdown on the left */}
          <div className="flex items-center gap-1 bg-[#121520] border border-zinc-800 rounded-xl px-2 sm:px-2.5 py-1.5 shrink-0">
            <ArrowUpDown className="w-3 h-3 text-amber-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer max-w-[100px] sm:max-w-none"
            >
              <option value="alphabet-asc" className="bg-[#121520]">Title (A-Z)</option>
              <option value="alphabet-desc" className="bg-[#121520]">Title (Z-A)</option>
              <option value="year-desc" className="bg-[#121520]">Year (Newest)</option>
              <option value="year-asc" className="bg-[#121520]">Year (Oldest)</option>
              <option value="minutes-desc" className="bg-[#121520]">Duration (Longest)</option>
              <option value="minutes-asc" className="bg-[#121520]">Duration (Shortest)</option>
              <option value="quality-desc" className="bg-[#121520]">Quality (Highest)</option>
              <option value="quality-asc" className="bg-[#121520]">Quality (Lowest)</option>
              <option value="size-desc" className="bg-[#121520]">Size (Largest)</option>
              <option value="size-asc" className="bg-[#121520]">Size (Smallest)</option>
              <option value="actor-asc" className="bg-[#121520]">Actor (A-Z)</option>
              <option value="actor-desc" className="bg-[#121520]">Actor (Z-A)</option>
              <option value="studio-asc" className="bg-[#121520]">Studio (A-Z)</option>
              <option value="studio-desc" className="bg-[#121520]">Studio (Z-A)</option>
              <option value="genre-asc" className="bg-[#121520]">Genre (A-Z)</option>
              <option value="genre-desc" className="bg-[#121520]">Genre (Z-A)</option>
            </select>
          </div>

          {/* Categories on the right */}
          <div className="flex items-center gap-1 bg-[#121520] border border-zinc-800 rounded-xl px-2 sm:px-2.5 py-1.5 shrink-0 ml-auto">
            <span className="text-[10px] text-zinc-500 font-medium">Filter:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer max-w-[85px] sm:max-w-none"
            >
              <option value="All" className="bg-[#121520]">All</option>
              <option value="__favorites__" className="bg-[#121520]">Favorites</option>
              <option value="__reviewed__" className="bg-[#121520]">Reviewed</option>
              {genreOptions.map((genre) => (
                <option key={genre} value={genre} className="bg-[#121520]">{genre}</option>
              ))}
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-[#121520] border border-zinc-800 rounded-xl p-1 shrink-0 ml-auto sm:ml-0">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cover')}
              title="Cover View"
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'cover'
                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <GalleryHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>


      {/* Alphabet filter */}
      <div className="rounded-lg border-y border-zinc-800/50 bg-[#0d0f16]/60 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAlphabetOpen((open) => !open)}
            aria-expanded={isAlphabetOpen}
            className="inline-flex shrink-0 items-center gap-1 text-[11px] text-zinc-400 font-mono uppercase whitespace-nowrap hover:text-zinc-200"
          >
            Alphabet
            {isAlphabetOpen
              ? <ChevronUp className="h-3.5 w-3.5" />
              : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {isMultiAlphabetActive && selectedAlphabets.length > 1 && (
            <span className="text-[10px] bg-amber-400/20 text-amber-300 font-mono px-1.5 py-0.5 rounded border border-amber-500/30">
              {selectedAlphabets.length} selected
            </span>
          )}
        </div>
        {isAlphabetOpen && (
          <div className="mt-1 flex items-center gap-1 overflow-x-auto scrollbar-none">
            {ALPHABET_LIST.map((char) => {
              const isSelected = char === 'All'
                ? selectedAlphabets.includes('All') || selectedAlphabets.length === 0
                : selectedAlphabets.includes(char);
              return (
                <button
                  key={char}
                  onClick={() => onToggleAlphabet(char)}
                  className={`min-w-6 px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors shrink-0 text-center ${
                    isSelected
                      ? 'bg-amber-400 text-zinc-950 font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                  title={char === 'All' ? 'Show all (reset)' : `Toggle letter ${char} (can select multiple)`}
                >
                  {char}
                </button>
              );
            })}
            {isMultiAlphabetActive && (
              <button
                onClick={() => onToggleAlphabet('All')}
                className="text-[10px] text-zinc-400 hover:text-amber-400 ml-1.5 px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900 shrink-0 font-mono transition-colors"
                title="Reset alphabet filter to All"
              >
                Clear ({selectedAlphabets.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Row 4: Active Filter Bar */}
      {activeMetadataFilter && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="text-amber-400 font-semibold uppercase tracking-wider text-[10px]">
              Active Filter:
            </span>
            <span className="font-medium text-white">
              {activeMetadataFilter.label}:
            </span>
            <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-mono font-medium">
              {String(activeMetadataFilter.value)}
            </span>
            <span className="text-zinc-400 text-[11px] hidden sm:inline">
              (Sorted Alphabetically A-Z by default)
            </span>
          </div>

          <button
            onClick={clearActiveMetadataFilter}
            className="flex items-center gap-1 px-2 py-1 text-xs text-amber-300 hover:text-white hover:bg-amber-500/20 rounded transition-colors"
          >
            <FilterX className="w-3.5 h-3.5" />
            <span>Clear Filter</span>
          </button>
        </div>
      )}

    </div>
  );
};
