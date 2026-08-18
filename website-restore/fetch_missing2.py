#!/usr/bin/env python3
"""Download missing CSS/JS/font files using the best available Wayback timestamp per file."""

import re, os, subprocess, urllib.parse, json, time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

OUTPUT_DIR   = Path("/Users/asterantony/khazrajiaudit.com")
WAYBACK_BASE = "https://web.archive.org/web"
AVAIL_API    = "https://archive.org/wayback/available"
CURL         = "/opt/homebrew/opt/curl/bin/curl"
WORKERS      = 4

_lock   = Lock()
success = [0]
failed  = []

def curl_get(url, timeout=30):
    for attempt in range(3):
        try:
            r = subprocess.run(
                [CURL, "-sL", "--max-time", str(timeout),
                 "-H", "User-Agent: Mozilla/5.0", url],
                capture_output=True, timeout=timeout + 5)
            if r.returncode == 0 and r.stdout:
                return r.stdout
            time.sleep(2 * (attempt + 1))
        except Exception:
            time.sleep(2)
    return None

def best_timestamp(url):
    params = urllib.parse.urlencode({"url": url})
    data = curl_get(f"{AVAIL_API}?{params}", timeout=15)
    if data:
        try:
            snap = json.loads(data).get("archived_snapshots", {}).get("closest", {})
            if snap.get("available"):
                return snap["timestamp"]
        except Exception:
            pass
    return None

def local_path(url):
    path = urllib.parse.urlparse(url).path.lstrip("/")
    return OUTPUT_DIR / path

def download(url, idx, total):
    dest = local_path(url)
    if dest.exists():
        return True

    ts = best_timestamp(url)
    if not ts:
        print(f"  [SKIP {idx}/{total}] not in archive: {url.split('/')[-1]}")
        with _lock:
            failed.append(url)
        return False

    wb_url = f"{WAYBACK_BASE}/{ts}/{url}"
    print(f"  [{idx}/{total}] ts={ts} {url.split('khazrajiaudit.com/')[-1]}")
    data = curl_get(wb_url, timeout=45)
    if not data:
        with _lock:
            failed.append(url)
        return False

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    with _lock:
        success[0] += 1
    return True

# Collect all missing wp-content CSS/JS/font URLs
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
print(f"Fetching best timestamps and downloading {len(urls)} missing files...")

with ThreadPoolExecutor(max_workers=WORKERS) as pool:
    futs = {pool.submit(download, u, i+1, len(urls)): u for i, u in enumerate(urls)}
    for f in as_completed(futs):
        pass

print(f"\nDone. Success: {success[0]}, Not in archive: {len(failed)}")
