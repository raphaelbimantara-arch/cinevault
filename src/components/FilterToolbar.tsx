import React, { useState } from 'react';
import { 
  LayoutGrid, 
  List, 
  GalleryHorizontal,
  Search, 
  X, 
  ArrowUp,
  ArrowDown,
  FilterX,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ViewMode, SortOption, ActiveFilter } from '../types';

interface FilterToolbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  gridCols: number;
  setGridCols: (cols: number) => void;
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
  gridCols,
  setGridCols,
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
          {/* Compact sort field selector + separate direction toggle */}
          <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-[#121520] px-2 py-1.5 shrink-0">
            <select
              aria-label="Sort field"
              value={(() => {
                const map: Record<string, string> = {
                  'alphabet-asc':'title','alphabet-desc':'title','year-asc':'year','year-desc':'year',
                  'minutes-asc':'duration','minutes-desc':'duration','quality-asc':'quality','quality-desc':'quality',
                  'size-asc':'size','size-desc':'size','actor-asc':'actor','actor-desc':'actor',
                  'studio-asc':'studio','studio-desc':'studio','genre-asc':'genre','genre-desc':'genre',
                  'date-added-asc':'dateAdded','date-added-desc':'dateAdded','date-modified-asc':'dateModified','date-modified-desc':'dateModified','censor-asc':'censor','censor-desc':'censor',
                  'poster-missing-first':'frontCover','poster-available-first':'frontCover','backdrop-missing-first':'backCover','backdrop-available-first':'backCover'
                };
                return map[sortBy] || 'title';
              })()}
              onChange={(e) => {
                const field = e.target.value;
                const currentDesc = ['alphabet-desc','year-desc','minutes-desc','quality-desc','size-desc','actor-desc','studio-desc','genre-desc','date-added-desc','date-modified-desc','censor-desc','poster-available-first','backdrop-available-first'].includes(sortBy);
                const pairs: Record<string, [SortOption, SortOption]> = {
                  title:['alphabet-asc','alphabet-desc'], year:['year-asc','year-desc'], duration:['minutes-asc','minutes-desc'],
                  quality:['quality-asc','quality-desc'], size:['size-asc','size-desc'], actor:['actor-asc','actor-desc'],
                  studio:['studio-asc','studio-desc'], genre:['genre-asc','genre-desc'], dateAdded:['date-added-asc','date-added-desc'],
                  dateModified:['date-modified-asc','date-modified-desc'], censor:['censor-asc','censor-desc'], frontCover:['poster-missing-first','poster-available-first'],
                  backCover:['backdrop-missing-first','backdrop-available-first']
                };
                const pair = pairs[field];
                if (pair) setSortBy(pair[currentDesc ? 1 : 0]);
              }}
              className="max-w-[130px] cursor-pointer bg-transparent text-xs text-zinc-200 focus:outline-none sm:max-w-none"
            >
              <option value="title" className="bg-[#121520]">Title</option>
              <option value="year" className="bg-[#121520]">Year</option>
              <option value="dateAdded" className="bg-[#121520]">Date Added</option>
              <option value="dateModified" className="bg-[#121520]">Date Modified</option>
              <option value="censor" className="bg-[#121520]">Censor</option>
              <option value="duration" className="bg-[#121520]">Duration</option>
              <option value="quality" className="bg-[#121520]">Quality</option>
              <option value="size" className="bg-[#121520]">Size</option>
              <option value="actor" className="bg-[#121520]">Actor</option>
              <option value="studio" className="bg-[#121520]">Studio</option>
              <option value="genre" className="bg-[#121520]">Genre</option>
              <option value="frontCover" className="bg-[#121520]">Front Cover</option>
              <option value="backCover" className="bg-[#121520]">Back Cover</option>
            </select>
            <button
              type="button"
              aria-label={['alphabet-desc','year-desc','minutes-desc','quality-desc','size-desc','actor-desc','studio-desc','genre-desc','date-added-desc','date-modified-desc','censor-desc','poster-available-first','backdrop-available-first'].includes(sortBy) ? 'Descending sort; click for ascending' : 'Ascending sort; click for descending'}
              title={['alphabet-desc','year-desc','minutes-desc','quality-desc','size-desc','actor-desc','studio-desc','genre-desc','date-added-desc','date-modified-desc','censor-desc','poster-available-first','backdrop-available-first'].includes(sortBy) ? 'Descending' : 'Ascending'}
              onClick={() => {
                const pairs: Record<string, [SortOption, SortOption]> = {
                  'alphabet-asc':['alphabet-asc','alphabet-desc'],'alphabet-desc':['alphabet-asc','alphabet-desc'],
                  'year-asc':['year-asc','year-desc'],'year-desc':['year-asc','year-desc'],
                  'minutes-asc':['minutes-asc','minutes-desc'],'minutes-desc':['minutes-asc','minutes-desc'],
                  'quality-asc':['quality-asc','quality-desc'],'quality-desc':['quality-asc','quality-desc'],
                  'size-asc':['size-asc','size-desc'],'size-desc':['size-asc','size-desc'],
                  'actor-asc':['actor-asc','actor-desc'],'actor-desc':['actor-asc','actor-desc'],
                  'studio-asc':['studio-asc','studio-desc'],'studio-desc':['studio-asc','studio-desc'],
                  'genre-asc':['genre-asc','genre-desc'],'genre-desc':['genre-asc','genre-desc'],
                  'date-added-asc':['date-added-asc','date-added-desc'],'date-added-desc':['date-added-asc','date-added-desc'],
                  'date-modified-asc':['date-modified-asc','date-modified-desc'],'date-modified-desc':['date-modified-asc','date-modified-desc'],
                  'censor-asc':['censor-asc','censor-desc'],'censor-desc':['censor-asc','censor-desc'],
                  'poster-missing-first':['poster-missing-first','poster-available-first'],'poster-available-first':['poster-missing-first','poster-available-first'],
                  'backdrop-missing-first':['backdrop-missing-first','backdrop-available-first'],'backdrop-available-first':['backdrop-missing-first','backdrop-available-first']
                };
                const pair = pairs[sortBy];
                if (pair) setSortBy(sortBy === pair[0] ? pair[1] : pair[0]);
              }}
              className="rounded-md p-1 text-zinc-300 hover:bg-zinc-800 hover:text-amber-300"
            >
              {['alphabet-desc','year-desc','minutes-desc','quality-desc','size-desc','actor-desc','studio-desc','genre-desc','date-added-desc','date-modified-desc','censor-desc','poster-available-first','backdrop-available-first'].includes(sortBy)
                ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
            </button>
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
              <option value="__uncensored__" className="bg-[#121520]">Uncensored</option>
              {genreOptions.map((genre) => (
                <option key={genre} value={genre} className="bg-[#121520]">{genre}</option>
              ))}
            </select>
          </div>

          {/* View Toggle & Slider */}
          <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
            {/* SLIDER PENGATUR UKURAN */}
            {viewMode === 'cover' && (
              <div className="flex items-center gap-2 bg-[#121520] px-2.5 py-1.5 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-400 font-mono">Size</span>
                <input 
                  type="range" 
                  min="2" 
                  max="15" 
                  value={gridCols} 
                  onChange={(e) => setGridCols(Number(e.target.value))} 
                  className="w-16 sm:w-24 accent-amber-400 cursor-pointer"
                  title={`${gridCols} columns`}
                />
              </div>
            )}

            <div className="flex items-center bg-[#121520] border border-zinc-800 rounded-xl p-1">
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