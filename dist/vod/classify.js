"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Classifier: Classify entries by language and type
const fs_1 = __importDefault(require("fs"));
function isArabic(text) {
    return /[\u0600-\u06FF]/.test(text);
}
function isMovie(entry) {
    // Smarter detection: if title contains S01, E01, Episode, or season/part/حلقه/حلقة => series
    const t = (entry.title || '').toLowerCase();
    if (/s\d{1,2}e\d{1,2}|episode|season|part|حلقه|حلقة|موسم|جزء/.test(t))
        return false;
    // If group/title contains 'movie' or 'فيلم' or 'film' => movie
    if (/movie|فيلم|film/.test(t) || /movie|فيلم|film/.test(entry.group || ''))
        return true;
    // If url contains '/movie/' or ends with .mp4 => movie
    if (/\/movie\//.test(entry.url || '') || /\.mp4$/.test(entry.url || ''))
        return true;
    // If url contains '/series/' or '/tv/' => series
    if (/\/series\//.test(entry.url || '') || /\/tv\//.test(entry.url || ''))
        return false;
    // Fallback to type field if present
    if (entry.type)
        return entry.type === 'movie';
    // Default: if title is short, likely movie
    return t.split(' ').length < 5;
}
function classify(entries) {
    const moviesArabic = [], moviesForeign = [], seriesArabic = [], seriesForeign = [];
    for (const entry of entries) {
        const ar = isArabic(entry.title);
        const movie = isMovie(entry);
        if (movie && ar)
            moviesArabic.push(entry);
        else if (movie)
            moviesForeign.push(entry);
        else if (ar)
            seriesArabic.push(entry);
        else
            seriesForeign.push(entry);
    }
    return { moviesArabic, moviesForeign, seriesArabic, seriesForeign };
}
const entries = JSON.parse(fs_1.default.readFileSync('vod-raw.json', 'utf8'));
const classified = classify(entries);
fs_1.default.writeFileSync('vod-classified.json', JSON.stringify(classified, null, 2));
