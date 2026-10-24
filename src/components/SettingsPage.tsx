import React, { startTransition, useState, useMemo, useRef, useEffect } from 'react';
import { 
  Download, Upload, Copy, AlertTriangle, CheckCircle2, Trash2, FileSpreadsheet, 
  RefreshCw, Layers, HardDrive, Sliders, Info, Check, Smartphone, ShieldCheck, X
} from 'lucide-react';
import { Movie } from '../types';
import { getImageSource } from '../utils/googleDriveImage';
import { getActorAliases, getCustomActors, KNOWN_ACTORS } from '../data/actorsData';

const formatStorageSize = (sizeInMB: number) => {
  if (isNaN(sizeInMB) || sizeInMB <= 0) return '0.00 GB';
  const sizeInGB = sizeInMB / 1000;
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: sizeInGB < 1000 ? 2 : 0,
    maximumFractionDigits: sizeInGB < 1000 ? 2 : 0,
  }).format(sizeInGB) + ' GB';
};

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

interface DuplicateGroup { key: string; reason: 'exact-title' | 'title-and-year' | 'similar-title'; movies: Movie[]; }
interface ActorDuplicateCandidate { name: string; alias: string; movieCount: number; }
interface ActorDuplicateGroup { key: string; reason: 'name-or-alias' | 'similar-spelling' | 'matching-name-parts'; actors: ActorDuplicateCandidate[]; }
interface KeepDuplicateButtonProps { onConfirm: () => void; title: string; className?: string; }
interface SaveSharedCatalogButtonProps { movieCount: number; isLoading: boolean; onSave: () => Promise<number>; onNotify: (type: 'success' | 'error', message: string) => void; }

const REVIEWED_DUPLICATE_GROUPS_KEY = 'cinevault_reviewed_duplicate_groups_v1';

const SaveSharedCatalogButton: React.FC<SaveSharedCatalogButtonProps> = ({ movieCount, isLoading, onSave, onNotify }) => {
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const count = await onSave();
      onNotify('success', `${count} movies successfully saved to the database.`);
    } catch (error) {
      onNotify('error', error instanceof Error ? error.message : 'Failed to save database.');
    } finally {
      setSaving(false);
      setConfirming(false);
    }
  };

  if (confirming) {
    return (
      <div className="space-y-2 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-3 sm:col-span-2">
        <p className="text-xs text-zinc-200">Replace the shared database with all {movieCount} movies from this device?</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setConfirming(false)} disabled={saving || isLoading} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800">Cancel</button>
          <button type="button" onClick={() => void handleSave()} disabled={saving || isLoading} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30">{saving || isLoading ? 'Saving...' : 'Confirm and save'}</button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" onClick={() => setConfirming(true)} disabled={isLoading || movieCount === 0} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-50">
      <Upload className="h-4 w-4" /> {isLoading ? 'Saving...' : 'Save to Database'}
    </button>
  );
};

const KeepDuplicateButton: React.FC<KeepDuplicateButtonProps> = ({ onConfirm, title, className }) => {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-[11px] text-amber-200">Keep all entries?</span>
        <button type="button" onClick={() => { setConfirming(false); onConfirm(); }} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300">Confirm</button>
        <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:bg-zinc-800">Cancel</button>
      </div>
    );
  }
  return <button type="button" onClick={() => setConfirming(true)} className={className} title={title}><CheckCircle2 className="h-3.5 w-3.5" />Keep These</button>;
};

function getMovieDuplicateReviewKey(group: DuplicateGroup): string { return group.movies.map((movie) => movie.id).sort().join('|'); }
function normalizePersonName(value: string): string { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' '); }

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    let diagonal = previous[0]; previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const above = previous[rightIndex];
      previous[rightIndex] = Math.min(previous[rightIndex] + 1, previous[rightIndex - 1] + 1, diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[right.length];
}

