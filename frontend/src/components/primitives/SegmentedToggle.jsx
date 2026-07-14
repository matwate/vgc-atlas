import styles from "./SegmentedToggle.module.css";

// Two-or-three-option toggle for All/Any mode switches.
// Accessible: rendered as a radiogroup; arrow keys move between options.
export function SegmentedToggle({ "aria-label": ariaLabel, value, options, onChange }) {
  function onKeyDown(e, idx) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = options[(idx + 1) % options.length];
      onChange(next.value);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = options[(idx - 1 + options.length) % options.length];
      onChange(prev.value);
    }
  }
  return (
    <div
      className={styles.group}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            type="button"
            role="radio"
            key={opt.value}
            aria-checked={active}
            className={`${styles.option} ${active ? styles.active : ""}`}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}