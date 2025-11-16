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

function extinf(entry: any) {
  let info = entry.info;
  if (!/tvg-logo=/.test(info)) info = info.replace('group-title="', `group-title="`, 1) + ` tvg-logo="${LOGO_URL}"`;
  return info;
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
  const lines = sorted.map(e => extinf(e) + '\n' + e.url);
  fs.writeFileSync(OUTPUT, '#EXTM3U\n' + lines.join('\n'), 'utf8');
  console.log(`[D] Wrote ${lines.length} entries to ${OUTPUT}`);
}

main();
