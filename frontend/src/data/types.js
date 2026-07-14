// Canonical Pokemon type colors in OKLCH. Earned domain fluency (Pikalytics /
// Smogon use these per-type accents; the competitive-data reading public knows
// them). fg is white for saturated fills, dark for pale ones — per the
// impeccable rule on text-on-colored fills.
//
// Colors derived from the canonical Showdown/Pokemon type hex codes mapped to
// OKLCH by perceptual reference. Cap chroma at 0.22 so text stays readable.

export const TYPE_COLORS = {
  normal:   { bg: "oklch(0.70 0.04 90)",    fg: "var(--ink)"  },
  fire:     { bg: "oklch(0.71 0.17 50)",    fg: "oklch(1 0 0)" },
  water:    { bg: "oklch(0.66 0.14 264)",   fg: "oklch(1 0 0)" },
  electric: { bg: "oklch(0.87 0.18 95)",    fg: "oklch(0.18 0.02 95)" },
  grass:    { bg: "oklch(0.79 0.16 135)",   fg: "oklch(0.16 0.04 135)" },
  ice:      { bg: "oklch(0.86 0.08 200)",   fg: "oklch(0.18 0.02 200)" },
  fighting: { bg: "oklch(0.55 0.20 27)",    fg: "oklch(1 0 0)" },
  poison:   { bg: "oklch(0.51 0.18 340)",   fg: "oklch(1 0 0)" },
  ground:   { bg: "oklch(0.83 0.12 80)",    fg: "oklch(0.18 0.02 80)" },
  flying:   { bg: "oklch(0.76 0.10 250)",   fg: "oklch(0.18 0.02 250)" },
  psychic:  { bg: "oklch(0.65 0.20 0)",     fg: "oklch(1 0 0)" },
  bug:      { bg: "oklch(0.75 0.16 110)",   fg: "oklch(1 0 0)" },
  rock:     { bg: "oklch(0.66 0.10 80)",    fg: "oklch(1 0 0)" },
  ghost:    { bg: "oklch(0.43 0.10 300)",   fg: "oklch(1 0 0)" },
  dragon:   { bg: "oklch(0.50 0.22 290)",   fg: "oklch(1 0 0)" },
  dark:     { bg: "oklch(0.40 0.04 50)",    fg: "oklch(1 0 0)" },
  steel:    { bg: "oklch(0.79 0.02 250)",   fg: "oklch(0.18 0.02 250)" },
  fairy:    { bg: "oklch(0.72 0.12 350)",   fg: "oklch(1 0 0)" },
};

const UNKNOWN_TYPE = { bg: "var(--surface-2)", fg: "var(--muted)" };

export function typeStyle(slug) {
  const s = (slug || "").toLowerCase().trim();
  return TYPE_COLORS[s] || UNKNOWN_TYPE;
}