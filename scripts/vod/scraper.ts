// Scraper: Crawl IPTV/VOD sources and extract raw entries
import fetch from 'node-fetch';
import fs from 'fs';

// Example: Add TMDB as a source
async function fetchTMDB(type: 'movie' | 'tv', pages = 2) {
  const TMDB_API_KEY = '8ede06744c75dd7816ba48cf972f457f';
  const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
  let results: any[] = [];
  for (let page = 1; page <= pages; page++) {
    const url = `https://api.themoviedb.org/3/${type}/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results) results = results.concat(data.results);
  }
  return results.map(item => ({
    title: item.title || item.name || 'Unknown',
    url: `https://www.themoviedb.org/${type}/${item.id}`,
    quality: 'TMDB',
    language: /[\u0600-\u06FF]/.test(item.title || item.name) ? 'Arabic' : 'Foreign',
    type: type === 'movie' ? 'movie' : 'series',
    group: type === 'movie' ? 'TMDB Movies' : 'TMDB Series',
    logo: item.poster_path ? TMDB_IMG + item.poster_path : ''
  }));
}

async function scrapeSources() {
  let results: any[] = [];
  // TMDB Movies
  results = results.concat(await fetchTMDB('movie', 2));
  // TMDB Series
  results = results.concat(await fetchTMDB('tv', 2));
  // TODO: Add crawling logic for public M3U, web pages, APIs
  // Example entry:
  // results.push({ title, url, quality, language, type, group, logo });
  return results;
}

(async () => {
  const entries = await scrapeSources();
  fs.writeFileSync('vod-raw.json', JSON.stringify(entries, null, 2));
})();
