// Tiny catalog cache: pull each kind once per session. Cleared whenever
// the user triggers a fresh rebuild (future).
import { api } from "../data/api.js";

const cache = new Map();

export async function loadCatalog(kind, force = false) {
  if (!force && cache.has(kind)) return cache.get(kind);
  const res = await api.catalog(kind);
  const values = (res?.values ?? []).filter(Boolean);
  cache.set(kind, values);
  return values;
}

export function prefetchCatalog(kinds) {
  return Promise.all(kinds.map((k) => loadCatalog(k).catch(() => [])));
}

export function clearCatalog() { cache.clear(); }