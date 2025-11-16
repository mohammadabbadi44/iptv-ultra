"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = __importDefault(require("child_process"));
const streamsDir = path_1.default.join(__dirname, '../../streams');
const combinedDir = path_1.default.join(__dirname, '../../combined');
const outputFile = path_1.default.join(combinedDir, 'all.m3u');
function getAllM3UFiles(dir) {
    return fs_1.default.readdirSync(dir)
        .filter(f => f.endsWith('.m3u'))
        .map(f => path_1.default.join(dir, f));
}
function ensureDir(dir) {
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir);
}
function mergeFiles(files) {
    let merged = '#EXTM3U\n';
    for (const file of files) {
        let content = fs_1.default.readFileSync(file, 'utf8');
        content = content.replace(/^#EXTM3U\s*/i, '');
        merged += content + '\n';
    }
    return merged;
}
function runScript(script) {
    try {
        child_process_1.default.execSync(`npx tsx scripts/manager/${script}`, { stdio: 'inherit' });
    }
    catch (e) {
        console.error(`[merge-playlists] Failed to run ${script}:`, e);
    }
}
function main() {
    ensureDir(combinedDir);
    const files = getAllM3UFiles(streamsDir);
    let merged = mergeFiles(files);
    fs_1.default.writeFileSync(outputFile, merged, 'utf8');
    // Run all steps in order
    runScript('remove-duplicates.ts');
    runScript('analyze-quality.ts');
    runScript('sort-channels.ts');
    runScript('apply-logo.ts');
    fs_1.default.writeFileSync(outputFile, merged, 'utf8');
    console.log(`[merge-playlists] Saved optimized playlist to ${outputFile}`);
}
main();
