# Product

## Register

product

## Platform

web

## Users

VGC players who struggle to build a team from zero. They open this tool mid-prep
or mid-tournament with a half-formed core or a single idea ("I want to build
around Charizard + Pelipper sun, what works?") and want to study real,
tournament-winning compositions to adapt. They are fluent in the format's
vocabulary — Pokemon names, moves, abilities, tera types — and have no patience
for hand-holding prose or marketing framing. They want to filter, read a team
sheet, copy what's proven, iterate. Secondary surface-vs-user nuance: the data
also interests content creators and analysts, but the design language is set by
the player mid-build, not the analyst mid-essay.

## Product Purpose

Search a large and growing database of real VGC (Pokemon Champions) tournament
teams by Pokemon, move, item, ability, tera type, and nature — with combo
filters ("Charizard must carry Heat Wave") and tournament-quality gates
(minimum players, ranked by top%). Present tournament-winning compositions as
readable team sheets so players can scout, adapt, and iterate on proven cores.
Success: a player starts with one constraint and leaves with a shortlist of
real teams to study, in under a minute.

## Positioning

A ranked, searchable atlas of real tournament-winning VGC team compositions —
find a proven comp for any core, filtered the way you actually think.

## Brand Personality

Clinical atlas. Restrained, reference-grade, reads like a curated compendium
rather than a product. The data carries the page; type and spacing do the
hierarchy; no decoration that competes with the content. Voice is direct and
matter-of-fact — labels over sentences, figures over fluff. The tool
disappears into the task. Familiar to anyone who has used Pikalytics, Smogon,
or damage-calc pages: domain-native density, no invented affordances.

## Anti-references

- **Fluffy marketing landing.** Sparkles, gradient hero, oversized CTA buttons,
  emoji, decoration, "trusted by" strips. The data is the point; the page is a
  search interface, not a pitch.
- **Generic SaaS dashboard.** Sidebar + topbar + empty stat cards + a hero
  metric template. Bolted-on skeleton with no content of its own.
- **Glossy game-UI / saturated gradients.** Drop-glow cards, RPG-menu vibes,
  neon-on-black shine. Wrong register for reference material.
- **Over-minimal to the point of bland.** Gray-on-gray, no hierarchy, no
  personality. Atlas, not blank page.

## Design Principles

1. **Reference over decoration.** Every pixel either holds data or gets out of
   its way. Decoration is admitted only when it clarifies the hierarchy.
2. **Filters first.** Searching is the whole product. No gate, splash, or
   onboarding wall between the user and the results list — the filter panel
   and the team list share the first screen.
3. **Earned familiarity.** Follow Pikalytics / Smogon / damage-calc
   conventions where they exist (team-sheet format, dense tables, slug-style
   filters). Reinventing standard competitive-data affordances is a defect.
4. **Quiet density.** Dense enough that a tournament scout fits one team per
   glance, spacious enough that a six-slot sheet reads cleanly. Type and
   spacing carry the rhythm.
5. **Reduced-motion respect and sensible accessibility defaults.** No formal
   WCAG level is claimed, but body contrast stays readable, keyboard nav is
   complete, focus is visible, and motion respects `prefers-reduced-motion`.

## Accessibility & Inclusion

No formal WCAG target. Sensible defaults enforced: body text ≥4.5:1 contrast,
full keyboard navigation, visible focus-visible rings, touch targets ≥40px,
reduced-motion fallbacks on every transition. Color is never the sole carrier
of state where a label or icon could also carry it.