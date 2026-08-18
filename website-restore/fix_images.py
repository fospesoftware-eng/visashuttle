#!/usr/bin/env python3
"""
1. Rewrite ShortPixel CDN URLs in HTML back to local /wp-content/uploads/... paths
2. Download the actual original images from Wayback Machine
"""

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

# Pattern: ShortPixel CDN URL containing the real image URL
SP_RE = re.compile(
    r'https?://sp-ao\.shortpixel\.ai/client/[^/]+/(https?://(?:www\.)?khazrajiaudit\.com(/wp-content/uploads/[^"\')\s>]+))',
    re.IGNORECASE
)

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
            if r.returncode == 0 and r.stdout and len(r.stdout) > 200:
                return r.stdout
            time.sleep(2)
        except Exception:
            time.sleep(2)
    return None

def download_image(orig_url, local_path):
    if local_path.exists() and local_path.stat().st_size > 200:
        return True
    data = curl_get(f"{WAYBACK_BASE}/{TIMESTAMP}/{orig_url}")
    if not data:
        # try best available timestamp
        r = subprocess.run([CURL, "-s", "--max-time", "15",
            f"{AVAIL_API}?url={urllib.parse.quote(orig_url, safe=':/')}"],
            capture_output=True)
        try:
            snap = json.loads(r.stdout).get("archived_snapshots", {}).get("closest", {})
            if snap.get("available"):
                data = curl_get(f"{WAYBACK_BASE}/{snap['timestamp']}/{orig_url}")
        except Exception:
            pass
    if data and len(data) > 200:
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_bytes(data)
        with _lock:
            success[0] += 1
        return True
    with _lock:
        failed.append(orig_url)
    return False

# Step 1: Collect all ShortPixel → original URL mappings
print("Scanning HTML for ShortPixel CDN URLs...")
to_download = {}  # local_path -> orig_url

html_files = list(OUTPUT_DIR.rglob("*.html"))
for html_file in html_files:
    content = html_file.read_text(encoding="utf-8", errors="ignore")
    for m in SP_RE.finditer(content):
        orig_url = m.group(1)
        local_rel = m.group(2).lstrip("/")
        local_p = OUTPUT_DIR / local_rel
        if not local_p.exists():
            to_download[str(local_p)] = orig_url

print(f"Found {len(to_download)} unique images to download")

# Step 2: Download images
with ThreadPoolExecutor(max_workers=WORKERS) as pool:
    futs = {pool.submit(download_image, orig, Path(lp)): orig
            for lp, orig in to_download.items()}
    done = 0
    for f in as_completed(futs):
        done += 1
        if done % 20 == 0:
            print(f"  [{done}/{len(to_download)}] {success[0]} ok, {len(failed)} failed")

print(f"\nImages downloaded: {success[0]}, Failed: {len(failed)}")

# Step 3: Rewrite ShortPixel URLs in all HTML files to local paths
print("\nRewriting ShortPixel CDN URLs in HTML files...")
rewritten = 0
for html_file in html_files:
    content = html_file.read_text(encoding="utf-8", errors="ignore")
    new_content = SP_RE.sub(lambda m: m.group(2), content)
    if new_content != content:
        html_file.write_text(new_content, encoding="utf-8")
        rewritten += 1

print(f"Rewrote {rewritten} HTML files")
print("Done.")
