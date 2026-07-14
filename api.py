"""api.py — FastAPI exposing the SQLite-backed VGC team search.

Run:
    uvicorn api:app --host 127.0.0.1 --port 8000

Endpoints:
    GET /search        — mirror of the CLI flags, returns JSON teams
    GET /team/{id}     — full slot breakdown of one team
    GET /stats         — dataset stats (teams, tournaments, top pokemon)
    GET /catalog/{kind} — canonical slugs for comboboxes
                          kind ∈ {pokemon, moves, items, abilities, teras, natures}
    POST /rebuild      — trigger an immediate store rebuild (atomic swap)

A BackgroundTasks loop rebuilds data/teams.db from data/teams.jsonl every
REFRESH_INTERVAL_SECONDS so the API keeps serving fresh tournament data
without ever blocking on a scrape. The rebuild is atomic (os.replace), so
in-flight queries against the old file complete normally.
"""
from __future__ import annotations
import fetcher

import asyncio
import functools
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.concurrency import run_in_threadpool

import scripts.rebuild_store as rebuilder
import scripts.fetch_new_data as fetcher
from store import DEFAULT_DB, MatchMode, SearchStore, Team

REFRESH_INTERVAL_SECONDS = 6 * 60 * 60   # 6h
SRC_JSONL = Path("data/teams.jsonl")


# --------------------------------------------------------------------------- #
# Serializers — keep API output independent of the dataclass shape
# --------------------------------------------------------------------------- #
def slot_to_dict(s):
    return {
        "slot": s.slot,
        "id": s.id,
        "name": s.name,
        "item": s.item,
        "ability": s.ability,
        "nature": s.nature,
        "tera": s.tera,
        "moves": s.moves,
    }


def team_to_dict(t: Team) -> dict:
    return {
        "team_id": t.team_id,
        "tourney_name": t.tourney_name,
        "tourney_players": t.tourney_players,
        "place": t.place,
        "top_pct": t.top_pct,
        "slots": [slot_to_dict(s) for s in t.slots],
        "pokemon": t.pokemon_names(),
    }


# --------------------------------------------------------------------------- #
# Catalog caching — only changes on rebuild, so memoize forever per process
# --------------------------------------------------------------------------- #
@functools.lru_cache(maxsize=None)
def _catalog_cached(kind: str) -> list[str]:
    store = SearchStore()
    return store.catalog(kind)


def _fresh_store() -> SearchStore:
    try:
        return SearchStore()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


# --------------------------------------------------------------------------- #
# Rebuild loop
# --------------------------------------------------------------------------- #
async def _rebuild_loop(app: FastAPI) -> None:
    while True:
        try:

            await run_in_threadpool(fetcher.update_new_tournaments)
            await run_in_threadpool(rebuilder.build, rebuilder.SRC, rebuilder.DST)
            _catalog_cached.cache_clear()
            print("[api] rebuilt teams.db")
        except Exception as e:  # noqa: BLE001
            print(f"[api] rebuild failed: {e!r}")
        await asyncio.sleep(REFRESH_INTERVAL_SECONDS)


# --------------------------------------------------------------------------- #
# App
# --------------------------------------------------------------------------- #
app = FastAPI(title="VGC Team Search API", version="0.1.0")


@app.on_event("startup")
async def _startup() -> None:
    # Ensure a DB exists on boot; rebuild synchronously if missing.
    if not DEFAULT_DB.exists():
        print("[api] teams.db missing, running initial rebuild…")
        await run_in_threadpool(rebuilder.build, rebuilder.SRC, rebuilder.DST)
        _catalog_cached.cache_clear()
    asyncio.create_task(_rebuild_loop(app))


@app.get("/search")
async def search(
    pokemon: list[str] = Query(default=[], alias="pokemon", description="Pokémon slug; repeatable."),
    pokemon_mode: MatchMode = Query(default=MatchMode.all),
    move: list[str] = Query(default=[], alias="move", description="Move slug; repeatable."),
    move_mode: MatchMode = Query(default=MatchMode.all),
    combo: list[str] = Query(
        default=[], alias="combo", description="'pokemon:move'; repeatable, always AND."
    ),
    item: list[str] = Query(default=[]),
    ability: list[str] = Query(default=[]),
    tera: list[str] = Query(default=[]),
    nature: list[str] = Query(default=[]),
    min_players: int = Query(default=0, ge=0),
    tourney: str = Query(default="", description="Substring of tournament name."),
    sort_by: str = Query(default="top_pct", pattern="^(top_pct|place)$"),
    limit: int = Query(default=25, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    show_team: bool = Query(default=True, description="Include per-slot details."),
):
    """Search teams by pokemon/moves/items/abilities/tera/nature, ranked."""
    store = _fresh_store()
    parsed_combos: list[tuple[str, str]] = []
    for c in combo:
        if ":" in c:
            p, m = c.split(":", 1)
        elif "=" in c:
            p, m = c.split("=", 1)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"combo '{c}' must be 'pokemon:move'",
            )
        parsed_combos.append((p, m))

    teams = await run_in_threadpool(
        store.search,
        pokemon=pokemon,
        pokemon_mode=pokemon_mode,
        moves=move,
        move_mode=move_mode,
        combos=parsed_combos,
        items=item,
        abilities=ability,
        teras=tera,
        natures=nature,
        min_players=min_players,
        tourney_contains=tourney,
        sort_by=sort_by,
        limit=limit,
        offset=offset,
    )
    payload = {
        "count": len(teams),
        "limit": limit,
        "offset": offset,
        "teams": [team_to_dict(t) for t in teams],
    }
    # Skip fetching slot details when caller asks to keep response light.
    if not show_team:
        for t in payload["teams"]:
            t.pop("slots", None)
    return payload


@app.get("/team/{team_id}")
async def team_detail(team_id: str):
    store = _fresh_store()
    t = await run_in_threadpool(store.get_team, team_id)
    if t is None:
        raise HTTPException(status_code=404, detail=f"team {team_id} not found")
    return team_to_dict(t)


@app.get("/stats")
async def stats(top: int = Query(default=20, ge=1, le=100)):
    store = _fresh_store()
    s = await run_in_threadpool(store.stats, top)
    return {
        "teams": s.n_teams,
        "tournaments": s.n_tournaments,
        "top_pokemon": [{"name": n, "slug": s, "teams": c} for n, s, c in s.top_pokemon],
    }


@app.get("/catalog/{kind}")
async def catalog(kind: str):
    if kind not in {"pokemon", "moves", "items", "abilities", "teras", "natures"}:
        raise HTTPException(status_code=400, detail=f"unknown catalog kind: {kind}")
    return {"kind": kind, "values": _catalog_cached(kind)}


@app.post("/rebuild")
async def rebuild_now():
    """Trigger an immediate store rebuild (atomic swap)."""
    await run_in_threadpool(rebuilder.build, rebuilder.SRC, rebuilder.DST)
    _catalog_cached.cache_clear()
    return {"ok": True, "db": str(rebuilder.DST)}


@app.get("/health")
async def health():
    return {
        "ok": DEFAULT_DB.exists(),
        "db": str(DEFAULT_DB),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=False)
