import styles from "./ErrorState.module.css";

// Generic inline error block. Deeply accessible: role=alert + text that names
// the problem without irony.
export function ErrorState({ error, onRetry }) {
  const status = error?.status;
  const msg = error?.message ?? "Unknown error";
  return (
    <div className={styles.wrap} role="alert">
      <h3 className={styles.title}>Couldn’t load teams</h3>
      <p className={styles.body}>
        {status ? <span className={styles.status}>{status} · </span> : null}
        {msg}
      </p>
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}