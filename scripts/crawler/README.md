# IPTV-ULTRA Web Crawler

This script crawls IPTV/movie/series sites, extracts M3U/M3U8 links, classifies them, and updates your playlists automatically.

- Searches multiple sources for fresh links
- Extracts and parses streaming links
- Classifies by type (movie, series, Arabic, foreign, etc.)
- Updates and merges with your existing M3U files

---

**Usage:**

```bash
python crawler.py
```

---

**Requirements:**
- Python 3.9+
- requests, beautifulsoup4, m3u8

Install dependencies:
```bash
pip install requests beautifulsoup4 m3u8
```

---

**Configuration:**
- Edit `SOURCES` in `crawler.py` to add/remove IPTV sites.
- The script will auto-update the following files:
  - streams/series-arabic.m3u
  - streams/series-foreign.m3u
  - streams/movies-arabic.m3u
  - streams/movies-foreign.m3u

---

**Warning:**
- Use for educational and legal purposes only.
- Respect copyright and terms of use of each source.
