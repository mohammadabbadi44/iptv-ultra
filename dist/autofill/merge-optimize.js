"use strict";
// Pipeline D: Merge + Optimize + Clean
// Merges, dedupes, sorts, validates, and outputs final all-in-one M3U
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
// Helper to get fetch (global or node-fetch)
async function getFetch() {
    if (typeof fetch !== 'undefined')
        return fetch;
    // @ts-ignore
    return (await import('node-fetch')).default;
}
const path = __importStar(require("path"));
const glob_1 = require("glob");
// Helper to get all .m3u files in streams/ except index.m3u and all.m3u (async for glob v11+)
async function getAllM3Us() {
    const files = await (0, glob_1.glob)('streams/*.m3u');
    return files.filter(f => !/all\.m3u$|index\.m3u$/.test(f));
}
const INPUTS_EXTRA = [
    'streams/tmdb-movies.m3u',
    'streams/tmdb-series.m3u',
];
const OUTPUT_PATH = path.resolve(__dirname, '../../index.m3u');
const LOGO_URL = 'https://raw.githubusercontent.com/mohammadabbadi44/iptv-ultra/master/.readme/preview.png';
const TMDB_API_KEY = '1e8c1e0b8e7e3e5e7e8e7e8e7e8e7e8e'; // Demo key, replace with your own for production
const TMDB_BASE = 'https://api.themoviedb.org/3/search/';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
function parseM3U(m3u, sourceFile) {
    const entries = [];
    let current = {};
    // Determine default category from filename
    let defaultCategory = '';
    if (sourceFile) {
        if (/movies-arabic/i.test(sourceFile))
            defaultCategory = 'Arabic Movies';
        else if (/movies-foreign/i.test(sourceFile))
            defaultCategory = 'Foreign Movies';
        else if (/series-arabic/i.test(sourceFile))
            defaultCategory = 'Arabic Series';
        else if (/series-foreign/i.test(sourceFile))
            defaultCategory = 'Foreign Series';
        else if (/movies/i.test(sourceFile))
            defaultCategory = 'Movies';
        else if (/series/i.test(sourceFile))
            defaultCategory = 'Series';
        else if (/channels|iptv|live/i.test(sourceFile))
            defaultCategory = 'Channels';
    }
    if (!defaultCategory)
        defaultCategory = 'Other';
    for (const line of m3u.split(/\r?\n/)) {
        if (line.startsWith('#EXTINF:')) {
            // Extract fields from EXTINF
            const nameMatch = line.match(/,(.*)$/);
            const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
            const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
            const groupTitleMatch = line.match(/group-title="([^"]*)"/);
            const logoMatch = line.match(/tvg-logo="([^"]*)"/);
            let parsedCategory = groupTitleMatch ? groupTitleMatch[1].trim() : '';
            // fallback: always set to defaultCategory if empty
            if (!parsedCategory)
                parsedCategory = defaultCategory || 'Other';
            current = {
                name: tvgNameMatch ? tvgNameMatch[1].trim() : (nameMatch ? nameMatch[1].trim() : ''),
                id: tvgIdMatch ? tvgIdMatch[1].trim() : '',
                category: parsedCategory,
                group: parsedCategory,
                logo: logoMatch ? logoMatch[1].trim() : ''
            };
        }
        else if (current && line && !line.startsWith('#')) {
            current.url = line;
            // fallback: إذا لم يوجد group أو category، استخدم defaultCategory
            if (!current.group || current.group.trim() === '')
                current.group = defaultCategory;
            if (!current.category || current.category.trim() === '')
                current.category = defaultCategory;
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
        const fetchFn = await getFetch();
        const res = await fetchFn(url, { method: 'HEAD', timeout: 8000 });
        return res.ok;
    }
    catch (_a) {
        return false;
    }
}
async function getPoster(name, type) {
    try {
        const fetchFn = await getFetch();
        const url = `${TMDB_BASE}${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}`;
        const res = await fetchFn(url);
        const data = await res.json();
        if (data.results && data.results[0] && data.results[0].poster_path) {
            return TMDB_IMG + data.results[0].poster_path;
        }
    }
    catch (_a) { }
    return null;
}
async function extinf(channel) {
    let group = channel.group || channel.category || '';
    // fallback: استنتاج التصنيف من الاسم إذا كان فارغ
    if (!group || group.trim() === '') {
        if (channel.name && /movie|فيلم|film/i.test(channel.name))
            group = 'Movies';
        else if (channel.name && /series|مسلسل|drama/i.test(channel.name))
            group = 'Series';
        else
            group = '';
    }
    // FINAL fallback: forcibly set to 'Other' if still empty
    if (!group || group.trim() === '')
        group = 'Other';
    let info = `#EXTINF:-1 tvg-id="${channel.id || ''}" tvg-name="${channel.name || ''}" group-title="${group}"`;
    let poster = null;
    if (channel.logo)
        poster = channel.logo;
    else {
        const type = (channel.category || '').toLowerCase().includes('series') ? 'tv' : 'movie';
        poster = await getPoster(channel.name || '', type);
    }
    if (!poster)
        poster = LOGO_URL;
    info += ` tvg-logo="${poster}"`;
    return info + `,${channel.name || ''}`;
}
function sortEntries(entries) {
    return entries.sort((a, b) => {
        const getScore = (e) => {
            let s = 0;
            if (/movie/i.test(e.category || ''))
                s += 1000;
            if (/series|drama/i.test(e.category || ''))
                s += 800;
            if (/arabic|عربي/i.test(e.category || ''))
                s += 100;
            if (/foreign|turkish|hollywood/i.test(e.category || ''))
                s += 50;
            if (e.url && /1080p/i.test(e.url))
                s += 10;
            if (e.url && /720p/i.test(e.url))
                s += 5;
            return -s;
        };
        return getScore(a) - getScore(b);
    });
}
async function main() {
    console.log('[DEBUG] main() started');
    const allM3Us = await getAllM3Us();
    const INPUTS = [...allM3Us, ...INPUTS_EXTRA];
    let all = [];
    for (const file of INPUTS) {
        if (!fs.existsSync(file))
            continue;
        const m3u = fs.readFileSync(file, 'utf8');
        all = all.concat(parseM3U(m3u, file));
    }
    // Deduplicate by name+url, validate
    const seen = new Map();
    for (const entry of all) {
        if (!entry.url || !isValidUrl(entry.url))
            continue;
        // Use name+url as deduplication key
        const key = (entry.name || '') + (entry.url || '');
        if (!seen.has(key))
            seen.set(key, entry);
    }
    const sorted = sortEntries(Array.from(seen.values()));
    // Ensure every entry has a non-empty category before output
    for (const entry of sorted) {
        if (!entry.category || entry.category.trim() === '') {
            entry.category = 'Other';
        }
    }
    const lines = [];
    for (const entry of sorted) {
        // Debug: print entry before extinf
        if (global.mainDebugCount === undefined)
            global.mainDebugCount = 0;
        if (global.mainDebugCount < 10) {
            console.log('[DEBUG MAIN ENTRY]', JSON.stringify(entry));
            global.mainDebugCount++;
        }
        const extinfLine = await extinf(entry);
        if (entry.url) {
            lines.push(extinfLine);
            lines.push(entry.url);
        }
    }
    // Debug: write the first 10 output lines to debug-output.txt
    console.log('[DEBUG] About to write debug-output.txt');
    const debugLines = lines.slice(0, 10).join('\n');
    fs.writeFileSync('debug-output.txt', debugLines, 'utf8');
    console.log('[DEBUG] Finished writing debug-output.txt');
    fs.writeFileSync(OUTPUT_PATH, '#EXTM3U\n' + lines.join('\n'), 'utf8');
    console.log(`[D] Wrote ${lines.length / 2} entries to ${OUTPUT_PATH}`);
    console.log('[DEBUG] Absolute OUTPUT path:', OUTPUT_PATH);
}
(async () => {
    await main();
})();
