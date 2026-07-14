import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

// Single source of truth for filter state: the URL query string.
// Mirrors every API param array via repeated params. SearchView debounces
// refetch from this state; increment setters rebuild the URL payload-ly.

const INT = (v, def=0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};
const STR = (v, def="") => (v == null ? def : v);

export function useSearchFilters() {
  const [params, setParams] = useSearchParams();

  const state = useMemo(() => ({
    pokemon:        params.getAll("pokemon"),
    pokemon_mode:   STR(params.get("pokemon_mode"), "all"),
    move:           params.getAll("move"),
    move_mode:      STR(params.get("move_mode"), "all"),
    combo:          params.getAll("combo"),
    item:           params.getAll("item"),
    ability:        params.getAll("ability"),
    tera:           params.getAll("tera"),
    nature:         params.getAll("nature"),
    min_players:    INT(params.get("min_players"), 0),
    tourney:        STR(params.get("tourney"), ""),
    sort_by:        STR(params.get("sort_by"), "top_pct"),
    limit:          INT(params.get("limit"), 25),
    offset:         INT(params.get("offset"), 0),
  }), [params]);

  const patch = useCallback((updater) => {
    setParams((cur) => {
      const next = new URLSearchParams(cur);
      updater(next);
      return next;
    }, { replace: false });
  }, [setParams]);

  // List helpers (each resets offset to 0 — a new filter set means new page 1).
  const addTo = useCallback((key) => (v) => {
    patch((p) => {
      if (p.getAll(key).includes(v)) return;
      p.append(key, v);
      p.set("offset", "0");
    });
  }, [patch]);

  const removeFrom = useCallback((key) => (v) => {
    patch((p) => {
      const all = p.getAll(key);
      p.delete(key);
      all.filter((x) => x !== v).forEach((x) => p.append(key, x));
    });
  }, [patch]);

  const setArr = useCallback((key) => (arr) => {
    patch((p) => {
      p.delete(key);
      arr.forEach((v) => p.append(key, v));
      p.set("offset", "0");
    });
  }, [patch]);

  const setVal = useCallback((key) => (v) => {
    patch((p) => {
      if (v === "" || v == null) p.delete(key);
      else p.set(key, v === 0 ? "0" : String(v));
      p.set("offset", "0");
    });
  }, [patch]);

  const setOffset = useCallback((v) => {
    patch((p) => { p.set("offset", String(Math.max(0, v))); });
  }, [patch]);

  const reset = useCallback(() => {
    setParams({}, { replace: false });
  }, [setParams]);

  const hasAnyFilter = useMemo(
    () =>
      state.pokemon.length > 0 ||
      state.move.length > 0 ||
      state.combo.length > 0 ||
      state.item.length > 0 ||
      state.ability.length > 0 ||
      state.tera.length > 0 ||
      state.nature.length > 0 ||
      state.min_players > 0 ||
      state.tourney.trim().length > 0,
    [state]
  );

  return { state, addTo, removeFrom, setArr, setVal, setOffset, reset, hasAnyFilter };
}