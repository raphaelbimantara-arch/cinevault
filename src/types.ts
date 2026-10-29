export interface Movie {
  id: string;
  title: string;
  genre: string;
  studio: string;
  year: number;
  minutes: number;
  size: string; // e.g. "14.8 GB", "4.2 GB"
  sizeBytes?: number; // bytes or MB for numerical sorting
  resolution?: string; // "4K UHD HDR", "1080p BluRay", "4K Remux", etc.
  posterUrl: string;
  backdropUrl?: string;
  actors: string[];
  castCount?: number;
  favorite?: boolean;
  reviewed?: boolean;
  uncensored?: boolean;
  censored?: 'Uncensored' | 'Reduced Mosaic' | '';
  addedDate?: string;
  modifiedDate?: string;
}

export type ViewMode = 'grid' | 'list' | 'cover';

export type ActivePage = 'library' | 'actors' | 'add' | 'settings';

export type SortOption =
  | 'alphabet-asc'
  | 'alphabet-desc'
  | 'year-desc'
  | 'year-asc'
  | 'minutes-desc'
  | 'minutes-asc'
  | 'size-desc'
  | 'size-asc'
  | 'actor-asc'
  | 'actor-desc'
  | 'quality-desc'
  | 'quality-asc'
  | 'studio-desc'
  | 'studio-asc'
  | 'genre-desc'
  | 'genre-asc'
  | 'poster-missing-first'
  | 'poster-available-first'
  | 'backdrop-missing-first'
  | 'backdrop-available-first'
  | 'date-added-asc'
  | 'date-added-desc'
  | 'date-modified-asc'
  | 'date-modified-desc';

export interface ActiveFilter {
  type: 'genre' | 'studio' | 'year' | 'minutes' | 'size' | 'resolution' | 'actor' | 'alphabet' | 'search';
  label: string;
  value: string | number;
}
