# Critic Layer

**Real-time, in-browser UX/UI review — note it, draw on it, or edit it live.**

Walk a live page in your own browser and mark it up three ways from one on-page
HUD:

- **Pick** — drop **sticky notes** on any element, like Post-its on a printout.
- **Draw** — sketch **freehand / arrows / shapes** over the page to circle and
  point at what matters.
- **Edit** — change an element's **text, style, attributes, or HTML live**. The
  page updates instantly (WYSIWYG) and Critic Layer records the exact before→after
  diff.

Critic Layer anchors notes and edits to the DOM element under them, then
synthesizes the session into a change brief a human can read and a **Claude Code
prompt a coding agent can act on** — no back-and-forth explaining what you meant.

It closes the gap between *"this section feels wrong"* and *"increase the hero
CTA's height 8–12px, raise its contrast to the primary brand fill, add 24px above
the CTA row, and keep it above the fold on mobile."* A note states the intent, a
drawing points at it, and a live edit nails the exact value. That translation is
the product.

## What it is (and isn't)

- **Is:** a fast bridge from human visual judgment to agent-executable design
  direction, at three fidelities (note → drawing → exact edit diff). Your captures
  are the spec; the AI is a *secondary, context-grounded* second set of eyes.
- **Isn't:** the thing that ships final pixels. Edit mode mutates the live page so
  you can *see* the fix and captures the diff, but the coding agent applies it to
  source. For a deeper free-form in-browser visual editing session, `/impeccable`
  is still the heavier tool. Not an autonomous redesign agent or a site crawler.

## How it works

1. **Open** a live page — Critic Layer drives your real Chrome via the
   claude-in-chrome MCP.
2. **Inject** the overlay. A small HUD appears with **Pick / Draw / Edit** modes; pin notes, draw markup, or live-edit elements at will. Click any element to pin a note, type your comment, and optionally set a category and severity.
3. **Review** at your own pace across breakpoints. Notes and edits anchor to real DOM nodes and survive scroll and re-render; drawings ride page coordinates. The HUD's **Export** button copies all notes as versioned JSON (and logs them to the console) at any time — your review survives even if the browser bridge doesn't.
4. **Synthesize.** Critic Layer reads your notes, drawings, and edits back and produces:
   - `ux_ui_change_brief.md` — the human-readable brief
   - `implementation_prompt.md` — a paste-ready Claude Code prompt
   - `annotation_manifest.json` — the record of raw notes, drawings, and edits
   - `issue_priority_table.md` — optional quick-scan

Captured edits carry an exact diff, so they become near-complete tasks — the agent
gets the concrete values you set, not a paraphrase.

You can also hand it an **existing annotation export** and it runs synthesis-only
(no browser needed).

## The AI is deliberately secondary

Your notes are the source of truth. The AI first synthesizes them faithfully —
preserving your intent and wording — and only *then*, once it has ingested the
design intent (`design.md` / `DESIGN.md` / brand notes, or a one-line statement
of what the experience is for), offers its own observations as clearly-labeled,
dismissible suggestions. Assertiveness is per run: **quiet** (default) or
**proactive**. Every issue is attributed `user` / `ai` / `uncertain` — never
blurred.

## Requirements

- **Live review:** the [claude-in-chrome](https://www.anthropic.com) MCP
  (controls your real Chrome). The overlay uses inline DOM inputs only and never
  triggers native dialogs. No MCP? Paste `critic-overlay.js` into DevTools
  yourself, review, hit Export, and hand Claude the JSON.
- **Synthesis-only:** no browser required.
- **Optional:** a `design.md` / `DESIGN.md` / brand-notes file to ground the AI's
  second pass.

The exported manifest is versioned and self-describing (`schemaVersion: 1` —
URL, viewport, timestamp, note array), so downstream tools like `canon-check`
can consume it as a prior design-review artifact.

## Triggering

Ask for it in plain language — "review this site," "mark up the homepage," "leave
notes on the hero," "draw on the page," "circle what's wrong," "just change this
copy/color right here," "show me the fix on the page," "turn my design feedback
into instructions for a coding agent," or hand it a Critic Layer / annotation JSON
export to synthesize.

## Layout

```
critic-layer/
└── skills/critic-layer/
    ├── SKILL.md
    ├── scripts/
    │   └── critic-overlay.js      # injectable review + markup + live-edit overlay
    └── references/
        ├── capture.md             # live-review only: browser + overlay API + object schemas
        ├── synthesis.md           # reading notes/drawings/edits, attribution, prioritization
        └── output.md              # manifest schema + brief/prompt templates
```

---

Part of the [enoevol-plugins](https://github.com/enoevol81/enoevol-plugins)
marketplace. MIT.
