import { Link } from "react-router-dom";
import { prettifySlug } from "../../data/normalize.js";
import { PokemonIcon } from "../pokemon/PokemonIcon.jsx";
import styles from "./TeamRow.module.css";

// One team row in the results list. Dense, scannable, clickable to detail.
// Design intent: this is the primary "find something to study" affordance.
// - The top% placement number is the loudest signal (cobalt primary).
// - Six mini pixel sprites carry the roster (decorative: aria-labels via the
//   cluster wrapper expose the names to AT without repeating them as text).
// - Tournament name + placing/players fill the secondary line.
export function TeamRow({ team, rank }) {
  const top = team.top_pct;
  const topStr = top == null ? "—" : `${top.toFixed(1)}%`;
  const place = team.place == null ? "—" : `#${team.place}`;
  const players = team.tourney_players == null ? "—" : `${team.tourney_players}p`;

  const slots = team.slots ?? [];
  // Build an accessible name for the sprite roster from the first six names.
  const rosterName = team.pokemon?.join(", ") || slots.map((s) => s.name).join(", ");

  return (
    <Link to={`/team/${team.team_id}`} className={styles.row} aria-label={`${team.tourney_name} — placement ${topStr}, roster: ${rosterName}`}>
      <div className={styles.rank}>
        <span className={styles.rankLabel} aria-hidden="true">Rank</span>
        <span className={styles.rankNum}>{rank ?? "–"}</span>
      </div>
      <div className={styles.placement}>
        <div className={styles.topPct}>{topStr}</div>
        <div className={styles.placing}>
          {place} <span className={styles.dot} aria-hidden="true">·</span> {players}
        </div>
      </div>
      <div className={styles.main}>
        <div className={styles.tourney}>{team.tourney_name || "Untitled tournament"}</div>
        <ul className={styles.roster} aria-label={`Roster: ${rosterName}`}>
          {slots.length > 0
            ? slots.map((s, i) => (
                <li key={i} className={styles.rosterItem}>
                  <PokemonIcon
                    slug={s.id || s.name}
                    name={s.name}
                    tier="pixel"
                    size="row"
                    plate
                  />
                </li>
              ))
            : team.pokemon?.map((p, i) => (
                <li key={i} className={styles.rosterItem}>
                  <PokemonIcon slug={p} name={p} tier="pixel" size="row" plate />
                </li>
              ))}
        </ul>
      </div>
      <div className={styles.chevron} aria-hidden="true">
        <svg viewBox="0 0 10 16" width="10" height="16">
          <path d="M2 1 L8 8 L2 15"
                stroke="currentColor" strokeWidth="1.6"
                fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  );
}