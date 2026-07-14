import { prettifySlug } from "../../data/normalize.js";
import styles from "./FilterChip.module.css";

// A chip representing one selected slug. Pure presentation; the X removes it
// from the filter list and is keyboard-accessible.
// Two visual variants:
//   - mono:    aligns combobox-driven values (Pikalytics-style data tokens)
//   - combo:   pair chips (pokemon × move) with a small × glyph
export function FilterChip({ value, label, onRemove, mono = true, tone = "neutral" }) {
  const display = label ?? value;
  const cls = [styles.chip, mono ? styles.mono : "", styles[tone] || ""].join(" ");
  return (
    <span className={cls}>
      <span className={styles.value}>{display}</span>
      <button
        type="button"
        className={styles.remove}
        aria-label={`Remove ${display}`}
        onClick={onRemove}
      >
        <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
          <path
            d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </button>
    </span>
  );
}

// Combo pair chip — "pokemon ⨯ move"
export function ComboChip({ pokemon, move, onRemove }) {
  return (
    <span className={styles.combo}>
      <span className={styles.comboCell}>{prettifySlug(pokemon)}</span>
      <span className={styles.x} aria-hidden="true">⨯</span>
      <span className={styles.comboCell}>{prettifySlug(move)}</span>
      <button
        type="button"
        className={styles.remove}
        aria-label={`Remove pairing ${prettifySlug(pokemon)} with ${prettifySlug(move)}`}
        onClick={onRemove}
      >
        <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
          <path
            d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </button>
    </span>
  );
}