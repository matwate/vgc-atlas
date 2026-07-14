import styles from "./ScalarControl.module.css";

// Compact labeled scalar inputs: text, number, select. Used in the filter rail
// for tourney substring, min players, sort, page size. No boxes — flat row.

export function TextControl({ id, label, hint, value, onChange, placeholder, pattern }) {
  return (
    <div className={styles.row}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      {hint && <p className={styles.hint}>{hint}</p>}
      <input
        id={id}
        type="text"
        className={styles.text}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        pattern={pattern}
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );
}

export function NumberControl({ id, label, hint, value, onChange, min = 0, max = 100000 }) {
  return (
    <div className={styles.row}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      {hint && <p className={styles.hint}>{hint}</p>}
      <input
        id={id}
        type="number"
        className={styles.text}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value || 0, 10))))}
      />
    </div>
  );
}

export function SelectControl({ id, label, hint, value, onChange, options }) {
  return (
    <div className={styles.row}>
      <label htmlFor={id} className={styles.label}>{label}</label>
      {hint && <p className={styles.hint}>{hint}</p>}
      <div className={styles.selectWrap}>
        <select
          id={id}
          className={styles.select}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <svg viewBox="0 0 10 6" width="10" height="6" aria-hidden="true"
             className={styles.chevron}>
          <path d="M1 1 L5 5 L9 1" stroke="currentColor" strokeWidth="1.5"
                fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}