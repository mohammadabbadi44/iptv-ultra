import fs from 'fs';
import path from 'path';
import child_process from 'child_process';

const streamsDir = path.join(__dirname, '../../streams');
const combinedDir = path.join(__dirname, '../../combined');
const outputFile = path.join(combinedDir, 'all.m3u');

function getAllM3UFiles(dir: string): string[] {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.m3u'))
    .map(f => path.join(dir, f));
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
}

function mergeFiles(files: string[]): string {
  let merged = '#EXTM3U\n';
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/^#EXTM3U\s*/i, '');
    merged += content + '\n';
  }
  return merged;
}

function runScript(script: string) {
  try {
    child_process.execSync(`npx tsx scripts/manager/${script}`, { stdio: 'inherit' });
  } catch (e) {
    console.error(`[merge-playlists] Failed to run ${script}:`, e);
  }
}

function main() {
  ensureDir(combinedDir);
  const files = getAllM3UFiles(streamsDir);
  let merged = mergeFiles(files);
  fs.writeFileSync(outputFile, merged, 'utf8');
  // Run all steps in order
  runScript('remove-duplicates.ts');
  runScript('analyze-quality.ts');
  runScript('sort-channels.ts');
  runScript('apply-logo.ts');
  fs.writeFileSync(outputFile, merged, 'utf8');
  console.log(`[merge-playlists] Saved optimized playlist to ${outputFile}`);
}

main();
