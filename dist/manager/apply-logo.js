"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const USERNAME = 'mohammadabbadi44';
const REPO = 'iptv-ultra';
const LOGO_URL = `https://raw.githubusercontent.com/${USERNAME}/${REPO}/main/logo.png`;
const streamsDir = path_1.default.join(__dirname, '../../streams');
function getAllM3UFiles(dir) {
    return fs_1.default.readdirSync(dir)
        .filter(f => f.endsWith('.m3u'))
        .map(f => path_1.default.join(dir, f));
}
function processFile(file) {
    let content = fs_1.default.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#EXTINF')) {
            if (/tvg-logo="[^"]*"/.test(lines[i])) {
                lines[i] = lines[i].replace(/tvg-logo="[^"]*"/, `tvg-logo="${LOGO_URL}"`);
            }
            else {
                lines[i] = lines[i].replace('#EXTINF:', `#EXTINF: tvg-logo="${LOGO_URL}",`);
            }
            console.log(`[apply-logo] ${file}: Set tvg-logo for line ${i}`);
        }
    }
    fs_1.default.writeFileSync(file, lines.join('\n'), 'utf8');
}
function main() {
    const files = getAllM3UFiles(streamsDir);
    for (const file of files) {
        processFile(file);
    }
    console.log('[apply-logo] Done.');
}
main();
