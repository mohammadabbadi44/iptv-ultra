const fs = require('fs');
const path = require('path');
// const fetch = require('node-fetch');

const streamsDir = path.join(__dirname, '../../streams');
const remoteM3U = 'https://iptv-org.github.io/iptv/index.m3u';

function getAllM3UFiles(dir: string): string[] {
  return fs.readdirSync(dir)
    .filter((f: string) => f.endsWith('.m3u'))
    .map((f: string) => path.join(dir, f));
}

async function downloadRemoteM3U() {
  const res = await fetch(remoteM3U);
  if (!res.ok) throw new Error('Failed to download remote M3U');
  return await res.text();
}

function parseM3U(m3u: string): { name: string, url: string }[] {
  const lines = m3u.split(/\r?\n/);
  const channels: { name: string, url: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#EXTINF')) {
      let name = lines[i].split(',').pop();
      name = name ? name.trim() : '';
      const url = lines[i + 1] || '';
      channels.push({ name, url });
    }
  }
  return channels;
}

async function updateLinks() {
  console.log('[update-links] Downloading latest global playlist...');
  const remoteM3UText = await downloadRemoteM3U();
  const remoteChannels = parseM3U(remoteM3UText);
  const remoteMap = new Map();
  for (const ch of remoteChannels) {
    remoteMap.set(ch.name.toLowerCase(), ch.url);
  }
  const files = getAllM3UFiles(streamsDir);
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    const lines = content.split(/\r?\n/);
    let updated = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#EXTINF')) {
        const name = lines[i].split(',').pop()?.trim() || '';
        const url = lines[i + 1] || '';
        const newUrl = remoteMap.get(name.toLowerCase());
        if (newUrl && newUrl !== url) {
          lines[i + 1] = newUrl;
          updated = true;
          console.log(`[update-links] Updated: ${name}`);
        }
      }
    }
    if (updated) {
      fs.writeFileSync(file, lines.join('\n'), 'utf8');
      console.log(`[update-links] Updated file: ${file}`);
    }
  }
  console.log('[update-links] Done.');
}

updateLinks().catch(err => {
  console.error('[update-links] Error:', err);
});
