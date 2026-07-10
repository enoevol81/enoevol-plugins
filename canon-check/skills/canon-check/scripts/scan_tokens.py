#!/usr/bin/env python3
"""Deterministic first pass for Canon Check: tallies colors, spacing-like
numeric values, and font-family declarations across a repo, with file
locations, so the frequency counting doesn't have to be done by eye.

Usage:
    python scan_tokens.py <repo-root> [--out canon-scan.json] [--top 30]
"""

import argparse
import json
import os
import re
import sys

SKIP_DIRS = {
    ".git", "node_modules", "dist", "build", ".next", "venv", ".venv",
    "__pycache__", "vendor", ".cache", "coverage", "out", ".turbo",
}

SCAN_EXTENSIONS = {
    ".css", ".scss", ".less", ".sass",
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    ".json", ".yml", ".yaml",
    ".md", ".mdx",
}

HEX_COLOR_RE = re.compile(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b")
FUNC_COLOR_RE = re.compile(r"\b(?:rgba?|hsla?)\([^)]{0,60}\)")
SPACING_RE = re.compile(r"\b\d+(?:\.\d+)?(?:px|rem|em)\b")
FONT_FAMILY_RE = re.compile(r"font-family\s*:\s*([^;\"'}\n]+)", re.IGNORECASE)


def iter_files(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]
        for name in filenames:
            ext = os.path.splitext(name)[1].lower()
            if ext in SCAN_EXTENSIONS:
                yield os.path.join(dirpath, name)


def record(bucket, value, rel_path):
    entry = bucket.setdefault(value, {"count": 0, "files": set()})
    entry["count"] += 1
    entry["files"].add(rel_path)


def finalize(bucket, top_n):
    items = sorted(bucket.items(), key=lambda kv: kv[1]["count"], reverse=True)
    truncated = max(0, len(items) - top_n)
    shown = items[:top_n]
    return {
        "truncated_count": truncated,
        "values": [
            {
                "value": value,
                "count": data["count"],
                "files": sorted(data["files"])[:10],
                "file_count": len(data["files"]),
            }
            for value, data in shown
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", help="Repo root to scan")
    parser.add_argument("--out", default=None, help="Write JSON to this file (default: stdout)")
    parser.add_argument("--top", type=int, default=30, help="Max distinct values to report per category")
    args = parser.parse_args()

    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        print(f"error: {root} is not a directory", file=sys.stderr)
        sys.exit(1)

    colors = {}
    spacing = {}
    fonts = {}
    scanned = 0
    skipped_unreadable = 0

    for path in iter_files(root):
        rel = os.path.relpath(path, root).replace(os.sep, "/")
        try:
            with open(path, "r", encoding="utf-8", errors="strict") as f:
                text = f.read()
        except (UnicodeDecodeError, OSError):
            skipped_unreadable += 1
            continue
        scanned += 1

        for match in HEX_COLOR_RE.findall(text):
            record(colors, match.lower(), rel)
        for match in FUNC_COLOR_RE.findall(text):
            record(colors, re.sub(r"\s+", " ", match.strip()), rel)
        for match in SPACING_RE.findall(text):
            record(spacing, match, rel)
        for match in FONT_FAMILY_RE.findall(text):
            record(fonts, match.strip().rstrip(","), rel)

    result = {
        "root": root,
        "files_scanned": scanned,
        "files_skipped_unreadable": skipped_unreadable,
        "colors": finalize(colors, args.top),
        "spacing": finalize(spacing, args.top),
        "fonts": finalize(fonts, args.top),
    }

    output = json.dumps(result, indent=2)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"Scanned {scanned} files ({skipped_unreadable} unreadable/skipped). Wrote {args.out}")
    else:
        print(output)


if __name__ == "__main__":
    main()
