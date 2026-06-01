---
name: vanish-brand-discovery
description: >
  Use this skill whenever the user provides one or more brand names and wants editorial discovery research for Vanish magazine — a publication at the convergence of fashion and outdoor design. Triggers on any request like "research these brands for Vanish," "pull discovery on [brand]," "give me an overview of [brand] for the magazine," or "I need brand profiles for the next issue." Also trigger when the user mentions Japanese outdoor/fashion brands, streetwear-meets-technical brands, or asks for Q&A questions for a brand feature. This skill combines web research with editorial framing tailored to Vanish's point of view: high-design, technically sophisticated brands operating at the intersection of outdoor function and fashion culture.
---

# Vanish Brand Discovery Skill

## About Vanish
Vanish is a magazine covering brands at the convergence of fashion and outdoor culture. Reference points include Norbit, Acronym, F/CE., and similar brands that treat technical function and design philosophy as one unified pursuit. Editorial voice is thoughtful, curious, and authoritative — not hype-driven. The magazine's readers understand the difference between a woven label and a printed one.

## Workflow

### Step 1 — Parse the Brand List
Accept one or more brand names from the user. If a list is provided, process each brand sequentially with a clear visual break between profiles.

### Step 2 — Web Research
For each brand, use `web_search` to gather:
- **Founding story**: Year, location, founder(s), origin context
- **Creative direction**: Aesthetics, material philosophy, silhouette language, colorways
- **Brand positioning**: How they sit at the fashion/outdoor crossover — more technical? more cultural? more design-led?
- **Voice and POV**: How they communicate (sparse? intellectual? community-forward?)
- **Notable collections, collaborations, or cultural moments**
- **Geographic and cultural roots** (especially Japanese design context if applicable)

Search queries to run per brand (adapt as needed):
1. `[Brand] founder history origin`
2. `[Brand] design philosophy aesthetic`
3. `[Brand] brand voice Instagram`

Use `web_fetch` on the brand's official site if discoverable, to capture voice and visual language directly from the source.

### Step 3 — Build the Brand Profile
Output a structured profile for each brand using this format:

---

## [BRAND NAME]

**Founded:** [Year] · [City/Country]  
**Founder(s):** [Name(s)]  

**In One Line:** [Single-sentence editorial description — not a tagline, a positioning statement. Write it as Vanish would, not as the brand would.]

**Brand Story:**  
[2–3 paragraphs covering founding context, creative evolution, and where they sit culturally today. Written in Vanish's editorial voice — informed, considered, not promotional.]

**Aesthetic Profile:**  
[Describe material choices, silhouette tendencies, color philosophy, and any signature design gestures. Be specific — mention fabrics, construction details, or formal references where known.]

**Brand Voice & POV:**  
[How does the brand communicate? Sparse and mysterious? Community-oriented? Technically verbose? What's their stance on the fashion/outdoor divide?]

**At the Convergence:**  
[Specifically address how this brand navigates the fashion × outdoor space that Vanish covers. Are they coming from outdoor and leaning toward fashion? Vice versa? What makes them relevant to Vanish's editorial lens?]

**Notable:**  
[Key collaborations, limited releases, cultural moments, or design milestones worth knowing]

---

### Step 4 — Generate Q&A Questions
After the brand profile, generate **4–5 editorial interview questions** under the header:

### Q&A — Possible Interview Questions for Vanish

Before writing questions, scan the brand research for **founder/creative director personal context**: parallel creative careers (music, art, film, architecture), non-fashion backgrounds, unusual biographical details, or personal obsessions that visibly bleed into the work. If found, at least one question must engage with that dimension specifically — not as trivia, but as a lens into how the brand thinks.

Questions should be:
- **Specific to this brand** — not interchangeable with any other brand
- **Exploratory, not promotional** — Vanish is interested in thinking, not pitching
- **Rooted in the fashion/outdoor tension** — push on how the brand resolves or leans into that duality
- **Appropriate for a print Q&A** — open-ended, meaty, worthy of a considered answer
- **Varied in angle** — mix design process, cultural positioning, philosophy, and founder's personal world

Avoid generic questions like "What inspires you?" or "How did you get started?" unless they're made brand-specific and surprising. A question about a founder's music career, art practice, or parallel discipline should be pointed — connecting that world to what the brand actually makes, not just acknowledging it exists.

---

## Quality Checks
Before outputting, verify:
- [ ] Profile is written in Vanish's voice, not the brand's PR voice
- [ ] "In One Line" reads like an editor wrote it, not a press release
- [ ] Q&A questions couldn't apply to any other brand on the list
- [ ] "At the Convergence" section directly addresses Vanish's editorial premise
- [ ] All factual claims (founding year, founder name) are sourced from web research, not assumed

## Notes on Tone
Vanish is not a hype publication. The editorial voice values:
- Specificity over generality
- Philosophy over product description  
- Cultural context over commercial framing
- Restraint — say less, mean more

When in doubt, write less and make it count.
