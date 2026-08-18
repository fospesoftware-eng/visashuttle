#!/usr/bin/env python3
"""Fix all HTML files: remove Wayback scripts, rewrite archive URLs to local paths."""

import re
from pathlib import Path

OUTPUT_DIR = Path("/Users/asterantony/khazrajiaudit.com")

WAYBACK_URL_RE = re.compile(
    r'(?:https?://web\.archive\.org)?/web/\d+[a-z_*]*/'
    r'(?:https?://(?:www\.)?khazrajiaudit\.com)?/?',
    re.IGNORECASE
)

ARCHIVE_STATIC_RE = re.compile(
    r'<(?:script|link)[^>]*(?:src|href)=["\']https?://web-static\.archive\.org[^>]*>',
    re.IGNORECASE
)

WAYBACK_TOOLBAR_RE = re.compile(
    r'<!-- BEGIN WAYBACK.*?END WAYBACK[^>]*-->',
    re.DOTALL
)

WAYBACK_DIV_RE = re.compile(
    r'<div[^>]+id=["\'](?:wm-ipp-base|donato)["\'][^>]*>.*?</div>\s*',
    re.DOTALL | re.IGNORECASE
)

def fix_html(content: str) -> str:
    # Remove Wayback static asset scripts/links
    content = ARCHIVE_STATIC_RE.sub('', content)
    # Remove toolbar comment blocks
    content = WAYBACK_TOOLBAR_RE.sub('', content)
    # Remove toolbar divs
    content = WAYBACK_DIV_RE.sub('', content)
    # Rewrite /web/TIMESTAMP.../http://khazrajiaudit.com/path -> /path
    content = WAYBACK_URL_RE.sub('/', content)
    # Clean up double slashes that aren't protocol slashes
    content = re.sub(r'(?<!:)//', '/', content)
    return content

html_files = list(OUTPUT_DIR.rglob("*.html"))
print(f"Fixing {len(html_files)} HTML files...")

for i, path in enumerate(html_files):
    try:
        original = path.read_text(encoding="utf-8", errors="ignore")
        fixed = fix_html(original)
        if fixed != original:
            path.write_text(fixed, encoding="utf-8")
    except Exception as e:
        print(f"  Error {path}: {e}")
    if (i + 1) % 100 == 0:
        print(f"  [{i+1}/{len(html_files)}] done")

print(f"Done. Fixed {len(html_files)} files.")
