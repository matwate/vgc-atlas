import { TeraBadge } from "../primitives/TeraBadge.jsx";
import { PokemonIcon } from "../pokemon/PokemonIcon.jsx";
import styles from "./TeamSlot.module.css";

// One Pokémon slot inside a team detail sheet.
// Layout: header row with [official artwork 96×96] [name + id + index chip]
// [tera badge or placeholder]. Below: a 2x2 dl of item/ability/nature/slot,
// then the 4-move list. Compact but readable; tabular figures + mono slugs.
export function TeamSlot({ slot, index }) {
  const id = slot.id || "?";
  const idEqName = id.toLowerCase().replace(/[^a-z0-9]/g, "") ===
    (slot.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const tera = slot.tera?.trim() || null;
  return (
    <article className={styles.slot}>
      <header className={styles.head}>
        <PokemonIcon
          slug={slot.id || slot.name}
          name={slot.name}
          tier="art"
          size="hero"
          className={styles.artWell}
        />
        <div className={styles.meta}>
          <div className={styles.indexRow}>
            <span className={styles.indexNum}>{String(index + 1).padStart(2, "0")}</span>
            <h3 className={styles.name}>{slot.name || "Unknown"}</h3>
          </div>
          {!idEqName && (
            <span className={styles.id}>{id}</span>
          )}
        </div>
        {tera ? (
          <span className={styles.teraWrap}>
            <span className={styles.teraLabel} aria-hidden="true">tera</span>
            <TeraBadge type={tera}>{tera}</TeraBadge>
          </span>
        ) : (
          <span className={styles.teraNone} title="No tera set in source data">
            <span className={styles.teraLabel} aria-hidden="true">tera</span>
            <span className={styles.teraNoneMark}>—</span>
          </span>
        )}
      </header>

      <dl className={styles.fields}>
        <div className={styles.field}>
          <dt>Item</dt>
          <dd>{slot.item || "—"}</dd>
        </div>
        <div className={styles.field}>
          <dt>Ability</dt>
          <dd>{slot.ability || "—"}</dd>
        </div>
        <div className={styles.field}>
          <dt>Nature</dt>
          <dd>{slot.nature || "—"}</dd>
        </div>
        <div className={styles.field}>
          <dt>Slot</dt>
          <dd className={styles.mono}>{slot.slot}</dd>
        </div>
      </dl>

      <ul className={styles.moves}>
        {(slot.moves || []).filter(Boolean).map((m, i) => (
          <li key={i} className={styles.move}>
            <span className={styles.moveMarker} aria-hidden="true" />
            {m}
          </li>
        ))}
      </ul>
    </article>
  );
}