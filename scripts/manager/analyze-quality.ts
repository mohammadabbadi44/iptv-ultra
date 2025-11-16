import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
// import mediainfo from 'mediainfo.js'; // Placeholder for actual resolution detection

const streamsDir = path.join(__dirname, '../../streams');

function getAllM3UFiles(dir: string): string[] {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.m3u'))
    .map(f => path.join(dir, f));
}

async function detectQuality(url: string): Promise<string> {
  // Placeholder: In real implementation, use mediainfo.js or probe the stream
  // Here, we just guess by URL or fallback
  try {
    const res = await fetch(url, { method: 'HEAD', timeout: 10000 });
    if (!res.ok) return 'Unknown';
    // Optionally, parse headers for hints
    // ...
    // Use mediainfo.js or ffprobe for real detection
    return 'Unknown';
  } catch {
    return 'Unknown';
  }
}


const GROUPS = [
  { name: 'Sports', keywords: ['sport', 'sports', 'bein', 'espn', 'nba', 'fox sports'] },
  { name: 'News', keywords: ['news', 'aljazeera', 'cnn', 'sky news', 'bbc'] },
  { name: 'Movies', keywords: ['movie', 'cinema', 'film', 'mbc2', 'mbc max'] },
  { name: 'Kids', keywords: ['kids', 'cartoon', 'disney', 'nick', 'baby', 'junior'] },
  { name: 'Arabic', keywords: ['arabic', 'arabi', 'rotana', 'mbc', 'saudi', 'qatar', 'kuwait', 'uae'] },
  { name: 'Documentary', keywords: ['documentary', 'geo', 'discovery', 'nat geo', 'history'] },
  { name: 'Music', keywords: ['music', 'mtv', 'radio', 'song', 'melody'] },
];

function detectGroup(name: string): string {
  const lower = name.toLowerCase();
  for (const group of GROUPS) {
    if (group.keywords.some(k => lower.includes(k))) {
      return group.name;
    }
  }
  return 'Other';
}

async function processFile(file: string) {
  let content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  // First pass: update quality and group-title
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXTINF')) {
      const name = lines[i].split(',').pop()?.trim() || '';
      const url = lines[i + 1] || '';
      let quality = await detectQuality(url);
      // Add or update quality attribute
      if (/quality="[^"]*"/.test(lines[i])) {
        lines[i] = lines[i].replace(/quality="[^"]*"/, `quality="${quality}"`);
      } else {
        lines[i] = lines[i].replace('#EXTINF:', `#EXTINF: quality="${quality}",`);
      }
      // Add or update group-title
      const group = detectGroup(name);
      if (/group-title="[^"]*"/.test(lines[i])) {
        lines[i] = lines[i].replace(/group-title="[^"]*"/, `group-title="${group}"`);
      } else {
        lines[i] = lines[i].replace('#EXTINF:', `#EXTINF: group-title="${group}",`);
      }
      console.log(`[analyze-quality] ${file}: Set quality=${quality}, group-title=${group} for ${name}`);
    }
  }
  // Second pass: sort channels by group
  const header = lines[0].startsWith('#EXTM3U') ? lines[0] : '#EXTM3U';
  const entries: { group: string, extinf: string, url: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXTINF')) {
      const groupMatch = lines[i].match(/group-title="([^"]*)"/);
      const group = groupMatch ? groupMatch[1] : 'Other';
      entries.push({ group, extinf: lines[i], url: lines[i + 1] || '' });
    }
  }
  // Sort by group then by name
  entries.sort((a, b) => {
    if (a.group < b.group) return -1;
    if (a.group > b.group) return 1;
    return a.extinf.localeCompare(b.extinf);
  });
  // Rebuild lines
  const sortedLines = [header];
  for (const entry of entries) {
    sortedLines.push(entry.extinf);
    sortedLines.push(entry.url);
  }
  fs.writeFileSync(file, sortedLines.join('\n'), 'utf8');
}

(async () => {
  const files = getAllM3UFiles(streamsDir);
  for (const file of files) {
    await processFile(file);
  }
  console.log('[analyze-quality] Done.');
})();
