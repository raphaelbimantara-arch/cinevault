import React from 'react';
import { ChevronRight, Film } from 'lucide-react';
import { Movie } from '../types';

interface MovieListProps {
  movies: Movie[];
  onSelectMovie: (movie: Movie) => void;
  onFilterByAttribute: (type: 'genre' | 'studio' | 'year' | 'minutes' | 'size', value: string | number) => void;
}

export const MovieList: React.FC<MovieListProps> = ({
  movies,
  onSelectMovie,
  onFilterByAttribute,
}) => {
  if (movies.length === 0) {
    return (
      <div className="py-20 text-center rounded-2xl border border-dashed border-zinc-800 bg-[#0d0f16]/60">
        <Film className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-zinc-300">No movies match your criteria</h3>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
          Try clearing your search query, changing the category, or selecting another letter in the alphabet bar.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#121520] rounded-xl border border-zinc-800/80 overflow-hidden shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px] sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-[#0d0f16]/90 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              <th className="py-2 px-2 sm:px-4">Movie</th>
              <th className="py-2 px-2 sm:px-4">Genre</th>
              <th className="py-2 px-2 sm:px-4 hidden sm:table-cell">Studio</th>
              <th className="py-2 px-2 sm:px-4">Year</th>
              <th className="py-2 px-2 sm:px-4 hidden sm:table-cell">Minutes</th>
              <th className="py-2 px-2 sm:px-4">Size</th>
              <th className="py-2 px-2 sm:px-4 text-right">Det.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {movies.map((movie) => {
              return (
                <tr
                  key={movie.id}
                  onClick={() => onSelectMovie(movie)}
                  className="group hover:bg-[#181d2c] transition-colors cursor-pointer"
                >
                  {/* Poster & Title */}
                  <td className="py-2 px-2 sm:px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-12 rounded overflow-hidden bg-zinc-800 shrink-0 border border-zinc-700/50">
                        <img
                          src={movie.posterUrl}
                          alt={movie.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors truncate text-[11px] sm:text-sm">
                          {movie.title}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Genre */}
                  <td className="py-2 px-2 sm:px-4 whitespace-nowrap">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300">
                      {movie.genre}
                    </span>
                  </td>

                  {/* Studio (Hidden on small mobile) */}
                  <td className="py-2 px-2 sm:px-4 whitespace-nowrap hidden sm:table-cell text-zinc-300 text-xs">
                    {movie.studio}
                  </td>

                  {/* Year */}
                  <td className="py-2 px-2 sm:px-4 whitespace-nowrap font-mono text-[11px] text-zinc-300">
                    {movie.year}
                  </td>

                  {/* Minutes (Hidden on small mobile) */}
                  <td className="py-2 px-2 sm:px-4 whitespace-nowrap font-mono text-[11px] text-zinc-300 hidden sm:table-cell">
                    {movie.minutes}m
                  </td>

                  {/* Size */}
                  <td className="py-2 px-2 sm:px-4 whitespace-nowrap font-mono text-[11px] text-zinc-300">
                    {movie.size}
                  </td>

                  {/* Action */}
                  <td className="py-2 px-2 sm:px-4 whitespace-nowrap text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMovie(movie);
                      }}
                      className="text-zinc-400 hover:text-white"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
