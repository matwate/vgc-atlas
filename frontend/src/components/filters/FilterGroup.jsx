import { useState } from "react";
import { TypeaheadCombobox } from "../TypeaheadCombobox.jsx";
import { FilterChip } from "./FilterChip.jsx";
import { SegmentedToggle } from "../primitives/SegmentedToggle.jsx";
import styles from "./FilterGroup.module.css";

// One labeled filter group in the rail: chips of selected slugs + an
// "Add" affordance (replaced inline by a combobox). Optionally shows an
// All/Any segmented toggle when `mode` + `onModeChange` exist.
export function FilterGroup({
  id,
  title,
  hint,
  values = [],
  selected = [],
  onAdd,
  onRemove,
  mode = null,
  onModeChange = null,
  placeholder = "Search…",
}) {
  const [adding, setAdding] = useState(false);
  return (
    <div className={styles.group}>
      <div className={styles.head}>
        <label htmlFor={`${id}-add`} className={styles.title}>{title}</label>
        {mode && onModeChange && (
          <SegmentedToggle
            aria-label={`${title} match mode`}
            value={mode}
            options={[
              { value: "all", label: "All" },
              { value: "any", label: "Any" },
            ]}
            onChange={onModeChange}
          />
        )}
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}

      <div className={styles.body}>
        {selected.length > 0 && (
          <ul className={styles.chipRow}>
            {selected.map((v) => (
              <li key={v}>
                <FilterChip value={v} onRemove={() => onRemove(v)} />
              </li>
            ))}
          </ul>
        )}

        {adding ? (
          <TypeaheadCombobox
            values={values}
            excluded={selected}
            placeholder={placeholder}
            onAdd={(v) => { onAdd(v); setAdding(true); }}
            onDismiss={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            id={`${id}-add`}
            className={styles.addBtn}
            onClick={() => setAdding(true)}
          >
            + Add {title.toLowerCase()}
            {selected.length > 0 && selected.length < 7 ? "" : ""}
          </button>
        )}
      </div>
    </div>
  );
}