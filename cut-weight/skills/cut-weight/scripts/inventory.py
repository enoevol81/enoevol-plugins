#!/usr/bin/env python3
"""Inventory a project tree for cut-weight analysis. Stdlib only.

Produces a JSON inventory with, per file: size, age on two clocks (mtime and
git last-touch), tracked/untracked status, and name-pattern signals. Known
regenerable-artifact directories are summarized as single entries instead of
walked file-by-file. Output is ASCII-only.

Usage:
  python inventory.py [root] [--out inventory.json] [--max-commits 500]

Exit code 0 on success. Prints a short ASCII summary table to stdout; the
full data goes to the JSON file.
"""
import argparse
import json
import os
import subprocess
import sys
import time

ARTIFACT_DIRS = {
    "node_modules", "dist", "build", "out", ".next", ".nuxt", "coverage",
    ".nyc_output", "htmlcov", "__pycache__", ".pytest_cache", ".venv",
    "venv", ".cache", ".vite", ".turbo", ".parcel-cache",
    "playwright-report", "test-results", ".mypy_cache", ".ruff_cache",
}
SKIP_DIRS = {".git"}

NAME_SIGNAL_SUFFIXES = (".bak", ".old", ".orig", ".tmp", "~")
NAME_SIGNAL_PARTS = (
    "-copy", " copy", "_old", "-old", "_v1", "_v2", "-v1", "-v2",
    "scratch", "deprecated", "archive", "wip",
)
NAME_SIGNAL_PREFIXES = ("tmp-", "temp-", "debug-", "old-", "bak-")


def name_signals(name):
    low = name.lower()
    sig = []
    if low.endswith(NAME_SIGNAL_SUFFIXES):
        sig.append("backup-suffix")
    if any(p in low for p in NAME_SIGNAL_PARTS):
        sig.append("stale-word")
    if low.startswith(NAME_SIGNAL_PREFIXES):
        sig.append("scratch-prefix")
    return sig


def run_git(root, args):
    try:
        r = subprocess.run(
            ["git", "-C", root] + args,
            capture_output=True, text=True, encoding="utf-8",
            errors="replace", timeout=120,
        )
        return r.stdout if r.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired):
        return None


def git_data(root, max_commits):
    """Return (tracked_set, last_touch_dict, commits_scanned, truncated)."""
    ls = run_git(root, ["ls-files", "-z"])
    if ls is None:
        return None, {}, 0, False
    tracked = {p.replace("\\", "/") for p in ls.split("\0") if p}

    # git log prints paths relative to the repo root even when run in a
    # subdirectory; strip the prefix so keys match our cwd-relative paths.
    prefix = (run_git(root, ["rev-parse", "--show-prefix"]) or "").strip()

    log = run_git(root, [
        "log", "--format=%x01%ct", "--name-only",
        "--max-count=%d" % max_commits, "--", ".",
    ])
    last_touch = {}
    commits = 0
    if log:
        ts = None
        for line in log.splitlines():
            if line.startswith("\x01"):
                ts = int(line[1:])
                commits += 1
            elif line.strip():
                p = line.strip().replace("\\", "/")
                if prefix and p.startswith(prefix):
                    p = p[len(prefix):]
                if p not in last_touch and ts is not None:
                    last_touch[p] = ts
    return tracked, last_touch, commits, commits >= max_commits


def dir_stats(path):
    total, count = 0, 0
    for dp, _dn, fns in os.walk(path):
        for fn in fns:
            try:
                total += os.path.getsize(os.path.join(dp, fn))
                count += 1
            except OSError:
                pass
    return total, count


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root", nargs="?", default=".")
    ap.add_argument("--out", default="inventory.json")
    ap.add_argument("--max-commits", type=int, default=500)
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    now = time.time()
    tracked, last_touch, commits, truncated = git_data(root, args.max_commits)

    files, artifacts = [], []
    for dp, dns, fns in os.walk(root):
        pruned = []
        for d in list(dns):
            if d in SKIP_DIRS:
                dns.remove(d)
            elif d in ARTIFACT_DIRS:
                dns.remove(d)
                pruned.append(d)
        for d in pruned:
            full = os.path.join(dp, d)
            size, count = dir_stats(full)
            rel = os.path.relpath(full, root).replace("\\", "/")
            artifacts.append({
                "path": rel + "/", "bytes": size, "files": count,
                "verdict_hint": "regenerable-artifact",
            })
        for fn in fns:
            full = os.path.join(dp, fn)
            rel = os.path.relpath(full, root).replace("\\", "/")
            try:
                st = os.stat(full)
            except OSError:
                continue
            gt = last_touch.get(rel)
            files.append({
                "path": rel,
                "bytes": st.st_size,
                "mtime_days": round((now - st.st_mtime) / 86400, 1),
                "git_last_touch_days":
                    round((now - gt) / 86400, 1) if gt else None,
                "tracked": (rel in tracked) if tracked is not None else None,
                "signals": name_signals(fn),
            })

    files.sort(key=lambda f: f["path"])
    report = {
        "root": root,
        "generated_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
        "git": {
            "available": tracked is not None,
            "commits_scanned": commits,
            "history_truncated": truncated,
            "note": ("history scanned to %d commits; files with "
                     "git_last_touch_days=null were not touched in that "
                     "window (older, or untracked)" % commits)
                    if truncated else None,
        },
        "artifact_dirs": artifacts,
        "files": files,
    }
    out = os.path.join(root, args.out) if not os.path.isabs(args.out) else args.out
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    flagged = [f for f in files if f["signals"]]
    art_bytes = sum(a["bytes"] for a in artifacts)
    print("cut-weight inventory: %s" % root)
    print("  files inventoried : %d" % len(files))
    print("  artifact dirs     : %d (%.1f MB regenerable)"
          % (len(artifacts), art_bytes / 1e6))
    print("  name-signal files : %d" % len(flagged))
    print("  git               : %s" % (
        "%d commits scanned%s" % (commits, " [TRUNCATED - see note in JSON]"
                                  if truncated else "")
        if tracked is not None else "not a git repo"))
    print("  full data -> %s" % out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
