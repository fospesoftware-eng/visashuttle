#!/usr/bin/env python3
"""Download all missing CSS/JS/font files from the 2026 Wayback snapshot."""

import re, os, subprocess, urllib.parse, time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

OUTPUT_DIR   = Path("/Users/asterantony/khazrajiaudit.com")
TIMESTAMP    = "20260311132951"
WAYBACK_BASE = "https://web.archive.org/web"
CURL         = "/opt/homebrew/opt/curl/bin/curl"
WORKERS      = 5

_lock   = Lock()
success = [0]
failed  = []

def curl_get(url, timeout=45):
    for attempt in range(3):
        try:
            r = subprocess.run(
                [CURL, "-sL", "--max-time", str(timeout),
                 "-H", "User-Agent: Mozilla/5.0 (compatible; site-restorer/1.0)", url],
                capture_output=True, timeout=timeout + 5)
            if r.returncode == 0 and r.stdout:
                return r.stdout
            time.sleep(2 * (attempt + 1))
        except Exception:
            time.sleep(2)
    return None

def local_path(url):
    parsed = urllib.parse.urlparse(url)
    path = parsed.path.lstrip("/")
    # strip query string from filename
    path = re.sub(r'\?.*$', '', path)
    return OUTPUT_DIR / path

def download(url, idx, total):
    dest = local_path(url)
    if dest.exists():
        return True
    wb_url = f"{WAYBACK_BASE}/{TIMESTAMP}/{url}"
    print(f"  [{idx}/{total}] {url.split('khazrajiaudit.com/')[-1]}")
    data = curl_get(wb_url)
    if not data:
        with _lock:
            failed.append(url)
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    with _lock:
        success[0] += 1
    return True

# Collect all missing wp-content CSS/JS/font URLs from HTML files
missing = set()
for html in OUTPUT_DIR.rglob("*.html"):
    content = html.read_text(encoding="utf-8", errors="ignore")
    for m in re.finditer(
        r'(?:href|src)=["\'](/wp-[^"\'?#]+\.(?:css|js|woff2?|ttf|eot))["\']',
        content, re.IGNORECASE):
        path = m.group(1).lstrip("/")
        if not (OUTPUT_DIR / path).exists():
            missing.add("https://www.khazrajiaudit.com/" + path)

urls = sorted(missing)
print(f"Downloading {len(urls)} missing CSS/JS/font files...")

with ThreadPoolExecutor(max_workers=WORKERS) as pool:
    futs = {pool.submit(download, u, i+1, len(urls)): u for i, u in enumerate(urls)}
    for f in as_completed(futs):
        pass

print(f"\nDone. Success: {success[0]}, Failed: {len(failed)}")
if failed:
    print("Still missing:")
    for f in failed[:20]:
        print(" ", f)
