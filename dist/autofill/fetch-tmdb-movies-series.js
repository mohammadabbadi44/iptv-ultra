"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Fetch latest movies and series from TMDB and output as M3U entries
// Requires TMDB API key (free, demo key used here)
const fs_1 = __importDefault(require("fs"));
const TMDB_API_KEY = '8ede06744c75dd7816ba48cf972f457f'; // User real key
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const MOVIES_OUT = 'streams/tmdb-movies.m3u';
const SERIES_OUT = 'streams/tmdb-series.m3u';
async function fetchTMDB(type, pages = 2) {
    let results = [];
    for (let page = 1; page <= pages; page++) {
        const url = `https://api.themoviedb.org/3/${type}/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results)
            results = results.concat(data.results);
    }
    return results;
}
function m3uEntry(item, type) {
    const name = item.title || item.name || 'Unknown';
    const logo = item.poster_path ? TMDB_IMG + item.poster_path : '';
    const group = type === 'movie' ? 'TMDB Movies' : 'TMDB Series';
    // No real stream, use TMDB page as placeholder
    const url = `https://www.themoviedb.org/${type}/${item.id}`;
    return `#EXTINF:-1 tvg-id="" tvg-name="${name}" group-title="${group}" tvg-logo="${logo}",${name}\n${url}`;
}
async function main() {
    const movies = await fetchTMDB('movie');
    const series = await fetchTMDB('tv');
    const movieLines = movies.map(m => m3uEntry(m, 'movie'));
    const seriesLines = series.map(s => m3uEntry(s, 'tv'));
    fs_1.default.writeFileSync(MOVIES_OUT, '#EXTM3U\n' + movieLines.join('\n'), 'utf8');
    fs_1.default.writeFileSync(SERIES_OUT, '#EXTM3U\n' + seriesLines.join('\n'), 'utf8');
    console.log(`Wrote ${movieLines.length} movies and ${seriesLines.length} series from TMDB.`);
}
main();
