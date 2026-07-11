#!/usr/bin/env python3
"""Batch-generate icon art with FLUX.2 on fal.ai.

TEMPLATE — the prompt-smith agent fills in STYLE_PREAMBLE and ICONS from the plan.
Reads FAL_KEY from the environment. Never hard-code keys.

This script is OPTIONAL: it only produces the FLUX art tier (hero/logo/launcher art).
The deterministic SVG/PNG icons ship without it and need no fal.ai account.

    pip install fal-client
    set FAL_KEY=...         (Windows cmd;  PowerShell: $env:FAL_KEY="...";  POSIX: export FAL_KEY=...)
    python generate_fal.py                 # all icons
    python generate_fal.py APP_ICON LOGO   # subset by id
"""
import os
import sys
import urllib.request

try:
    import fal_client
except ImportError:
    sys.exit(
        "The fal-client package is not installed.\n"
        "  Fix:  pip install fal-client\n"
        "(Only needed for FLUX art generation — the SVG/PNG icon path works without it.)"
    )

MODEL = "fal-ai/flux-2-pro"        # or "fal-ai/flux-2" for the cheaper dev/LoRA base
IMAGE_SIZE = "square_hd"           # 1024x1024; downscale to icon sizes afterwards
SEED = 42                          # fixed seed = set consistency. Change per run if desired
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "png", "flux")

# --- Filled in by the prompt-smith agent ---------------------------------------
STYLE_PREAMBLE = (
    "flat vector icon, single color on transparent background, centered, generous "
    "padding, bold even strokes, geometric, no text, no drop shadow, no gradient, square"
)

# id -> subject (one clear metaphor each)
ICONS = {
    # "APP_ICON": "a rounded-square app glyph of <domain metaphor>",
    # "LOGO":     "a minimal monogram mark for <product>",
}
# -------------------------------------------------------------------------------


def prompt_for(subject: str) -> str:
    return f"{STYLE_PREAMBLE}, {subject}"


def generate(icon_id: str, subject: str):
    print(f"[{icon_id}] generating...")
    result = fal_client.run(
        MODEL,
        arguments={
            "prompt": prompt_for(subject),
            "image_size": IMAGE_SIZE,
            "num_images": 1,
            "seed": SEED,
            "output_format": "png",
        },
    )
    url = result["images"][0]["url"]
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, f"{icon_id.lower()}.png")
    urllib.request.urlretrieve(url, out)
    print(f"  saved {os.path.relpath(out)}")


def main():
    if not os.environ.get("FAL_KEY"):
        sys.exit(
            "FAL_KEY is not set, so fal.ai generation can't run.\n"
            "  1. Get a key at https://fal.ai/dashboard/keys (paid account required).\n"
            "  2. Set it for this shell:\n"
            "       Windows cmd:   set FAL_KEY=your-key\n"
            "       PowerShell:    $env:FAL_KEY=\"your-key\"\n"
            "       macOS/Linux:   export FAL_KEY=your-key\n"
            "  3. Re-run this script.\n"
            "No fal.ai account? You don't need one — the SVG/PNG icons in svg/ and png/ "
            "are the production set and are already complete without this script."
        )
    if not ICONS:
        sys.exit("ICONS is empty — the prompt-smith agent must fill it from the plan.")
    wanted = set(a.upper() for a in sys.argv[1:]) or set(ICONS)
    unknown = wanted - set(k.upper() for k in ICONS)
    if unknown:
        sys.exit(f"Unknown icon id(s): {', '.join(sorted(unknown))}. Known: {', '.join(sorted(ICONS))}")

    failed = []
    for icon_id, subject in ICONS.items():
        if icon_id.upper() not in wanted:
            continue
        try:
            generate(icon_id, subject)
        except Exception as err:  # keep the batch going; report at the end
            print(f"  [{icon_id}] FAILED: {err}", file=sys.stderr)
            failed.append(icon_id)
    if failed:
        sys.exit(
            f"\n{len(failed)} icon(s) failed: {', '.join(failed)}.\n"
            f"Re-run just those:  python {os.path.basename(__file__)} {' '.join(failed)}"
        )
    print("\nAll requested icons generated.")


if __name__ == "__main__":
    main()
