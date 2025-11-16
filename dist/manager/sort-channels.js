"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const streamsDir = path_1.default.join(__dirname, '../../streams');
const GROUPS = [
    { name: 'Sports', keywords: ['sport', 'sports', 'bein', 'espn', 'nba', 'fox sports'] },
    { name: 'News', keywords: ['news', 'aljazeera', 'cnn', 'sky news', 'bbc'] },
    { name: 'Movies', keywords: ['movie', 'cinema', 'film', 'mbc2', 'mbc max'] },
    { name: 'Kids', keywords: ['kids', 'cartoon', 'disney', 'nick', 'baby', 'junior'] },
    { name: 'Arabic', keywords: ['arabic', 'arabi', 'rotana', 'mbc', 'saudi', 'qatar', 'kuwait', 'uae'] },
    { name: 'Documentary', keywords: ['documentary', 'geo', 'discovery', 'nat geo', 'history'] },
    { name: 'Music', keywords: ['music', 'mtv', 'radio', 'song', 'melody'] },
];
function getAllM3UFiles(dir) {
    return fs_1.default.readdirSync(dir)
        .filter(f => f.endsWith('.m3u'))
        .map(f => path_1.default.join(dir, f));
}
function detectGroup(name) {
    const lower = name.toLowerCase();
    for (const group of GROUPS) {
        if (group.keywords.some(k => lower.includes(k))) {
            return group.name;
        }
    }
    return 'Other';
}
function processFile(file) {
    var _a;
    let content = fs_1.default.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#EXTINF')) {
            const name = ((_a = lines[i].split(',').pop()) === null || _a === void 0 ? void 0 : _a.trim()) || '';
            const group = detectGroup(name);
            if (/group-title="[^"]*"/.test(lines[i])) {
                lines[i] = lines[i].replace(/group-title="[^"]*"/, `group-title="${group}"`);
            }
            else {
                lines[i] = lines[i].replace('#EXTINF:', `#EXTINF: group-title="${group}",`);
            }
            console.log(`[sort-channels] ${file}: Set group-title=${group} for ${name}`);
        }
    }
    fs_1.default.writeFileSync(file, lines.join('\n'), 'utf8');
}
function main() {
    const files = getAllM3UFiles(streamsDir);
    for (const file of files) {
        processFile(file);
    }
    console.log('[sort-channels] Done.');
}
main();
