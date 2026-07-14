import styles from "./Pagination.module.css";

// Atlas-grade pagination: First/Prev/Next/Last + numeric center label.
// Walks the dataset by offset + limit. Hides itself when count < limit.
export function Pagination({ offset, limit, count, total, onOffset, offsetFromUrl }) {
  if (offset === 0 && count < limit) return null;
  const effective = total ?? count;
  const last = Math.max(offset, count);  // we know at least this many rows exist
  const pageStart = offset + 1;
  const pageEnd = offset + count;

  const hasPrev = offset > 0;
  const hasNext = count === limit;
  return (
    <nav className={styles.nav} aria-label="Pagination">
      <div className={styles.range}>
        Showing
        <span className={styles.rangeNums}>
          {pageStart}–{pageEnd}
        </span>
        {effective != null ? <>of {effective}</> : <>so far</>}
      </div>
      <div className={styles.buttons}>
        <button
          type="button"
          className={styles.btn}
          disabled={!hasPrev}
          onClick={() => onOffset(Math.max(0, offset - limit))}
          aria-label="Previous page"
        >
          <svg viewBox="0 0 10 16" width="9" height="14" aria-hidden="true">
            <path d="M8 1 L2 8 L8 15" stroke="currentColor" strokeWidth="1.6"
                  fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Prev
        </button>
        <button
          type="button"
          className={styles.btn}
          disabled={!hasNext}
          onClick={() => onOffset(offset + limit)}
          aria-label="Next page"
        >
          Next
          <svg viewBox="0 0 10 16" width="9" height="14" aria-hidden="true">
            <path d="M2 1 L8 8 L2 15" stroke="currentColor" strokeWidth="1.6"
                  fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </nav>
  );
}