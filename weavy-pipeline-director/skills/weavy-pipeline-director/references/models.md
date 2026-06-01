# Weavy Model Reference

Full model comparison data. Load this file when the user asks about specific models, needs help choosing between models, or needs to know inputs/outputs/pricing for a category.

Note: Credit prices and model availability change. Always verify current pricing in the Figma Weave interface.

---

## Image Generation Models

| Model | Credit/Run | Strengths | Optional Inputs | Notes |
|---|---|---|---|---|
| ChatGPT Images 2.0 | 1–37 | Versatile, large output sizes | — | High res: up to 3840×2160 |
| Reve | 4 | Multi-reference support | Reference Image | Good for style blending |
| Higgsfield Image | 21 | Style options | Reference Image | Unique stylistic outputs |
| GPT Image 1 | 8 | Style & reference imitation | — | Excels at replicating references |
| Imagen 4 | 6 | Quality, aspect flexibility | Negative Prompt | Google's latest |
| Imagen 3 | 6 | Quality | Negative Prompt | Solid production model |
| Imagen 3 Fast | 3 | Speed | Negative Prompt | Exploration tier |
| Flux 2 Pro | 5 | Detail, multi-reference | Image | Strong for editorial/texture |
| Flux 2 Flex | 14 | Multi-reference, custom size | Image | Higher cost, flexible |
| Flux 2 Dev LoRA | 4 | LoRA + image reference | LoRA, LoRA Weight, Image | Custom style/subject locking |
| Flux 1.1 Ultra | 7 | Wide aspect support (21:9) | Image | Fashion/cinematic framing |
| Flux Pro 1.1 | 5 | Quality + aspect options | Image | Production workhorse |
| Flux Fast | 0.4 | Speed | — | Exploration only |
| Flux Dev LoRA | 4 | Multi-LoRA, image input | Image, LoRA | Custom model workflows |
| Recraft V3 | 5 | Baked styles, 1K–4K output | Style Image, Control Image | **Best for graphic/type treatments** |
| Mystic | 12 | Style image input | Style Image, Control Image | Strong stylistic output |
| Ideogram V3 | 4 | Typography, style options | Negative Prompt, Remix, Style Ref | **Best for type-integrated imagery** |
| Ideogram V3 Character | 15 | Character consistency | Character Ref, Mask | Subject-locked generation |
| Stable Diffusion 3.5 | 8 | Wide aspect, image input | Image | Open ecosystem |
| Minimax Image 01 | 1 | Low cost | — | Budget generation |
| Bria | 6 | Negative prompt | Negative Prompt | Commercial-safe outputs |
| Dalle 3 | 5 | Reliable | — | Stable, well-known |
| Luma Photon | 2 | Multi-reference | Ref, Character Ref | Budget multi-ref option |
| Nvidia Sana | 0.2 | Ultra-low cost | Negative Prompt | Fast, minimal |
| Nvidia Consistory | 5 | **Subject consistency across scenes** | Subject/Scene/Style Prompts | Unique multi-scene subject lock |

**Key picks for your domains:**
- Type/Graphic treatments → **Ideogram V3, Recraft V3**
- Textural editorial → **Flux 2 Pro, Imagen 4, Flux 1.1 Ultra**
- Fashion editorial → **Flux 1.1 Ultra, Higgsfield Image, GPT Image 1**
- Product/footwear consistency → **Nvidia Consistory, Ideogram V3 Character**
- Budget exploration → **Flux Fast, Nvidia Sana, Minimax Image 01**

---

## Edit Image Models

