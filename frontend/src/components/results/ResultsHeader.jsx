import { Badge } from "../primitives/Badge.jsx";
import styles from "./ResultsHeader.module.css";

// Sticky title above the list. Carries the active filter count + result count.
export function ResultsHeader({ count, hasFilters, onToggleRail, railLabel = "Filters" }) {
  return (
    <div className={styles.header}>
      <div className={styles.left}>
        <h2 className={styles.title}>
          {hasFilters ? "Matching teams" : "Top teams by placement"}
        </h2>
        {count != null && (
          <Badge tone={hasFilters ? "primary" : "neutral"} mono>
            {count}
          </Badge>
        )}
      </div>
      <button
        type="button"
        className={styles.railToggle}
        onClick={onToggleRail}
        aria-label="Open filters"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M2 4h12M4 8h8M6 12h4"
                stroke="currentColor" strokeWidth="1.6"
                strokeLinecap="round" fill="none" />
        </svg>
        {railLabel}
      </button>
    </div>
  );
}