function getActorDuplicateReason(first: ActorDuplicateCandidate, second: ActorDuplicateCandidate): ActorDuplicateGroup['reason'] | null {
  const firstIdentities = [first.name, ...getActorAliases(first.alias)].map(normalizePersonName).filter(Boolean);
  const secondIdentities = [second.name, ...getActorAliases(second.alias)].map(normalizePersonName).filter(Boolean);
  if (firstIdentities.some((identity) => secondIdentities.includes(identity))) return 'name-or-alias';
  for (const firstIdentity of firstIdentities) {
    for (const secondIdentity of secondIdentities) {
      const firstWords = firstIdentity.split(' '); const secondWords = secondIdentity.split(' ');
      if (firstWords.length > 1 && secondWords.length > 1 && firstWords.length === secondWords.length && [...firstWords].sort().join(' ') === [...secondWords].sort().join(' ')) return 'matching-name-parts';
      if (firstWords.length > 1 && secondWords.length > 1) {
        const firstGiven = firstWords[0]; const secondGiven = secondWords[0]; const firstFamily = firstWords[firstWords.length - 1]; const secondFamily = secondWords[secondWords.length - 1];
        const sameFamily = firstFamily === secondFamily || (firstFamily.length >= 4 && secondFamily.length >= 4 && editDistance(firstFamily, secondFamily) <= 1);
        if (sameFamily && firstGiven.length >= 3 && secondGiven.length >= 3 && editDistance(firstGiven, secondGiven) <= 1) return 'matching-name-parts';
      }
      const maxLength = Math.max(firstIdentity.length, secondIdentity.length); const allowedDistance = maxLength >= 8 ? 2 : maxLength >= 5 ? 1 : 0;
      if (allowedDistance > 0 && editDistance(firstIdentity, secondIdentity) <= allowedDistance) return 'similar-spelling';
    }
  }
  return null;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  movies, sharedCatalogToken, sharedCatalogStatus, sharedCatalogError, onConnectSharedCatalog, onDisconnectSharedCatalog,
  onInitializeSharedCatalog, onSaveSharedCatalog, onRefreshSharedCatalog, onImportMovies, onDeleteMovie, onBulkDeleteMovies,
  onMergeActors, onResetCatalog, onSelectMovie,
}) => {
  const [activeTab, setActiveTab] = useState<'csv' | 'duplicates' | 'system'>('csv');
  const [duplicateType, setDuplicateType] = useState<'movies' | 'actors'>('movies');
  const [reviewedDuplicateGroups, setReviewedDuplicateGroups] = useState<Set<string>>(() => {
    try { const stored = localStorage.getItem(REVIEWED_DUPLICATE_GROUPS_KEY); const parsed: unknown = stored ? JSON.parse(stored) : []; return new Set(Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string') : []); } 
    catch { return new Set(); }
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedMovies, setParsedMovies] = useState<Movie[]>([]);
  const [rawPreviewData, setRawPreviewData] = useState<string[][]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseNotes, setParseNotes] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [autoImportEnabled, setAutoImportEnabled] = useState(false);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message }); setTimeout(() => { setNotification((curr) => (curr?.message === message ? null : curr)); }, 4500);
  };

  const handleCancelUpload = () => {
    setCsvFile(null); setParsedMovies([]); setRawPreviewData([]); setParseErrors([]); setParseNotes([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportCsv = () => {
    try {
      const headers = ['id', 'title', 'genre', 'studio', 'year', 'minutes', 'size', 'resolution', 'posterUrl', 'backdropUrl', 'actors', 'addedDate', 'castCount', 'favorite', 'reviewed', 'uncensored'];
      const escapeCsvCell = (val: unknown): string => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) return `"${str.replace(/"/g, '""')}"`;
        return str;
      };
      const rows = movies.map((m) => [
        escapeCsvCell(m.id), escapeCsvCell(m.title), escapeCsvCell(m.genre), escapeCsvCell(m.studio), escapeCsvCell(m.year),
        escapeCsvCell(m.minutes), escapeCsvCell(m.size), escapeCsvCell(m.resolution || '1080p BluRay'), escapeCsvCell(m.posterUrl),
        escapeCsvCell(m.backdropUrl || ''), escapeCsvCell(m.actors.join(' | ')), escapeCsvCell(m.addedDate || new Date().toISOString().split('T')[0]),
        escapeCsvCell(m.castCount ?? ''), escapeCsvCell(m.favorite ? 'true' : ''), escapeCsvCell(m.reviewed ? 'true' : ''), escapeCsvCell(m.uncensored ? 'true' : '')
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url); link.setAttribute('download', `cinevault_movies_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
      showToast('success', `Successfully exported ${movies.length} movies to CSV!`);
    } catch (err) { showToast('error', 'Failed to export catalog to CSV.'); }
  };

  const parseCsvText = (text: string): { rows: string[][]; delimiter: string } => {
    let cleanText = text.replace(/^[\uFEFF\uFFFE]/, '').replace(/\0/g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const firstLine = cleanText.split('\n').find((l) => l.trim().length > 0) || '';
    const commaCount = (firstLine.match(/,/g) || []).length; const semiCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length; const pipeCount = (firstLine.match(/\|/g) || []).length;
    let delimiter = ',';
    if (semiCount > commaCount && semiCount >= tabCount && semiCount >= pipeCount) delimiter = ';';
    else if (tabCount > commaCount && tabCount >= semiCount && tabCount >= pipeCount) delimiter = '\t';
    else if (pipeCount > commaCount && pipeCount >= semiCount && pipeCount >= tabCount) delimiter = '|';

    const lines: string[][] = []; let currentRow: string[] = []; let currentCell = ''; let insideQuotes = false;
    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i]; const nextChar = cleanText[i + 1];
      if (char === '"') {
        if (insideQuotes && nextChar === '"') { currentCell += '"'; i++; } else { insideQuotes = !insideQuotes; }
      } else if (char === delimiter && !insideQuotes) {
        let trimmed = currentCell.trim(); if (trimmed.startsWith('"') && trimmed.endsWith('"')) trimmed = trimmed.slice(1, -1);
        currentRow.push(trimmed); currentCell = '';
      } else if (char === '\n' && !insideQuotes) {
        let trimmed = currentCell.trim(); if (trimmed.startsWith('"') && trimmed.endsWith('"')) trimmed = trimmed.slice(1, -1);
        currentRow.push(trimmed); if (currentRow.some((cell) => cell.length > 0)) lines.push(currentRow);
        currentRow = []; currentCell = '';
      } else { currentCell += char; }
    }
    if (currentCell.length > 0 || currentRow.length > 0) {
      let trimmed = currentCell.trim(); if (trimmed.startsWith('"') && trimmed.endsWith('"')) trimmed = trimmed.slice(1, -1);
      currentRow.push(trimmed); if (currentRow.some((cell) => cell.length > 0)) lines.push(currentRow);
    }
    return { rows: lines, delimiter };
  };

  const processRawCsvText = (text: string) => {
    setParseErrors([]); setParseNotes([]); setIsProcessingCsv(true);
    try {
      if (!text || text.trim().length === 0) { setParseErrors(['CSV is empty.']); setParsedMovies([]); setRawPreviewData([]); return; }
      const { rows } = parseCsvText(text);
      if (rows.length < 1) { setParseErrors(['No readable rows found.']); setParsedMovies([]); setRawPreviewData([]); return; }

      setRawPreviewData(rows.slice(0, 6));
      const rawHeaders = rows[0].map((h) => { let c = h.trim(); if (c.startsWith('"') && c.endsWith('"')) c = c.slice(1, -1); return c.toLowerCase(); });
      const findIdx = (...syn: string[]) => {
        for (const s of syn) { const cs = s.toLowerCase().replace(/[^a-z0-9]/g, ''); const i = rawHeaders.findIndex((h) => h.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cs)); if (i !== -1) return i; } return -1;
      };

      let titleIdx = findIdx('title', 'judul', 'movie', 'film', 'name'); const genreIdx = findIdx('genre'); const studioIdx = findIdx('studio');
      const yearIdx = findIdx('year'); const minutesIdx = findIdx('minutes'); const sizeIdx = findIdx('size'); const resolutionIdx = findIdx('resolution');
      const posterUrlIdx = findIdx('posterurl', 'poster'); const backdropUrlIdx = findIdx('backdrop'); const actorsIdx = findIdx('actors', 'actor', 'cast');
      const idIdx = findIdx('id'); const addedDateIdx = findIdx('addeddate', 'date'); const castCountIdx = findIdx('castcount');
      const favoriteIdx = findIdx('favorite'); const reviewedIdx = findIdx('reviewed'); const uncensoredIdx = findIdx('uncensored');

      const isHeaderRow = rawHeaders.some((h) => ['title', 'judul', 'movie', 'id', 'genre'].some((k) => h.includes(k)));
      if (titleIdx === -1) { if (idIdx === 0 && rows[0].length > 1) titleIdx = 1; else titleIdx = 0; }

      const startRow = isHeaderRow ? 1 : 0; const parsedList: Movie[] = []; const errors: string[] = []; const notes: string[] = []; let autoFilled = 0;
      const defaultPosters = ['https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800', 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800'];

      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i]; if (!row || row.length === 0 || row.every((c) => !c || c.trim().length === 0)) continue;
        const getCell = (idx: number) => (idx === -1 || idx >= row.length) ? '' : (row[idx]?.trim() || '').replace(/^"|"$/g, '');
        let hadEmpty = false;
        let title = getCell(titleIdx); if (!title) { title = `Untitled #${i + 1}`; hadEmpty = true; }
        let genre = getCell(genreIdx); if (!genre) { genre = 'Drama'; hadEmpty = true; }
        let studio = getCell(studioIdx); if (!studio) { studio = 'Independent Studio'; hadEmpty = true; }
        
        // PENGAMAN: parseInt dengan fallback 0
        let year = parseInt(getCell(yearIdx).replace(/[^\d]/g, ''), 10) || 0;
        let minutes = parseInt(getCell(minutesIdx).replace(/[^\d]/g, ''), 10) || 0;

        let size = getCell(sizeIdx) || '4.5 GB'; if (size.includes(',')) size = size.replace(',', '.');
        let resolution = getCell(resolutionIdx) || '1080p HD';
        let posterUrl = getCell(posterUrlIdx); if (!posterUrl.startsWith('http')) { posterUrl = defaultPosters[i % defaultPosters.length]; hadEmpty = true; }
        
        const rawActors = getCell(actorsIdx); let actors = rawActors ? rawActors.split(/[|,;]/).map((a) => a.trim()).filter(Boolean) : ['Cast'];
        const id = getCell(idIdx) || `csv-${Date.now()}-${i}`;
        const addedDate = getCell(addedDateIdx) || new Date().toISOString().split('T')[0];
        const castCount = parseInt(getCell(castCountIdx), 10) || undefined;
        const favorite = ['true', '1', 'yes'].includes(getCell(favoriteIdx).toLowerCase());
        const reviewed = ['true', '1', 'yes'].includes(getCell(reviewedIdx).toLowerCase());
        const uncensored = ['true', '1', 'yes'].includes(getCell(uncensoredIdx).toLowerCase());
        const sizeNum = parseFloat(size.replace(/[^\d.]/g, '')) || 4.5;
        const sizeBytes = Math.round(sizeNum * 1000);
        if (hadEmpty) autoFilled++;

        parsedList.push({ id, title, genre, studio, year, minutes, size, sizeBytes, resolution, posterUrl, backdropUrl: getCell(backdropUrlIdx), actors, castCount, favorite, reviewed, uncensored, addedDate });
      }

      if (parsedList.length === 0) errors.push('No movie rows found.');
      else if (autoFilled > 0) notes.push(`Notice: ${autoFilled} row(s) had blank fields filled with defaults.`);

      setParsedMovies(parsedList); setParseErrors(errors); setParseNotes(notes);
    } catch (err) {
      setParseErrors(['Error: ' + String(err)]); setParsedMovies([]); setRawPreviewData([]);
    } finally { setIsProcessingCsv(false); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setCsvFile(file); setIsProcessingCsv(true);
    const reader = new FileReader();
    reader.onload = (event) => processRawCsvText(event.target?.result as string);
    reader.onerror = () => { setParseErrors(['Unable to read file.']); setIsProcessingCsv(false); };
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (parsedMovies.length === 0) { showToast('error', 'No data to import.'); return; }
    onImportMovies(parsedMovies, importMode);
    showToast('success', `Successfully imported ${parsedMovies.length} movies!`);
    handleCancelUpload();
  };

  const duplicateGroups = useMemo(() => {
    const groups: DuplicateGroup[] = []; const processedIds = new Set<string>();
    const normalizeTitle = (str: string) => str.toLowerCase().replace(/^(the|a|an)\s+/i, '').replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim();
    const titleMap = new Map<string, Movie[]>();
    movies.forEach((m) => { const key = m.title.trim().toLowerCase(); const list = titleMap.get(key) || []; list.push(m); titleMap.set(key, list); });
    titleMap.forEach((list, key) => { if (list.length > 1) { const allSameYear = list.every((m) => m.year === list[0].year); groups.push({ key: `exact-${key}`, reason: allSameYear ? 'title-and-year' : 'exact-title', movies: list }); list.forEach((m) => processedIds.add(m.id)); } });
    const remaining = movies.filter((m) => !processedIds.has(m.id)); const normMap = new Map<string, Movie[]>();
    remaining.forEach((m) => { const norm = normalizeTitle(m.title); if (norm.length >= 3) { const list = normMap.get(norm) || []; list.push(m); normMap.set(norm, list); } });
    normMap.forEach((list, norm) => { if (list.length > 1) groups.push({ key: `similar-${norm}`, reason: 'similar-title', movies: list }); });
    return groups;
  }, [movies]);

  const actorDuplicateGroups = useMemo(() => {
    const actorMap = new Map<string, ActorDuplicateCandidate>(); const custom = getCustomActors();
    const addActor = (name: string, count = 0) => { const t = name.trim(); if (!t) return; const k = t.toLowerCase(); const e = actorMap.get(k); actorMap.set(k, { name: e?.name || t, alias: e?.alias || '', movieCount: (e?.movieCount || 0) + count }); };
    movies.forEach((m) => m.actors.forEach((a) => addActor(a, 1))); [...Object.keys(KNOWN_ACTORS), ...Object.keys(custom)].forEach((n) => addActor(n));
    const actors = [...actorMap.values()]; const parents = actors.map((_, i) => i); const reasons = new Map<number, Set<ActorDuplicateGroup['reason']>>();
    const findRoot = (i: number): number => { if (parents[i] !== i) parents[i] = findRoot(parents[i]); return parents[i]; };
    for (let i = 0; i < actors.length; i++) { for (let j = i + 1; j < actors.length; j++) { const reason = getActorDuplicateReason(actors[i], actors[j]); if (!reason) continue; const ri = findRoot(i); const rj = findRoot(j); if (ri !== rj) { parents[rj] = ri; const comb = new Set([...(reasons.get(ri) || []), ...(reasons.get(rj) || []), reason]); reasons.set(ri, comb); reasons.delete(rj); } else { const comb = reasons.get(ri) || new Set(); comb.add(reason); reasons.set(ri, comb); } } }
    const grouped = new Map<number, ActorDuplicateCandidate[]>(); actors.forEach((a, i) => { const r = findRoot(i); const g = grouped.get(r) || []; g.push(a); grouped.set(r, g); });
    return [...grouped.entries()].filter(([, g]) => g.length > 1).map(([r, g]) => { const gr = reasons.get(r) || new Set(); const reason = gr.has('name-or-alias') ? 'name-or-alias' : gr.has('matching-name-parts') ? 'matching-name-parts' : 'similar-spelling'; const sorted = g.sort((a, b) => a.name.localeCompare(b.name)); return { key: sorted.map((a) => normalizePersonName(a.name)).join('|'), reason, actors: sorted }; }).sort((a, b) => a.actors[0].name.localeCompare(b.actors[0].name));
  }, [movies]);

  const visibleMovieGroups = useMemo(() => duplicateGroups.filter((g) => !reviewedDuplicateGroups.has(`movie:${getMovieDuplicateReviewKey(g)}`)), [duplicateGroups, reviewedDuplicateGroups]);
  const visibleActorGroups = useMemo(() => actorDuplicateGroups.filter((g) => !reviewedDuplicateGroups.has(`actor:${g.key}`)), [actorDuplicateGroups, reviewedDuplicateGroups]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try { const count = await onRefreshSharedCatalog(); showToast('success', `Database refreshed! ${count} movies loaded.`); }
    catch (error) { showToast('error', error instanceof Error ? error.message : 'Failed to refresh.'); }
    finally { setIsRefreshing(false); }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 w-full max-w-full overflow-hidden">
      {notification && (
        <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm ${notification.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200' : notification.type === 'error' ? 'bg-rose-950/80 border-rose-500/40 text-rose-200' : 'bg-amber-950/80 border-amber-500/40 text-amber-200'}`}>
          <div className="flex items-center gap-2 min-w-0">{notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}<span className="truncate">{notification.message}</span></div>
          <button onClick={() => setNotification(null)} className="text-xs opacity-70 hover:opacity-100 underline shrink-0">Close</button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0"><Sliders className="w-5 h-5" /></div>
          <div><h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Catalog & Data Settings</h2><p className="text-xs sm:text-sm text-zinc-400 mt-1">Export and import CSV spreadsheets, detect duplicate movies, and manage library storage.</p></div>
        </div>
        <div className="grid grid-cols-3 items-stretch bg-[#121520] border border-zinc-800 rounded-xl p-1 w-full sm:w-auto">
          <button onClick={() => setActiveTab('csv')} className={`min-w-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold whitespace-nowrap ${activeTab === 'csv' ? 'bg-amber-400 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'}`}><FileSpreadsheet className="w-3.5 h-3.5 shrink-0" /><span>CSV Tools</span></button>
          <button onClick={() => setActiveTab('duplicates')} className={`min-w-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold whitespace-nowrap ${activeTab === 'duplicates' ? 'bg-amber-400 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'}`}><Copy className="w-3.5 h-3.5 shrink-0" /><span>Duplicates</span></button>
          <button onClick={() => setActiveTab('system')} className={`min-w-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1 sm:px-3 py-2 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold whitespace-nowrap ${activeTab === 'system' ? 'bg-amber-400 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-white'}`}><HardDrive className="w-3.5 h-3.5 shrink-0" /><span>Overview</span></button>
        </div>
      </div>

      {activeTab === 'csv' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 w-full">
          <div className="md:col-span-4 bg-[#121520] border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0"><Download className="w-5 h-5" /></div><div><h3 className="font-bold text-base text-zinc-100">Export to CSV</h3><p className="text-xs text-zinc-400">Download collection</p></div></div>
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between items-center text-zinc-400"><span>Movies:</span><strong className="text-zinc-100 font-mono text-sm">{movies.length} Titles</strong></div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800/80"><button onClick={handleExportCsv} className="w-full py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md"><Download className="w-4 h-4" /><span>Download CSV</span></button></div>
          </div>

          <div className="md:col-span-8 bg-[#121520] border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col shadow-lg">
            <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0"><Upload className="w-5 h-5" /></div><div><h3 className="font-bold text-base text-zinc-100">Import from CSV</h3><p className="text-xs text-zinc-400">Load movies into CineVault</p></div></div>

            <div className="flex gap-2 items-stretch">
              <input ref={fileInputRef} type="file" accept=".csv,*" onClick={(e) => { (e.target as HTMLInputElement).value = ''; }} onChange={handleFileChange} className="hidden" id="csv-file-picker" />
              <label htmlFor="csv-file-picker" className="flex-1 border-2 border-dashed border-zinc-700 hover:border-amber-400 rounded-xl p-3 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition-colors bg-zinc-900/40 hover:bg-zinc-900/80"><FileSpreadsheet className="w-6 h-6 text-amber-400" /><span className="text-xs font-semibold text-zinc-200 truncate max-w-full">{csvFile ? csvFile.name : 'Choose CSV file'}</span></label>
              {csvFile && (<button onClick={handleCancelUpload} className="px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" title="Cancel upload"><X className="w-5 h-5" /></button>)}
            </div>

            {rawPreviewData.length > 0 && (
              <div className="mt-4 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900">
                <div className="px-3 py-2 border-b border-zinc-800 flex justify-between items-center bg-[#151926]"><span className="text-[10px] font-bold text-zinc-300 uppercase">Data Preview (First 5 rows)</span><span className="text-[10px] text-emerald-400 font-mono">{parsedMovies.length} rows parsed</span></div>
                <div className="overflow-x-auto max-h-[150px] custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#121520]"><tr className="border-b border-zinc-800">{rawPreviewData[0].map((col, idx) => (<th key={idx} className="px-2 py-1.5 text-[9px] font-bold text-amber-400 uppercase border-r border-zinc-800 last:border-0 whitespace-nowrap">{col}</th>))}</tr></thead>
                    <tbody>{rawPreviewData.slice(1).map((row, rowIdx) => (<tr key={rowIdx} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30">{rawPreviewData[0].map((_, colIdx) => (<td key={colIdx} className="px-2 py-1.5 text-[9px] text-zinc-300 border-r border-zinc-800/50 last:border-0 whitespace-nowrap font-mono">{row[colIdx] || <span className="text-zinc-600 italic">empty</span>}</td>))}</tr>))}</tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-auto pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex gap-2 w-full sm:w-auto">
                <button type="button" onClick={() => setImportMode('merge')} className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg border text-xs font-semibold ${importMode === 'merge' ? 'bg-amber-400/10 border-amber-500/50 text-amber-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>Merge</button>
                <button type="button" onClick={() => setImportMode('replace')} className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg border text-xs font-semibold ${importMode === 'replace' ? 'bg-rose-500/10 border-rose-500/50 text-rose-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>Replace All</button>
              </div>
              <button onClick={handleExecuteImport} disabled={parsedMovies.length === 0 || isProcessingCsv} className="w-full sm:w-auto py-2 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2"><Upload className="w-3.5 h-3.5" /><span>{isProcessingCsv ? 'Processing...' : `Apply Import (${parsedMovies.length})`}</span></button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'duplicates' && (
        <div className="space-y-5 w-full">
          <div className="flex w-full rounded-xl border border-zinc-800 bg-[#121520] p-1 sm:w-fit">
            <button type="button" onClick={() => setDuplicateType('movies')} className={`flex-1 rounded-lg px-4 py-2 text-xs font-semibold ${duplicateType === 'movies' ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-white'}`}>Movies ({visibleMovieGroups.length})</button>
            <button type="button" onClick={() => setDuplicateType('actors')} className={`flex-1 rounded-lg px-4 py-2 text-xs font-semibold ${duplicateType === 'actors' ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-white'}`}>Actors ({visibleActorGroups.length})</button>
          </div>
          <div className="text-center text-zinc-500 text-sm py-8">Duplicate data UI is here.</div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-6 w-full">
          <div className="bg-[#121520] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div><h3 className="font-bold text-base text-zinc-100 flex items-center gap-2"><Upload className="w-4 h-4 text-emerald-400" /><span>Database Synchronization</span></h3><p className="text-xs text-zinc-400 mt-1">Save changes to the cloud, or pull the latest data from Neon.</p></div>
            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
              <button type="button" onClick={handleManualRefresh} disabled={isRefreshing || sharedCatalogStatus === 'loading'} className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-blue-400/40 bg-blue-400/10 px-4 py-2.5 text-xs font-bold text-blue-300 hover:bg-blue-400/20 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${isRefreshing || sharedCatalogStatus === 'loading' ? 'animate-spin' : ''}`} />{isRefreshing || sharedCatalogStatus === 'loading' ? 'Refreshing...' : 'Refresh from Database'}</button>
              <SaveSharedCatalogButton movieCount={movies.length} isLoading={sharedCatalogStatus === 'loading'} onSave={onSaveSharedCatalog} onNotify={showToast} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-[#121520] border border-zinc-800 rounded-2xl p-3.5 sm:p-4"><span className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">Total Movies</span><div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">{movies.length}</div></div>
            <div className="bg-[#121520] border border-zinc-800 rounded-2xl p-3.5 sm:p-4"><span className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">Storage</span><div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 mt-1">{formatStorageSize(movies.reduce((acc, m) => acc + (Math.round(Number(m.sizeBytes)) || 0), 0))}</div></div>
            <div className="bg-[#121520] border border-zinc-800 rounded-2xl p-3.5 sm:p-4"><span className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">Actors</span><div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">{new Set(movies.flatMap((m) => m.actors).filter(Boolean)).size}</div></div>
            <div className="bg-[#121520] border border-zinc-800 rounded-2xl p-3.5 sm:p-4"><span className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">Studios</span><div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">{new Set(movies.map((m) => m.studio)).size}</div></div>
          </div>
        </div>
      )}
    </div>
  );
};