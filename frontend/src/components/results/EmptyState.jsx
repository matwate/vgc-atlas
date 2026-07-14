import { Link } from "react-router-dom";
import { Badge } from "../primitives/Badge.jsx";
import { PokemonIcon } from "../pokemon/PokemonIcon.jsx";
import { normalize } from "../../data/normalize.js";
import styles from "./EmptyState.module.css";

// No matches. The atlas-style empty state teaches the interface: shows the
// most-used Pokemon from /stats as a quick-start shortcut the user can click.
// Clicking a chip routes through the same useSearchFilters addTo("pokemon").
export function EmptyState({ onPick, topPokemon = [] }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.emo} aria-hidden="true">
        <svg viewBox="0 0 32 32" width="40" height="40">
          <circle cx="14" cy="14" r="9" fill="none" stroke="currentColor"
                  strokeWidth="1.6" opacity="0.85" />
          <path d="M21 21 L28 28" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" />
        </svg>
      </div>
      <h2 className={styles.title}>No matching teams</h2>
      <p className={styles.body}>
        Loosen a filter, flip a match mode to <em>Any</em>, or start fresh
        with one of the most-used Pokémon in the dataset.
      </p>
      {topPokemon.length > 0 && (
        <div className={styles.suggestions}>
          <span className={styles.label}>Top-used Pokémon</span>
          <ul className={styles.suggRow}>
            {topPokemon.slice(0, 12).map(({ name, slug, teams }) => (
              <li key={name}>
                <button
                  type="button"
                  className={styles.sugg}
                  onClick={() => onPick?.(name)}
                >
                  <PokemonIcon
                    slug={slug || normalize(name)}
                    name={name}
                    tier="pixel"
                    size="chip"
                    plate
                  />
                  <span className={styles.suggLabel}>{name}</span>
                  <Badge tone="neutral" mono>{teams}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Link to="/" className={styles.clear}>Reset all filters</Link>
    </div>
  );
}

export function WelcomeState({ topPokemon = [], totalTeams, onPick }) {
  const totalStr = totalTeams != null
    ? Number(totalTeams).toLocaleString()
    : "—";
  return (
    <div className={styles.welcome}>
      <div className={styles.welcomeInner}>
        <h2 className={styles.title}>Start scouting</h2>
        <p className={styles.body}>
          Search <b>{totalStr} winning teams</b> from real Champions VGC
          tournaments — by Pokémon, moves, items, abilities, tera types,
          and natures. Add the most-used Pokémon below to get going fast.
        </p>
        {topPokemon.length > 0 && (
          <div className={styles.suggestions}>
            <span className={styles.label}>Most-used Pokémon</span>
            <ul className={styles.suggRow}>
              {topPokemon.slice(0, 14).map(({ name, slug, teams }) => (
                <li key={name}>
                  <button
                    type="button"
                    className={styles.sugg}
                    onClick={() => onPick?.(name)}
                  >
                    <PokemonIcon
                      slug={slug || normalize(name)}
                      name={name}
                      tier="pixel"
                      size="chip"
                      plate
                    />
                    <span className={styles.suggLabel}>{name}</span>
                    <Badge tone="neutral" mono>{teams}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}