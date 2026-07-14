import { useState } from "react";
import { TypeaheadCombobox } from "../TypeaheadCombobox.jsx";
import { ComboChip } from "./FilterChip.jsx";
import styles from "./ComboFilter.module.css";

// Manages a list of "pokemon:move" pairing chips, AND-across.
// Collapsed state shows existing chips + an "+ Add pairing" button.
// Expanded state renders two stacked comboboxes (pokemon, then move) with Add.
// Cancelling returns to collapsed without committing the draft.
export function ComboFilter({
  title = "Pairings",
  hint = "Specific Pokemon must know a specific move (AND across pairings)",
  catalog = { pokemon: [], moves: [] },
  value = [],
  onChange,
}) {
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState({ pokemon: "", move: "" });

  const pairs = value.map((c) => {
    const [p, m] = c.split(":");
    return { pokemon: p || "", move: m || "" };
  });

  function commitPairing() {
    if (!draft.pokemon || !draft.move) return;
    const combo = `${draft.pokemon}:${draft.move}`;
    if (!value.includes(combo)) onChange([...value, combo]);
    cancelDraft();
  }
  function cancelDraft() {
    setDraft({ pokemon: "", move: "" });
    setDrafting(false);
  }
  function removeAt(i) {
    const next = value.slice();
    next.splice(i, 1);
    onChange(next);
  }

  return (
    <div className={styles.group}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
      </div>
      <p className={styles.hint}>{hint}</p>

      {pairs.length > 0 && (
        <ul className={styles.chipRow}>
          {pairs.map((p, i) => (
            <li key={`${p.pokemon}:${p.move}`}>
              <ComboChip
                pokemon={p.pokemon}
                move={p.move}
                onRemove={() => removeAt(i)}
              />
            </li>
          ))}
        </ul>
      )}

      {drafting ? (
        <div className={styles.draft}>
          <TypeaheadCombobox
            values={catalog.pokemon}
            placeholder="Pokemon slug…"
            onAdd={(v) => { setDraft((d) => ({ ...d, pokemon: v })); }}
            onDismiss={cancelDraft}
            submitOnExact={false}
          />
          <span className={styles.x} aria-hidden="true">⨯</span>
          <TypeaheadCombobox
            values={catalog.moves}
            placeholder="Move slug…"
            onAdd={(v) => { setDraft((d) => ({ ...d, move: v })); }}
            onDismiss={cancelDraft}
            submitOnExact={false}
          />
          <div className={styles.draftActions}>
            <button
              type="button"
              className={styles.btnAdd}
              disabled={!draft.pokemon || !draft.move}
              onClick={commitPairing}
            >
              Add
            </button>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={cancelDraft}
              aria-label="Cancel pairing"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => setDrafting(true)}
        >
          + Add pairing
        </button>
      )}
    </div>
  );
}