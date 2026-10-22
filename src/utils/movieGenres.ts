export function getMovieGenres(genreValue: string): string[] {
  return genreValue
    .split(/[,|;]/)
    .map((genre) => genre.trim())
    .filter(Boolean);
}
