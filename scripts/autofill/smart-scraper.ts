// Pipeline C: Smart Web Scraper (AI-assisted)
// Crawls IPTV-related sites, extracts, classifies, validates, and writes categorized M3U files

import fetch from 'node-fetch';
import fs from 'fs';
import { JSDOM } from 'jsdom';

const SITES = [
  'https://www.freeiptv.life/',
  'https://iptvcat.com/',
  // Add more as needed
];

const LOGO_URL = 'https://raw.githubusercontent.com/mohammadabbadi44/iptv-ultra/master/.readme/preview.png';
const OUTPUTS: Record<string, string> = {
  'movies-arabic': 'streams/movies-arabic.m3u',
  'movies-foreign': 'streams/movies-foreign.m3u',
  'series-arabic': 'streams/series-arabic.m3u',
  'series-foreign': 'streams/series-foreign.m3u',
};

const AI_KEYWORDS = [
  { keyword: /arabic.*movie|فيلم عربي/i, file: 'movies-arabic' },
  { keyword: /turkish.*series|مسلسل تركي/i, file: 'series-foreign' },
  { keyword: /egyptian.*drama|مسلسل مصري/i, file: 'series-arabic' },
  { keyword: /hollywood.*movie/i, file: 'movies-foreign' },
];

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

function extinf(name: string, group: string) {
  return `#EXTINF:-1 tvg-name="${name}" group-title="${group}" tvg-logo="${LOGO_URL}",${name}`;
}

function aiClassify(name: string): string | null {
  for (const rule of AI_KEYWORDS) {
    if (rule.keyword.test(name)) return rule.file;
  }
  if (/arabic|عربي/i.test(name)) return 'movies-arabic';
  if (/series|مسلسل/i.test(name)) return 'series-foreign';
  if (/movie|فيلم/i.test(name)) return 'movies-foreign';
  return null;
}

async function main() {
  const categorized: Record<string, string[]> = {
    'movies-arabic': [],
    'movies-foreign': [],
    'series-arabic': [],
    'series-foreign': []
  };
  for (const site of SITES) {
    try {
      const html = await fetch(site).then(r => r.text());
      const dom = new JSDOM(html);
      const links = Array.from(dom.window.document.querySelectorAll('a'))
        .map(a => (a as HTMLAnchorElement).href)
        .filter(isValidUrl);
      for (const url of links) {
        if (!(await validateUrl(url))) continue;
        // Use AI keyword classification
        const name = url.split('/').pop() || url;
        const type = aiClassify(name);
        if (!type) continue;
        categorized[type].push(extinf(name, type) + '\n' + url);
      }
    } catch (e) {
      console.error(`[C] Failed to crawl ${site}:`, e);
    }
  }
  for (const [type, lines] of Object.entries(categorized)) {
    fs.writeFileSync(OUTPUTS[type], '#EXTM3U\n' + lines.join('\n'), 'utf8');
    console.log(`[C] Wrote ${lines.length} entries to ${OUTPUTS[type]}`);
  }
}

main();
