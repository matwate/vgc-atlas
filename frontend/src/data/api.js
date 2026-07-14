const BASE = "/api";

async function getJSON(path, { signal } = {}) {
  const res = await fetch(`${BASE}${path}`, { signal });
  if (!res.ok) {
    let msg;
    try {
      const body = await res.json();
      msg = body.detail || body.message || res.statusText;
    } catch {
      msg = res.statusText;
    }
    const err = new Error(`${res.status}: ${msg}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  search(params) {
    const u = new URLSearchParams();
    const append = (k, v) => v !== "" && v !== null && v !== undefined && u.append(k, v);
    (params.pokemon || []).forEach((p) => append("pokemon", p));
    if (params.pokemon_mode) append("pokemon_mode", params.pokemon_mode);
    (params.move || []).forEach((m) => append("move", m));
    if (params.move_mode)  append("move_mode", params.move_mode);
    (params.combo || []).forEach((c) => append("combo", c));
    (params.item || []).forEach((v) => append("item", v));
    (params.ability || []).forEach((v) => append("ability", v));
    (params.tera || []).forEach((v) => append("tera", v));
    (params.nature || []).forEach((v) => append("nature", v));
    append("min_players", params.min_players || 0);
    append("tourney", params.tourney || "");
    append("sort_by", params.sort_by);
    append("limit", params.limit);
    append("offset", params.offset);
    return getJSON(`/search?${u.toString()}`);
  },

  team(id)        { return getJSON(`/team/${encodeURIComponent(id)}`); },
  stats(top = 20) { return getJSON(`/stats?top=${top}`); },
  catalog(kind)   { return getJSON(`/catalog/${encodeURIComponent(kind)}`); },
};