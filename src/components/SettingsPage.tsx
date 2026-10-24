import React, { startTransition, useState, useMemo, useRef, useEffect } from 'react';
import { 
  Download, 
  Upload, 
  Copy, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  FileSpreadsheet, 
  RefreshCw, 
  Layers, 
  HardDrive, 
  Sliders, 
  Info,
  Check,
  Smartphone,
  ShieldCheck,
  Cloud
} from 'lucide-react';
import { Movie } from '../types';
import { getImageSource } from '../utils/googleDriveImage';
import { getActorAliases, getCustomActors, KNOWN_ACTORS } from '../data/actorsData';

interface SettingsPageProps {
  movies: Movie[];
  sharedCatalogToken: string;
  sharedCatalogStatus: 'disconnected' | 'loading' | 'connected' | 'empty' | 'error';
  sharedCatalogError: string;
  onConnectSharedCatalog: (token: string) => void;
  onDisconnectSharedCatalog: () => void;
  onInitializeSharedCatalog: () => Promise<void>;
  onSaveSharedCatalog: () => Promise<number>;
  onRefreshSharedCatalog: () => Promise<number>;
  onImportMovies: (newMovies: Movie[], mode: 'merge' | 'replace') => void;
  onDeleteMovie: (movieId: string) => void;
  onBulkDeleteMovies: (movieIds: string[]) => void;
  onMergeActors: (primaryName: string, mergedNames: string[]) => void;
  onUpdateMovie?: (updatedMovie: Movie) => void;
  onResetCatalog: () => void;
  onSelectMovie: (movie: Movie) => void;
}

interface DuplicateGroup {
  key: string;
  reason: 'exact-title' | 'title-and-year' | 'similar-title';
  movies: Movie[];
}

interface ActorDuplicateCandidate {
  name: string;
  alias: string;
  movieCount: number;
}

interface ActorDuplicateGroup {
  key: string;
  reason: 'name-or-alias' | 'similar-spelling' | 'matching-name-parts';
  actors: ActorDuplicateCandidate[];
}

interface KeepDuplicateButtonProps {
  onConfirm: () => void;
  title: string;
  className?: string;
}

interface SaveSharedCatalogButtonProps {
  movieCount: number;
  isLoading: boolean;
  onSave: () => Promise<number>;
  onNotify: (type: 'success' | 'error', message: string) => void;
}

const REVIEWED_DUPLICATE_GROUPS_KEY = 'cinevault_reviewed_duplicate_groups_v1';

const SaveSharedCatalogButton: React.FC<SaveSharedCatalogButtonProps> = ({
  movieCount,
  isLoading,
  onSave,
  onNotify,
}) => {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const count = await onSave();
      onNotify('success', `${count} film berhasil disimpan ke database bersama.`);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Gagal menyimpan database perangkat ini ke katalog bersama.';
      onNotify('error', message);
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="space-y-2 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-3 sm:col-span-2">
        <p className="text-xs text-zinc-200">
          Replace the shared database with all {movieCount} movies from this device?
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={saving || isLoading}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || isLoading}
            className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
          >
            {saving || isLoading ? 'Saving...' : 'Confirm and save'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      disabled={isLoading || movieCount === 0}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Upload className="h-4 w-4" />
      {isLoading ? 'Menyimpan database...' : 'Save to Database'}
    </button>
  );
};

const KeepDuplicateButton: React.FC<KeepDuplicateButtonProps> = ({ onConfirm, title, className }) => {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2" role="group" aria-label="Confirm keeping duplicate entries">
        <span className="text-[11px] text-amber-200">Keep all entries? Nothing will be deleted.</span>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
          className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className={className}
      title={title}
    >
      <CheckCircle2 className="h-3.5 w-3.5" />
      Keep These
    </button>
  );
};

function getMovieDuplicateReviewKey(group: DuplicateGroup): string {
  return group.movies.map((movie) => movie.id).sort().join('|');
}

function normalizePersonName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[right.length];
}

