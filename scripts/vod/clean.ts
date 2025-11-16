// Cleaner: Remove duplicates, dead links, keep highest quality
import fs from 'fs';

function clean(entries: any[]) {
  // TODO: Remove duplicates, dead links, keep highest quality
  return entries;
}

const classified = JSON.parse(fs.readFileSync('vod-classified.json', 'utf8'));
for (const key of Object.keys(classified)) {
  classified[key] = clean(classified[key]);
}
fs.writeFileSync('vod-classified.json', JSON.stringify(classified, null, 2));
