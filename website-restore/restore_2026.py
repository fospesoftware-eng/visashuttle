#!/usr/bin/env python3
"""
Restore khazrajiaudit.com specifically from the March 11 2026 snapshot.
All pages and assets are fetched using timestamp 20260311132951.
"""

import os, re, json, subprocess, urllib.parse, time, sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

try:
    from bs4 import BeautifulSoup
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'beautifulsoup4', 'lxml'])
    from bs4 import BeautifulSoup

TARGET_DOMAIN = "khazrajiaudit.com"
TARGET_URL    = "https://www.khazrajiaudit.com"
TIMESTAMP     = "20260311132951"   # March 11, 2026 — the target snapshot
OUTPUT_DIR    = Path("/Users/asterantony/khazrajiaudit.com")
CDX_API       = "https://web.archive.org/cdx/search/cdx"
WAYBACK_BASE  = "https://web.archive.org/web"
CURL          = "/opt/homebrew/opt/curl/bin/curl"
WORKERS       = 5

_lock    = Lock()
done     = set()
failed   = []
counter  = [0]

def curl_get(url: str, timeout: int = 60):
    for attempt in range(3):
        try:
            r = subprocess.run(
                [CURL, "-sL", "--max-time", str(timeout),
                 "--retry", "1",
                 "-H", "User-Agent: Mozilla/5.0 (compatible; site-restorer/1.0)",
                 url],
                capture_output=True, timeout=timeout + 10
            )
            if r.returncode == 0 and r.stdout:
                return r.stdout
            time.sleep(2 * (attempt + 1))
        except Exception:
            time.sleep(2)
    return None

def cdx_get_urls():
    """Get all URLs archived for this domain near the 2026 snapshot."""
    print(f"[CDX] Fetching URLs near {TIMESTAMP}...")
    params = urllib.parse.urlencode({
        "url": f"{TARGET_DOMAIN}/*",
        "output": "json",
        "fl": "original,mimetype",
        "filter": "statuscode:200",
        "collapse": "urlkey",
        "from": "20260101",
        "to": "20261231",
        "limit": "50000",
    })
    data = curl_get(f"{CDX_API}?{params}", timeout=120)
    if data:
        try:
            rows = json.loads(data)
            if len(rows) >= 2:
                headers = rows[0]
                results = [dict(zip(headers, row)) for row in rows[1:]]
                print(f"[CDX] Found {len(results)} URLs from 2026 snapshot window")
                return results
        except Exception as e:
            print(f"[CDX] Parse error: {e}")

    # Fallback: get any available snapshot
    print("[CDX] Trying without date filter...")
    params2 = urllib.parse.urlencode({
        "url": f"{TARGET_DOMAIN}/*",
        "output": "json",
        "fl": "original,mimetype",
        "filter": "statuscode:200",
        "collapse": "urlkey",
        "limit": "50000",
    })
    data2 = curl_get(f"{CDX_API}?{params2}", timeout=120)
    if data2:
        try:
            rows = json.loads(data2)
            if len(rows) >= 2:
                headers = rows[0]
                results = [dict(zip(headers, row)) for row in rows[1:]]
                print(f"[CDX] Found {len(results)} total URLs")
                return results
        except Exception as e:
            print(f"[CDX] Parse error: {e}")
    return []

def should_skip(url: str) -> bool:
    bad = [r':\d{2,5}/', r'suspendedpage', r'\{search_term',
           r'[?&]utm_', r'[?&]trk=', r'/web/\d+', r'web\.archive\.org']
    return any(re.search(p, url) for p in bad)

def local_path(url: str) -> Path:
    parsed = urllib.parse.urlparse(url)
    path = parsed.path.lstrip("/")
    if not path or path.endswith("/"):
        path = path + "index.html"
    elif "." not in Path(path).name:
        path = path + "/index.html"
    if parsed.query:
        safe_q = re.sub(r'[^\w=&-]', '_', parsed.query)[:40]
        base, ext = os.path.splitext(path)
        path = f"{base}_{safe_q}{ext}"
    return OUTPUT_DIR / path

