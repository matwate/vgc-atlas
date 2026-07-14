import { Link, useParams } from "react-router-dom";
import { useEffect } from "react";

import { api } from "../data/api.js";
import { useFetch } from "../hooks/useFetch.js";
import { TeraBadge } from "../components/primitives/TeraBadge.jsx";
import { Badge } from "../components/primitives/Badge.jsx";
import { TeamSlot } from "../components/team/TeamSlot.jsx";
import { ErrorState } from "../components/results/ErrorState.jsx";
import styles from "./TeamDetailView.module.css";

// Header hero for a team sheet — tournament name, placement summary, tera
// census across slots (who carries which tera type).
function TeamSummary({ team }) {
  const top = team.top_pct;
  const placementStr = team.place == null
    ? "—"
    : `#${team.place} of ${team.tourney_players ?? "?"}`;
  const topStr = top == null ? "—" : `${top.toFixed(1)}% top`;

  const teras = (team.slots || [])
    .map((s) => ({ slot: s.slot, tera: s.tera?.trim(), name: s.name }))
    .filter((x) => x.tera);

  return (
    <header className={styles.hero}>
      <div className={styles.crumbRow}>
        <Link to="/" className={styles.back}>
          <svg viewBox="0 0 10 16" width="9" height="14" aria-hidden="true">
            <path d="M8 1 L2 8 L8 15" stroke="currentColor" strokeWidth="1.6"
                  fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to search
        </Link>
        <Badge tone="neutral" mono>#{team.team_id}</Badge>
      </div>

      <h1 className={styles.name}>{team.tourney_name || "Untitled tournament"}</h1>

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>Top %</dt>
          <dd className={styles.statVal}>{topStr}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Placing</dt>
          <dd className={styles.statVal}>{placementStr}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Roster</dt>
          <dd className={styles.statVal}>{team.slots?.length ?? 6}</dd>
        </div>
      </dl>

      {teras.length > 0 && (
        <div className={styles.teras}>
          <span className={styles.terasLabel}>Tera</span>
          <ul className={styles.terasList}>
            {teras.map((t) => (
              <li key={`${t.slot}:${t.tera}`} className={styles.teraItem}>
                <TeraBadge type={t.tera}>{t.tera}</TeraBadge>
                <span className={styles.terasWho}>{t.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}

function TeamSlotSkeleton() {
  const Slot = () => (
    <article className={styles.skelSlot}>
      <div className={styles.skelHead}>
        <div className={`${styles.skel} ${styles.skelIdx}`} />
        <div className={`${styles.skel} ${styles.skelName}`} />
        <div className={`${styles.skel} ${styles.skelTera}`} />
      </div>
      <div className={styles.skelFields}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.skelField}>
            <div className={`${styles.skel} ${styles.skelLabel}`} />
            <div className={`${styles.skel} ${styles.skelValue}`} />
          </div>
        ))}
      </div>
      <div className={styles.skelMoves}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${styles.skel} ${styles.skelMove}`} />
        ))}
      </div>
    </article>
  );
  return <Slot />;
}

export function TeamDetailView() {
  const { teamId } = useParams();
  // Reset scroll position when team changes.
  useEffect(() => {
    document.querySelector("main")?.scrollTo?.(0, 0);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [teamId]);

  const req = useFetch(
    (s) => api.team(teamId),
    [teamId],
  );

  return (
    <div className={styles.page}>
      {req.error && <ErrorState error={req.error} />}

      {!req.error && !req.loading && req.data && (
        <>
          <TeamSummary team={req.data} />
          <div className={styles.sheet}>
            {(req.data.slots || []).map((s, i) => (
              <TeamSlot key={s.slot || i} slot={s} index={i} />
            ))}
          </div>
        </>
      )}

      {!req.error && req.loading && (
        <div className={styles.skeletonLayout}>
          <div className={`${styles.skel} ${styles.skelHero}`} />
          <div className={styles.sheet}>
            {Array.from({ length: 6 }).map((_, i) => (
              <TeamSlotSkeleton key={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}