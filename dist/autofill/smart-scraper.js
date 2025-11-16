"use strict";
// Pipeline C: Smart Web Scraper (AI-assisted)
// Crawls IPTV-related sites, extracts, classifies, validates, and writes categorized M3U files
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs_1 = __importDefault(require("fs"));
const jsdom_1 = require("jsdom");
const SITES = [
    'https://www.freeiptv.life/',
    'https://iptvcat.com/',
    // Add more as needed
];
const LOGO_URL = 'https://raw.githubusercontent.com/mohammadabbadi44/iptv-ultra/master/.readme/preview.png';
const OUTPUTS = {
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
const TMDB_API_KEY = '1e8c1e0b8e7e3e5e7e8e7e8e7e8e7e8e'; // Demo key, replace with your own for production
const TMDB_BASE = 'https://api.themoviedb.org/3/search/';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
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
function aiClassify(name) {
    for (const rule of AI_KEYWORDS) {
        if (rule.keyword.test(name))
            return rule.file;
    }
    if (/arabic|عربي/i.test(name))
        return 'movies-arabic';
    if (/series|مسلسل/i.test(name))
        return 'series-foreign';
    if (/movie|فيلم/i.test(name))
        return 'movies-foreign';
    return null;
}
async function main() {
    const categorized = {
        'movies-arabic': [],
        'movies-foreign': [],
        'series-arabic': [],
        'series-foreign': []
    };
    for (const site of SITES) {
        try {
            const html = await (0, node_fetch_1.default)(site).then(r => r.text());
            const dom = new jsdom_1.JSDOM(html);
            const links = Array.from(dom.window.document.querySelectorAll('a'))
                .map(a => a.href)
                .filter(isValidUrl);
            for (const url of links) {
                if (!(await validateUrl(url)))
                    continue;
                // Use AI keyword classification
                const name = url.split('/').pop() || url;
                const type = aiClassify(name);
                if (!type)
                    continue;
                const channel = { id: name, name, category: type, url };
                const extinfLine = await extinf(channel);
                categorized[type].push(extinfLine + '\n' + url);
            }
        }
        catch (e) {
            console.error(`[C] Failed to crawl ${site}:`, e);
        }
    }
    for (const [type, lines] of Object.entries(categorized)) {
        fs_1.default.writeFileSync(OUTPUTS[type], '#EXTM3U\n' + lines.join('\n'), 'utf8');
        console.log(`[C] Wrote ${lines.length} entries to ${OUTPUTS[type]}`);
    }
}
main();
