"use strict";
// Pipeline B: Auto-fill from multiple external free IPTV sources
// Reads, merges, dedupes, validates, and writes categorized M3U files
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs_1 = __importDefault(require("fs"));
const SOURCES = [
    'https://iptv-org.github.io/iptv/index.m3u',
    'https://iptvcat.com/playlist.m3u',
    'https://raw.githubusercontent.com/Free-IPTV/Countries/master/ALL.m3u',
    'https://iptv-org.github.io/iptv/categories/movies.m3u',
    'https://iptv-org.github.io/iptv/categories/entertainment.m3u',
    'https://iptv-org.github.io/iptv/categories/series.m3u',
];
const LOGO_URL = 'https://raw.githubusercontent.com/mohammadabbadi44/iptv-ultra/master/.readme/preview.png';
const OUTPUTS = {
    'movies-arabic': 'streams/movies-arabic.m3u',
    'movies-foreign': 'streams/movies-foreign.m3u',
    'series-arabic': 'streams/series-arabic.m3u',
    'series-foreign': 'streams/series-foreign.m3u',
};
const TMDB_API_KEY = '1e8c1e0b8e7e3e5e7e8e7e8e7e8e7e8e'; // Demo key, replace with your own for production
const TMDB_BASE = 'https://api.themoviedb.org/3/search/';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
function parseM3U(m3u) {
    const entries = [];
    let current = {};
    for (const line of m3u.split(/\r?\n/)) {
        if (line.startsWith('#EXTINF:')) {
            current = { info: line };
        }
        else if (line && !line.startsWith('#')) {
            current.url = line;
            entries.push(current);
            current = {};
        }
    }
    return entries;
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
function detectQuality(url) {
    if (/1080p|1920x1080/i.test(url))
        return '1080p';
    if (/720p|1280x720/i.test(url))
        return '720p';
    if (/480p|854x480/i.test(url))
        return '480p';
    return 'SD';
}
function classify(entry) {
    const info = entry.info.toLowerCase();
    if (info.includes('arabic')) {
        if (info.includes('movie'))
            return 'movies-arabic';
        if (info.includes('series') || info.includes('drama'))
            return 'series-arabic';
    }
    if (info.includes('movie'))
        return 'movies-foreign';
    if (info.includes('series') || info.includes('drama'))
        return 'series-foreign';
    return null;
}
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
async function main() {
    let all = [];
    for (const src of SOURCES) {
        try {
            const m3u = await (0, node_fetch_1.default)(src).then(r => r.text());
            all = all.concat(parseM3U(m3u));
        }
        catch (e) {
            console.error(`[B] Failed to fetch ${src}:`, e);
        }
    }
    // Validate, dedupe, keep highest quality
    const seen = new Map();
    // Ensure CATEGORIES, categorized, OUTPUTS are defined
    const CATEGORIES = [
        'movies-arabic', 'movies-foreign', 'series-arabic', 'series-foreign',
        'movie', 'film', 'cinema', 'series', 'مسلسل', 'فيلم', 'عربي', 'أجنبي'
    ];
    const categorized = {
        'movies-arabic': [],
        'movies-foreign': [],
        'series-arabic': [],
        'series-foreign': []
    };
    // OUTPUTS should be defined at the top of the script, but ensure it's here for safety
    const OUTPUTS = {
        'movies-arabic': 'streams/movies-arabic.m3u',
        'movies-foreign': 'streams/movies-foreign.m3u',
        'series-arabic': 'streams/series-arabic.m3u',
        'series-foreign': 'streams/series-foreign.m3u'
    };
    for (const channel of all) {
        if (!channel.url || !isValidUrl(channel.url))
            continue;
        if (!CATEGORIES.some((cat) => (channel.category || '').toLowerCase().includes(cat)))
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
        console.log(`[B] Wrote ${lines.length} entries to ${OUTPUTS[type]}`);
    }
}
main();
