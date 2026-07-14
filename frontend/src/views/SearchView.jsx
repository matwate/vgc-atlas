import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import { api } from "../data/api.js";
import { normalize } from "../data/normalize.js";
import { useFetch } from "../hooks/useFetch.js";
import { useDebounced } from "../hooks/useDebounced.js";
import { useSearchFilters } from "../hooks/useSearchFilters.js";
import { prefetchCatalog, loadCatalog } from "../hooks/useCatalog.js";

import { FilterRail } from "../components/filters/FilterRail.jsx";
import { ResultsHeader } from "../components/results/ResultsHeader.jsx";
import { TeamRow } from "../components/results/TeamRow.jsx";
import { TeamRowListSkeleton } from "../components/results/Skeleton.jsx";
import { EmptyState, WelcomeState } from "../components/results/EmptyState.jsx";
import { ErrorState } from "../components/results/ErrorState.jsx";
import { Pagination } from "../components/results/Pagination.jsx";

import styles from "./SearchView.module.css";

export function SearchView() {
  const filters = useSearchFilters();
  const { state, hasAnyFilter, setOffset } = filters;

  // Catalog: load once per session, fill in incrementally so each group renders
  // as soon as its data arrives. Keeping the empty catalog visible until then
  // avoids layout shift from the "Add" button.
  const [catalog, setCatalog] = useState({
    pokemon: [], moves: [], items: [], abilities: [], teras: [], natures: [],
  });
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadCatalog("pokemon"), loadCatalog("moves"),
      loadCatalog("items"),   loadCatalog("abilities"),
      loadCatalog("teras"),   loadCatalog("natures"),
    ]).then(([pokemon, moves, items, abilities, teras, natures]) => {
      if (!cancelled) setCatalog({ pokemon, moves, items, abilities, teras, natures });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Dataset stats feed the welcome-state quick-start prompts.
  const statsReq = useFetch((s) => api.stats(24), []);

  // Debounce filter changes (not pagination) so typing in the tourney field
  // or rapidly toggling chips doesn't starve the API. Pagination stays live.
  const debouncedFiltersKey = useDebounced(JSON.stringify({
    pokemon: state.pokemon, pokemon_mode: state.pokemon_mode,
    move: state.move, move_mode: state.move_mode,
    combo: state.combo,
    item: state.item, ability: state.ability,
    tera: state.tera, nature: state.nature,
    min_players: state.min_players, tourney: state.tourney,
    sort_by: state.sort_by, limit: state.limit,
  }), 280);

  const searchArgs = useMemo(
    () => {
      try { return JSON.parse(debouncedFiltersKey); }
      catch { return {}; }
    },
    [debouncedFiltersKey]
  );

  // When no filter is set, don't call /search at all — the Welcome state is
  // the whole first view, fed by /stats for the quick-start prompts. The first
  // real query fires when a filter chip lands or the user types in tourney.
  const hasArgs = hasAnyFilter || state.tourney.trim().length > 0;
  const searchReq = useFetch(
    hasArgs
      ? (s) => api.search({
          ...searchArgs,
          offset: state.offset,
          limit: searchArgs.limit || 25,
        })
      : () => Promise.resolve(undefined),
    [hasArgs, debouncedFiltersKey, state.offset],
    { keepPrevious: true }
  );

  // Mobile rail toggle.
  const [railOpen, setRailOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => { setRailOpen(false); }, [loc]);

  const topPokemon = statsReq.data?.top_pokemon ?? [];

  const teams = searchReq.data?.teams ?? [];
  const firstLoading = hasArgs && searchReq.loading && !searchReq.data;
  const refreshing = hasArgs && searchReq.loading && !!searchReq.data;
  // Welcome state dominates the first view when no filter is set, regardless of
  // whether /search would return rows. EmptyState only fires when the user has
  // actually narrowed with filters and there's nothing to show.
  const showWelcome = !hasAnyFilter && !searchReq.error;
  const showEmpty = hasAnyFilter && !firstLoading && !searchReq.error && teams.length === 0;
  const showList = hasArgs && searchReq.data && searchReq.data.teams.length > 0;

  function pickPokemon(name) {
    filters.addTo("pokemon")(normalize(name));
  }

  return (
    <div className={styles.shell}>
      <FilterRail
        catalog={catalog}
        filters={filters}
        open={railOpen}
        forceClose={() => setRailOpen(false)}
      />

      {railOpen && (
        <button
          type="button"
          className={styles.backdrop}
          aria-label="Close filters"
          onClick={() => setRailOpen(false)}
        />
      )}

      <section className={styles.results} aria-label="Search results">
        {!showWelcome && (
          <ResultsHeader
            count={searchReq.data?.count}
            hasFilters={hasAnyFilter}
            onToggleRail={() => setRailOpen(true)}
          />
        )}

        {searchReq.error && (
          <ErrorState error={searchReq.error} />
        )}

        {showWelcome && !searchReq.error && (
          <WelcomeState
            topPokemon={topPokemon}
            totalTeams={statsReq.data?.teams}
            onPick={pickPokemon}
          />
        )}

        {showEmpty && (
          topPokemon.length > 0 ? (
            <EmptyState topPokemon={topPokemon} onPick={pickPokemon} />
          ) : (
            <EmptyState onPick={pickPokemon} />
          )
        )}

        {firstLoading && (
          <TeamRowListSkeleton count={Math.min(searchArgs.limit || 25, 10)} />
        )}

        {hasArgs && searchReq.data && searchReq.data.teams.length > 0 && (
          <>
            <div className={styles.list} data-stale={refreshing ? "true" : "false"}>
              {searchReq.data.teams.map((t, i) => (
                <TeamRow
                  key={t.team_id}
                  team={t}
                  rank={searchReq.data.offset + i + 1}
                />
              ))}
            </div>
            <Pagination
              offset={searchReq.data.offset}
              limit={searchArgs.limit || 25}
              count={searchReq.data.teams.length}
              offsetFromUrl={state.offset}
              onOffset={setOffset}
            />
          </>
        )}
      </section>
    </div>
  );
}