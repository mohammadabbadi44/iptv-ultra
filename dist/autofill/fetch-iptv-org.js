"use strict";
// Pipeline A: Auto-fill from iptv-org (safe + clean)
// Fetches channels from iptv-org API, filters, validates, writes to categorized M3U files
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs_1 = __importDefault(require("fs"));
const API_URL = 'https://iptv-org.github.io/api/channels.json';
const LOGO_URL = 'https://raw.githubusercontent.com/mohammadabbadi44/iptv-ultra/master/.readme/preview.png';
const TMDB_API_KEY = '1e8c1e0b8e7e3e5e7e8e7e8e7e8e7e8e'; // Demo key, replace with your own for production
const TMDB_BASE = 'https://api.themoviedb.org/3/search/';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const OUTPUTS = {
    'movies-arabic': 'streams/movies-arabic.m3u',
    'movies-foreign': 'streams/movies-foreign.m3u',
    'series-arabic': 'streams/series-arabic.m3u',
    'series-foreign': 'streams/series-foreign.m3u',
};
const CATEGORIES = [
    'movies', 'series', 'entertainment', 'drama', 'arabic', 'international'
];
async function getPoster(name, type) {
    try {
        const url = `${TMDB_BASE}${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}`;
        const res = await (0, node_fetch_1.default)(url);
        const data = await res.json();
        if (data.results && data.results[0] && data.results[0].poster_path) {
            return TMDB_IMG + data.results[0].poster_path;
        }
    }
    catch (_a) { }
    return null;
}
async function extinf(channel) {
    let info = `#EXTINF:-1 tvg-id="${channel.id}" tvg-name="${channel.name}" group-title="${channel.category || ''}"`;
    let poster = null;
    if (channel.logo)
        poster = channel.logo;
    else {
        // Guess type
        const type = (channel.category || '').toLowerCase().includes('series') ? 'tv' : 'movie';
        poster = await getPoster(channel.name, type);
    }
    if (!poster)
        poster = LOGO_URL;
    info += ` tvg-logo="${poster}"`;
    return info + `,${channel.name}`;
}
function isValidUrl(url) {
    return /^https?:\/\/.+\.(m3u8?|ts)$/.test(url);
}
async function validateUrl(url) {
    try {
        const res = await (0, node_fetch_1.default)(url, { method: 'HEAD', timeout: 8000 });
        return res.ok;
    }
    catch (_a) {
        return false;
    }
}
function classify(channel) {
    const name = (channel.name || '').toLowerCase();
    const cat = (channel.category || '').toLowerCase();
    if ((cat.includes('movie') || name.includes('movie')) && cat.includes('arabic'))
        return 'movies-arabic';
    if ((cat.includes('movie') || name.includes('movie')))
        return 'movies-foreign';
    if ((cat.includes('series') || name.includes('series')) && cat.includes('arabic'))
        return 'series-arabic';
    if ((cat.includes('series') || name.includes('series')))
        return 'series-foreign';
    if (cat.includes('arabic'))
        return 'movies-arabic';
    if (cat.includes('drama'))
        return 'series-arabic';
    return null;
}
async function main() {
    const data = await (0, node_fetch_1.default)(API_URL).then(r => r.json());
    const categorized = {
        'movies-arabic': [],
        'movies-foreign': [],
        'series-arabic': [],
        'series-foreign': []
    };
    for (const channel of data) {
        if (!channel.url || !isValidUrl(channel.url))
            continue;
        if (!CATEGORIES.some(cat => (channel.category || '').toLowerCase().includes(cat)))
            continue;
        if (!(await validateUrl(channel.url)))
            continue;
        const type = classify(channel);
        if (!type)
            continue;
        const extinfLine = await extinf(channel);
        categorized[type].push(extinfLine + '\n' + channel.url);
    }
    for (const [type, lines] of Object.entries(categorized)) {
        fs_1.default.writeFileSync(OUTPUTS[type], '#EXTM3U\n' + lines.join('\n'), 'utf8');
        console.log(`[A] Wrote ${lines.length} entries to ${OUTPUTS[type]}`);
    }
}
main();
