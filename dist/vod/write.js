"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Writer: Write classified entries to M3U files
const fs_1 = __importDefault(require("fs"));
function toM3U(entries, group, logo) {
    return '#EXTM3U\n' + entries.map(e => `#EXTINF:-1 tvg-id="" tvg-name="${e.title}" group-title="${group}" tvg-logo="${logo}",${e.title}\n${e.url}`).join('\n');
}
const classified = JSON.parse(fs_1.default.readFileSync('vod-classified.json', 'utf8'));
const logo = 'https://raw.githubusercontent.com/mohammadabbadi44/iptv-ultra/master/.readme/preview.png';
fs_1.default.writeFileSync('streams/movies-arabic.m3u', toM3U(classified.moviesArabic, 'Arabic Movies', logo));
fs_1.default.writeFileSync('streams/movies-foreign.m3u', toM3U(classified.moviesForeign, 'Foreign Movies', logo));
fs_1.default.writeFileSync('streams/series-arabic.m3u', toM3U(classified.seriesArabic, 'Arabic Series', logo));
fs_1.default.writeFileSync('streams/series-foreign.m3u', toM3U(classified.seriesForeign, 'Foreign Series', logo));
// دمج كل النتائج في ملف واحد all.m3u
const all = [
    ...classified.moviesArabic,
    ...classified.moviesForeign,
    ...classified.seriesArabic,
    ...classified.seriesForeign
];
fs_1.default.writeFileSync('streams/all.m3u', toM3U(all, 'All', logo));
