#!/usr/bin/env python3
"""Download all missing images from HTML files using Wayback Machine."""

import re, json, subprocess, urllib.parse, time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

OUTPUT_DIR   = Path("/Users/asterantony/khazrajiaudit.com")
TIMESTAMP    = "20260311132951"
WAYBACK_BASE = "https://web.archive.org/web"
AVAIL_API    = "https://archive.org/wayback/available"
CURL         = "/opt/homebrew/opt/curl/bin/curl"
WORKERS      = 6

_lock   = Lock()
success = [0]
failed  = []

def curl_get(url, timeout=45):
    for attempt in range(2):
        try:
            r = subprocess.run(
                [CURL, "-sL", "--max-time", str(timeout),
                 "-H", "User-Agent: Mozilla/5.0", url],
                capture_output=True, timeout=timeout + 5)
            if r.returncode == 0 and r.stdout:
                return r.stdout
            time.sleep(2)
        except Exception:
            time.sleep(2)
    return None

def best_ts(url):
    r = subprocess.run([CURL, "-s", "--max-time", "15",
        f"{AVAIL_API}?url={urllib.parse.quote(url, safe=':/')}"],
        capture_output=True)
    try:
        snap = json.loads(r.stdout).get("archived_snapshots", {}).get("closest", {})
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
    if dest.exists() and dest.stat().st_size > 100:
        return True

    # Try 2026 snapshot first, then best available
    data = curl_get(f"{WAYBACK_BASE}/{TIMESTAMP}/{url}", timeout=45)
    if not data or len(data) < 100:
        ts = best_ts(url)
        if ts:
            data = curl_get(f"{WAYBACK_BASE}/{ts}/{url}", timeout=45)

    if not data or len(data) < 100:
        with _lock:
            failed.append(url)
        print(f"  [FAIL {idx}/{total}] {url.split('/')[-1]}")
        return False

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    with _lock:
        success[0] += 1
    if success[0] % 20 == 0:
        print(f"  [+{success[0]}] downloaded so far")
    return True

# Collect all image URLs from all HTML files
IMG_RE = re.compile(
    r'(?:src|href|data-src|content)=["\']'
    r'(/wp-content/uploads/[^"\'?#]+\.(?:jpg|jpeg|png|webp|gif|svg|ico))',
    re.IGNORECASE
)

images = set()
for html in OUTPUT_DIR.rglob("*.html"):
    content = html.read_text(encoding="utf-8", errors="ignore")
    for m in IMG_RE.finditer(content):
        path = m.group(1).lstrip("/")
        if not (OUTPUT_DIR / path).exists():
            images.add("https://www.khazrajiaudit.com/" + path)

# Also check CSS files for background images
CSS_IMG_RE = re.compile(r'url\(["\']?(/wp-content/uploads/[^"\')?#]+)["\']?\)', re.IGNORECASE)
for css in OUTPUT_DIR.rglob("*.css"):
    try:
        content = css.read_text(encoding="utf-8", errors="ignore")
        for m in CSS_IMG_RE.finditer(content):
            path = m.group(1).lstrip("/")
            if not (OUTPUT_DIR / path).exists():
                images.add("https://www.khazrajiaudit.com/" + path)
    except Exception:
        pass

urls = sorted(images)
print(f"Missing images to download: {len(urls)}")

with ThreadPoolExecutor(max_workers=WORKERS) as pool:
    futs = {pool.submit(download, u, i+1, len(urls)): u for i, u in enumerate(urls)}
    for f in as_completed(futs):
        pass

print(f"\nDone. Downloaded: {success[0]}, Failed: {len(failed)}")
if failed:
    (OUTPUT_DIR / "_failed_images.txt").write_text("\n".join(failed))
    print(f"Failed images saved to _failed_images.txt")