| Model | Credit/Run | Use Case | Key Inputs | Notes |
|---|---|---|---|---|
| ChatGPT Images 2.0 Edit | 1–37 | Versatile editing, multi-image | Prompt + Image | High res output |
| Gemini 3.1 Flash (Nano Banana 2) | 4–18 | Fast flexible editing, web search | Prompt (+ optional Image) | Best for quick iterative edits |
| Gemini 3 Pro | 15–30 | High quality flexible editing | Prompt (+ optional Image) | More capable, higher cost |
| Seedream V5 Edit | 4 | Prompt-driven edit, 2K–3K output | Prompt + Image | High res, Enhance Prompt mode |
| Reve Edit | 4 | Style-preserving edit | Prompt + Image | Keeps source structure well |
| Qwen Image Edit 2511 | 10 | LoRA support + multi-image | Prompt + Image | LoRA-capable edit model |
| Klux Kontext | 3 | **Identity/product preservation edit** | Prompt + Image | Low cost, strong adherence |
| Flux Kontext Multi Image | 10 | Multi-image context editing | Prompt + Image 1 + Image 2 | Best for cross-reference edits |
| Flux Kontext LoRA | 12 | LoRA-controlled edit | Prompt + LoRA | For custom-trained subject edits |
| GPT Image 1 Edit | 8 | Reference-faithful edit | Prompt + Image | Strong for style replication |
| GPT Image 1.5 Edit | 7 | Similar to 1, newer | Prompt + Image | |
| SeedEdit 3.0 | 4 | Direct image editing | Prompt + Image | Fast and reliable |
| Gemini 2.0 Flash | 0.1 | Ultra-cheap quick edits | Prompt + Image | Lowest cost option |
| Flux 2 Max | 10 | High-fidelity edit | Prompt + optional Image | Complex edits |
| Flux Fill Pro | 6 | Inpainting | Prompt + Image + Mask | Precision inpainting |
| Flux Dev LoRA Inpaint | 4 | LoRA inpainting | Prompt + Image + Mask + LoRA | Style-locked inpainting |
| Ideogram V3 Inpaint | 11 | Type-preserving inpainting | Prompt + Image + Mask | Good for type-integrated inpaint |
| Bria Inpaint | 5 | Commercial-safe inpaint | Prompt + Image + Mask | |
| Flux Pro Outpaint | 6 | Expand canvas | Prompt + Image | Extend existing images |
| SD3 Remove Background | 2 | Background removal | Image | |
| Bria Remove Background | 0.6 | Background removal | (none required) | Ultra-cheap |
| Kolors Virtual Try On | 8 | Garment on person | Person Image + Garment Image | Fashion-specific |
| Replace Background | 4 | Swap background | Prompt + Subject Image | |
| Bria Replace Background | 2 | Swap background | Background Prompt + Image | Budget option |
| Relight 2.0 | 10 | Relighting | Prompt + Image | Change light direction/quality |

**Key edit picks for your domains:**
- Fast exploratory edits → **Gemini 3.1 Flash (Nano Banana), Gemini 2.0 Flash**
- Structural/identity-locked edits → **Klux Kontext, Flux Kontext Multi Image**
- Precision inpainting → **Flux Fill Pro, Flux Dev LoRA Inpaint**
- Fashion garment/try-on → **Kolors Virtual Try On**
- Relighting for editorial → **Relight 2.0**
- High-quality edit with style reference → **GPT Image 1 Edit, Mystic**

---

## Generate From Image (ControlNet / Style Transfer) Models

| Model | Credit/Run | Use Case | Key Inputs | Notes |
|---|---|---|---|---|
| Flux Dev Redux | 3 | Style/structure transfer | Image | No prompt required |
| Flux ControlNet & LoRA | 10 | Structure + custom style | Control Image (+ optional Prompt, LoRA) | LoRA via URL link |
| Flux Canny Pro | 6 | **Edge/structure lock** | Prompt + Control Image | Best for preserving outlines |
| Flux Depth Pro | 6 | **Depth/3D structure lock** | Prompt + Control Image | Good for 3D-sourced references |
| Qwen Edit Multiangle | 4 | Multi-angle product views | Image (+ optional Prompt) | Camera control options in toolbar |
| Image to Image | 10 | Guided style transfer | Prompt + Image | |
| Stable Diffusion ControlNets | 1 | Budget control generation | Prompt + Control Image | Cheapest controlled option |
| Sketch To Image | 0.1 | Sketch/line art to image | Prompt + Sketch Image | Ultra-cheap for ideation |

