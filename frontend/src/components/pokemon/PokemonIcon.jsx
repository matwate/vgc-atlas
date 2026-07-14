import { useState } from "react";
import { prettifySlug } from "../../data/normalize.js";
import styles from "./PokemonIcon.module.css";

// Pokémon sprite/art icon.
//
// - `tier="pixel"` -> /sprites/{slug}.png (~96 px source; rendered small)
// - `tier="art"`   -> /art/{slug}.png (~800 px; rendered large)
//
// If the PNG 404s (we treat a broken <img> as fallback), the component swaps
// to a letter-fill token of the same shape — so no layout shift in the row.
//
// Sizes via the `size` prop in px; wells-tuned token constants in the CSS.
// Use the named size tokens (chip / row / hero) so we keep a tight surface vocabulary.
//
// `name` is the display name used for alt + letter fallback. Falls back to
// prettifying the slug if not supplied.

const SIZES = {
  chip: 24,
  row: 32,
  hero: 96,
};

export function PokemonIcon({ slug, name, tier = "pixel", size = "row", plate = false, className = "" }) {
  const [errored, setErrored] = useState(false);
  const path = tier === "art" ? "/art" : "/sprites";
  const src = `${path}/${encodeURIComponent(slug)}.png`;
  const label = name || prettifySlug(slug);
  const px = typeof size === "number" ? size : SIZES[size] || SIZES.row;
  const cls = [styles.icon, plate ? styles.plate : "", className].filter(Boolean).join(" ");
  const tierCls = tier === "art" ? styles.art : styles.pixel;

  // Letter initials (max 2) for fallback plate. Use first non-empty token.
  const initials = (label || slug || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("") || "?";

  if (errored) {
    return (
      <span
        className={`${cls} ${tierCls} ${plate ? styles.plate : ""} ${styles.fallback}`}
        style={{ width: px, height: px }}
        role="img"
        aria-label={label}
      >
        <span className={styles.fallbackText} style={{ fontSize: px * 0.32 }}>
          {initials}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`${cls} ${tierCls}`}
      style={{ width: px, height: px }}
    >
      <img
        src={src}
        alt={label}
        title={label}
        loading="lazy"
        decoding="async"
        width={px}
        height={px}
        onError={() => setErrored(true)}
      />
    </span>
  );
}