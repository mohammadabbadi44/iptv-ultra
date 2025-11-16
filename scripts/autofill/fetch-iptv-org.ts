// Pipeline A: Auto-fill from iptv-org (safe + clean)
// Fetches channels from iptv-org API, filters, validates, writes to categorized M3U files

import fetch from 'node-fetch';
import fs from 'fs';

const API_URL = 'https://iptv-org.github.io/api/channels.json';
const LOGO_URL = 'https://raw.githubusercontent.com/mohammadabbadi44/iptv-ultra/master/.readme/preview.png';

const OUTPUTS: Record<string, string> = {
  'movies-arabic': 'streams/movies-arabic.m3u',
  'movies-foreign': 'streams/movies-foreign.m3u',
  'series-arabic': 'streams/series-arabic.m3u',
  'series-foreign': 'streams/series-foreign.m3u',
};

const CATEGORIES = [
  'movies', 'series', 'entertainment', 'drama', 'arabic', 'international'
];

function extinf(channel: any) {
  let info = `#EXTINF:-1 tvg-id="${channel.id}" tvg-name="${channel.name}" group-title="${channel.category || ''}"`;
  if (channel.logo) info += ` tvg-logo="${channel.logo}"`;
  else info += ` tvg-logo="${LOGO_URL}"`;
  return info + `,${channel.name}`;
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

function classify(channel: any) {
  const name = (channel.name || '').toLowerCase();
  const cat = (channel.category || '').toLowerCase();
  if ((cat.includes('movie') || name.includes('movie')) && cat.includes('arabic')) return 'movies-arabic';
  if ((cat.includes('movie') || name.includes('movie'))) return 'movies-foreign';
  if ((cat.includes('series') || name.includes('series')) && cat.includes('arabic')) return 'series-arabic';
  if ((cat.includes('series') || name.includes('series'))) return 'series-foreign';
  if (cat.includes('arabic')) return 'movies-arabic';
  if (cat.includes('drama')) return 'series-arabic';
  return null;
}

async function main() {
  const data = await fetch(API_URL).then(r => r.json());
  const categorized: Record<string, string[]> = {
    'movies-arabic': [],
    'movies-foreign': [],
    'series-arabic': [],
    'series-foreign': []
  };
  for (const channel of data) {
    if (!channel.url || !isValidUrl(channel.url)) continue;
    if (!CATEGORIES.some(cat => (channel.category || '').toLowerCase().includes(cat))) continue;
    if (!(await validateUrl(channel.url))) continue;
    const type = classify(channel);
    if (!type) continue;
    categorized[type].push(extinf(channel) + '\n' + channel.url);
  }
  for (const [type, lines] of Object.entries(categorized)) {
    fs.writeFileSync(OUTPUTS[type], '#EXTM3U\n' + lines.join('\n'), 'utf8');
    console.log(`[A] Wrote ${lines.length} entries to ${OUTPUTS[type]}`);
  }
}

main();
