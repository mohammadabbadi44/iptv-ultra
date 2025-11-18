// scripts/utils/generateMasterPlaylist.js
// سكريبت لدمج جميع قنوات .m3u في ملف واحد مرتب حسب التصنيف وبدون تكرار
// التشغيل: node scripts/utils/generateMasterPlaylist.js

const fs = require('fs');
const path = require('path');

const STREAMS_DIR = path.join(__dirname, '../../streams');
const OUTPUT_FILE = path.join(__dirname, '../../index_master_sorted_by_category.m3u');

function parseM3UFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const entries = [];
    let lastExtinf = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXTINF')) {
            lastExtinf = line;
        } else if (lastExtinf && line && (line.startsWith('http://') || line.startsWith('https://'))) {
            entries.push({ extinf: lastExtinf, url: line });
            lastExtinf = null;
        }
    }
    return entries;
}

function extractCategory(extinf) {
    const match = extinf.match(/group-title="([^"]+)"/);
    return match ? match[1] : 'Other';
}

function extractTvgId(extinf) {
    const match = extinf.match(/tvg-id="([^"]+)"/);
    return match ? match[1] : '';
}

function main() {
    const files = fs.readdirSync(STREAMS_DIR).filter(f => f.endsWith('.m3u'));
    const unique = new Map(); // key: url or tvg-id, value: {extinf, url, category}
    for (const file of files) {
        const entries = parseM3UFile(path.join(STREAMS_DIR, file));
        for (const entry of entries) {
            const key = extractTvgId(entry.extinf) || entry.url;
            if (!unique.has(key)) {
                unique.set(key, {
                    extinf: entry.extinf,
                    url: entry.url,
                    category: extractCategory(entry.extinf)
                });
            }
        }
    }
    // Sort by category
    const byCategory = {};
    for (const { extinf, url, category } of unique.values()) {
        if (!byCategory[category]) byCategory[category] = [];
        byCategory[category].push({ extinf, url });
    }
    // Write output
    let output = '#EXTM3U\n# --- IPTV Ultra Master Playlist (Sorted by Category, No Duplicates) ---\n# Generated: ' + new Date().toISOString().slice(0,10) + '\n\n';
    for (const cat of Object.keys(byCategory).sort()) {
        output += `\n########################################\n# ${cat}\n########################################\n`;
        for (const { extinf, url } of byCategory[cat]) {
            output += extinf + '\n' + url + '\n';
        }
    }
    fs.writeFileSync(OUTPUT_FILE, output, 'utf8');
    console.log('Master playlist generated:', OUTPUT_FILE);
}

main();
