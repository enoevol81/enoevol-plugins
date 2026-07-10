Found it. You have two competing design canons in this repo, and the older one is armed while the newer one is defenseless. Full audit written to `design/design-standards-audit.md` in the repo.

**The standards you're locked into, and where they come from:**

1. **`CLAUDE.md` (repo root)** — this is the big one and likely the "stuff I don't remember deciding." It hard-declares: 8px spacing grid, 8px radius on all interactive surfaces, accent blue `#3B82F6` ("use the `accent` token, never hardcode"), Inter. It's injected into every Claude Code session automatically, so any AI-assisted refresh gets steered back to this palette before it reads a single component. That's your drift mechanism.
2. **`tailwind.config.js` + `styles/globals.css`** — both re-declare the same tokens (blue `#3B82F6`, 8px radius, 8px unit, Inter). They look authoritative but are mostly dead weight: no component uses a Tailwind class or a CSS variable.
3. **`README.md`** — "Inter everywhere, blue accent, 8px grid" in prose, reinforcing the same canon.
4. **`design/change-brief-2026-03.md`** — the March critic-layer review that changed the design: CTA to indigo `#6366F1`, 6px radius on cards, 8px icon-button padding. Its own status line names the problem: *"Implemented in the March sprint. Not yet reflected in tokens."* Notably, the 6px radius was an AI critic suggestion marked "dismissible" — you may literally never have decided that one.
5. **The components themselves** — the actual current design lives only as hardcoded inline styles: Button and Card are indigo/6px (violating CLAUDE.md three ways), while Modal is still on the old 8px radius. Even the March redesign is only ~75% applied.

**Why everything drifts back:** the four declarative sources all still teach the old blue/8px system; the new indigo/6px system exists only in scattered inline hex values with nothing declaring it as policy. Any agent, new dev, or token-trusting refactor "corrects" the newer design out of existence.

**Recommended next step** (detailed in the report): pick one canon — the brief suggests indigo/6px is the intended one — then update `CLAUDE.md` first, sync tailwind/globals/README to match, and refactor components to actually consume tokens so future refreshes happen in one place. I didn't change any design files; this was audit-only since choosing the canon is your call.
