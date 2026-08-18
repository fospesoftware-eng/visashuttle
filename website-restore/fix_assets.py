#!/usr/bin/env python3
"""
Fix asset filename/URL mismatch.
Files were saved as: style_ver=6_9_1.css
HTML requests them as: style.css?ver=6.9.1
Fix: rename files to strip query suffix, update HTML to strip ?query from asset URLs.
"""

import re, os, shutil
from pathlib import Path

OUTPUT_DIR = Path("/Users/asterantony/khazrajiaudit.com")

# ── Step 1: Rename asset files (CSS, JS, images, fonts) ──────────────────────
# Pattern: anything_ver=x_y_z.ext  →  anything.ext
QSUFFIX = re.compile(r'(_ver=|_v=|_rev=|_id=)[^.]+(\.\w+)$', re.IGNORECASE)

renamed = 0
conflicts = 0

asset_exts = {'.css','.js','.png','.jpg','.jpeg','.gif','.webp','.svg',
              '.woff','.woff2','.ttf','.eot','.ico','.map'}

for f in OUTPUT_DIR.rglob('*'):
    if f.is_file() and f.suffix.lower() in asset_exts:
        m = QSUFFIX.search(f.name)
        if m:
            new_name = f.name[:m.start()] + m.group(2)
            new_path = f.parent / new_name
            if new_path.exists():
                # keep the existing file (whichever came first is fine for CSS cache-busters)
                conflicts += 1
            else:
                f.rename(new_path)
                renamed += 1

print(f"[rename] Renamed {renamed} files, {conflicts} conflicts (kept existing)")

# ── Step 2: Fix HTML — strip ?query from CSS/JS/image hrefs/srcs ─────────────
ASSET_QUERY_RE = re.compile(
    r'((?:href|src)=["\'])([^"\']*?\.(?:css|js|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot|ico))\?[^"\']*(["\'])',
    re.IGNORECASE
)

html_files = list(OUTPUT_DIR.rglob('*.html'))
fixed_html = 0
for path in html_files:
    try:
        content = path.read_text(encoding='utf-8', errors='ignore')
        new_content = ASSET_QUERY_RE.sub(r'\1\2\3', content)
        if new_content != content:
            path.write_text(new_content, encoding='utf-8')
            fixed_html += 1
    except Exception as e:
        print(f"  Error {path}: {e}")

print(f"[html]   Fixed query strings in {fixed_html}/{len(html_files)} HTML files")
print("Done.")