WAYBACK_URL_RE = re.compile(
    r'(?:https?://web\.archive\.org)?/web/\d+[a-z_*]*/'
    r'(?:https?://(?:www\.)?khazrajiaudit\.com)?/?',
    re.IGNORECASE
)
ARCHIVE_STATIC_RE = re.compile(
    r'<(?:script|link)[^>]*(?:src|href)=["\']https?://web-static\.archive\.org[^>]*?>(?:</(?:script|link)>)?',
    re.IGNORECASE
)
TOOLBAR_RE = re.compile(r'<!-- BEGIN WAYBACK.*?END WAYBACK[^>]*-->', re.DOTALL)
TOOLBAR_DIV_RE = re.compile(
    r'<div[^>]+id=["\'](?:wm-ipp-base|donato)["\'][^>]*>.*?</div>\s*',
    re.DOTALL | re.IGNORECASE
)

def clean_html(content: str) -> str:
    content = ARCHIVE_STATIC_RE.sub('', content)
    content = TOOLBAR_RE.sub('', content)
    content = TOOLBAR_DIV_RE.sub('', content)
    content = WAYBACK_URL_RE.sub('/', content)
    content = re.sub(r'(?<!:)//', '/', content)
    return content

def download(orig: str) -> bool:
    with _lock:
        if orig in done:
            return True
        done.add(orig)

    dest = local_path(orig)
    if dest.exists():
        return True

    # Always use the 2026 target timestamp
    wb_url = f"{WAYBACK_BASE}/{TIMESTAMP}/{orig}"
    data = curl_get(wb_url, timeout=60)

    if not data:
        with _lock:
            failed.append(orig)
        return False

    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        text = data.decode("utf-8", errors="ignore")
        is_html = text.lstrip()[:100].lower().startswith(("<!do", "<htm", "<!-", "<hea"))
        if is_html:
            dest.write_text(clean_html(text), encoding="utf-8")
        else:
            dest.write_bytes(data)
        with _lock:
            counter[0] += 1
            if counter[0] % 50 == 0:
                print(f"  [+{counter[0]}] downloaded, {len(failed)} failed")
        return True
    except Exception:
        with _lock:
            failed.append(orig)
        return False

def scrape_assets(html_path: Path, base_url: str):
    """Find additional asset URLs referenced inside an HTML page."""
    try:
        soup = BeautifulSoup(html_path.read_text(encoding="utf-8", errors="ignore"), "lxml")
    except Exception:
        return []
    assets = []
    for tag, attr in [("img","src"),("script","src"),("link","href"),
                      ("source","src"),("img","data-src")]:
        for el in soup.find_all(tag):
            val = el.get(attr,"")
            if val and not val.startswith("data:") and not val.startswith("#") and not val.startswith("http"):
                abs_url = urllib.parse.urljoin(base_url, val)
                if TARGET_DOMAIN in abs_url and not should_skip(abs_url):
                    assets.append(abs_url)
            elif val and TARGET_DOMAIN in val and not should_skip(val):
                assets.append(val)
    return assets

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Target snapshot : {TIMESTAMP} (March 11, 2026)")
    print(f"Output          : {OUTPUT_DIR}")
    print(f"Workers         : {WORKERS}")

    # Get URL list
    all_rows = cdx_get_urls()
    if not all_rows:
        print("ERROR: Could not fetch URL list. Is VPN on?")
        return

    # Save index
    (OUTPUT_DIR / "_urls.json").write_text(json.dumps(all_rows, indent=2))

    # Filter
    urls = [r["original"] for r in all_rows
            if r.get("original") and not should_skip(r["original"])]
    # Always include the homepage
    if TARGET_URL not in urls:
        urls.insert(0, TARGET_URL)

    print(f"[filter] {len(urls)} URLs to download")
    print(f"\n[download] Starting...")

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        list(as_completed({pool.submit(download, u): u for u in urls}))

    # Second pass: scrape HTML for additional assets
    html_files = list(OUTPUT_DIR.rglob("*.html"))
    print(f"\n[assets] Scanning {len(html_files)} HTML pages for linked assets...")
    extra_urls = set()
    for hf in html_files:
        base = TARGET_URL + "/" + str(hf.relative_to(OUTPUT_DIR).parent).replace("\\","/")
        for a in scrape_assets(hf, base):
            if a not in done:
                extra_urls.add(a)

    if extra_urls:
        print(f"[assets] Downloading {len(extra_urls)} additional assets...")
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            list(as_completed({pool.submit(download, u): u for u in extra_urls}))

    print(f"\n{'='*60}")
    print(f"DONE. Downloaded : {counter[0]} new files")
    print(f"Total in dir     : {sum(1 for _ in OUTPUT_DIR.rglob('*') if _.is_file())}")
    print(f"Failed           : {len(failed)}")
    if failed:
        (OUTPUT_DIR / "_failed.txt").write_text("\n".join(failed))

if __name__ == "__main__":
    main()
