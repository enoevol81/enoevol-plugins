#!/usr/bin/env python3
"""Inventory a project tree for cut-weight analysis. Stdlib only.

Produces a JSON inventory with, per file: size, age on two clocks (mtime and
git last-touch), tracked/untracked status, and name-pattern signals. Known
regenerable-artifact directories are summarized as single entries instead of
walked file-by-file. Protected paths (.git/, _quarantine/) are never listed
as candidate files. Unreadable directories and broken symlinks are reported,
not silently skipped. Output is ASCII-only.

Usage:
  python inventory.py [root] [--out inventory.json] [--max-commits 500]
                      [--max-files 200000]

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
# Never walked, never candidates: git internals and the quarantine buffer
# (a prior run's quarantined files must not be re-classified as cuttable).
PROTECTED_DIRS = {".git", "_quarantine"}

NAME_SIGNAL_SUFFIXES = (".bak", ".old", ".orig", ".tmp", "~")
NAME_SIGNAL_PARTS = (
    "-copy", " copy", "_old", "-old", "_v1", "_v2", "-v1", "-v2",
    "scratch", "deprecated", "archive", "wip",
)
NAME_SIGNAL_PREFIXES = ("tmp-", "temp-", "debug-", "old-", "bak-")

# --- Agent / AI-tooling artifacts (handled by the Phase 2.5 gate, not the
# cut/quarantine matrix). Detection is a curated, defensible set -- the skill's
# reference doc carries judgment for plugin-specific droppings this misses.
AGENT_CANONICAL_NAMES = {
    "claude.md", "agents.md", "agent.md", "gemini.md",
    ".cursorrules", ".windsurfrules", ".clinerules", ".goosehints",
    ".aider.conf.yml",
}
AGENT_CANONICAL_PATHS = {".github/copilot-instructions.md"}
AGENT_CANONICAL_DIR_PREFIXES = (".cursor/rules/",)
AGENT_DROPPING_NAMES = {".aider.chat.history.md", ".aider.input.history"}
AGENT_DROPPING_NAME_PREFIXES = (".aider.tags.cache",)
AGENT_CONFIG_DIR_PREFIXES = (".claude/",)  # note: NOT .claude-plugin/
AGENT_DROPPING_DIRS = {".specstory"}


def agent_category(rel, name):
    """Classify a path as an agent artifact, or None. rel is root-relative."""
    low = name.lower()
    rl = rel.lower()
    if (low in AGENT_CANONICAL_NAMES or rl in AGENT_CANONICAL_PATHS
            or rl.startswith(AGENT_CANONICAL_DIR_PREFIXES)):
        return "canonical"
    if low in AGENT_DROPPING_NAMES or low.startswith(AGENT_DROPPING_NAME_PREFIXES):
        return "tool-dropping"
    if low == "settings.local.json" and rl.startswith(".claude/"):
        return "tool-dropping"  # per-machine overrides, should not be committed
    if rl.startswith(AGENT_CONFIG_DIR_PREFIXES):
        return "agent-config"
    return None


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
            ["git", "-C", root, "-c", "core.quotepath=off"] + args,
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
    # subdirectory; strip the prefix so keys match our root-relative paths.
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
    ap.add_argument("--max-files", type=int, default=200000,
                    help="stop inventorying after this many files "
                         "(the JSON says so if the cap is hit)")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        print("error: not a directory: %s" % root, file=sys.stderr)
        return 2
    out = args.out if os.path.isabs(args.out) else os.path.join(root, args.out)
    out = os.path.abspath(out)
    now = time.time()
    tracked, last_touch, commits, truncated = git_data(root, args.max_commits)

    files, artifacts, agent_dirs = [], [], []
    protected, errors = [], []
    files_capped = False

    def on_walk_error(err):
        # Unreadable directory: report it, do not silently drop coverage.
        errors.append({
            "path": os.path.relpath(err.filename, root).replace("\\", "/"),
            "error": err.__class__.__name__,
        })

    for dp, dns, fns in os.walk(root, onerror=on_walk_error):
        if files_capped:
            break
        pruned = []
        for d in list(dns):
            full = os.path.join(dp, d)
            rel = os.path.relpath(full, root).replace("\\", "/")
            if d in PROTECTED_DIRS:
                dns.remove(d)
                protected.append(rel + "/")
            elif os.path.islink(full):
                # Directory symlinks are recorded, never followed.
                dns.remove(d)
                files.append({"path": rel, "bytes": 0, "mtime_days": None,
                              "git_last_touch_days": None,
                              "tracked": (rel in tracked) if tracked is not None
                                         else None,
                              "signals": [], "symlink": True})
            elif d in ARTIFACT_DIRS:
                dns.remove(d)
                pruned.append(d)
            elif d in AGENT_DROPPING_DIRS:
                dns.remove(d)
                size, count = dir_stats(full)
                agent_dirs.append({
                    "path": rel + "/", "bytes": size, "files": count,
                    "category": "tool-dropping",
                })
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
            if os.path.abspath(full) == out:
                continue  # never inventory our own output file
            rel = os.path.relpath(full, root).replace("\\", "/")
            link = os.path.islink(full)
            try:
                st = os.lstat(full) if link else os.stat(full)
            except OSError as e:
                errors.append({"path": rel, "error": e.__class__.__name__})
                continue
            entry = {
                "path": rel,
                "bytes": st.st_size,
                "mtime_days": round((now - st.st_mtime) / 86400, 1),
                "git_last_touch_days":
                    round((now - (last_touch.get(rel))) / 86400, 1)
                    if last_touch.get(rel) else None,
                "tracked": (rel in tracked) if tracked is not None else None,
                "signals": name_signals(fn),
            }
            if link:
                entry["symlink"] = True
                if not os.path.exists(full):
                    entry["broken_symlink"] = True
            cat = agent_category(rel, fn)
            if cat:
                entry["agent_artifact"] = cat
            files.append(entry)
            if len(files) >= args.max_files:
                files_capped = True
                break

    files.sort(key=lambda f: f["path"])

    agent_files = [f for f in files if f.get("agent_artifact")]
    agent_artifacts = {
        "canonical": [{"path": f["path"], "tracked": f["tracked"]}
                      for f in agent_files if f["agent_artifact"] == "canonical"],
        "config": [{"path": f["path"], "tracked": f["tracked"]}
                   for f in agent_files if f["agent_artifact"] == "agent-config"],
        "droppings": [{"path": f["path"], "tracked": f["tracked"]}
                      for f in agent_files if f["agent_artifact"] == "tool-dropping"]
                     + [{"path": d["path"], "tracked": None} for d in agent_dirs],
        "note": ("route these through the Phase 2.5 gate (leave / untrack / "
                 "gitignore / delete) -- NOT the cut/quarantine matrix"),
    }

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
        "protected_dirs": {
            "paths": protected,
            "note": ("skipped by design (.git internals, quarantine buffer); "
                     "NEVER candidates for cut or quarantine"),
        },
        "files_capped": ("walk stopped at %d files (--max-files); coverage "
                         "is partial" % args.max_files) if files_capped else False,
        "errors": errors,
        "artifact_dirs": artifacts,
        "agent_artifacts": agent_artifacts,
        "files": files,
    }
    out_dir = os.path.dirname(out)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    flagged = [f for f in files if f["signals"]]
    art_bytes = sum(a["bytes"] for a in artifacts)
    print("cut-weight inventory: %s" % root)
    print("  files inventoried : %d%s" % (
        len(files), " [CAPPED at --max-files - coverage is partial]"
        if files_capped else ""))
    print("  artifact dirs     : %d (%.1f MB regenerable)"
          % (len(artifacts), art_bytes / 1e6))
    print("  name-signal files : %d" % len(flagged))
    print("  agent artifacts   : %d canonical, %d config, %d droppings "
          "(-> Phase 2.5 gate)"
          % (len(agent_artifacts["canonical"]), len(agent_artifacts["config"]),
             len(agent_artifacts["droppings"])))
    if protected:
        print("  protected (skip)  : %s" % ", ".join(protected))
    if errors:
        print("  unreadable        : %d path(s) -- listed under 'errors' "
              "in the JSON" % len(errors))
    print("  git               : %s" % (
        "%d commits scanned%s" % (commits, " [TRUNCATED - see note in JSON]"
                                  if truncated else "")
        if tracked is not None else "not a git repo"))
    print("  full data -> %s" % out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
