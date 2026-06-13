#!/usr/bin/env python3
"""Batch-generate icon art with FLUX.2 on fal.ai.

TEMPLATE — the prompt-smith agent fills in STYLE_PREAMBLE and ICONS from the plan.
Reads FAL_KEY from the environment. Never hard-code keys.

    pip install fal-client
    export FAL_KEY=...
    python generate_fal.py                 # all icons
    python generate_fal.py APP_ICON LOGO   # subset by id
"""
import os
import sys
import urllib.request

try:
    import fal_client
except ImportError:
    sys.exit("pip install fal-client")

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
        sys.exit("Set FAL_KEY in your environment first.")
    if not ICONS:
        sys.exit("ICONS is empty — the prompt-smith agent must fill it from the plan.")
    wanted = set(a.upper() for a in sys.argv[1:]) or set(ICONS)
    for icon_id, subject in ICONS.items():
        if icon_id.upper() in wanted:
            generate(icon_id, subject)


if __name__ == "__main__":
    main()
