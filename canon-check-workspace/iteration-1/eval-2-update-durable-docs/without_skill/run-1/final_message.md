Done. Updated the two durable docs in the copied repo; left the code and the dated change brief alone.

**What changed**
- `CLAUDE.md` — Design Standards now say: accent is indigo `#6366F1` (via the `accent` token), corner radius is 6px on all surfaces (interactive elements and containers — the old rule was 8px on interactive surfaces only), plus codified the 8px icon-button padding rule from the March brief since it also shipped. The 8px spacing grid and Inter are unchanged — those weren't part of the new direction.
- `README.md` — design blurb now reads "indigo accent (`#6366F1`), 6px corners" instead of "blue accent."

**Choices I made (headless defaults)**
- `design/change-brief-2026-03.md` untouched — it's a dated review record, not a direction doc; rewriting history there would be misleading.
- Docs only, no code edits, per your scoping. Nothing committed.

**Drift you should know about** (docs now describe the target; two code spots lag it)
- Tokens are still old: `tailwind.config.js` and `styles/globals.css` both define accent `#3B82F6` and radius `8px` — the March brief even flags "not yet reflected in tokens." Components meanwhile hardcode `#6366F1`/6px inline, violating the "use the token" rule.
- `src/components/Modal.tsx` still uses `borderRadius: "8px"` — the one straggler against "6px everywhere."

Verification: grepped all `.md` files — no remaining `#3B82F6`/blue/8px-radius claims outside the historical brief; `git diff --stat` shows only CLAUDE.md and README.md changed. Suggested next step: a small token-sync pass (update the two token files, point components at tokens, fix Modal) — say the word and I'll do it.
