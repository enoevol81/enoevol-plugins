#!/usr/bin/env python3
"""Rasterize a folder of SVG icons to PNG at one or more sizes.

Tries cairosvg, then resvg, then rsvg-convert, then inkscape — whichever is present.
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

NO_BACKEND_MSG = """\
No SVG rasterizer found. Install ONE of these, then re-run:
  pip install cairosvg              (easiest if pip works; needs cairo DLLs on Windows)
  resvg                             (single static binary, best quality:
                                       Windows: winget install resvg  /  cargo install resvg
                                       macOS:   brew install resvg)
  rsvg-convert                      (Linux: apt-get install librsvg2-bin)
  Inkscape                          (https://inkscape.org — any OS; auto-detected in the
                                       default Windows install location)"""


def have(cmd):
    return shutil.which(cmd) is not None


def find_inkscape():
    """Inkscape is often installed but not on PATH on Windows — check common spots."""
    if have("inkscape"):
        return "inkscape"
    if sys.platform == "win32":
        for base in (os.environ.get("ProgramFiles", r"C:\Program Files"),
                     os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")):
            for exe in (os.path.join(base, "Inkscape", "bin", "inkscape.exe"),
                        os.path.join(base, "Inkscape", "inkscape.exe")):
                if os.path.exists(exe):
                    return exe
    return None


def rasterize_cairosvg(src, dst, size):
    import cairosvg  # type: ignore
    cairosvg.svg2png(url=src, write_to=dst, output_width=size, output_height=size)


def rasterize_resvg(src, dst, size):
    subprocess.run(
        ["resvg", "-w", str(size), "-h", str(size), src, dst],
        check=True,
    )


def rasterize_rsvg(src, dst, size):
    subprocess.run(
        ["rsvg-convert", "-w", str(size), "-h", str(size), "-o", dst, src],
        check=True,
    )


def make_rasterize_inkscape(exe):
    def rasterize_inkscape(src, dst, size):
        subprocess.run(
            [exe, src, "--export-type=png", f"--export-filename={dst}",
             f"--export-width={size}", f"--export-height={size}"],
            check=True,
        )
    return rasterize_inkscape


def pick_backend():
    try:
        import cairosvg  # noqa: F401  (import can fail on Windows if cairo DLLs missing)
        return "cairosvg", rasterize_cairosvg
    except Exception:
        pass
    if have("resvg"):
        return "resvg", rasterize_resvg
    if have("rsvg-convert"):
        return "rsvg-convert", rasterize_rsvg
    inkscape = find_inkscape()
    if inkscape:
        return f"inkscape ({inkscape})", make_rasterize_inkscape(inkscape)
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
        sys.exit(NO_BACKEND_MSG)
    print(f"Using backend: {name}")

    svgs = [f for f in sorted(os.listdir(args.src_dir)) if f.lower().endswith(".svg")]
    if not svgs:
        sys.exit(f"No .svg files in {args.src_dir}")

    os.makedirs(args.dst_dir, exist_ok=True)
    smallest = min(args.sizes)
    failed = []
    for svg in svgs:
        stem = os.path.splitext(svg)[0]
        src = os.path.join(args.src_dir, svg)
        for size in args.sizes:
            out_name = f"{stem}.png" if size == smallest else f"{stem}@{size}.png"
            out = os.path.join(args.dst_dir, out_name)
            try:
                fn(src, out, size)
                print(f"  {svg} -> {os.path.relpath(out)} ({size}px)")
            except Exception as err:  # keep going; a bad SVG shouldn't kill the batch
                print(f"  {svg} FAILED at {size}px: {err}", file=sys.stderr)
                failed.append(f"{svg}@{size}")

    if args.web:
        src = os.path.join(args.src_dir, args.web_source)
        if not os.path.exists(src):
            sys.exit(f"--web needs {args.web_source} in {args.src_dir}")
        for size, fname in WEB_NAMES.items():
            if size in args.sizes:
                out = os.path.join(args.dst_dir, fname)
                try:
                    fn(src, out, size)
                    print(f"  [web] {args.web_source} -> {os.path.relpath(out)} ({size}px)")
                except Exception as err:
                    print(f"  [web] {fname} FAILED: {err}", file=sys.stderr)
                    failed.append(fname)

    if failed:
        sys.exit(f"\nDone with {len(failed)} failure(s): {', '.join(failed)}")
    print(f"\nDone: {len(svgs)} icon(s) x {len(args.sizes)} size(s).")


if __name__ == "__main__":
    main()
