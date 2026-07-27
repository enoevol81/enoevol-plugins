#!/usr/bin/env python3
"""Deterministic first pass for Canon Check: tallies colors, spacing-like
numeric values, and font-family declarations across a repo, with file
locations, so the frequency counting doesn't have to be done by eye.

Zero dependencies, cross-platform (paths are normalized to forward slashes
in output regardless of OS). Binary files are skipped; text files with
legacy encodings (e.g. cp1252 on Windows) are still scanned leniently
rather than dropped. The scan is bounded: files over --max-bytes and files
beyond --max-files are skipped and *counted*, never silently dropped —
check "scan_complete" in the output before treating counts as exhaustive.

Values are ranked by file spread (how many distinct files a value appears
in) before raw count, because repetition across independent files is the
signal that a value became canon.

Usage:
    python scan_tokens.py <repo-root> [--out canon-scan.json] [--top 30]
                          [--max-files 5000] [--max-bytes 1000000]

Exit codes: 0 = scan ran (even if it found nothing); 1 = bad arguments.
"""

import argparse
import json
import os
import re
import sys

SKIP_DIRS = {
    ".git", "node_modules", "dist", "build", ".next", "venv", ".venv",
    "__pycache__", "vendor", ".cache", "coverage", "out", ".turbo",
    "bower_components", "Pods", "target",
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
    for dirpath, dirnames, filenames in os.walk(root, onerror=None):
        dirnames[:] = sorted(
            d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")
        )
        for name in sorted(filenames):
            ext = os.path.splitext(name)[1].lower()
            if ext in SCAN_EXTENSIONS:
                yield os.path.join(dirpath, name)


def read_text(path, max_bytes):
    """Return file text, or None for binary/oversized/unreadable files.

    Sniffs for NUL bytes to reject binaries, then decodes UTF-8 leniently so
    legacy-encoded files (common on Windows) still yield their ASCII tokens
    instead of being dropped wholesale.
    """
    try:
        size = os.path.getsize(path)
        if size > max_bytes:
            return "too_large"
        with open(path, "rb") as f:
            raw = f.read()
    except OSError:
        return None
    if b"\x00" in raw[:1024]:
        return None
    return raw.decode("utf-8", errors="replace")


def record(bucket, value, rel_path):
    entry = bucket.setdefault(value, {"count": 0, "files": set()})
    entry["count"] += 1
    entry["files"].add(rel_path)


def finalize(bucket, top_n):
    items = sorted(
        bucket.items(),
        key=lambda kv: (-len(kv[1]["files"]), -kv[1]["count"], kv[0]),
    )
    truncated = max(0, len(items) - top_n)
    shown = items[:top_n]
    return {
        "truncated_count": truncated,
        "values": [
            {
                "value": value,
                "count": data["count"],
                "file_count": len(data["files"]),
                "files": sorted(data["files"])[:10],
            }
            for value, data in shown
        ],
    }


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("root", help="Repo root to scan")
    parser.add_argument("--out", default=None, help="Write JSON to this file (default: stdout)")
    parser.add_argument("--top", type=int, default=30, help="Max distinct values to report per category")
    parser.add_argument("--max-files", type=int, default=5000,
                        help="Stop scanning after this many files (reported, not silent)")
    parser.add_argument("--max-bytes", type=int, default=1_000_000,
                        help="Skip files larger than this many bytes (reported, not silent)")
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
    skipped_large = 0
    hit_file_cap = False

    for path in iter_files(root):
        if scanned >= args.max_files:
            hit_file_cap = True
            break
        rel = os.path.relpath(path, root).replace(os.sep, "/")
        text = read_text(path, args.max_bytes)
        if text is None:
            skipped_unreadable += 1
            continue
        if text == "too_large":
            skipped_large += 1
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

    total_values = sum(len(b) for b in (colors, spacing, fonts))
    result = {
        "root": root,
        "files_scanned": scanned,
        "files_skipped_unreadable": skipped_unreadable,
        "files_skipped_large": skipped_large,
        "scan_complete": not hit_file_cap,
        "colors": finalize(colors, args.top),
        "spacing": finalize(spacing, args.top),
        "fonts": finalize(fonts, args.top),
    }
    if not hit_file_cap and total_values == 0:
        result["note"] = (
            "No color, spacing, or font-family tokens found in any scanned "
            "file — likely a greenfield repo with no design canon yet, or the "
            "design surface lives outside the scanned extensions."
        )
    if hit_file_cap:
        result["note"] = (
            f"Scan stopped at --max-files={args.max_files}; counts are a "
            "lower bound, not exhaustive. Re-run with a higher --max-files "
            "or point the scan at a subdirectory."
        )

    output = json.dumps(result, indent=2)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(output)
        print(
            f"Scanned {scanned} files "
            f"({skipped_unreadable} binary/unreadable, {skipped_large} over size cap"
            f"{', file cap hit' if hit_file_cap else ''}). Wrote {args.out}"
        )
    else:
        print(output)


if __name__ == "__main__":
    main()
