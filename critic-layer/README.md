# Critic Layer

**Real-time, in-browser UX/UI design review — a review-to-instruction layer.**

Walk a live page in your own browser and drop **sticky notes directly on the
interface**, exactly as you would with Post-its on a printout. Critic Layer
anchors each note to the DOM element under it, then synthesizes the session into
a change brief a human can read and a **Claude Code prompt a coding agent can act
on** — no back-and-forth explaining what you meant.

It closes the gap between *"this section feels wrong"* and *"increase the hero
CTA's height 8–12px, raise its contrast to the primary brand fill, add 24px above
the CTA row, and keep it above the fold on mobile."* That translation is the
product.

## What it is (and isn't)

- **Is:** a fast bridge from human visual judgment to agent-executable design
  direction. The designer's notes are the spec; the AI is a *secondary,
  context-grounded* second set of eyes.
- **Isn't:** a design editor (it never moves pixels — that's `/impeccable`), an
  autonomous redesign agent, or a site crawler.

## How it works

1. **Open** a live page — Critic Layer drives your real Chrome via the
   claude-in-chrome MCP.
2. **Inject** the sticky-note overlay. A small HUD appears; click any element to
   pin a note, type your comment, set a category and severity.
3. **Review** at your own pace across breakpoints. Notes anchor to real DOM nodes
   and survive scroll and re-render. The HUD's **Export** button copies all notes
   as versioned JSON (and logs them to the console) at any time — your review
   survives even if the browser bridge doesn't.
4. **Synthesize.** Critic Layer reads your notes back and produces:
   - `ux_ui_change_brief.md` — the human-readable brief
   - `implementation_prompt.md` — a paste-ready Claude Code prompt
   - `annotation_manifest.json` — the record of raw notes
   - `issue_priority_table.md` — optional quick-scan

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

Ask for it in plain language — "review this site," "let me mark up the homepage,"
"leave notes on the hero," "sticky-note this page," "turn my design feedback into
instructions for a coding agent," or hand it a Critic Layer / annotation JSON
export to synthesize.

## Layout

```
critic-layer/
└── skills/critic-layer/
    ├── SKILL.md
    ├── scripts/
    │   └── critic-overlay.js      # injectable sticky-note overlay
    └── references/
        ├── capture.md             # live-review only: browser + overlay API
        ├── synthesis.md           # reading notes, attribution, prioritization
        └── output.md              # manifest schema + brief/prompt templates
```

---

Part of the [enoevol-plugins](https://github.com/enoevol81/enoevol-plugins)
marketplace. MIT.
