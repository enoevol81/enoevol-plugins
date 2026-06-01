#!/usr/bin/env python3
"""
contact_sheet.py — render labeled thumbnail sheets of every image in a folder.

Why this exists: portfolio folders are full of files named like
`Screenshot_2025-10-21_161503.png` or `final_v3_REAL.png`. The filename tells
you nothing, and the order they happen to sit in tells you nothing either. The
ONLY reliable way to know what an asset is, is to look at it. This script lays
every image out as a labeled grid so the agent can view a few sheets instead of
opening hundreds of files one by one, and build a trustworthy
filename->content map before grouping anything.

Paginates automatically so it scales to a few hundred images.

Usage:
    python3 contact_sheet.py <folder> [--out-prefix sheet] [--per-page 12]

Writes sheet_01.jpg, sheet_02.jpg, ... in the current directory (or wherever
--out-prefix points). Prints the list of sheets written.
"""

import argparse
import os
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except Exception:
    print("ERROR: Pillow required (pip install Pillow --break-system-packages)", file=sys.stderr)
    sys.exit(1)

IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tif", ".tiff"}


def load_font(size):
    for p in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--out-prefix", default="sheet")
    ap.add_argument("--per-page", type=int, default=12)
    ap.add_argument("--cols", type=int, default=3)
    args = ap.parse_args()

    root = os.path.abspath(args.folder)
    images = []
    for dp, dn, fn in os.walk(root):
        dn[:] = [d for d in dn if not d.startswith(".")]
        for f in sorted(fn):
            if os.path.splitext(f)[1].lower() in IMG_EXT and not f.startswith("."):
                images.append(os.path.join(dp, f))
    images.sort()

    if not images:
        print("No images found.")
        return

    cols = args.cols
    rows = (args.per_page + cols - 1) // cols
    cw, ch, pad = 540, 380, 36
    font = load_font(15)

    written = []
    for page_start in range(0, len(images), args.per_page):
        page = images[page_start:page_start + args.per_page]
        sheet = Image.new("RGB", (cols * cw, rows * ch), (18, 18, 22))
        dr = ImageDraw.Draw(sheet)
        for i, path in enumerate(page):
            try:
                im = Image.open(path).convert("RGB")
                im.thumbnail((cw - 20, ch - pad - 12))
            except Exception:
                continue
            cx = (i % cols) * cw
            cy = (i // cols) * ch
            sheet.paste(im, (cx + 10, cy + pad))
            dr.rectangle([cx, cy, cx + cw - 2, cy + ch - 2], outline=(64, 64, 72))
            label = os.path.relpath(path, root)
            dr.text((cx + 8, cy + 9), label, fill=(255, 220, 120), font=font)
        idx = page_start // args.per_page + 1
        out = f"{args.out_prefix}_{idx:02d}.jpg"
        sheet.save(out, quality=85)
        written.append(out)

    print(f"Wrote {len(written)} contact sheet(s) covering {len(images)} images:")
    for w in written:
        print(f"  {w}")
    print("\nNext: view each sheet and record what each file ACTUALLY is.")
    print("Never trust the filename or file order — the picture is the source of truth.")


if __name__ == "__main__":
    main()
