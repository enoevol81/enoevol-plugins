#!/usr/bin/env python3
"""
inventory.py — the mechanical first pass over a portfolio folder.

The point of this script is to spend machine time so the agent doesn't spend
*looking* time on the boring parts. It walks a directory, classifies every
file, pulls image dimensions, and clusters near-duplicate images (the "forty
exports of the same shoe" problem) using a small average-hash. It writes a full
manifest to JSON and prints a compact summary the agent can read at a glance.

It does NOT judge quality or decide what's a "project" — that's the agent's job,
informed by actually viewing the assets. This just clears the brush.

Usage:
    python3 inventory.py <root_folder> [--out manifest.json] [--hash-threshold 6]

Degrades gracefully: if Pillow is missing, it still inventories everything,
just without dimensions or duplicate clustering.
"""

import argparse
import json
import os
import sys
from collections import defaultdict
from datetime import datetime

try:
    from PIL import Image
    HAVE_PIL = True
except Exception:
    HAVE_PIL = False

# --- file classification -----------------------------------------------------

TYPE_MAP = {
    "image": {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp", ".heic", ".bmp", ".gif"},
    "vector": {".svg", ".ai", ".eps", ".pdf"},   # pdf is ambiguous; treated as doc below if multipage-ish
    "raw_photo": {".raw", ".cr2", ".cr3", ".nef", ".arw", ".dng"},
    "3d": {".blend", ".obj", ".fbx", ".stl", ".gltf", ".glb", ".3dm", ".lxo", ".step", ".stp", ".igs", ".iges"},
    "texture": {".sbsar", ".sbs", ".exr", ".hdr"},
    "doc": {".doc", ".docx", ".txt", ".md", ".rtf", ".pages"},
    "deck": {".ppt", ".pptx", ".key"},
    "sheet": {".xls", ".xlsx", ".csv", ".numbers"},
    "video": {".mp4", ".mov", ".avi", ".mkv", ".webm"},
    "design_doc": {".psd", ".indd", ".sketch", ".fig", ".afdesign", ".afphoto"},
}

# extensions we can open visually as a single still image
VIEWABLE_IMAGE = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff"}

# filename tokens that hint at draft/version status
WORKING_TOKENS = ("wip", "draft", "rough", "sketch", "_v", "-v", "version", "test", "tmp", "temp", "old", "backup", "copy")
FINAL_TOKENS = ("final", "hero", "approved", "master", "deliver", "export", "presentation", "portfolio")


def classify(ext):
    ext = ext.lower()
    for t, exts in TYPE_MAP.items():
        if ext in exts:
            return t
    return "other"


def status_hint(name):
    low = name.lower()
    final = any(t in low for t in FINAL_TOKENS)
    working = any(t in low for t in WORKING_TOKENS)
    if final and not working:
        return "final-ish"
    if working and not final:
        return "working-ish"
    return "unknown"


# --- average hash for near-duplicate clustering ------------------------------

def dhash(path, size=8):
    """64-bit difference hash. Keys on horizontal gradients (edges), so it
    discriminates between images that share overall brightness but differ in
    content — much better than average-hash for graphic/flat imagery. Returns
    int, or None on failure."""
    if not HAVE_PIL:
        return None
    try:
        img = Image.open(path).convert("L").resize((size + 1, size), Image.LANCZOS)
        px = img.tobytes()  # row-major grayscale bytes, not deprecated
        w = size + 1
        bits = 0
        for row in range(size):
            base = row * w
            for col in range(size):
                bits = (bits << 1) | (1 if px[base + col] > px[base + col + 1] else 0)
        return bits
    except Exception:
        return None


def hamming(a, b):
    return bin(a ^ b).count("1")


def cluster_dupes(images, threshold):
    """Greedy clustering by hamming distance on difference hash."""
    clusters = []
    for img in images:
        h = img.get("dhash")
        if h is None:
            continue
        placed = False
        for cl in clusters:
            if hamming(h, cl["seed"]) <= threshold:
                cl["members"].append(img["path"])
                placed = True
                break
        if not placed:
            clusters.append({"seed": h, "members": [img["path"]]})
    # only return clusters with more than one member (actual dupe groups)
    return [c["members"] for c in clusters if len(c["members"]) > 1]


# --- main --------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("root")
    ap.add_argument("--out", default="manifest.json")
    ap.add_argument("--hash-threshold", type=int, default=8,
                    help="Max hamming distance to treat two images as near-duplicates on a 64-bit difference hash (0=identical, ~8 catches re-exports/crops, higher=looser).")
    args = ap.parse_args()

    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        print(f"ERROR: {root} is not a directory", file=sys.stderr)
        sys.exit(1)

    files = []
    by_folder = defaultdict(list)
    images_for_hash = []

    for dirpath, dirnames, filenames in os.walk(root):
        # skip hidden + common junk dirs
        dirnames[:] = [d for d in dirnames if not d.startswith(".") and d not in ("node_modules", "__pycache__")]
        for fn in filenames:
            if fn.startswith("."):
                continue
            full = os.path.join(dirpath, fn)
            ext = os.path.splitext(fn)[1].lower()
            rel = os.path.relpath(full, root)
            try:
                st = os.stat(full)
                size = st.st_size
                mtime = datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d")
            except OSError:
                size, mtime = None, None

            ftype = classify(ext)
            entry = {
                "path": rel,
                "folder": os.path.relpath(dirpath, root),
                "ext": ext,
                "type": ftype,
                "size_kb": round(size / 1024, 1) if size else None,
                "modified": mtime,
                "status_hint": status_hint(fn),
            }

            if ftype == "image" and ext in VIEWABLE_IMAGE and HAVE_PIL:
                try:
                    with Image.open(full) as im:
                        entry["dimensions"] = f"{im.width}x{im.height}"
                        entry["megapixels"] = round((im.width * im.height) / 1_000_000, 2)
                except Exception:
                    entry["dimensions"] = None
                h = dhash(full)
                if h is not None:
                    images_for_hash.append({"path": rel, "dhash": h})

            files.append(entry)
            by_folder[entry["folder"]].append(entry)

    dupe_groups = cluster_dupes(images_for_hash, args.hash_threshold) if HAVE_PIL else []

    # Guard against degenerate over-merging: if a single "cluster" swallows most
    # of the images, the hash isn't discriminating for this asset set (common
    # with flat/graphic imagery). Don't report a bogus mega-group as duplicates.
    n_hashed = len(images_for_hash)
    dupe_unreliable = False
    if dupe_groups and n_hashed:
        largest = max(len(g) for g in dupe_groups)
        if largest > 0.6 * n_hashed:
            dupe_unreliable = True
            dupe_groups = []

    # type tally
    type_counts = defaultdict(int)
    for f in files:
        type_counts[f["type"]] += 1

    manifest = {
        "root": root,
        "generated": datetime.now().isoformat(timespec="seconds"),
        "total_files": len(files),
        "pillow_available": HAVE_PIL,
        "type_counts": dict(sorted(type_counts.items(), key=lambda x: -x[1])),
        "candidate_projects": sorted(by_folder.keys()),
        "near_duplicate_groups": dupe_groups,
        "files": files,
    }

    with open(args.out, "w") as f:
        json.dump(manifest, f, indent=2)

    # --- compact human/agent summary ---
    print(f"INVENTORY: {len(files)} files under {root}")
    print(f"Manifest written to: {args.out}")
    print(f"\nFile types:")
    for t, c in manifest["type_counts"].items():
        print(f"  {t:12s} {c}")

    print(f"\nCandidate projects (top-level + subfolders): {len(by_folder)}")
    for folder in sorted(by_folder.keys()):
        entries = by_folder[folder]
        imgs = sum(1 for e in entries if e["type"] == "image")
        finals = sum(1 for e in entries if e["status_hint"] == "final-ish")
        label = folder if folder != "." else "(root)"
        print(f"  {label:40s} {len(entries):3d} files  ({imgs} images, {finals} look final)")

    if dupe_groups:
        n_dupe_files = sum(len(g) for g in dupe_groups)
        print(f"\nNear-duplicate clusters: {len(dupe_groups)} groups covering {n_dupe_files} images")
        print("  (review these — likely the same asset exported many times; keep the best, drop the rest)")
        for i, g in enumerate(dupe_groups[:8], 1):
            print(f"  group {i}: {len(g)} files — e.g. {g[0]}")
        if len(dupe_groups) > 8:
            print(f"  ... and {len(dupe_groups) - 8} more groups (see manifest)")
    elif dupe_unreliable:
        print("\nDuplicate detection skipped: the visual hash over-merged this set")
        print("  (typical for flat/graphic imagery). Eyeball duplicates instead.")
    elif HAVE_PIL:
        print("\nNo near-duplicate image clusters detected.")
    else:
        print("\n(Pillow not installed — skipped dimensions and duplicate detection.)")


if __name__ == "__main__":
    main()
