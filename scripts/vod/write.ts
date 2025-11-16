// Writer: Write classified entries to M3U files
import fs from 'fs';

function toM3U(entries: any[], group: string, logo: string) {
  return '#EXTM3U\n' + entries.map(e =>
    `#EXTINF:-1 tvg-id="" tvg-name="${e.title}" group-title="${group}" tvg-logo="${logo}",${e.title}\n${e.url}`
  ).join('\n');
}

const classified = JSON.parse(fs.readFileSync('vod-classified.json', 'utf8'));
const logo = 'https://raw.githubusercontent.com/mohammadabbadi44/iptv-ultra/master/.readme/preview.png';
fs.writeFileSync('streams/movies-arabic.m3u', toM3U(classified.moviesArabic, 'Arabic Movies', logo));
fs.writeFileSync('streams/movies-foreign.m3u', toM3U(classified.moviesForeign, 'Foreign Movies', logo));
fs.writeFileSync('streams/series-arabic.m3u', toM3U(classified.seriesArabic, 'Arabic Series', logo));
fs.writeFileSync('streams/series-foreign.m3u', toM3U(classified.seriesForeign, 'Foreign Series', logo));

// دمج كل النتائج في ملف واحد all.m3u
const all = [
  ...classified.moviesArabic,
  ...classified.moviesForeign,
  ...classified.seriesArabic,
  ...classified.seriesForeign
];
fs.writeFileSync('streams/all.m3u', toM3U(all, 'All', logo));
