// Pipeline B: Auto-fill from multiple external free IPTV sources
// Reads, merges, dedupes, validates, and writes categorized M3U files

import fetch from 'node-fetch';
import fs from 'fs';

const SOURCES = [
  'https://iptv-org.github.io/iptv/index.m3u',
  'https://iptvcat.com/playlist.m3u',
  'https://raw.githubusercontent.com/Free-IPTV/Countries/master/ALL.m3u',
  'https://iptv-org.github.io/iptv/categories/movies.m3u',
  'https://iptv-org.github.io/iptv/categories/entertainment.m3u',
  'https://iptv-org.github.io/iptv/categories/series.m3u',
];

const LOGO_URL = 'https://raw.githubusercontent.com/mohammadabbadi44/iptv-ultra/master/.readme/preview.png';
const OUTPUTS: Record<string, string> = {
  'movies-arabic': 'streams/movies-arabic.m3u',
  'movies-foreign': 'streams/movies-foreign.m3u',
  'series-arabic': 'streams/series-arabic.m3u',
  'series-foreign': 'streams/series-foreign.m3u',
};

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

function detectQuality(url: string) {
  if (/1080p|1920x1080/i.test(url)) return '1080p';
  if (/720p|1280x720/i.test(url)) return '720p';
  if (/480p|854x480/i.test(url)) return '480p';
  return 'SD';
}

function classify(entry: any) {
  const info = entry.info.toLowerCase();
  if (info.includes('arabic')) {
    if (info.includes('movie')) return 'movies-arabic';
    if (info.includes('series') || info.includes('drama')) return 'series-arabic';
  }
  if (info.includes('movie')) return 'movies-foreign';
  if (info.includes('series') || info.includes('drama')) return 'series-foreign';
  return null;
}

function extinf(entry: any) {
  let info = entry.info;
  if (!/tvg-logo=/.test(info)) info = info.replace('group-title="', `group-title="`, 1) + ` tvg-logo="${LOGO_URL}"`;
  return info;
}

async function main() {
  let all: any[] = [];
  for (const src of SOURCES) {
    try {
      const m3u = await fetch(src).then(r => r.text());
      all = all.concat(parseM3U(m3u));
    } catch (e) {
      console.error(`[B] Failed to fetch ${src}:`, e);
    }
  }
  // Validate, dedupe, keep highest quality
  const seen = new Map();
  for (const entry of all) {
    if (!entry.url || !isValidUrl(entry.url)) continue;
    if (!(await validateUrl(entry.url))) continue;
    const key = entry.info + entry.url;
    const q = detectQuality(entry.url);
    if (!seen.has(key) || q > detectQuality(seen.get(key).url)) {
      seen.set(key, entry);
    }
  }
  // Classify and write
  const categorized: Record<string, string[]> = {
    'movies-arabic': [],
    'movies-foreign': [],
    'series-arabic': [],
    'series-foreign': []
  };
  for (const entry of seen.values()) {
    const type = classify(entry);
    if (!type) continue;
    categorized[type].push(extinf(entry) + '\n' + entry.url);
  }
  for (const [type, lines] of Object.entries(categorized)) {
    fs.writeFileSync(OUTPUTS[type], '#EXTM3U\n' + lines.join('\n'), 'utf8');
    console.log(`[B] Wrote ${lines.length} entries to ${OUTPUTS[type]}`);
  }
}

main();
