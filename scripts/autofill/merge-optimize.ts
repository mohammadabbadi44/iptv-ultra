// Pipeline D: Merge + Optimize + Clean
// Merges, dedupes, sorts, validates, and outputs final all-in-one M3U

import fs from 'fs';
import fetch from 'node-fetch';

const INPUTS: string[] = [
  'streams/movies-arabic.m3u',
  'streams/movies-foreign.m3u',
  'streams/series-arabic.m3u',
  'streams/series-foreign.m3u',
];
const OUTPUT = 'combined/all.m3u';
const LOGO_URL = 'https://raw.githubusercontent.com/mohammadabbadi44/iptv-ultra/master/.readme/preview.png';
const TMDB_API_KEY = '1e8c1e0b8e7e3e5e7e8e7e8e7e8e7e8e'; // Demo key, replace with your own for production
const TMDB_BASE = 'https://api.themoviedb.org/3/search/';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

function parseM3U(m3u: string) {
  const entries = [];
  let current: any = {};
  for (const line of m3u.split(/\r?\n/)) {
    if (line.startsWith('#EXTINF:')) {
      current = { info: line };
    } else if (line && !line.startsWith('#')) {
      current.url = line;
      entries.push(current);
      current = {};
    }
  }
  return entries;
}

function isValidUrl(url: string) {
  return /^https?:\/\/.+\.(m3u8?|ts)$/.test(url);
}

async function validateUrl(url: string) {
  try {
    const res = await fetch(url, { method: 'HEAD', timeout: 8000 });
    return res.ok;
  } catch {
    return false;
  }
}

async function getPoster(name: string, type: 'movie' | 'tv'): Promise<string | null> {
  try {
    const url = `${TMDB_BASE}${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results[0] && data.results[0].poster_path) {
      return TMDB_IMG + data.results[0].poster_path;
    }
  } catch {}
  return null;
}

async function extinf(channel: any): Promise<string> {
  let info = `#EXTINF:-1 tvg-id="${channel.id}" tvg-name="${channel.name}" group-title="${channel.category || ''}"`;
  let poster = null;
  if (channel.logo) poster = channel.logo;
  else {
    // Guess type
    const type = (channel.category || '').toLowerCase().includes('series') ? 'tv' : 'movie';
    poster = await getPoster(channel.name, type as 'movie' | 'tv');
  }
  if (!poster) poster = LOGO_URL;
  info += ` tvg-logo="${poster}"`;
  return info + `,${channel.name}`;
}

function sortEntries(entries: any[]) {
  // Movies > Series > Arabic > Foreign > HD > SD
  return entries.sort((a, b) => {
    const getScore = (e: any) => {
      let s = 0;
      if (/movie/i.test(e.info)) s += 1000;
      if (/series|drama/i.test(e.info)) s += 800;
      if (/arabic|عربي/i.test(e.info)) s += 100;
      if (/foreign|turkish|hollywood/i.test(e.info)) s += 50;
      if (/1080p/i.test(e.url)) s += 10;
      if (/720p/i.test(e.url)) s += 5;
      return -s;
    };
    return getScore(a) - getScore(b);
  });
}

async function main() {
  let all: any[] = [];
  for (const file of INPUTS) {
    if (!fs.existsSync(file)) continue;
    const m3u = fs.readFileSync(file, 'utf8');
    all = all.concat(parseM3U(m3u));
  }
  // Deduplicate by name+url, validate
  const seen: Map<string, any> = new Map();
  for (const entry of all) {
    if (!entry.url || !isValidUrl(entry.url)) continue;
    if (!(await validateUrl(entry.url))) continue;
    const key = entry.info + entry.url;
    if (!seen.has(key)) seen.set(key, entry);
  }
  const sorted = sortEntries(Array.from(seen.values()));
  const lines = await Promise.all(sorted.map(e => extinf(e)));
  fs.writeFileSync(OUTPUT, '#EXTM3U\n' + lines.join('\n'), 'utf8');
  console.log(`[D] Wrote ${lines.length} entries to ${OUTPUT}`);
}

main();
