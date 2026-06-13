#!/usr/bin/env python3
"""Rasterize a folder of SVG icons to PNG at one or more sizes.

Tries cairosvg, then rsvg-convert, then inkscape — whichever is present.
The smallest size becomes <name>.png; larger sizes become <name>@<size>.png.

Usage:
    python rasterize.py svg/ png/ --sizes 32 64 256          # Blender / generic
    python rasterize.py svg/ png/ --sizes 16 32 180 192 512  # web favicon set

For the web favicon set, also pass --web to emit conventionally-named copies
(favicon-16.png, favicon-32.png, apple-touch-icon.png, icon-192.png, icon-512.png)
so the icon-forge web installer auto-wires them. Requires a single source named
favicon.svg (or pass --web-source NAME).
"""
import argparse
import os
import shutil
import subprocess
import sys


def have(cmd):
    return shutil.which(cmd) is not None


def rasterize_cairosvg(src, dst, size):
    import cairosvg  # type: ignore
    cairosvg.svg2png(url=src, write_to=dst, output_width=size, output_height=size)


def rasterize_rsvg(src, dst, size):
    subprocess.run(
        ["rsvg-convert", "-w", str(size), "-h", str(size), "-o", dst, src],
        check=True,
    )


def rasterize_inkscape(src, dst, size):
    subprocess.run(
        ["inkscape", src, "--export-type=png", f"--export-filename={dst}",
         f"--export-width={size}", f"--export-height={size}"],
        check=True,
    )


def pick_backend():
    try:
        import cairosvg  # noqa: F401
        return "cairosvg", rasterize_cairosvg
    except Exception:
        pass
    if have("rsvg-convert"):
        return "rsvg-convert", rasterize_rsvg
    if have("inkscape"):
        return "inkscape", rasterize_inkscape
    return None, None


# size -> conventional web filename
WEB_NAMES = {16: "favicon-16.png", 32: "favicon-32.png", 180: "apple-touch-icon.png",
             192: "icon-192.png", 512: "icon-512.png"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src_dir")
    ap.add_argument("dst_dir")
    ap.add_argument("--sizes", type=int, nargs="+", default=[32, 64, 256])
    ap.add_argument("--web", action="store_true",
                    help="also emit conventionally-named favicon copies from --web-source")
    ap.add_argument("--web-source", default="favicon.svg",
                    help="SVG filename (in src_dir) used for the --web favicon copies")
    args = ap.parse_args()

    name, fn = pick_backend()
    if fn is None:
        sys.exit(
            "No SVG rasterizer found. Install one:\n"
            "  pip install cairosvg   (easiest)\n"
            "  or apt-get install librsvg2-bin   (rsvg-convert)\n"
            "  or install Inkscape"
        )
    print(f"Using backend: {name}")

    svgs = [f for f in sorted(os.listdir(args.src_dir)) if f.lower().endswith(".svg")]
    if not svgs:
        sys.exit(f"No .svg files in {args.src_dir}")

    os.makedirs(args.dst_dir, exist_ok=True)
    smallest = min(args.sizes)
    for svg in svgs:
        stem = os.path.splitext(svg)[0]
        src = os.path.join(args.src_dir, svg)
        for size in args.sizes:
            out_name = f"{stem}.png" if size == smallest else f"{stem}@{size}.png"
            out = os.path.join(args.dst_dir, out_name)
            fn(src, out, size)
            print(f"  {svg} -> {os.path.relpath(out)} ({size}px)")

    if args.web:
        src = os.path.join(args.src_dir, args.web_source)
        if not os.path.exists(src):
            sys.exit(f"--web needs {args.web_source} in {args.src_dir}")
        for size, fname in WEB_NAMES.items():
            if size in args.sizes:
                out = os.path.join(args.dst_dir, fname)
                fn(src, out, size)
                print(f"  [web] {args.web_source} -> {os.path.relpath(out)} ({size}px)")

    print(f"\nDone: {len(svgs)} icon(s) x {len(args.sizes)} size(s).")


if __name__ == "__main__":
    main()