**Key picks:**
- Structure from 3D renders → **Flux Depth Pro**
- Line art/edge from illustrations → **Flux Canny Pro**
- Multi-angle product → **Qwen Edit Multiangle**
- Budget control exploration → **Sketch To Image, SD ControlNets**

---

## Video Generation Models

| Model | Credit/Run | Duration | Strengths | Key Inputs | Notes |
|---|---|---|---|---|---|
| Seedance 2.0 | 116–552 | 4s–15s | **Cinematic quality, audio, long duration** | Prompt (+ First/Last Frame) | Top tier production |
| Seedance 2.0 Reference | 116–552 | 4s–15s | Reference-consistent video | Prompt + Reference | For brand/character consistency |
| Kling 3 | 60–440 | 3s–15s | **Audio, multi-shot, long duration** | Prompt (+ First/Last Frame) | Multi-shot description supported |
| Seedance V1.5 Pro | 25–74 | 4s–12s | Audio, camera fixed mode | Prompt | Solid mid-tier |
| Veo 3.x (all variants) | 120–320 | 8s | Audio generation | Prompt (+ optional First Frame) | Google's top video model |
| Runway Gen-4.5 | 70–140 | 5s–10s | **First-frame driven, cinematic** | First Frame + Prompt | Fashion/editorial motion |
| Runway Gen-4 | 56–140 | 2s–10s | Quality, Camera Concepts | First Frame + Prompt | |
| Runway Gen-4 Turbo | 30–60 | 5s–10s | Speed | First Frame | Budget Runway |
| Kling 2.5 First & Last Frame | 35–70 | 5s–10s | **Bookended motion control** | Prompt + First Frame + Last Frame | Best for controlled motion arc |
| Kling 2.1 First & Last Frame | 25–280 | 5s–10s | First/last frame | Prompt + First/Last | Multiple quality tiers |
| Luma Ray 2 | 108–194 | 5s–9s | Camera Concepts | Prompt (+ First/Last) | |
| Moonvalley | 165–330 | 5s–10s | **Temporal coherence** | Prompt (+ First Frame) | Strong stability |
| Minimax Video Director | 60 | 5s | Director controls | Prompt | |
| Minimax Video 01 | 60 | 5s | First frame support | First Frame + optional Last Frame | |
| Pixverse V4.5 | 60–90 | 8s | Sound Effect, Style | Prompt + optional First Frame | Budget with style options |
| Wan 2.5 | 55 | Flexible | Image input | Prompt + Image | |
| LTX 2 Video | 50–280 | 6s–10s | High resolution (up to 4K) | Prompt | 4K capable |
| Hunyuan | 60 | Flexible | Open quality | Prompt | |
| Higgsfield Video | 14–62 | varies | VFX features, movement | Prompt + First Frame | Unique effects |

**Key video picks for your domains:**
- Fashion film, cinematic → **Seedance 2.0, Runway Gen-4.5**
- Controlled motion arc → **Kling 2.5 First & Last Frame**
- Long-form branded content → **Kling 3 (multi-shot), Seedance 2.0**
- Audio-synced content → **Seedance 2.0, Veo 3, Kling 3**
- Budget exploration → **Pixverse V4.5, Minimax Video 01**
- Temporal stability priority → **Moonvalley, Runway Gen-4**

---

## Enhance / Upscale Models

Available in Enhance Images and Enhance Video categories in Weave. Always check the Enhance sections in the Weave interface for current options — these update frequently. Primary use cases:
- Upscaling generated images before export
- Enhancing video resolution for delivery
- Sharpening details in product/fashion shots after generation

---

## Model Lifecycle Notes

Models in Weave are updated frequently. Treat credit prices as approximate — verify in-app before production budgeting. New models (especially video) release monthly. When a user asks about a model not in this list, recommend they check the Weave model browser and offer to help evaluate it based on its input/output specs.
