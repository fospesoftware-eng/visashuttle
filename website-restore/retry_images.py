#!/usr/bin/env python3
"""Retry failed images — try multiple timestamps, validate by magic bytes."""

import re, json, subprocess, urllib.parse, time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

OUTPUT_DIR   = Path("/Users/asterantony/khazrajiaudit.com")
WAYBACK_BASE = "https://web.archive.org/web"
AVAIL_API    = "https://archive.org/wayback/available"
CURL         = "/opt/homebrew/opt/curl/bin/curl"
WORKERS      = 3

IMG_MAGIC = [b'\xff\xd8', b'\x89PNG', b'GIF8', b'RIFF', b'<svg', b'WEBP', b'\x00\x00\x01\x00']

def is_image(data: bytes) -> bool:
    if not data or len(data) < 100:
        return False
    for magic in IMG_MAGIC:
        if data[:len(magic)] == magic:
            return True
    # webp: starts with RIFF....WEBP
    if len(data) > 12 and data[8:12] == b'WEBP':
        return True
    return False

_lock   = Lock()
success = [0]
still_failed = []

def curl_get(url, timeout=45):
    try:
        r = subprocess.run(
            [CURL, "-sL", "--max-time", str(timeout),
             "-H", "User-Agent: Mozilla/5.0", url],
            capture_output=True, timeout=timeout + 5)
        if r.returncode == 0:
            return r.stdout
    except Exception:
        pass
    return None

def get_timestamps(url):
    """Get all available timestamps for a URL from CDX."""
    params = urllib.parse.urlencode({
        "url": url, "output": "json", "fl": "timestamp",
        "filter": "statuscode:200", "limit": "5",
        "from": "20210101", "to": "20261231",
    })
    r = subprocess.run([CURL, "-s", "--max-time", "20",
        f"https://web.archive.org/cdx/search/cdx?{params}"], capture_output=True)
    try:
        rows = json.loads(r.stdout)
        return [row[0] for row in rows[1:]] if len(rows) > 1 else []
    except Exception:
        return []

def download(url, idx, total):
    path = urllib.parse.urlparse(url).path.lstrip("/")
    dest = OUTPUT_DIR / path
    if dest.exists() and dest.stat().st_size > 500 and is_image(dest.read_bytes()[:20]):
        return True

    # Try direct 2026 timestamp first
    for ts in ["20260311132951", "20251201000000", "20240101000000"]:
        data = curl_get(f"{WAYBACK_BASE}/{ts}/{url}")
        if is_image(data):
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            with _lock:
                success[0] += 1
            return True

    # Try CDX to find actual timestamps
    timestamps = get_timestamps(url)
    for ts in timestamps:
        data = curl_get(f"{WAYBACK_BASE}/{ts}/{url}")
        if is_image(data):
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            with _lock:
                success[0] += 1
            return True

    print(f"  [FAIL {idx}/{total}] {url.split('/')[-1]}")
    with _lock:
        still_failed.append(url)
    return False

failed_file = OUTPUT_DIR / "_failed_images.txt"
if not failed_file.exists():
    print("No _failed_images.txt found.")
    exit()

urls = [l.strip() for l in failed_file.read_text().splitlines() if l.strip()]
print(f"Retrying {len(urls)} failed images with {WORKERS} workers...")

with ThreadPoolExecutor(max_workers=WORKERS) as pool:
    futs = {pool.submit(download, u, i+1, len(urls)): u for i, u in enumerate(urls)}
    done = 0
    for f in as_completed(futs):
        done += 1
        if done % 50 == 0:
            print(f"  [{done}/{len(urls)}] {success[0]} ok so far")

print(f"\nDone. Recovered: {success[0]}, Still missing: {len(still_failed)}")
failed_file.write_text("\n".join(still_failed))
