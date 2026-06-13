# fal.ai FLUX.2 Reference (cached)

Current as of mid-2026. Verify endpoint names with a quick check if a call 404s.

## Models / endpoints

- `fal-ai/flux-2-pro` — zero-config production output, predictable across batches, seed
  control, JPEG/PNG output. Best default for a consistent icon batch.
- `fal-ai/flux-2` — **[dev]**, lighter/cheaper (~$0.012/megapixel), supports **JSON
  prompts** and is the **LoRA-trainable** base. Use for iteration and for LoRA workflows.
- `fal-ai/flux-2/...` flex / max variants — higher-quality editing / multi-reference.
- FLUX.2 supports **multi-reference editing** (condition on reference images) and up to
  4MP output. This is the lever for icon-set consistency.
- Older FLUX.1 (`fal-ai/flux/dev`, `fal-ai/flux/schnell`, `fal-ai/flux-pro`,
  `fal-ai/flux-pro/kontext` for edits) still exist if needed.

## Python usage

```python
import fal_client  # pip install fal-client ; export FAL_KEY=...

result = fal_client.run(
    "fal-ai/flux-2-pro",
    arguments={
        "prompt": "...",
        "image_size": "square_hd",   # 1024x1024; generate large, downscale for icons
        "num_images": 1,
        "seed": 42,                   # FIX the seed for set consistency
        "output_format": "png",       # keep alpha-friendly / lossless
    },
)
url = result["images"][0]["url"]
```

`fal_client.submit(...)` + polling for async/batch; or `subscribe` in JS
(`@fal-ai/client`, not the deprecated `serverless-client`).

## Consistency tactics for an icon SET (pick by set size)

1. **Locked preamble + fixed seed** — same style prefix on every prompt, one seed.
   Cheapest, gets you ~70% there. Always do this.
2. **Reference-image conditioning** — pass the rasterized SVG PNGs as FLUX.2 references so
   new icons inherit the silhouette/stroke language. Best for small-to-medium sets.
3. **Train a tiny LoRA** on the SVG-rendered PNGs (`fal` LoRA trainer, ~$0.008/step), then
   generate the whole set through the LoRA. Best for large sets (20+) or when you want to
   keep adding on-style icons later. Highest setup cost, highest consistency.

## Prompt shape that works for flat icon art

`flat vector icon, single <accent> color on transparent background, centered, generous
padding, bold even strokes, geometric, no text, no shadow, no gradient, square` + the
specific subject. Keep subjects to one clear object/metaphor. FLUX renders typography well
but for icons you usually want **no text** — say so explicitly.

## Honest limits

FLUX will not emit grid-perfect 1px-stroke 32px UI sprites. Use it for the larger /
decorative / hero / logo / launcher tier and as a style field; downscale + clean up, or
trace into SVG. The deterministic SVG path remains the source of truth for functional
small icons.
