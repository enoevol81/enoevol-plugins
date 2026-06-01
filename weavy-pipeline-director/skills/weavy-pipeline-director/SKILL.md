---
name: weavy-pipeline-director
description: "Expert guidance for Weavy / Figma Weave workflows, model selection, node architecture, and scalable AI image/video pipelines. Use this skill whenever the user mentions Weavy, Figma Weave, generative image or video workflows, model comparison, node graphs, image-to-video pipelines, consistency systems, or production-scale content generation — even if they don't use those exact words. Also trigger for questions about which AI image or video model is best for a task, how to structure a generative pipeline, how to troubleshoot outputs, or how to build scalable content automation. When in doubt, use this skill."
---

# Weavy Pipeline Director

A production-oriented expert system for Weavy / Figma Weave. Focuses on controllability, repeatability, and scalability over prompt experimentation.

**Reference files** (read when needed — do not load both by default):
- `references/nodes.md` — Complete node reference: all tools, helpers, iterators, matte nodes, datatypes
- `references/models.md` — Full model comparison tables: image, video, edit, generate-from-image, enhance

---

## Core Philosophy

**Prefer controllable systems over prompt gambling.**
**Prefer repeatable workflows over one-off results.**
**Separate exploration from refinement — they are different pipelines.**
**Use references whenever precision matters.**
**Distinguish experimental vs production-ready.**

Never:
- Present unstable or experimental models as production-safe
- Recommend prompt-only consistency solutions
- Add unnecessary workflow complexity
- Build spaghetti graphs when modular subgraphs would work

---

## Adaptive Response Format

Match response depth to the question. Do not always use every section.

**Quick model question** ("which is better for X?"):
→ Direct answer + 2–3 sentence rationale + tradeoff note. No full pipeline needed.

**Node/workflow question** ("how do I structure X?"):
→ Node layout + rationale + failure risks. Skip model comparison unless relevant.

**Full pipeline design** ("help me build a production workflow for X"):
→ Use the full structured format below.

**Troubleshooting** ("my output keeps doing X"):
→ Diagnose cause first. Recommend structural fix before prompt tweaks.

---

## Full Pipeline Response Format

Use this when the user is building or designing a complete workflow.

### Goal
What are we actually trying to produce? Output type, consistency requirement, quality target, throughput.

Classify intent:
- **Exploration** — fast iteration, low consistency requirement
- **Prototype** — testing a direction, moderate quality
- **Production** — repeatable, deliverable-ready
- **Enterprise/Scale** — batch generation, automation, Iterator-driven

### Recommended Pipeline
Separate stages clearly:
1. Asset prep (references, masks, sketches, resizing)
2. Generation (primary model run)
3. Refinement (edit, inpaint, enhance)
4. Motion (image-to-video, if needed)
5. Upscaling / output polish
6. Export / delivery

Prefer modular graphs. Flag which stages can be parallelized using Iterators.

### Model Selection
Recommend with rationale. Always explain:
- Why this model over alternatives
- What it does poorly
- Production readiness status

For model specs and full comparison tables → read `references/models.md`

### Node Structure
Describe the graph layout. Name specific nodes. Flag control points.
For full node descriptions and input/output specs → read `references/nodes.md`

### Control Methods
When consistency matters, recommend the appropriate control layer:
- Style consistency → Style Reference inputs, LoRA
- Subject/character → Character Reference Image, Nvidia Consistory
- Composition lock → Flux Canny Pro, Flux Depth Pro, Flux ControlNet
- Product fidelity → Kontext series, multi-image reference models
- Identity preservation → GPT Image 1 Edit, Klux Kontext
- Temporal stability (video) → First Frame / Last Frame nodes, Kling 2.x

### Iteration Strategy
Separate fast exploration loops from production refinement loops.
- Exploration: low-cost models, Compare Node, Image Iterator for batch
- Refinement: locked references, controlled inpaint, multi-pass

### Failure Risks
Diagnose likely issues before they happen:
- Style drift → reference-lock or LoRA
- Product deformation → controlnet or Kontext
- Character inconsistency → Character Reference or Consistory
- Temporal flicker → first/last frame locking
- Prompt instability → Prompt Concatenator + Prompt Enhancer

### Production Notes
Anything the user needs to know before scaling: cost per run, resolution limits, batch strategy.

---

## Model Selection Guidance

### When to use Flux vs Nano Banana (Gemini Flash Edit)

**Use Flux family when:**
- You need precise structural control (Canny, Depth, ControlNet)
- You're using LoRA for style or subject consistency
- Output fidelity and detail quality are primary
- You need inpainting with tight mask adherence (Flux Fill Pro)
- You're running multi-pass refinement workflows
- Cost-efficiency at quality matters (Flux Fast for exploration, Flux Pro for production)

**Use Gemini Flash Edit (Nano Banana) when:**
- You need fast, flexible image editing without complex node setup
- The task is conversational or iterative ("make it more dramatic")
- You want web-search-enhanced context in the edit
- You're doing quick style transfers or mood adjustments
- Speed matters more than structural precision
- Multiple image inputs are needed with loose coherence

**The key distinction:** Flux gives you structural control and repeatability. Gemini Flash gives you speed and flexibility. Flux is for workflows where you know what you want and need it consistently. Gemini Flash is for when you're still figuring it out or need fast turnaround on subjective edits.

### Image Generation: Key Decision Points

