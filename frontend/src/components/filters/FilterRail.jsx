import { FilterGroup } from "./FilterGroup.jsx";
import { ComboFilter } from "./ComboFilter.jsx";
import { TextControl, NumberControl, SelectControl } from "./ScalarControl.jsx";
import styles from "./FilterRail.module.css";

// The left rail. Hosts all filters. Calls into useSearchFilters handlers.
// Catalog is fetched once in SearchView and passed in.
export function FilterRail({ catalog, filters, open, forceClose }) {
  const { state, addTo, removeFrom, setArr, setVal } = filters;

  return (
    <aside className={styles.rail} aria-label="Filters" data-open={open ? "true" : "false"}>
      <div className={styles.railHead}>
        <h2 className={styles.railTitle}>Filters</h2>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={forceClose}
          aria-label="Close filters"
        >
          <svg viewBox="0 0 10 10" width="12" height="12" aria-hidden="true">
            <path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5"
                  stroke="currentColor" strokeWidth="1.4"
                  strokeLinecap="round" fill="none" />
          </svg>
        </button>
      </div>

      <div className={styles.groups}>
        <FilterGroup
          id="pokemon"
          title="Pokémon"
          hint="Slug from the catalog. Repeatable; toggle All / Any."
          values={catalog.pokemon}
          selected={state.pokemon}
          onAdd={addTo("pokemon")}
          onRemove={removeFrom("pokemon")}
          mode={state.pokemon_mode}
          onModeChange={setVal("pokemon_mode")}
          placeholder="Try dragapult…"
        />
        <FilterGroup
          id="move"
          title="Moves"
          hint="Some Pokémon on the team must know each move."
          values={catalog.moves}
          selected={state.move}
          onAdd={addTo("move")}
          onRemove={removeFrom("move")}
          mode={state.move_mode}
          onModeChange={setVal("move_mode")}
          placeholder="Try protect…"
        />
        <ComboFilter
          title="Pairings"
          hint="A specific Pokémon must know a specific move (AND across pairings)."
          catalog={catalog}
          value={state.combo}
          onChange={setArr("combo")}
        />
        <FilterGroup
          id="item"
          title="Items"
          hint="A held item somewhere on the team."
          values={catalog.items}
          selected={state.item}
          onAdd={addTo("item")}
          onRemove={removeFrom("item")}
          placeholder="Try safety-goggles…"
        />
        <FilterGroup
          id="ability"
          title="Abilities"
          hint="Ability somewhere on the team."
          values={catalog.abilities}
          selected={state.ability}
          onAdd={addTo("ability")}
          onRemove={removeFrom("ability")}
          placeholder="Try intimidate…"
        />
        <FilterGroup
          id="tera"
          title="Tera Types"
          hint="At least one Pokémon must tera into this type."
          values={catalog.teras}
          selected={state.tera}
          onAdd={addTo("tera")}
          onRemove={removeFrom("tera")}
          placeholder="Try electric…"
        />
        <FilterGroup
          id="nature"
          title="Natures"
          hint="A nature somewhere on the team."
          values={catalog.natures}
          selected={state.nature}
          onAdd={addTo("nature")}
          onRemove={removeFrom("nature")}
          placeholder="Try jolly…"
        />
        <TextControl
          id="tourney"
          label="Tournament contains"
          hint="Substring of tournament name (e.g. “Mesa”)."
          value={state.tourney}
          onChange={setVal("tourney")}
          placeholder="Try mesa…"
        />
        <NumberControl
          id="min_players"
          label="Min tournament players"
          hint="Ignore tiny tournaments — reduces small-bracket bias."
          value={state.min_players}
          min={0}
          max={10000}
          onChange={setVal("min_players")}
        />
        <SelectControl
          id="sort"
          label="Sort by"
          value={state.sort_by}
          onChange={setVal("sort_by")}
          options={[
            { value: "top_pct", label: "Top % (lower = better)" },
            { value: "place", label: "Raw placing" },
          ]}
        />
        <NumberControl
          id="limit"
          label="Page size"
          value={state.limit}
          min={5}
          max={100}
          onChange={setVal("limit")}
        />
      </div>
    </aside>
  );
}