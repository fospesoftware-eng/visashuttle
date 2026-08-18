#!/usr/bin/env python3
"""Retry failed URLs with lower concurrency to avoid Wayback Machine throttling."""

import os, re, json, subprocess, urllib.parse, time, sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

try:
    from bs4 import BeautifulSoup
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'beautifulsoup4', 'lxml'])
    from bs4 import BeautifulSoup

OUTPUT_DIR   = Path("/Users/asterantony/khazrajiaudit.com")
WAYBACK_BASE = "https://web.archive.org/web"
CURL         = "/opt/homebrew/opt/curl/bin/curl"
WORKERS      = 3

_lock   = Lock()
success = [0]
failed  = []

def curl_get(url: str, timeout: int = 60):
    for attempt in range(3):
        try:
            r = subprocess.run(
                [CURL, "-sL", "--max-time", str(timeout),
                 "-H", "User-Agent: Mozilla/5.0 (compatible; site-restorer/1.0)",
                 url],
                capture_output=True, timeout=timeout + 5
            )
            if r.returncode == 0 and r.stdout:
                return r.stdout
            if attempt < 2:
                time.sleep(3 * (attempt + 1))
        except Exception:
            if attempt < 2:
                time.sleep(3)
    return None

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
    for tag in soup.find_all(True):
        for attr in ("href", "src", "action", "data-src"):
            val = tag.get(attr, "")
            if val:
                cleaned = re.sub(r'https?://web\.archive\.org/web/\d+[a-z_*]?/', '', val)
                if cleaned != val:
                    tag[attr] = cleaned
    result = str(soup)
    result = re.sub(r'<!-- BEGIN WAYBACK.*?END WAYBACK[^>]*-->', '', result, flags=re.DOTALL)
    return result

def download_one(orig: str, ts: str, idx: int, total: int) -> bool:
    dest = local_path(orig)
    if dest.exists():
        print(f"  [skip {idx}/{total}] {orig}")
        return True

    wb_url = f"{WAYBACK_BASE}/{ts}/{orig}"
    print(f"  [dl  {idx}/{total}] {orig}")
    data = curl_get(wb_url, timeout=60)

    if not data:
        with _lock:
            failed.append(orig)
        print(f"  [FAIL {idx}/{total}] {orig}")
        return False

    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        text = data.decode("utf-8", errors="ignore")
        if text.lstrip()[:50].lower().startswith(("<!do", "<htm", "<!-")):
            dest.write_text(rewrite_html(text), encoding="utf-8")
        else:
            dest.write_bytes(data)
        with _lock:
            success[0] += 1
        return True
    except Exception as e:
        with _lock:
            failed.append(orig)
        return False

def main():
    failed_file = OUTPUT_DIR / "_failed.txt"
    urls_file   = OUTPUT_DIR / "_urls.json"

    if not failed_file.exists():
        print("No _failed.txt found — nothing to retry.")
        return

    failed_urls = [l.strip() for l in failed_file.read_text().splitlines() if l.strip()]
    print(f"Retrying {len(failed_urls)} failed URLs with {WORKERS} workers...")

    # Build timestamp lookup from CDX cache
    ts_map = {}
    if urls_file.exists():
        for row in json.loads(urls_file.read_text()):
            if isinstance(row, dict):
                ts_map[row.get("original", "")] = row.get("timestamp", "20260311132951")

    tasks = [(url, ts_map.get(url, "20260311132951"), i+1, len(failed_urls))
             for i, url in enumerate(failed_urls)]

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs = {pool.submit(download_one, *t): t[0] for t in tasks}
        for fut in as_completed(futs):
            pass

    print(f"\n{'='*60}")
    print(f"Retry done. Success: {success[0]}, Still failed: {len(failed)}")

    if failed:
        failed_file.write_text("\n".join(failed))
        print(f"Still failing: {failed_file}")
    else:
        failed_file.unlink(missing_ok=True)
        print("All previously failed URLs now downloaded!")

if __name__ == "__main__":
    main()
