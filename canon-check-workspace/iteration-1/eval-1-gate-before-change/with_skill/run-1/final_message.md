Done — both buttons are now 12px. But before I made the edit, I ran a quick canon check on corner radius, and you should know what you're diverging from, because it's messier than "8px feels too sharp":

**Heads up — corner radius was already in conflict before this change.** Your written canon says **8px** in three explicit places: `CLAUDE.md`'s Design Standards ("Corner radius is 8px on all interactive surfaces"), `tailwind.config.js` (`borderRadius.md: 8px`), and `styles/globals.css` (`--radius: 8px`). But the buttons you just asked about were actually **6px** — changed in commit `14fe0ef` "per March critic review," even though that March change brief (`design/change-brief-2026-03.md`) only proposed 6px for *cards*, as a dismissible AI suggestion. The 6px on buttons was scope drift that never got documented anywhere. So the "sharp" corners bothering you were never a chosen standard — no need to feel like you're breaking a rule.

**What I changed:**
- `src/components/Button.tsx:9` — `borderRadius: 6px → 12px`
- `src/components/IconButton.tsx:9` — `borderRadius: 6px → 12px`

Verified by grep: both buttons are 12px; nothing else touched.

**Current state of radius across the repo (now three-way):** buttons 12px, `Card.tsx` 6px, `Modal.tsx` 8px — and all three docs/token sources still claim 8px everywhere. Also worth noting: the buttons use hardcoded inline values, not the `--radius` token or Tailwind's `rounded-md`, which is how this drift happened in the first place (and `Button.tsx`'s indigo `#6366F1` fill similarly bypasses the documented `accent` token).

**Recommended next step:** run the companion **canon-update** skill to bring the durable docs back in line — decide whether 12px is the new interactive-surface standard (update CLAUDE.md, `--radius`, and the Tailwind token to match, ideally pointing the buttons at the token instead of hardcoding), and settle the now-obsolete March change brief, whose one implemented-then-overtaken radius suggestion is exactly the kind of artifact that keeps getting read as a live rule. Your call — I didn't touch any docs or tokens.
