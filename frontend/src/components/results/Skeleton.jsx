import styles from "./Skeleton.module.css";

// Dense placeholders — product register: skeleton shimmer > spinner.
// TeamRow skeleton: visible while we wait for /search. The grid layout matches
// the real row so no layout shift on swap-in.
export function TeamRowSkeleton() {
  return (
    <div className={styles.row}>
      <div className={styles.rank}>
        <div className={`${styles.skel} ${styles.rankSkel}`} />
      </div>
      <div className={styles.place}>
        <div className={`${styles.skel} ${styles.topSkel}`} />
        <div className={`${styles.skel} ${styles.placingSkel}`} />
      </div>
      <div className={styles.main}>
        <div className={`${styles.skel} ${styles.tourneySkel}`} />
        <div className={styles.pokeRow}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${styles.skel} ${styles.pokeSkel}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TeamRowListSkeleton({ count = 8 }) {
  return (
    <div className={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <TeamRowSkeleton key={i} />
      ))}
    </div>
  );
}