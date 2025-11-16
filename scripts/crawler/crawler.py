import requests
from bs4 import BeautifulSoup
import re
import os
from urllib.parse import urlparse

# List of IPTV/movie/series aggregator sites to crawl
SOURCES = [
    'https://iptv-org.github.io/iptv/index.m3u',
    'https://iptvcat.com/',
    'https://www.freeiptv.life/',
    # Add more sources as needed
]

LOGO_URL = 'https://raw.githubusercontent.com/mohammadabbadi44/iptv-ultra/master/.readme/preview.png'

# Output files
OUTPUTS = {
    'series-arabic': 'streams/series-arabic.m3u',
    'series-foreign': 'streams/series-foreign.m3u',
    'movies-arabic': 'streams/movies-arabic.m3u',
    'movies-foreign': 'streams/movies-foreign.m3u',
}

def fetch_url(url):
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        print(f"[!] Error fetching {url}: {e}")
        return ''

def extract_m3u_links(html):
    # Find all .m3u or .m3u8 links in HTML
    return re.findall(r'https?://[^\s"\'>]+\.(?:m3u8?|ts)', html)

def classify_entry(name, group):
    name = name.lower()
    group = group.lower() if group else ''
    if 'series' in group or 'series' in name or 'مسلسل' in name:
        if 'arabic' in group or 'arabic' in name or 'عربي' in name:
            return 'series-arabic'
        else:
            return 'series-foreign'
    if 'movie' in group or 'movie' in name or 'فيلم' in name:
        if 'arabic' in group or 'arabic' in name or 'عربي' in name:
            return 'movies-arabic'
        else:
            return 'movies-foreign'
    return None

def parse_m3u(m3u_text):
    entries = []
    current = {}
    for line in m3u_text.splitlines():
        if line.startswith('#EXTINF:'):
            # Parse EXTINF line
            info = line
            name = re.search(r',(.+)', info)
            name = name.group(1).strip() if name else 'Unknown'
            group = re.search(r'group-title="([^"]+)"', info)
            group = group.group(1) if group else ''
            current = {
                'info': info,
                'name': name,
                'group': group,
            }
        elif line and not line.startswith('#'):
            current['url'] = line.strip()
            entries.append(current)
            current = {}
    return entries

def write_m3u(filename, entries):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('#EXTM3U\n')
        for entry in entries:
            # Add logo to each entry
            info = entry['info']
            if 'tvg-logo' not in info:
                info = info.replace('group-title="', f'group-title="', 1)
                info = info.rstrip() + f' tvg-logo="{LOGO_URL}"'
            f.write(f'{info}\n{entry["url"]}\n')

def main():
    all_entries = {k: [] for k in OUTPUTS}
    for src in SOURCES:
        print(f'[+] Crawling {src}')
        if src.endswith('.m3u'):
            m3u_text = fetch_url(src)
            entries = parse_m3u(m3u_text)
            for entry in entries:
                cat = classify_entry(entry['name'], entry['group'])
                if cat:
                    all_entries[cat].append(entry)
        else:
            html = fetch_url(src)
            m3u_links = extract_m3u_links(html)
            for m3u_url in m3u_links:
                m3u_text = fetch_url(m3u_url)
                entries = parse_m3u(m3u_text)
                for entry in entries:
                    cat = classify_entry(entry['name'], entry['group'])
                    if cat:
                        all_entries[cat].append(entry)
    # Deduplicate by URL
    for cat, entries in all_entries.items():
        seen = set()
        unique = []
        for e in entries:
            if e['url'] not in seen:
                unique.append(e)
                seen.add(e['url'])
        print(f'[=] Writing {cat}: {len(unique)} entries')
        write_m3u(OUTPUTS[cat], unique)

if __name__ == '__main__':
    main()
