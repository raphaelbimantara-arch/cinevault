/**
 * Utility for fetching movie genres from public online databases (iTunes Movie API & TVMaze)
 * Works without requiring API keys and supports CORS directly in the browser.
 */

export interface OnlineGenreResult {
  source: 'iTunes' | 'TVMaze' | 'Wikipedia';
  matchedTitle: string;
  year?: number;
  genres: string[];
  description?: string;
  posterUrl?: string;
}

export async function searchMovieGenreOnline(title: string): Promise<OnlineGenreResult[]> {
  const cleanTitle = title.trim();
  if (!cleanTitle) return [];

  const results: OnlineGenreResult[] = [];
  const seenGenres = new Set<string>();

  // 1. Try iTunes Search API (Very high quality official movie metadata)
  try {
    const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanTitle)}&entity=movie&limit=6`;
    const response = await fetch(itunesUrl, { signal: AbortSignal.timeout(6000) });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.results)) {
        for (const item of data.results) {
          const itemTitle = item.trackName || item.collectionName || '';
          const primaryGenre = item.primaryGenreName;
          const releaseYear = item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined;
          
          if (primaryGenre && !seenGenres.has(primaryGenre.toLowerCase())) {
            seenGenres.add(primaryGenre.toLowerCase());
            results.push({
              source: 'iTunes',
              matchedTitle: itemTitle,
              year: releaseYear,
              genres: [primaryGenre],
              description: item.longDescription || item.shortDescription,
              posterUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '300x300bb') : undefined,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('iTunes genre search skipped or failed:', err);
  }

  // 2. Try TVMaze API (Public open show/film API, CORS enabled, no auth needed)
  try {
    const tvmazeUrl = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(cleanTitle)}`;
    const response = await fetch(tvmazeUrl, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        for (const entry of data.slice(0, 3)) {
          const show = entry.show;
          if (show && Array.isArray(show.genres) && show.genres.length > 0) {
            const releaseYear = show.premiered ? parseInt(show.premiered.slice(0, 4), 10) : undefined;
            const newGenres = show.genres.filter((g: string) => !seenGenres.has(g.toLowerCase()));
            
            if (newGenres.length > 0) {
              newGenres.forEach((g: string) => seenGenres.add(g.toLowerCase()));
              results.push({
                source: 'TVMaze',
                matchedTitle: show.name,
                year: releaseYear,
                genres: show.genres,
                description: show.summary ? show.summary.replace(/<[^>]*>/g, '') : undefined,
                posterUrl: show.image?.medium,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('TVMaze genre search skipped or failed:', err);
  }

  // 3. Try Wikipedia Open Search API (Wikipedia Open CORS)
  if (results.length === 0) {
    try {
      const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanTitle + ' film')}&format=json&origin=*`;
      const response = await fetch(wikiUrl, { signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const data = await response.json();
        const searchItems = data.query?.search;
        if (Array.isArray(searchItems) && searchItems.length > 0) {
          const knownKeywords = [
            'Sci-Fi', 'Science Fiction', 'Action', 'Adventure', 'Thriller',
            'Drama', 'Comedy', 'Horror', 'Mystery', 'Crime', 'Romance',
            'Animation', 'Fantasy', 'Cyberpunk', 'Neo-noir', 'Documentary',
            'War', 'Western', 'Biography', 'Musical'
          ];
          const detectedGenres: string[] = [];

          for (const item of searchItems.slice(0, 3)) {
            const text = (item.title + ' ' + (item.snippet || '')).toLowerCase();
            for (const kw of knownKeywords) {
              if (text.includes(kw.toLowerCase()) && !detectedGenres.includes(kw)) {
                detectedGenres.push(kw);
              }
            }
          }

          if (detectedGenres.length > 0) {
            results.push({
              source: 'Wikipedia',
              matchedTitle: searchItems[0].title.replace(/\s*\(film\)/i, ''),
              genres: detectedGenres.slice(0, 3),
              description: searchItems[0].snippet ? searchItems[0].snippet.replace(/<[^>]*>/g, '') : undefined,
            });
          }
        }
      }
    } catch (err) {
      console.warn('Wikipedia genre search skipped or failed:', err);
    }
  }

  return results;
}
