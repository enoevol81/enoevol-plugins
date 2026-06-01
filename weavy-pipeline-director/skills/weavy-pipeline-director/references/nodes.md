# Weavy Node Reference

Full documentation for all Weave nodes. Load this file when the user asks about specific node behavior, inputs/outputs, or how to structure a workflow using particular nodes.

---

## Text Tools

### Prompt Node
Basic free-form text prompt. Write as long and detailed as needed. Connects to any generative model.

### Prompt Concatenator Node
Combines multiple text inputs into one. Add inputs via the `+` button. Also accepts additional inline text. Use for modular prompt assembly — keeps subject, style, and composition prompts separate and swappable.

### Prompt Enhancer Node
Improves and refines a connected Prompt Node. Choose LLM from dropdown. Customize enhancement instructions. Use before production runs to tighten prompt clarity.

### Run Any LLM Node
Send text and image inputs to any LLM; receive text response. Choose model from dropdown. Useful for dynamic prompt generation, caption writing, or conditional workflow logic.

### Image Describer Node
Analyzes an image and generates a strong descriptive prompt capturing its key attributes. Connect to a generation node to recreate or riff on a reference. LLM-selectable. Key tool for reference-locked workflows.

### Video Describer Node
Same as Image Describer but for video inputs. Extracts motion, composition, and style attributes. Use for video-to-video style transfer setup.

---

## Editing Tools

### Levels Node
Adjusts brightness, contrast, tonal range via histogram (shadows, midtones, highlights). Corrects exposure and color balance. Input: Image or Video.

### Compositor Node
Combines multiple images or videos with blend modes, layer ordering, translation, rotation. Use for multi-element compositions. Input: Image, Video, or Text.

### Painter Node
Paint on inputs or blank canvas. Creates hand-painted masks or sketches for sketch-to-image models. Outputs both image and mask. Adjustable aspect ratio, brush color, background color. Input: Image (optional).

### Crop Node
Crop and resize inputs by preset aspect ratio or custom dimensions. Input: Image or Video.

### Resize Node
Stretch or squash to custom dimensions. Use to meet model input requirements or resize reference images. Input: Image or Video.

### Blur Node
Apply blur effect (Fast Box Blur or Gaussian Blur) with intensity control. Input: Image or Video.

### Invert Node
Invert image or video. Especially useful for inverting masks. Input: Image or Video.

### Channels Node
Access individual channels: Red, Green, Blue, Alpha. Use for advanced compositing. Input: Image or Video.

### Extract Video Frame Node
Select a specific frame from a video and extract as a single image. Use timeline or enter frame number/timecode. Key node for image-to-video workflows where you need to use a generated video frame as a new first-frame input. Input: Video.

---

## Matte Tools

### Mask Extractor
Auto-segments image into parts. Click to select regions. Shift to add, Alt+Shift to subtract. Preview original or mask view. Input: Image.

### Mask By Text
Masks objects by text description. Describe what to mask. Needs both image and text input. More flexible than Mask Extractor for complex selections.

### Matte Grow / Shrink
Expand (grow) or contract (choke) matte channel for cleaner edges. Slider control. Use after Mask Extractor or Mask By Text for refinement. Input: Image, Video, or Mask.

### Merge Alpha
Applies a mask as the alpha channel of an image. Combine image + mask → image with transparency. Essential for compositing workflows. Input: Image + Mask.

### Video Matte
Extracts matte pass from video. Choose matte type from dropdown. Input: Video.

### Video Mask by Text
Masks elements in video using text prompt. Input: Video + Text.

---

## Helpers / Organizational Nodes

### Import Node
Imports files into Weave. Supports: JPEG, JPG, PNG, HEIC, WEBP (images), MP4, Quicktime (video), MP3/WAV/OGG (audio), GLB (3D). Does not support Google Drive or iCloud direct import.

### Export Node
Exports generated file to a chosen local folder. Preserves source format (PNG stays PNG). Works with Image and Video nodes.

### Preview Node
Clean preview of generated image or video. Connect to any output for a dedicated viewing node.

### Import Model Node
Import custom models from Fal, Replicate, or CivitAI via URL paste. For models not natively in Weave.

### Import LoRA Node
Upload a single custom LoRA file. Use for subject, style, or product consistency beyond what native models offer.

### Import Multiple LoRAs Node
Load multiple LoRAs simultaneously. Stack via the `+` button with per-LoRA weight control.

### Router Node
Splits one input node to multiple outputs. Created by double-clicking on an output. Keeps graphs clean when one prompt/reference feeds multiple models. Essential for Compare workflows.

### Output Node
Creates a Design App from the workflow. Connect to the final node you want exposed. App feature only available after adding an Output Node.

### Sticky Note
Canvas annotation. Place anywhere. Non-functional but critical for documenting complex graph stages.

### Compare Node
Side-by-side comparison of two image inputs. Slider or toggle switch. Use for model A/B testing and refinement decisions.

---

## Iterators

### Text Iterator Node
Batch-generates from multiple text prompts simultaneously. Input via manual entry, Array Node, Prompt Node, or CSV import. CSV can be sorted by name. Each prompt runs as a separate output. Use for prompt variation exploration or batch content generation.

### Image Iterator Node
Batch-generates from multiple images simultaneously using one model. Import multiple images; the model processes all at once as separate runs. Use for batch product shots, style variation testing, or processing image sets.

### Video Iterator Node
Same as Image Iterator but for video inputs. Batch-generate multiple videos simultaneously.

---

## Datatypes

### Array Node
Holds multiple text inputs for use with Text Iterator. The primary way to feed structured text lists into batch workflows.

---

## Node Connection Patterns

**One prompt → many models (A/B test):**
Prompt Node → Router Node → [Model A] + [Model B] → Compare Node

**Reference-locked generation:**
Import Node → Image Describer Node → Prompt Concatenator ← Prompt Node
Prompt Concatenator → [Generation Model]

**Batch from CSV:**
Text Iterator (CSV import) → [Model] → Export Node

**Masked inpainting:**
Import Node → Mask Extractor (or Mask By Text) → Matte Grow/Shrink → Merge Alpha
Original Image + Mask → [Inpaint Model]

**Video extraction loop:**
[Video Output] → Extract Video Frame → [New generation / Image-to-Video model]

**Multi-LoRA fashion shoot:**
Import Multiple LoRAs → [Flux Dev LoRA or Flux Dev LoRA Inpaint]
Prompt Concatenator → same model