function getActorDuplicateReason(
  first: ActorDuplicateCandidate,
  second: ActorDuplicateCandidate,
): ActorDuplicateGroup['reason'] | null {
  const firstIdentities = [first.name, ...getActorAliases(first.alias)].map(normalizePersonName).filter(Boolean);
  const secondIdentities = [second.name, ...getActorAliases(second.alias)].map(normalizePersonName).filter(Boolean);
  if (firstIdentities.some((identity) => secondIdentities.includes(identity))) {
    return 'name-or-alias';
  }

  for (const firstIdentity of firstIdentities) {
    for (const secondIdentity of secondIdentities) {
      const firstWords = firstIdentity.split(' ');
      const secondWords = secondIdentity.split(' ');
      if (
        firstWords.length > 1 &&
        secondWords.length > 1 &&
        firstWords.length === secondWords.length &&
        [...firstWords].sort().join(' ') === [...secondWords].sort().join(' ')
      ) {
        return 'matching-name-parts';
      }

      if (firstWords.length > 1 && secondWords.length > 1) {
        const firstGiven = firstWords[0];
        const secondGiven = secondWords[0];
        const firstFamily = firstWords[firstWords.length - 1];
        const secondFamily = secondWords[secondWords.length - 1];
        const sameFamily = firstFamily === secondFamily
          || (firstFamily.length >= 4 && secondFamily.length >= 4
            && editDistance(firstFamily, secondFamily) <= 1);
        if (
          sameFamily &&
          firstGiven.length >= 3 &&
          secondGiven.length >= 3 &&
          editDistance(firstGiven, secondGiven) <= 1
        ) {
          return 'matching-name-parts';
        }
      }

      const maxLength = Math.max(firstIdentity.length, secondIdentity.length);
      const allowedDistance = maxLength >= 8 ? 2 : maxLength >= 5 ? 1 : 0;
      if (allowedDistance > 0 && editDistance(firstIdentity, secondIdentity) <= allowedDistance) {
        return 'similar-spelling';
      }
    }
  }
  return null;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  movies,
  sharedCatalogToken,
  sharedCatalogStatus,
  sharedCatalogError,
  onConnectSharedCatalog,
  onDisconnectSharedCatalog,
  onInitializeSharedCatalog,
  onSaveSharedCatalog,
  onRefreshSharedCatalog,
  onImportMovies,
  onDeleteMovie,
  onBulkDeleteMovies,
  onMergeActors,
  onResetCatalog,
  onSelectMovie,
}) => {
  const [activeTab, setActiveTab] = useState<'csv' | 'duplicates' | 'system'>('csv');
  const [duplicateType, setDuplicateType] = useState<'movies' | 'actors'>('movies');
  const [reviewedDuplicateGroups, setReviewedDuplicateGroups] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(REVIEWED_DUPLICATE_GROUPS_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];
      return new Set(Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string') : []);
    } catch (error) {
      console.error('Failed to load reviewed duplicate groups:', error);
      return new Set();
    }
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // CSV Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedMovies, setParsedMovies] = useState<Movie[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseNotes, setParseNotes] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [autoImportEnabled, setAutoImportEnabled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(REVIEWED_DUPLICATE_GROUPS_KEY, JSON.stringify([...reviewedDuplicateGroups]));
      } catch (error) {
        console.error('Failed to save reviewed duplicate groups:', error);
        showToast('error', 'Could not save duplicate review decisions on this device.');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reviewedDuplicateGroups]);

  // Auto-dismiss notification after 4s
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // ----------------------------------------------------------------------
  // 1. CSV EXPORT LOGIC
  // ----------------------------------------------------------------------
  const handleExportCsv = () => {
    try {
      const headers = [
        'id', 'title', 'genre', 'studio', 'year', 'minutes', 'size', 'resolution',
        'posterUrl', 'backdropUrl', 'actors', 'addedDate', 'castCount', 'favorite', 'reviewed', 'uncensored'
      ];

      // Fungsi baru: Hanya pakai tanda kutip jika ada koma, enter, atau kutip di dalam teks
      const escapeCsvCell = (val: unknown): string => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        // Jika ada koma, enter, atau kutip, bungkus dengan kutip dan gandakan kutipnya
        if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str; // Kalau teks biasa, biarkan tanpa tanda kutip
      };

      const rows = movies.map((m) => [
        escapeCsvCell(m.id), escapeCsvCell(m.title), escapeCsvCell(m.genre), escapeCsvCell(m.studio),
        escapeCsvCell(m.year), escapeCsvCell(m.minutes), escapeCsvCell(m.size), escapeCsvCell(m.resolution || '1080p BluRay'),
        escapeCsvCell(m.posterUrl), escapeCsvCell(m.backdropUrl || ''), escapeCsvCell(m.actors.join(' | ')),
        escapeCsvCell(m.addedDate || new Date().toISOString().split('T')[0]), escapeCsvCell(m.castCount ?? ''),
        escapeCsvCell(m.favorite ? 'true' : ''), escapeCsvCell(m.reviewed ? 'true' : ''), escapeCsvCell(m.uncensored ? 'true' : '')
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `cinevault_movies_export_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('success', `Successfully exported ${movies.length} movies to CSV!`);
    } catch (err) {
      console.error('Export error:', err);
      showToast('error', 'Failed to export catalog to CSV.');
    }
  };

  const handleDownloadSampleCsv = () => {
    const sampleHeaders = 'id,title,genre,studio,year,minutes,size,resolution,posterUrl,backdropUrl,actors,addedDate,castCount,favorite,reviewed,uncensored';
    const sampleRow = '"m-sample-01","Inception Reloaded","Sci-Fi","Warner Bros.",2024,148,"12.4 GB","4K UHD HDR","https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800","","Leonardo DiCaprio | Joseph Gordon-Levitt","2024-01-15","","false","false","false"';
    const sampleContent = '\uFEFF' + [sampleHeaders, sampleRow].join('\r\n');
    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'cinevault_template_format.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ----------------------------------------------------------------------
  // 2. CSV IMPORT LOGIC
  // ----------------------------------------------------------------------
  const parseCsvText = (text: string): { rows: string[][]; delimiter: string } => {
    let cleanText = text.replace(/^[\uFEFF\uFFFE]/, '');
    cleanText = cleanText.replace(/\0/g, '');
    cleanText = cleanText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const firstLine = cleanText.split('\n').find((l) => l.trim().length > 0) || '';
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const pipeCount = (firstLine.match(/\|/g) || []).length;

    let delimiter = ',';
    if (semiCount > commaCount && semiCount >= tabCount && semiCount >= pipeCount) {
      delimiter = ';';
    } else if (tabCount > commaCount && tabCount >= semiCount && tabCount >= pipeCount) {
      delimiter = '\t';
    } else if (pipeCount > commaCount && pipeCount >= semiCount && pipeCount >= tabCount) {
      delimiter = '|';
    }

    const lines: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        let trimmedCell = currentCell.trim();
        if (trimmedCell.startsWith('"') && trimmedCell.endsWith('"')) {
          trimmedCell = trimmedCell.slice(1, -1);
        }
        currentRow.push(trimmedCell);
        currentCell = '';
      } else if (char === '\n' && !insideQuotes) {
        let trimmedCell = currentCell.trim();
        if (trimmedCell.startsWith('"') && trimmedCell.endsWith('"')) {
          trimmedCell = trimmedCell.slice(1, -1);
        }
        currentRow.push(trimmedCell);
        if (currentRow.some((cell) => cell.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      let trimmedCell = currentCell.trim();
      if (trimmedCell.startsWith('"') && trimmedCell.endsWith('"')) {
        trimmedCell = trimmedCell.slice(1, -1);
      }
      currentRow.push(trimmedCell);
      if (currentRow.some((cell) => cell.length > 0)) {
        lines.push(currentRow);
      }
    }

    return { rows: lines, delimiter };
  };

  const processRawCsvText = (text: string, sourceName: string = 'CSV') => {
    setParseErrors([]);
    setParseNotes([]);
    setIsProcessingCsv(true);

    try {
      if (!text || text.trim().length === 0) {
        setParseErrors(['The CSV data is empty. Please select or paste a valid CSV file.']);
        setParsedMovies([]);
        return;
      }

      const { rows } = parseCsvText(text);
      if (rows.length < 1) {
        setParseErrors(['No readable rows found in this CSV data.']);
        setParsedMovies([]);
        return;
      }

      const rawHeaders = rows[0].map((h) => {
        let cleaned = h.trim();
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
        else if (cleaned.startsWith("'") && cleaned.endsWith("'")) cleaned = cleaned.slice(1, -1);
        return cleaned.toLowerCase();
      });

      const findIdx = (...synonyms: string[]) => {
        for (const syn of synonyms) {
          const cleanSyn = syn.toLowerCase().replace(/[^a-z0-9]/g, '');
          const idx = rawHeaders.findIndex((h) => {
            const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanH === cleanSyn || cleanH.includes(cleanSyn);
          });
          if (idx !== -1) return idx;
        }
        return -1;
      };

      let titleIdx = findIdx('title', 'judul', 'movie', 'film', 'name', 'nama');
      const genreIdx = findIdx('genre', 'kategori', 'category', 'genres');
      const studioIdx = findIdx('studio', 'production', 'distributor', 'rumah produksi', 'studios');
      const yearIdx = findIdx('year', 'tahun', 'release');
      const minutesIdx = findIdx('minutes', 'duration', 'durasi', 'menit', 'runtime', 'length');
      const sizeIdx = findIdx('size', 'ukuran', 'filesize', 'kapasitas');
      const resolutionIdx = findIdx('resolution', 'resolusi', 'quality', 'kualitas', 'format');
      const posterUrlIdx = findIdx('posterurl', 'poster', 'cover', 'gambar', 'image', 'photo', 'artwork');
      const backdropUrlIdx = findIdx('backdropurl', 'backdrop', 'banner');
      const actorsIdx = findIdx('actors', 'actor', 'aktor', 'cast', 'pemain', 'bintang');
      const idIdx = findIdx('id', 'kode', 'code');
      const addedDateIdx = findIdx('addeddate', 'added_date', 'date', 'tanggal');
      const castCountIdx = findIdx('castcount', 'actorcount', 'actorscount', 'jumlahaktor', 'jumlahpemain');
      const favoriteIdx = findIdx('favorite', 'isfavorite', 'favorit');
      const reviewedIdx = findIdx('reviewed', 'isreviewed', 'reviewedstatus', 'sudahdireview');
      const uncensoredIdx = findIdx('uncensored', 'isuncensored', 'uncensoredstatus');

      const isHeaderRow = rawHeaders.some((h) => 
        ['title', 'judul', 'movie', 'film', 'genre', 'studio', 'year', 'tahun', 'size', 'actors', 'actor', 'id'].some((key) => h.includes(key))
      );

      if (titleIdx === -1) {
        if (idIdx === 0 && rows[0].length > 1) titleIdx = 1;
        else titleIdx = 0;
      }

      const startRow = isHeaderRow ? 1 : 0;
      const parsedList: Movie[] = [];
      const errors: string[] = [];
      const notes: string[] = [];
      let autoFilledFieldsCount = 0;

      const defaultPosters = [
        'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
        'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800',
        'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
        'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=800',
        'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800',
      ];

      const normalizeResolution = (res: string): string => {
        const cleaned = res.trim().toLowerCase();
        if (cleaned === '720p') return '720p HD';
        if (cleaned === '1080p') return '1080p HD';
        if (cleaned === '960p') return '960p HD';
        return res || '1080p HD';
      };

      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || row.every((c) => !c || c.trim().length === 0)) continue;

        const getCell = (idx: number): string => {
          if (idx === -1 || idx >= row.length) return '';
          let val = row[idx]?.trim() || '';
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
          else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
          if (/^(null|undefined|none|n\/a|-)$/i.test(val)) return '';
          return val;
        };

        let hadEmptyField = false;
        let title = getCell(titleIdx);
        if (!title) { title = `Untitled Movie #${i + 1}`; hadEmptyField = true; }

        let genre = getCell(genreIdx);
        if (!genre) { genre = 'Drama'; hadEmptyField = true; }

        let studio = getCell(studioIdx);
        if (!studio) { studio = 'Independent Studio'; hadEmptyField = true; }

        const rawYear = getCell(yearIdx);
        let yearVal = parseInt(rawYear.replace(/[^\d]/g, ''), 10);
        if (isNaN(yearVal) || yearVal < 1888 || yearVal > 2100) {
          yearVal = 2024;
          if (rawYear) hadEmptyField = true;
        }

        const rawMinutes = getCell(minutesIdx);
        let minutesVal = parseInt(rawMinutes.replace(/[^\d]/g, ''), 10);
        if (isNaN(minutesVal) || minutesVal <= 0) {
          minutesVal = 115;
          if (rawMinutes) hadEmptyField = true;
        }

        let size = getCell(sizeIdx);
        if (!size) { size = '4.5 GB'; hadEmptyField = true; }
        else {
          size = size.replace(',', '.');
          if (!/gb|mb|tb/i.test(size) && !isNaN(parseFloat(size))) {
            size = `${parseFloat(size)} GB`;
          }
        }

        let resolution = getCell(resolutionIdx);
        if (!resolution) resolution = '1080p HD';
        else resolution = normalizeResolution(resolution);

        let posterUrl = getCell(posterUrlIdx);
        if (!posterUrl || (!posterUrl.startsWith('http') && !posterUrl.startsWith('/') && !posterUrl.startsWith('data:'))) {
          posterUrl = defaultPosters[i % defaultPosters.length];
          hadEmptyField = true;
        }

        const backdropUrl = getCell(backdropUrlIdx);

        const rawActors = getCell(actorsIdx);
        let actors: string[] = [];
        if (rawActors) actors = rawActors.split(/[|,;]/).map((a) => a.trim()).filter(Boolean);
        if (actors.length === 0) actors = ['Cast'];

        const id = getCell(idIdx) || `csv-${Date.now()}-${i}`;
        const addedDate = getCell(addedDateIdx) || new Date().toISOString().split('T')[0];
        const castCountValue = getCell(castCountIdx);
        const castCount = castCountValue && Number.isInteger(Number(castCountValue)) && Number(castCountValue) >= 0 ? Number(castCountValue) : undefined;
        const favorite = ['true', '1', 'yes', 'y'].includes(getCell(favoriteIdx).trim().toLowerCase());
        const reviewed = ['true', '1', 'yes', 'y'].includes(getCell(reviewedIdx).trim().toLowerCase());
        const uncensored = ['true', '1', 'yes', 'y'].includes(getCell(uncensoredIdx).trim().toLowerCase());

        const sizeNum = parseFloat(size.replace(/[^\d.]/g, '')) || 4.5;
        const isTB = /tb/i.test(size);
        const sizeBytes = Math.round(sizeNum * (isTB ? 1000000 : 1000));

        if (hadEmptyField) autoFilledFieldsCount++;

        parsedList.push({
          id, title, genre, studio, year: yearVal, minutes: minutesVal, size, sizeBytes, resolution, posterUrl, backdropUrl, actors, castCount, favorite, reviewed, uncensored, addedDate,
        });
      }

      if (parsedList.length === 0) {
        errors.push('No movie rows found in the CSV data. Please make sure the data contains movie records.');
      } else if (autoFilledFieldsCount > 0) {
        notes.push(`Notice: ${autoFilledFieldsCount} movie(s) had some blank fields (e.g. genre, studio, duration, or poster) which were safely filled with default values.`);
      }

      setParsedMovies(parsedList);
      setParseErrors(errors);
      setParseNotes(notes);

      if (autoImportEnabled && errors.length === 0 && parsedList.length > 0) {
        setTimeout(() => { handleAutoImport(); }, 500);
      }
    } catch (err) {
      console.error('CSV parse error:', err);
      setParseErrors(['Error processing CSV: ' + String(err)]);
      setParsedMovies([]);
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setIsProcessingCsv(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processRawCsvText(text, file.name);
    };
    reader.onerror = () => {
      setParseErrors(['Unable to read the selected file. Please try pasting the CSV text directly.']);
      setIsProcessingCsv(false);
    };
    reader.readAsText(file);
  };

  const handleAutoImport = () => {
    if (parsedMovies.length === 0) {
      showToast('error', 'No movie data ready to import.');
      return;
    }
    onImportMovies(parsedMovies, importMode);
    showToast('success', importMode === 'merge' ? `Successfully merged ${parsedMovies.length} movies from CSV!` : `Successfully replaced library with ${parsedMovies.length} movies from CSV!`);
    setCsvFile(null);
    setParsedMovies([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExecuteImport = () => {
    if (parsedMovies.length === 0) {
      showToast('error', 'No movie data ready to import.');
      return;
    }
    onImportMovies(parsedMovies, importMode);
    showToast('success', importMode === 'merge' ? `Successfully merged ${parsedMovies.length} movies from CSV!` : `Successfully replaced library with ${parsedMovies.length} movies from CSV!`);
    setCsvFile(null);
    setParsedMovies([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ----------------------------------------------------------------------
  // 3. DUPLICATE DATA FINDER LOGIC
  // ----------------------------------------------------------------------
  const duplicateGroups: DuplicateGroup[] = useMemo(() => {
    const groups: DuplicateGroup[] = [];
    const processedIds = new Set<string>();

    const normalizeTitle = (str: string) =>
      str.toLowerCase().replace(/^(the|a|an)\s+/i, '').replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim();

    const titleMap = new Map<string, Movie[]>();
    movies.forEach((m) => {
      const key = m.title.trim().toLowerCase();
      const list = titleMap.get(key) || [];
      list.push(m);
      titleMap.set(key, list);
    });

    titleMap.forEach((list, key) => {
      if (list.length > 1) {
        const allSameYear = list.every((m) => m.year === list[0].year);
        groups.push({ key: `exact-${key}`, reason: allSameYear ? 'title-and-year' : 'exact-title', movies: list });
        list.forEach((m) => processedIds.add(m.id));
      }
    });

    const remainingMovies = movies.filter((m) => !processedIds.has(m.id));
    const normMap = new Map<string, Movie[]>();
    remainingMovies.forEach((m) => {
      const norm = normalizeTitle(m.title);
      if (norm.length >= 3) {
        const list = normMap.get(norm) || [];
        list.push(m);
        normMap.set(norm, list);
      }
    });

    normMap.forEach((list, norm) => {
      if (list.length > 1) {
        groups.push({ key: `similar-${norm}`, reason: 'similar-title', movies: list });
      }
    });

    return groups;
  }, [movies]);

  const actorDuplicateGroups: ActorDuplicateGroup[] = useMemo(() => {
    const actorMap = new Map<string, ActorDuplicateCandidate>();
    const customProfiles = getCustomActors();
    const customProfileMap = new Map(Object.entries(customProfiles).map(([name, profile]) => [name.trim().toLowerCase(), profile]));

    const addActor = (name: string, movieCount = 0) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;
      const key = trimmedName.toLowerCase();
      const existing = actorMap.get(key);
      actorMap.set(key, {
        name: existing?.name || trimmedName,
        alias: existing?.alias || customProfileMap.get(key)?.alias?.trim() || '',
        movieCount: (existing?.movieCount || 0) + movieCount,
      });
    };

    movies.forEach((movie) => {
      const uniqueNames = new Set(movie.actors.map((name) => name.trim().toLowerCase()).filter(Boolean));
      uniqueNames.forEach((name) => {
        const originalName = movie.actors.find((actorName) => actorName.trim().toLowerCase() === name);
        if (originalName) addActor(originalName, 1);
      });
    });
    [...Object.keys(KNOWN_ACTORS), ...Object.keys(customProfiles)].forEach((name) => addActor(name));

    const actors = [...actorMap.values()];
    const parents = actors.map((_, index) => index);
    const reasons = new Map<number, Set<ActorDuplicateGroup['reason']>>();

    const findRoot = (index: number): number => {
      if (parents[index] !== index) parents[index] = findRoot(parents[index]);
      return parents[index];
    };

    for (let firstIndex = 0; firstIndex < actors.length; firstIndex++) {
      for (let secondIndex = firstIndex + 1; secondIndex < actors.length; secondIndex++) {
        const reason = getActorDuplicateReason(actors[firstIndex], actors[secondIndex]);
        if (!reason) continue;
        const firstRoot = findRoot(firstIndex);
        const secondRoot = findRoot(secondIndex);
        if (firstRoot !== secondRoot) {
          parents[secondRoot] = firstRoot;
          const combinedReasons = new Set([...(reasons.get(firstRoot) || []), ...(reasons.get(secondRoot) || []), reason]);
          reasons.set(firstRoot, combinedReasons);
          reasons.delete(secondRoot);
        } else {
          const combinedReasons = reasons.get(firstRoot) || new Set<ActorDuplicateGroup['reason']>();
          combinedReasons.add(reason);
          reasons.set(firstRoot, combinedReasons);
        }
      }
    }

    const groupedActors = new Map<number, ActorDuplicateCandidate[]>();
    actors.forEach((actor, index) => {
      const root = findRoot(index);
      const group = groupedActors.get(root) || [];
      group.push(actor);
      groupedActors.set(root, group);
    });

    return [...groupedActors.entries()]
      .filter(([, group]) => group.length > 1)
      .map(([root, group]) => {
        const groupReasons = reasons.get(root) || new Set<ActorDuplicateGroup['reason']>();
        const reason = groupReasons.has('name-or-alias') ? 'name-or-alias' : groupReasons.has('matching-name-parts') ? 'matching-name-parts' : 'similar-spelling';
        const sortedActors = group.sort((a, b) => a.name.localeCompare(b.name));
        return { key: sortedActors.map((actor) => normalizePersonName(actor.name)).join('|'), reason, actors: sortedActors };
      })
      .sort((a, b) => a.actors[0].name.localeCompare(b.actors[0].name));
  }, [movies]);

  const visibleMovieDuplicateGroups = useMemo(() => duplicateGroups.filter((group) => !reviewedDuplicateGroups.has(`movie:${getMovieDuplicateReviewKey(group)}`)), [duplicateGroups, reviewedDuplicateGroups]);
  const visibleActorDuplicateGroups = useMemo(() => actorDuplicateGroups.filter((group) => !reviewedDuplicateGroups.has(`actor:${group.key}`)), [actorDuplicateGroups, reviewedDuplicateGroups]);
  const totalDuplicateRedundantCount = useMemo(() => visibleMovieDuplicateGroups.reduce((acc, grp) => acc + (grp.movies.length - 1), 0), [visibleMovieDuplicateGroups]);
  const totalActorDuplicateCount = useMemo(() => visibleActorDuplicateGroups.reduce((count, group) => count + group.actors.length - 1, 0), [visibleActorDuplicateGroups]);

  const handleKeepDuplicateGroup = (type: 'movie' | 'actor', key: string) => {
    const kind = type === 'movie' ? 'film' : 'aktor';
    startTransition(() => {
      setReviewedDuplicateGroups((previous) => new Set(previous).add(`${type}:${key}`));
      showToast('success', `Grup ${kind} ditandai sudah ditinjau. Data tetap disimpan.`);
    });
  };

  const handleMergeActorGroup = (group: ActorDuplicateGroup, primaryName: string) => {
    const mergedNames = group.actors.map((actor) => actor.name).filter((name) => name !== primaryName);
    if (mergedNames.length === 0) return;
    if (!window.confirm(`Merge ${mergedNames.join(', ')} into "${primaryName}"? Movie credits and actor profile statuses will be combined.`)) return;
    onMergeActors(primaryName, mergedNames);
    showToast('success', `Merged ${mergedNames.length} similar actor name(s) into ${primaryName}.`);
  };

  const handleKeepSingle = (group: DuplicateGroup, keepId: string) => {
    const idsToDelete = group.movies.filter((m) => m.id !== keepId).map((m) => m.id);
    onBulkDeleteMovies(idsToDelete);
    showToast('success', `Removed ${idsToDelete.length} duplicates and kept selected version.`);
  };

  const handleMergeGroup = (group: DuplicateGroup) => {
    if (group.movies.length < 2) return;
    const sorted = [...group.movies].sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
    const primary = sorted[0];
    const secondaryIds = sorted.slice(1).map((m) => m.id);
    const combinedActors = Array.from(new Set(group.movies.flatMap((m) => m.actors)));
    primary.actors = combinedActors;
    onBulkDeleteMovies(secondaryIds);
    showToast('success', `Merged info and removed ${secondaryIds.length} duplicate entries.`);
  };

  const handleAutoCleanAllDuplicates = () => {
    if (visibleMovieDuplicateGroups.length === 0) return;
    const allIdsToDelete: string[] = [];
    visibleMovieDuplicateGroups.forEach((grp) => {
      const sorted = [...grp.movies].sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
      for (let i = 1; i < sorted.length; i++) allIdsToDelete.push(sorted[i].id);
    });
    if (allIdsToDelete.length > 0) {
      onBulkDeleteMovies(allIdsToDelete);
      showToast('success', `Auto-cleaned ${allIdsToDelete.length} duplicate movies!`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 w-full max-w-full overflow-hidden">
      {notification && (
        <div className={`p-3 sm:p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
          notification.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200' : notification.type === 'error' ? 'bg-rose-950/80 border-rose-500/40 text-rose-200' : 'bg-amber-950/80 border-amber-500/40 text-amber-200'
        }`}>
          <div className="flex items-center gap-2 min-w-0">
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            <span className="truncate">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs opacity-70 hover:opacity-100 underline shrink-0">Close</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Catalog & Data Settings</h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">Export and import CSV spreadsheets, detect duplicate movies, and manage library storage.</p>
        </div>

        <div className="grid grid-cols-3 items-stretch bg-[#121520] border border-zinc-800 rounded-xl p-1 w-full sm:w-auto">
          <button onClick={() => setActiveTab('csv')} className={`min-w-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${activeTab === 'csv' ? 'bg-amber-400 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'}`}>
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span>CSV Tools</span>
          </button>
          <button onClick={() => setActiveTab('duplicates')} className={`min-w-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors relative whitespace-nowrap ${activeTab === 'duplicates' ? 'bg-amber-400 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'}`}>
            <Copy className="w-3.5 h-3.5 shrink-0" />
            <span>Duplicates</span>
          </button>
          <button onClick={() => setActiveTab('system')} className={`min-w-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors whitespace-nowrap ${activeTab === 'system' ? 'bg-amber-400 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'}`}>
            <HardDrive className="w-3.5 h-3.5 shrink-0" />
            <span>Overview</span>
          </button>
        </div>
      </div>

      {activeTab === 'csv' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
          {/* Card 1: Export CSV */}
          <div className="bg-[#121520] border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-100">Export Catalog to CSV</h3>
                  <p className="text-xs text-zinc-400">Download entire collection as a CSV spreadsheet</p>
                </div>
              </div>
              <div className="space-y-3 mt-4 text-xs text-zinc-300">
                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                  <div className="flex justify-between items-center text-zinc-400"><span>Movies Ready to Export:</span><strong className="text-zinc-100 font-mono text-sm">{movies.length} Titles</strong></div>
                  <div className="flex justify-between items-center text-zinc-400"><span>File Format:</span><span className="font-mono text-zinc-300">Standard CSV (UTF-8)</span></div>
                  <div className="flex justify-between items-center text-zinc-400"><span>Columns:</span><span className="text-[11px] text-zinc-400">Title, Genre, Studio, Year, Duration, Size, Actors</span></div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>Exported CSV files can be edited in Microsoft Excel, Google Sheets, or re-imported into CineVault anytime as a backup.</span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center gap-2.5">
              <button onClick={handleExportCsv} className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]">
                <Download className="w-4 h-4" />
                <span>Download CSV ({movies.length} Movies)</span>
              </button>
              <button onClick={handleDownloadSampleCsv} className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors shrink-0">Template</button>
            </div>
          </div>

          {/* Card 2: Import CSV */}
          <div className="bg-[#121520] border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-100">Import Catalog from CSV</h3>
                  <p className="text-xs text-zinc-400">Load movies from a CSV spreadsheet into CineVault</p>
                </div>
              </div>
              <div className="mt-4">
                <input ref={fileInputRef} type="file" accept=".csv,text/csv,text/plain,application/vnd.ms-excel,text/comma-separated-values,application/csv,*" onClick={(e) => { (e.target as HTMLInputElement).value = ''; }} onChange={handleFileChange} className="hidden" id="csv-file-picker" />
                <label htmlFor="csv-file-picker" onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    setCsvFile(file);
                    setIsProcessingCsv(true);
                    const reader = new FileReader();
                    reader.onload = (ev) => processRawCsvText(ev.target?.result as string, file.name);
                    reader.readAsText(file);
                  }
                }} className="border-2 border-dashed border-zinc-700 hover:border-amber-400 rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-colors bg-zinc-900/40 hover:bg-zinc-900/80">
                  <FileSpreadsheet className="w-8 h-8 text-amber-400" />
                  <div className="max-w-full">
                    <span className="text-xs sm:text-sm font-semibold text-zinc-200 block truncate">{csvFile ? csvFile.name : 'Choose or drop CSV file here'}</span>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{csvFile ? `${(csvFile.size / 1024).toFixed(1)} KB` : 'Supports comma, semicolon, and tab CSV files'}</p>
                  </div>
                </label>
                <div className="mt-2.5 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">Having trouble with files?</span>
                  <button type="button" onClick={() => setShowPasteArea(!showPasteArea)} className="text-amber-400 hover:text-amber-300 font-semibold underline">{showPasteArea ? 'Hide Paste Area' : 'Paste CSV Text Directly'}</button>
                </div>
                {showPasteArea && (
                  <div className="mt-2.5 p-3 rounded-xl bg-zinc-900 border border-zinc-700 space-y-2">
                    <textarea value={pastedText} onChange={(e) => setPastedText(e.target.value)} placeholder="Paste your CSV text rows here..." rows={4} className="w-full p-2 rounded-lg bg-black/60 border border-zinc-700 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-400" />
                    <button type="button" onClick={() => processRawCsvText(pastedText, 'Pasted CSV')} disabled={!pastedText.trim()} className="w-full py-2 px-3 rounded-lg bg-zinc-800 hover:bg-amber-400 hover:text-zinc-950 disabled:opacity-50 text-xs font-bold text-amber-300 transition-colors">Process Pasted CSV Data</button>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">Import Mode:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button type="button" onClick={() => setImportMode('merge')} className={`p-2.5 rounded-xl border text-left transition-colors ${importMode === 'merge' ? 'bg-amber-400/10 border-amber-500/50 text-amber-300 font-semibold' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}>
                    <div className="font-bold">Merge / Update</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Update existing movies and add new titles</div>
                  </button>
                  <button type="button" onClick={() => setImportMode('replace')} className={`p-2.5 rounded-xl border text-left transition-colors ${importMode === 'replace' ? 'bg-rose-500/10 border-rose-500/50 text-rose-300 font-semibold' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}>
                    <div className="font-bold">Replace All</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">Clear existing library and replace with CSV data</div>
                  </button>
                </div>
              </div>
              {parseErrors.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                  {parseErrors.map((err, idx) => <div key={idx}>• {err}</div>)}
                </div>
              )}
              {parseNotes.length > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                  {parseNotes.map((note, idx) => <div key={idx}>ℹ {note}</div>)}
                </div>
              )}
              {parsedMovies.length > 0 && (
                <div className="mt-3 p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Ready to Import: {parsedMovies.length} Movies</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">{importMode === 'merge' ? 'Merge / Update' : 'Replace All'}</span>
                  </div>
                  <div className="bg-black/50 rounded-lg p-2.5 space-y-1.5 font-mono text-[11px] text-zinc-300 max-h-32 overflow-y-auto border border-emerald-500/20">
                    {parsedMovies.slice(0, 5).map((m, idx) => (
                      <div key={idx} className="truncate flex items-center gap-2">
                        <span className="text-amber-400">#{idx + 1}</span>
                        <span className="text-white font-semibold truncate">{m.title}</span>
                        <span className="text-zinc-500">({m.year})</span>
                        <span className="text-zinc-400 text-[10px]">· {m.genre}</span>
                        <span className="text-zinc-500 text-[10px]">· {m.size}</span>
                      </div>
                    ))}
                    {parsedMovies.length > 5 && <div className="text-[10px] text-zinc-500 pt-1 italic">... and {parsedMovies.length - 5} more movies</div>}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-800/80 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={autoImportEnabled} onChange={(e) => setAutoImportEnabled(e.target.checked)} className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-amber-400 focus:ring-amber-400/50 focus:ring-offset-0" />
                <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">Auto-import immediately after upload (skip preview)</span>
              </label>
              <button onClick={handleExecuteImport} disabled={parsedMovies.length === 0 || isProcessingCsv} className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md">
                <Upload className="w-4 h-4" />
                <span>{isProcessingCsv ? 'Processing CSV...' : `Apply Import (${parsedMovies.length} Movies)`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'duplicates' && (
        <div className="space-y-5 w-full">
          <div className="flex w-full rounded-xl border border-zinc-800 bg-[#121520] p-1 sm:w-fit">
            <button type="button" onClick={() => setDuplicateType('movies')} className={`flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-colors sm:flex-none ${duplicateType === 'movies' ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-white'}`}>Movies ({visibleMovieDuplicateGroups.length})</button>
            <button type="button" onClick={() => setDuplicateType('actors')} className={`flex-1 rounded-lg px-4 py-2 text-xs font-semibold transition-colors sm:flex-none ${duplicateType === 'actors' ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-white'}`}>Actors ({visibleActorDuplicateGroups.length})</button>
          </div>
          {duplicateType === 'movies' ? (
            <>
              <div className="bg-[#121520] border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base sm:text-lg text-white">Duplicate Movie Finder</h3>
                    {visibleMovieDuplicateGroups.length > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">{visibleMovieDuplicateGroups.length} Groups ({totalDuplicateRedundantCount} duplicates)</span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Clean Catalog (0 Duplicates)</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">Scans for identical titles, identical title & release year, or spelling variations.</p>
                </div>
                {visibleMovieDuplicateGroups.length > 0 && (
                  <button onClick={handleAutoCleanAllDuplicates} className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shrink-0 shadow-md">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Auto Clean All Duplicates</span>
                  </button>
                )}
              </div>
              {visibleMovieDuplicateGroups.length === 0 && (
                <div className="py-16 text-center rounded-2xl border border-dashed border-zinc-800 bg-[#0d0f16]/60 p-6">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3"><Check className="w-7 h-7" /></div>
                  <h3 className="text-base font-bold text-zinc-200">{duplicateGroups.length > 0 ? 'All Movie Groups Reviewed' : 'No Duplicate Movies Found!'}</h3>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1">{duplicateGroups.length > 0 ? 'Reviewed groups remain saved in your catalog and can be detected again if their entries change.' : `All ${movies.length} titles in your library are unique. No redundant duplicate titles or releases detected.`}</p>
                </div>
              )}
              {visibleMovieDuplicateGroups.length > 0 && (
                <div className="space-y-4">
                  {visibleMovieDuplicateGroups.map((group, grpIdx) => (
                    <div key={group.key} className="bg-[#121520] border border-zinc-800/90 hover:border-zinc-700 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 overflow-hidden">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">{grpIdx + 1}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-sm truncate">"{group.movies[0].title}"</span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${group.reason === 'title-and-year' ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' : group.reason === 'exact-title' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-blue-500/15 border-blue-500/30 text-blue-300'}`}>
                                {group.reason === 'title-and-year' && 'Same Title & Year'}
                                {group.reason === 'exact-title' && 'Exact Title Match'}
                                {group.reason === 'similar-title' && 'Similar Title Match'}
                              </span>
                            </div>
                            <span className="text-[11px] text-zinc-400">{group.movies.length} duplicate entries found</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <KeepDuplicateButton onConfirm={() => handleKeepDuplicateGroup('movie', getMovieDuplicateReviewKey(group))} className="w-full sm:w-auto px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors" title="Keep every movie in this reviewed group" />
                          <button onClick={() => handleMergeGroup(group)} className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors" title="Merge actors and keep entry with highest resolution/size">
                            <Layers className="w-3.5 h-3.5 text-amber-400" />
                            <span>Merge Info</span>
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.movies.map((m, idx) => (
                          <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors overflow-hidden">
                            <div onClick={() => onSelectMovie(m)} className="w-14 sm:w-16 aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700/60 shrink-0 cursor-pointer shadow" title="Click to view movie details">
                              <img src={getImageSource(m.posterUrl)} alt={m.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-zinc-100 text-xs truncate">{m.title}</span>
                                <span className="text-[10px] font-mono text-zinc-500 shrink-0">#{idx + 1}</span>
                              </div>
                              <div className="text-[11px] text-zinc-400 space-y-0.5 mt-1 font-mono">
                                <div className="flex items-center gap-2 flex-wrap"><span>{m.year}</span><span aria-hidden="true">·</span><span className="text-amber-400 font-semibold">{m.genre}</span><span aria-hidden="true">·</span><span>{m.minutes}m</span></div>
                                <div className="flex items-center gap-2 text-zinc-500 flex-wrap"><span className="truncate max-w-[100px]">{m.studio}</span><span aria-hidden="true">·</span><span>{m.resolution || '1080p'}</span><span aria-hidden="true">·</span><span className="text-zinc-300 font-semibold">{m.size}</span></div>
                                <div className="text-[10px] text-zinc-500 truncate mt-1">Cast: {m.actors.join(', ')}</div>
                              </div>
                              <div className="mt-3 flex items-center gap-2 flex-wrap">
                                <button onClick={() => handleKeepSingle(group, m.id)} className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 hover:text-zinc-950 text-emerald-300 text-[11px] font-semibold transition-colors flex items-center gap-1" title="Keep this version and remove other duplicates"><Check className="w-3 h-3" /><span>Keep This</span></button>
                                <button onClick={() => onDeleteMovie(m.id)} className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold transition-colors flex items-center gap-1" title="Delete only this entry"><Trash2 className="w-3 h-3" /><span>Delete</span></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-[#121520] p-4 sm:p-5">
                <h3 className="font-bold text-base text-white">Duplicate Actor Finder</h3>
                <p className="mt-1 text-xs text-zinc-400">Checks actor names and aliases for exact matches, spelling variations, and similar first/last names. Review each group before merging; similar names are suggestions, not guaranteed duplicates.</p>
                <div className="mt-3 text-xs font-mono text-zinc-300">{visibleActorDuplicateGroups.length} groups · {totalActorDuplicateCount} possible duplicate entries</div>
              </div>
              {visibleActorDuplicateGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#0d0f16]/60 p-8 text-center">
                  <Check className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
                  <h3 className="font-bold text-zinc-200">{actorDuplicateGroups.length > 0 ? 'All Actor Groups Reviewed' : 'No duplicate actors found'}</h3>
                  <p className="mt-1 text-xs text-zinc-400">{actorDuplicateGroups.length > 0 ? 'Reviewed actor entries remain saved and can be detected again if the names or aliases change.' : 'Actor names and aliases currently appear unique.'}</p>
                </div>
              ) : visibleActorDuplicateGroups.map((group, groupIndex) => (
                <section key={group.key} className="space-y-3 rounded-2xl border border-zinc-800 bg-[#121520] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400/20 font-mono text-xs font-bold text-amber-300">{groupIndex + 1}</span>
                      <span className="text-sm font-bold text-white">{group.reason === 'name-or-alias' ? 'Name or alias match' : group.reason === 'matching-name-parts' ? 'Matching first/last name' : 'Possible spelling variation'}</span>
                    </div>
                    <KeepDuplicateButton onConfirm={() => handleKeepDuplicateGroup('actor', group.key)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20" title="Keep all actor entries in this reviewed group" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {group.actors.map((actor) => (
                      <article key={actor.name} className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3">
                        <h4 className="truncate text-sm font-semibold text-zinc-100">{actor.name}</h4>
                        <p className="mt-1 truncate text-xs text-zinc-400">Alias: {getActorAliases(actor.alias).join(', ') || '—'}</p>
                        <p className="mt-1 text-[11px] text-zinc-500">{actor.movieCount} movie credits</p>
                        <button type="button" onClick={() => handleMergeActorGroup(group, actor.name)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-700" title={`Merge other candidates into ${actor.name}`}>
                          <Layers className="h-3.5 w-3.5 text-amber-400" />
                          Keep this actor and merge others
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-6 w-full">
          {/* Tombol Save to Database - DIKEMBALIKAN DI SINI */}
          <div className="bg-[#121520] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Simpan Perubahan ke Database</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Kirim semua data film dari perangkat ini ke database Neon agar bisa diakses dari HP atau laptop lain.
              </p>
            </div>
            <div className="w-full sm:w-auto">
              <SaveSharedCatalogButton
                movieCount={movies.length}
                isLoading={sharedCatalogStatus === 'loading'}
                onSave={onSaveSharedCatalog}
                onNotify={showToast}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#121520] border border-zinc-800 rounded-2xl p-3.5 sm:p-4">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">Total Movies</span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">{movies.length}</div>
              <span className="text-[10px] sm:text-[11px] text-zinc-500 mt-1 block">Saved in catalog</span>
            </div>
            <div className="bg-[#121520] border border-zinc-800 rounded-2xl p-3.5 sm:p-4">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">Storage</span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 mt-1">{(movies.reduce((acc, m) => acc + (m.sizeBytes || 0), 0) / 1000).toFixed(1)} GB</div>
              <span className="text-[10px] sm:text-[11px] text-zinc-500 mt-1 block">Estimated capacity</span>
            </div>
            <div className="bg-[#121520] border border-zinc-800 rounded-2xl p-3.5 sm:p-4">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">Unique Actors</span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">{new Set(movies.flatMap((m) => m.actors.map((a) => a.trim().toLowerCase())).filter(Boolean)).size}</div>
              <span className="text-[10px] sm:text-[11px] text-zinc-500 mt-1 block">In talent directory</span>
            </div>
            <div className="bg-[#121520] border border-zinc-800 rounded-2xl p-3.5 sm:p-4">
              <span className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">Studios</span>
              <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">{new Set(movies.map((m) => m.studio.trim().toLowerCase()).filter(Boolean)).size}</div>
              <span className="text-[10px] sm:text-[11px] text-zinc-500 mt-1 block">Production houses</span>
            </div>
          </div>
          <div className="bg-[#121520] border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0"><ShieldCheck className="w-4 h-4" /></div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-100">{sharedCatalogStatus === 'connected' ? 'Database Active' : 'Local Device Storage Active'}</h3>
                  <p className="text-[11px] text-zinc-400">{sharedCatalogStatus === 'connected' ? 'Catalog changes sync to Neon database; this device also keeps a local copy' : 'Movie data is saved directly on this device until a shared catalog is connected'}</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">{sharedCatalogStatus === 'connected' ? 'Neon + local cache' : 'localStorage / on-device'}</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">{sharedCatalogStatus === 'connected' ? 'The shared catalog is loaded when CineVault opens and edits are sent to Neon. A local copy remains available on this device.' : 'Without a shared catalog, CineVault stores movie data in this browser or app only. Changes do not automatically appear on other devices.'}</p>
          </div>
          <div className="bg-[#121520] border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
              <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0"><Smartphone className="w-4 h-4" /></div>
              <div>
                <h3 className="font-bold text-sm text-zinc-100">Android APK & Phone Installation</h3>
                <p className="text-[11px] text-zinc-400">Ways to run CineVault as a standalone app on your phone</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5"><span>1. Instant Install (No Coding)</span></span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">Fastest</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">Open this link in <strong>Chrome</strong> on your Android phone, tap the three dots (<strong>⋮</strong>), and select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>. An app icon will appear on your phone home screen and open in standalone full-screen without browser bars.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5"><span>2. Generate APK via PWABuilder</span></span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">1-Click</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">Go to <span className="font-mono text-amber-400">PWABuilder.com</span>, enter your CineVault preview link, and click <strong>"Package for Android"</strong> to download a ready-to-install <span className="font-mono text-zinc-200">.apk</span> file for direct installation on any Android phone.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5"><span>3. Build Native APK with Capacitor & Android Studio</span></span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">Full Native</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">Export or clone this codebase to your computer and run:</p>
                <div className="p-2.5 rounded-lg bg-black/60 border border-zinc-800 font-mono text-[11px] text-amber-300/90 overflow-x-auto select-all">
                  npm install @capacitor/core @capacitor/cli @capacitor/android<br />
                  npm run build<br />
                  npx cap add android<br />
                  npx cap open android
                </div>
                <p className="text-[10px] text-zinc-400">In Android Studio, click <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong> to generate <span className="font-mono text-zinc-300">app-debug.apk</span>.</p>
              </div>
            </div>
          </div>
          <div className="bg-[#121520] border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-amber-400" /><span>Reset Catalog to Initial Demo</span></h3>
              <p className="text-xs text-zinc-400 mt-1">Restore sample movie collection if you wish to reset your library to default demo data.</p>
            </div>
            <button onClick={() => {
              if (window.confirm('Are you sure you want to reset your catalog to the default demo library?')) {
                onResetCatalog();
                showToast('info', 'Movie catalog reset to demo data.');
              }
            }} className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-800 hover:bg-rose-500 hover:text-white text-zinc-300 font-semibold text-xs transition-colors shrink-0 text-center">Reset Catalog</button>
          </div>
        </div>
      )}
    </div>
  );
};