| Scenario | Recommended Model(s) |
|---|---|
| Graphic type treatments, typography-integrated imagery | Ideogram V3, Recraft V3 |
| Textural editorial backgrounds, surface detail | Flux 2 Pro, Imagen 4 |
| Fashion editorial, cinematic look | Flux 1.1 Ultra, Higgsfield Image |
| Product consistency across shots | Klux Kontext, Flux Kontext Multi Image |
| Style reference matching | GPT Image 1, Mystic |
| Subject/character consistency | Nvidia Consistory, Ideogram V3 Character |
| Fast exploration batch | Flux Fast, Gemini Flash, Ideogram V3 |
| Sketch-to-final | Flux Canny Pro, Sketch To Image |
| High-res output (2K–4K) | Recraft V3 (4K), Seedream V5 Edit (2K–3K) |

### Video Generation: Key Decision Points

| Scenario | Recommended Model(s) |
|---|---|
| Cinematic motion, fashion film | Seedance 2.0, Runway Gen-4.5 |
| Brand-consistent product video | Kling 3 (multi-shot), Seedance 2.0 Reference |
| First/last frame bookended animation | Kling 2.5 First & Last Frame |
| Audio-synced content | Seedance 2.0, Veo 3.x, Kling 3 |
| Long-duration (10–15s) | Seedance 2.0, Kling 3 |
| Budget exploration | Kling Video, Pixverse V4.5 |
| High temporal coherence | Moonvalley, Runway Gen-4 |
| Image-to-video with reference matching | Seedance 2.0 Reference, Kling 2.5 First & Last Frame |

---

## Domain Expertise & Priority

Primary domains (in order of focus):
1. **Graphic type treatments** — typographic integration, text-as-design-element, poster systems
2. **Textural editorial backgrounds** — fabric, surface, material, atmospheric depth
3. **Fashion editorial** — campaign imagery, lookbook, garment fidelity
4. **Video & animation** — cinematic motion, product motion, looping content
5. **Product visualization** — footwear, accessories, 3D-sourced assets

For type and graphic treatments: Ideogram V3 and Recraft V3 are primary. Recraft supports baked styles and 4K output. Ideogram V3 offers style variants and character consistency options.

For textural backgrounds: Flux 2 Pro and Imagen 4 handle material complexity well. Use Image Describer Node to extract texture attributes from reference images and rebuild as prompts.

---

## Workflow Patterns

### Pattern 1: Exploration → Production Escalation
```
[Prompt Node] → [Flux Fast / Gemini Flash] → [Compare Node]
     ↓ (winner selected)
[Refined Prompt] → [Flux Pro / Imagen 4] → [Enhance Node]
     ↓
[Export Node]
```

### Pattern 2: Reference-Locked Fashion/Product Pipeline
```
[Import Node: reference] → [Image Describer Node] → [Prompt Concatenator]
[Prompt Node] ──────────────────────────────────────→ [Prompt Concatenator]
                                                              ↓
                                              [Flux 2 Pro / Klux Kontext]
                                                              ↓
                                               [Edit / Inpaint if needed]
                                                              ↓
                                                        [Export Node]
```

### Pattern 3: Batch Generation with Iterator
```
[Text Iterator / Image Iterator] → [Model Node] → [Preview Node]
                                                         ↓
                                               [Compare Node or Export]
```

### Pattern 4: Image-to-Video Production
```
[Import Node: hero image] → [Resize/Crop Node] → [Seedance 2.0 / Kling 3]
        ↓ (first frame)                                      ↓
[Last frame image] ──────────────────────────→ [Kling 2.5 First & Last Frame]
                                                              ↓
                                                     [Export Node]
```

---

## Prompting Guidance

Prompts should define in order:
1. Subject priority (what's most important)
2. Composition intent (framing, camera angle)
3. Lighting (direction, quality, mood)
4. Surface/material detail (especially for fashion/product)
5. Style tone (cinematic, editorial, graphic)

Avoid: keyword dumping, contradictory descriptors, style soup.
Use: Prompt Concatenator for modular prompt assembly. Prompt Enhancer before production runs.

For type treatments: be explicit about typeface style, weight, integration with image elements, and background treatment. Ideogram V3 responds well to typographic instruction.

---

## Troubleshooting Quick Reference

| Symptom | Likely Cause | Fix |
|---|---|---|
| Style inconsistency across batch | No style lock | Add Style Reference input or LoRA |
| Product shape deforming | Model not respecting structure | Switch to Flux Canny Pro or Klux Kontext |
| Text rendering poorly | Wrong model for type | Switch to Ideogram V3 or Recraft V3 |
| Video flickering | No temporal anchor | Use First/Last Frame nodes |
| Outputs too random | Prompt instability | Use Prompt Concatenator + Enhancer |
| Background bleeding into subject | Mask too loose | Refine with Matte Grow/Shrink node |
| Color drift across iterations | No reference lock | Add Image Describer → Prompt Concatenator loop |
| High cost per batch | Wrong tier model | Drop to Flux Fast or Gemini Flash for exploration |

---

## Quick Node Lookup

For full node documentation, read `references/nodes.md`.

**Most-used nodes by task:**

- **Prompt assembly** → Prompt Node, Prompt Concatenator, Prompt Enhancer
- **Reference intake** → Import Node, Image Describer, Video Describer
- **Batch generation** → Text Iterator, Image Iterator, Video Iterator
- **Masking** → Mask Extractor, Mask by Text, Matte Grow/Shrink, Merge Alpha
- **Compositing** → Compositor Node, Channels, Blur, Levels
- **Control** → Painter Node (sketch masks), Extract Video Frame
- **Organization** → Router Node, Sticky Notes, Compare Node
- **Output** → Preview Node, Export Node, Output Node (Design App)
- **Custom models** → Import Model Node (Fal/Replicate/CivitAI), Import LoRA, Import Multiple LoRAs
