import fs from 'fs';
import path from 'path';

const streamsDir = path.join(__dirname, '../../streams');

function getAllM3UFiles(dir: string): string[] {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.m3u'))
    .map(f => path.join(dir, f));
}

function parseChannels(file: string) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  const channels = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXTINF')) {
      const extinf = lines[i];
      const url = lines[i + 1] || '';
      const name = extinf.split(',').pop()?.trim() || '';
      const qualityMatch = extinf.match(/quality="(\w+)"/);
      const quality = qualityMatch ? qualityMatch[1] : 'Unknown';
      channels.push({ extinf, url, name, quality, idx: i });
    }
  }
  return { lines, channels };
}

function qualityRank(q: string) {
  if (q === '1080p') return 3;
  if (q === '720p') return 2;
  if (q === '480p') return 1;
  return 0;
}

function removeDuplicatesFromFile(file: string) {
  const { lines, channels } = parseChannels(file);
  const seen = new Map<string, { idx: number; quality: string }>();
  for (const ch of channels) {
    const key = ch.url || ch.name;
    if (!seen.has(key)) {
      seen.set(key, { idx: ch.idx, quality: ch.quality });
    } else {
      const prev = seen.get(key)!;
      if (qualityRank(ch.quality) > qualityRank(prev.quality)) {
        // Remove previous, keep this
        lines[prev.idx] = '';
        lines[prev.idx + 1] = '';
        seen.set(key, { idx: ch.idx, quality: ch.quality });
      } else {
        // Remove this
        lines[ch.idx] = '';
        lines[ch.idx + 1] = '';
      }
    }
  }
  fs.writeFileSync(file, lines.filter(Boolean).join('\n'), 'utf8');
  console.log(`[remove-duplicates] Processed ${file}`);
}

function main() {
  const files = getAllM3UFiles(streamsDir);
  for (const file of files) {
    removeDuplicatesFromFile(file);
  }
  console.log('[remove-duplicates] Done.');
}

main();
