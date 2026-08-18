#!/usr/bin/env python3
"""
Wayback Machine Website Restorer - Fast parallel version
Restores https://www.khazrajiaudit.com using Homebrew curl + ThreadPoolExecutor
"""

import os, re, time, json, subprocess, urllib.parse, sys
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
OUTPUT_DIR    = Path("/Users/asterantony/khazrajiaudit.com")
CDX_API       = "https://web.archive.org/cdx/search/cdx"
WAYBACK_BASE  = "https://web.archive.org/web"
CURL          = "/opt/homebrew/opt/curl/bin/curl"
WORKERS       = 8   # parallel downloads

_lock     = Lock()
downloaded = set()
failed     = []
counter    = [0]

def curl_get(url: str, timeout: int = 45):
    try:
        r = subprocess.run(
            [CURL, "-sL", "--max-time", str(timeout),
             "--retry", "2", "--retry-delay", "2",
             "-H", "User-Agent: Mozilla/5.0 (compatible; site-restorer/1.0)",
             url],
            capture_output=True, timeout=timeout + 10
        )
        return r.stdout if r.returncode == 0 else None
    except Exception:
        return None

def cdx_get_all_urls(domain: str):
    print(f"\n[CDX] Fetching URL list for {domain}...")
    params = urllib.parse.urlencode({
        "url": f"{domain}/*",
        "output": "json",
        "fl": "timestamp,original,statuscode,mimetype",
        "filter": "statuscode:200",
        "collapse": "urlkey",
        "limit": "50000",
    })
    data = curl_get(f"{CDX_API}?{params}", timeout=120)
    if not data:
        return []
    try:
        rows = json.loads(data)
        if len(rows) < 2:
            return []
        headers = rows[0]
        results = [dict(zip(headers, row)) for row in rows[1:]]
        print(f"[CDX] Found {len(results)} unique URLs")
        return results
    except Exception as e:
        print(f"[CDX] Error: {e}\nResponse: {data[:300]}")
        return []

def should_skip(url: str) -> bool:
    """Filter out junk URLs that will never resolve from Wayback."""
    skip_patterns = [
        r':\d{2,5}/',          # non-standard ports like :80 :8080
        r'suspendedpage\.cgi',
        r'\{search_term',
        r'utm_source=',
        r'utm_medium=',
        r'\?trk=',
        r'/web/\d+',           # already-wrapped wayback URLs
        r'web\.archive\.org',
    ]
    for pat in skip_patterns:
        if re.search(pat, url):
            return True
    return False

def local_path(original_url: str) -> Path:
    parsed = urllib.parse.urlparse(original_url)
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

def rewrite_html(content: str) -> str:
    soup = BeautifulSoup(content, "lxml")
    for tag in soup.find_all(id=re.compile(r'wm-|wmb-', re.I)):
        tag.decompose()
    for tag in soup.find_all("script", src=re.compile(r'web\.archive\.org', re.I)):
        tag.decompose()
    for tag in soup.find_all("div", id="donato"):
        tag.decompose()
    for tag in soup.find_all(True):
        for attr in ("href", "src", "action", "data-src", "data-href"):
            val = tag.get(attr, "")
            if not val:
                continue
            cleaned = re.sub(r'https?://web\.archive\.org/web/\d+[a-z_*]?/', '', val)
            if cleaned != val:
                tag[attr] = cleaned
    result = str(soup)
    result = re.sub(r'<!-- BEGIN WAYBACK.*?END WAYBACK[^>]*-->', '', result, flags=re.DOTALL)
    return result

def download_one(orig: str, ts: str) -> bool:
    with _lock:
        if orig in downloaded:
            return True
        downloaded.add(orig)

    dest = local_path(orig)
    if dest.exists():
        return True

    wb_url = f"{WAYBACK_BASE}/{ts}/{orig}"
    data = curl_get(wb_url, timeout=45)
    if not data:
        with _lock:
            failed.append(orig)
        return False

    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        text = data.decode("utf-8", errors="ignore")
        if text.lstrip()[:50].lower().startswith(("<!do", "<htm", "<!-")):
            dest.write_text(rewrite_html(text), encoding="utf-8")
        else:
            dest.write_bytes(data)
    except Exception as e:
        with _lock:
            failed.append(orig)
        return False

    with _lock:
        counter[0] += 1
        if counter[0] % 50 == 0:
            print(f"  [{counter[0]}] downloaded so far, {len(failed)} failed")
    return True

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Output: {OUTPUT_DIR}")
    print(f"Workers: {WORKERS}")

    # Reuse CDX data if already fetched
    index_file = OUTPUT_DIR / "_urls.json"
    if index_file.exists():
        print(f"[CDX] Reusing cached URL list from {index_file}")
        all_urls = json.loads(index_file.read_text())
    else:
        all_urls = cdx_get_all_urls(TARGET_DOMAIN)
        if not all_urls:
            print("ERROR: Cannot reach Wayback Machine. Is VPN on?")
            return
        index_file.write_text(json.dumps(all_urls, indent=2))

    # Filter junk URLs
    clean = [(r["original"], r["timestamp"]) for r in all_urls
             if r.get("original") and r.get("timestamp") and not should_skip(r["original"])]
    print(f"[filter] {len(clean)}/{len(all_urls)} URLs after filtering junk")

    print(f"\n[download] Starting {WORKERS} parallel workers...")
    start = time.time()
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(download_one, orig, ts): orig for orig, ts in clean}
        for fut in as_completed(futures):
            pass  # progress logged inside download_one

    elapsed = time.time() - start
    print(f"\n{'='*60}")
    print(f"Done in {elapsed:.0f}s. Downloaded: {counter[0]}, Skipped/cached: {len(downloaded)-counter[0]}, Failed: {len(failed)}")
    print(f"Output: {OUTPUT_DIR}")
    if failed:
        fail_file = OUTPUT_DIR / "_failed.txt"
        fail_file.write_text("\n".join(failed))
        print(f"Failed URLs: {fail_file}")

if __name__ == "__main__":
    main()
