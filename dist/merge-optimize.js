"use strict";
// Pipeline D: Merge + Optimize + Clean
// Merges, dedupes, sorts, validates, and outputs final all-in-one M3U
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
// Helper to get fetch (global or node-fetch)
function getFetch() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (typeof fetch !== 'undefined')
                        return [2 /*return*/, fetch];
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('node-fetch'); })];
                case 1: 
                // @ts-ignore
                return [2 /*return*/, (_a.sent()).default];
            }
        });
    });
}
var glob_1 = require("glob");
// Helper to get all .m3u files in streams/ except index.m3u and all.m3u (async for glob v11+)
function getAllM3Us() {
    return __awaiter(this, void 0, void 0, function () {
        var files;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, glob_1.glob)('streams/*.m3u')];
                case 1:
                    files = _a.sent();
                    return [2 /*return*/, files.filter(function (f) { return !/all\.m3u$|index\.m3u$/.test(f); })];
            }
        });
    });
}
var INPUTS_EXTRA = [
    'streams/tmdb-movies.m3u',
    'streams/tmdb-series.m3u',
];
var OUTPUT = 'index.m3u';
var LOGO_URL = 'https://raw.githubusercontent.com/mohammadabbadi44/iptv-ultra/master/.readme/preview.png';
var TMDB_API_KEY = '1e8c1e0b8e7e3e5e7e8e7e8e7e8e7e8e'; // Demo key, replace with your own for production
var TMDB_BASE = 'https://api.themoviedb.org/3/search/';
var TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
function parseM3U(m3u, sourceFile) {
    var entries = [];
    var current = undefined;
    // Determine default category from filename
    var defaultCategory = '';
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
    for (var _i = 0, _a = m3u.split(/\r?\n/); _i < _a.length; _i++) {
        var line = _a[_i];
        if (line.startsWith('#EXTINF:')) {
            // Extract fields from EXTINF
            var nameMatch = line.match(/,(.*)$/);
            var tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
            var tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
            var groupTitleMatch = line.match(/group-title="([^"]*)"/);
            var logoMatch = line.match(/tvg-logo="([^"]*)"/);
            var parsedCategory = groupTitleMatch ? groupTitleMatch[1].trim() : '';
            // If parsedCategory is empty, use defaultCategory
            if (!parsedCategory)
                parsedCategory = defaultCategory || 'Other';
            current = {
                info: line,
                name: tvgNameMatch ? tvgNameMatch[1].trim() : (nameMatch ? nameMatch[1].trim() : ''),
                id: tvgIdMatch ? tvgIdMatch[1].trim() : '',
                category: parsedCategory,
                logo: logoMatch ? logoMatch[1].trim() : ''
            };
        }
        else if (current && line && !line.startsWith('#')) {
            current.url = line;
            entries.push(current);
            current = undefined;
        }
    }
    return entries;
}
function isValidUrl(url) {
    return /^https?:\/\/.+\.(m3u8?|ts)$/.test(url);
}
function validateUrl(url) {
    return __awaiter(this, void 0, void 0, function () {
        var fetchFn, res, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, getFetch()];
                case 1:
                    fetchFn = _b.sent();
                    return [4 /*yield*/, fetchFn(url, { method: 'HEAD', timeout: 8000 })];
                case 2:
                    res = _b.sent();
                    return [2 /*return*/, res.ok];
                case 3:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function getPoster(name, type) {
    return __awaiter(this, void 0, void 0, function () {
        var fetchFn, url, res, data, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, getFetch()];
                case 1:
                    fetchFn = _b.sent();
                    url = "".concat(TMDB_BASE).concat(type, "?api_key=").concat(TMDB_API_KEY, "&query=").concat(encodeURIComponent(name));
                    return [4 /*yield*/, fetchFn(url)];
                case 2:
                    res = _b.sent();
                    return [4 /*yield*/, res.json()];
                case 3:
                    data = _b.sent();
                    if (data.results && data.results[0] && data.results[0].poster_path) {
                        return [2 /*return*/, TMDB_IMG + data.results[0].poster_path];
                    }
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/, null];
            }
        });
    });
}
function extinf(channel) {
    return __awaiter(this, void 0, void 0, function () {
        var group, info, poster, type;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    group = channel.category && channel.category.trim() ? channel.category.trim() : '';
                    // Final fallback: always set to 'Other' if empty
                    if (!group)
                        group = 'Other';
                    info = "#EXTINF:-1 tvg-id=\"".concat(channel.id || '', "\" tvg-name=\"").concat(channel.name || '', "\" group-title=\"").concat(group, "\"");
                    // Debug: print the first 10 EXTINF lines and their group-title
                    if (typeof global.extinfDebugCount === 'undefined')
                        global.extinfDebugCount = 0;
                    if (global.extinfDebugCount < 10) {
                        console.log('[DEBUG EXTINF]', info);
                        global.extinfDebugCount++;
                    }
                    poster = null;
                    if (!channel.logo) return [3 /*break*/, 1];
                    poster = channel.logo;
                    return [3 /*break*/, 3];
                case 1:
                    type = (channel.category || '').toLowerCase().includes('series') ? 'tv' : 'movie';
                    return [4 /*yield*/, getPoster(channel.name || '', type)];
                case 2:
                    poster = _a.sent();
                    _a.label = 3;
                case 3:
                    if (!poster)
                        poster = LOGO_URL;
                    info += " tvg-logo=\"".concat(poster, "\"");
                    return [2 /*return*/, info + ",".concat(channel.name || '')];
            }
        });
    });
}
function sortEntries(entries) {
    // Movies > Series > Arabic > Foreign > HD > SD
    return entries.sort(function (a, b) {
        var getScore = function (e) {
            var s = 0;
            if (/movie/i.test(e.info))
                s += 1000;
            if (/series|drama/i.test(e.info))
                s += 800;
            if (/arabic|عربي/i.test(e.info))
                s += 100;
            if (/foreign|turkish|hollywood/i.test(e.info))
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
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var allM3Us, INPUTS, all, _i, INPUTS_1, file, m3u, seen, _a, all_1, entry, key, sorted, _b, sorted_1, entry, lines, _c, sorted_2, entry, extinfLine, debugLines;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log('[DEBUG] main() started');
                    return [4 /*yield*/, getAllM3Us()];
                case 1:
                    allM3Us = _d.sent();
                    INPUTS = __spreadArray(__spreadArray([], allM3Us, true), INPUTS_EXTRA, true);
                    all = [];
                    for (_i = 0, INPUTS_1 = INPUTS; _i < INPUTS_1.length; _i++) {
                        file = INPUTS_1[_i];
                        if (!fs.existsSync(file))
                            continue;
                        m3u = fs.readFileSync(file, 'utf8');
                        all = all.concat(parseM3U(m3u, file));
                    }
                    seen = new Map();
                    for (_a = 0, all_1 = all; _a < all_1.length; _a++) {
                        entry = all_1[_a];
                        if (!entry.url || !isValidUrl(entry.url))
                            continue;
                        key = entry.info + entry.url;
                        if (!seen.has(key))
                            seen.set(key, entry);
                    }
                    sorted = sortEntries(Array.from(seen.values()));
                    // Ensure every entry has a non-empty category before output
                    for (_b = 0, sorted_1 = sorted; _b < sorted_1.length; _b++) {
                        entry = sorted_1[_b];
                        if (!entry.category || entry.category.trim() === '') {
                            entry.category = 'Other';
                        }
                    }
                    lines = [];
                    _c = 0, sorted_2 = sorted;
                    _d.label = 2;
                case 2:
                    if (!(_c < sorted_2.length)) return [3 /*break*/, 5];
                    entry = sorted_2[_c];
                    return [4 /*yield*/, extinf(entry)];
                case 3:
                    extinfLine = _d.sent();
                    if (entry.url) {
                        lines.push(extinfLine);
                        lines.push(entry.url);
                    }
                    _d.label = 4;
                case 4:
                    _c++;
                    return [3 /*break*/, 2];
                case 5:
                    // Debug: write the first 10 output lines to debug-output.txt
                    console.log('[DEBUG] About to write debug-output.txt');
                    debugLines = lines.slice(0, 10).join('\n');
                    fs.writeFileSync('debug-output.txt', debugLines, 'utf8');
                    console.log('[DEBUG] Finished writing debug-output.txt');
                    fs.writeFileSync(OUTPUT, '#EXTM3U\n' + lines.join('\n'), 'utf8');
                    console.log("[D] Wrote ".concat(lines.length / 2, " entries to ").concat(OUTPUT));
                    return [2 /*return*/];
            }
        });
    });
}
(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, main()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); })();
