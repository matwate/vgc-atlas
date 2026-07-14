"""store.py — SQLite-backed reusable search core for VGC team data.

All filter tokens are normalized to slugs (see `normalize`) at DB build time,
so query-time matching is plain equality against indexed columns. Substring
matching is intentionally dropped: with combobox-driven canonical tokens you
get faster lookups and zero ambiguity.

Three thin faces consume this module:
    - search.py     (existing CLI; unchanged flags, rich output)
    - api.py        (FastAPI; JSON search/team/stats/catalog endpoints)
    - scripts/rebuild_store.py  (regenerates data/teams.db from teams.jsonl)
"""

from __future__ import annotations

import re
import sqlite3
import unicodedata
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional

DEFAULT_DB = Path(__file__).parent / "data" / "teams.db"


# --------------------------------------------------------------------------- #
# Normalization
# --------------------------------------------------------------------------- #
def normalize(text: str | None) -> str:
    if text is None:
        return ""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = text.lower().strip()
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"[^a-z0-9-]", "", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text


class MatchMode(str, Enum):
    all = "all"
    any = "any"


# --------------------------------------------------------------------------- #
# Data model (kept presentation-agnostic; rich tables in search.py read these)
# --------------------------------------------------------------------------- #
@dataclass
class Slot:
    slot: int
    id: str
    name: str
    item: str
    ability: str
    nature: str
    tera: str
    moves: list[str]


@dataclass
class Team:
    team_id: str
    tourney_name: str
    tourney_players: Optional[int]
    place: Optional[int]
    top_pct: Optional[float]
    slots: list[Slot] = field(default_factory=list)

    def pokemon_names(self) -> list[str]:
        return [s.name for s in self.slots]


@dataclass
class Stats:
    n_teams: int
    n_tournaments: int
    top_pokemon: list[tuple[str, str, int]]   # (display_name, canonical_slug, teams)


# --------------------------------------------------------------------------- #
# Store
# --------------------------------------------------------------------------- #
_SCHEMA = """
CREATE TABLE teams (
    team_id            TEXT PRIMARY KEY,
    tourney_name       TEXT,
    tourney_name_norm  TEXT,
    tourney_players    INTEGER,
    place              INTEGER,
    top_pct            REAL
);
CREATE TABLE slots (
    team_id           TEXT NOT NULL,
    slot_idx          INTEGER NOT NULL,
    pokemon_id        TEXT,
    pokemon_id_norm   TEXT,
    pokemon_name      TEXT,
    pokemon_name_norm TEXT,
    item              TEXT,
    item_norm         TEXT,
    ability           TEXT,
    ability_norm      TEXT,
    nature            TEXT,
    nature_norm       TEXT,
    tera              TEXT,
    tera_norm         TEXT
);
CREATE TABLE slot_moves (
    team_id   TEXT NOT NULL,
    slot_idx  INTEGER NOT NULL,
    move      TEXT,
    move_norm TEXT
);
CREATE INDEX idx_teams_tourney_norm ON teams(tourney_name_norm);
CREATE INDEX idx_teams_top_pct      ON teams(top_pct);
CREATE INDEX idx_teams_place        ON teams(place);
CREATE INDEX idx_slots_team         ON slots(team_id);
CREATE INDEX idx_slots_pid          ON slots(pokemon_id_norm);
CREATE INDEX idx_slots_pname        ON slots(pokemon_name_norm);
CREATE INDEX idx_slots_item         ON slots(item_norm);
CREATE INDEX idx_slots_ability      ON slots(ability_norm);
CREATE INDEX idx_slots_nature       ON slots(nature_norm);
CREATE INDEX idx_slots_tera         ON slots(tera_norm);
CREATE INDEX idx_moves_move         ON slot_moves(move_norm);
CREATE INDEX idx_moves_team_slot    ON slot_moves(team_id, slot_idx);
"""


def _row_to_team(cur: sqlite3.Cursor, row: sqlite3.Row) -> Team:
    team = Team(
        team_id=row["team_id"],
        tourney_name=row["tourney_name"] or "",
        tourney_players=row["tourney_players"],
        place=row["place"],
        top_pct=row["top_pct"],
    )
    cur.execute(
        """SELECT slot_idx, pokemon_id, pokemon_name, item, ability, nature, tera
           FROM slots WHERE team_id=? ORDER BY slot_idx""",
        (row["team_id"],),
    )
    for s in cur.fetchall():
        cur.execute(
            "SELECT move FROM slot_moves WHERE team_id=? AND slot_idx=? ORDER BY rowid",
            (row["team_id"], s["slot_idx"]),
        )
        moves = [m["move"] for m in cur.fetchall() if m["move"]]
        team.slots.append(
            Slot(
                slot=s["slot_idx"],
                id=s["pokemon_id"] or "",
                name=s["pokemon_name"] or "",
                item=s["item"] or "",
                ability=s["ability"] or "",
                nature=s["nature"] or "",
                tera=s["tera"] or "",
                moves=moves,
            )
        )
    return team


class SearchStore:
    """Read-only handle to teams.db. Safe to call concurrently; connections
    are opened per-call so an atomic DB swap (rebuild) never breaks in-flight
    reads."""

    def __init__(self, db_path: Path | str = DEFAULT_DB) -> None:
        self.db_path = Path(db_path)
        if not self.db_path.exists():
            raise FileNotFoundError(
                f"teams.db not found at {self.db_path}. "
                "Run: python scripts/rebuild_store.py"
            )

    def _conn(self) -> sqlite3.Connection:
        # mode=ro: never accidentally write; immutable=1: skip filesystem stat
        # checks per query (safe because rebuilds swap atomically via os.replace)
        uri = f"file:{self.db_path.as_posix()}?mode=ro&immutable=1"
        conn = sqlite3.connect(uri, uri=True, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    # ----- search -----------------------------------------------------------
    def search(
        self,
        *,
        pokemon: list[str] | None = None,
        pokemon_mode: MatchMode = MatchMode.all,
        moves: list[str] | None = None,
        move_mode: MatchMode = MatchMode.all,
        combos: list[tuple[str, str]] | None = None,
        items: list[str] | None = None,
        abilities: list[str] | None = None,
        teras: list[str] | None = None,
        natures: list[str] | None = None,
        min_players: int = 0,
        tourney_contains: str = "",
        sort_by: str = "top_pct",
        limit: int = 25,
        offset: int = 0,
    ) -> list[Team]:
        pokemon = [normalize(p) for p in (pokemon or []) if p]
        moves = [normalize(m) for m in (moves or []) if m]
        combos = [(normalize(p), normalize(m)) for p, m in (combos or [])]
        items = [normalize(i) for i in (items or []) if i]
        abilities = [normalize(a) for a in (abilities or []) if a]
        teras = [normalize(t) for t in (teras or []) if t]
        natures = [normalize(n) for n in (natures or []) if n]
        norm_tourney = normalize(tourney_contains) if tourney_contains else ""

        where: list[str] = []
        params: list[object] = []

        if min_players:
            where.append("t.tourney_players >= ?")
            params.append(min_players)
        if norm_tourney:
            where.append("t.tourney_name_norm LIKE ?")
            params.append(f"%{norm_tourney}%")

        # Pokémon filter (match against either id-slug or name-slug)
        if pokemon:
            if pokemon_mode == MatchMode.all:
                for p in pokemon:
                    where.append(
                        "EXISTS (SELECT 1 FROM slots s WHERE s.team_id=t.team_id "
                        "AND (s.pokemon_id_norm=? OR s.pokemon_name_norm=?))"
                    )
                    params.extend([p, p])
            else:  # any
                placeholders = ",".join("?" for _ in pokemon) * 2  # id list + name list
                ph = []
                for p in pokemon:
                    ph.extend([p, p])
                # use union-by-or via EXISTS with IN
                where.append(
                    "EXISTS (SELECT 1 FROM slots s WHERE s.team_id=t.team_id "
                    "AND (s.pokemon_id_norm IN (%s) OR s.pokemon_name_norm IN (%s)))"
                    % (",".join("?" for _ in pokemon), ",".join("?" for _ in pokemon))
                )
                params.extend(pokemon)
                params.extend(pokemon)

        # Move filter (some slot on the team knows the move)
        if moves:
            if move_mode == MatchMode.all:
                for m in moves:
                    where.append(
                        "EXISTS (SELECT 1 FROM slot_moves mv WHERE mv.team_id=t.team_id "
                        "AND mv.move_norm=?)"
                    )
                    params.append(m)
            else:
                where.append(
                    "EXISTS (SELECT 1 FROM slot_moves mv WHERE mv.team_id=t.team_id "
                    "AND mv.move_norm IN (%s))" % ",".join("?" for _ in moves)
                )
                params.extend(moves)

        # Combo: specific pokemon must know specific move (AND across combos)
        for p_needle, m_needle in combos:
            where.append(
                "EXISTS (SELECT 1 FROM slots s "
                "JOIN slot_moves mv ON mv.team_id=s.team_id AND mv.slot_idx=s.slot_idx "
                "WHERE s.team_id=t.team_id "
                "AND (s.pokemon_id_norm=? OR s.pokemon_name_norm=?) "
                "AND mv.move_norm=?)"
            )
            params.extend([p_needle, p_needle, m_needle])

        # Item / ability / tera / nature (AND across needles)
        for n in items:
            where.append(
                "EXISTS (SELECT 1 FROM slots s WHERE s.team_id=t.team_id AND s.item_norm=?)"
            )
            params.append(n)
        for n in abilities:
            where.append(
                "EXISTS (SELECT 1 FROM slots s WHERE s.team_id=t.team_id AND s.ability_norm=?)"
            )
            params.append(n)
        for n in teras:
            where.append(
                "EXISTS (SELECT 1 FROM slots s WHERE s.team_id=t.team_id AND s.tera_norm=?)"
            )
            params.append(n)
        for n in natures:
            where.append(
                "EXISTS (SELECT 1 FROM slots s WHERE s.team_id=t.team_id AND s.nature_norm=?)"
            )
            params.append(n)

        order = "place" if sort_by == "place" else "top_pct"
        sql = (
            "SELECT t.team_id, t.tourney_name, t.tourney_players, t.place, t.top_pct "
            "FROM teams t"
            + (" WHERE " + " AND ".join(where) if where else "")
            + f" ORDER BY (t.{order} IS NULL), t.{order} ASC, t.team_id ASC"
            + " LIMIT ? OFFSET ?"
        )
        params.extend([limit, offset])

        conn = self._conn()
        try:
            cur = conn.cursor()
            cur.execute(sql, params)
            rows = cur.fetchall()
            return [_row_to_team(cur, r) for r in rows]
        finally:
            conn.close()

    # ----- team detail ------------------------------------------------------
    def get_team(self, team_id: str) -> Optional[Team]:
        conn = self._conn()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT team_id, tourney_name, tourney_players, place, top_pct "
                "FROM teams WHERE team_id=?",
                (str(team_id),),
            )
            row = cur.fetchone()
            return _row_to_team(cur, row) if row else None
        finally:
            conn.close()

    # ----- stats ------------------------------------------------------------
    def stats(self, top_n: int = 20) -> Stats:
        conn = self._conn()
        try:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) AS n FROM teams")
            n_teams = cur.fetchone()["n"]
            cur.execute("SELECT COUNT(DISTINCT tourney_name) AS n FROM teams")
            n_tourneys = cur.fetchone()["n"]
            cur.execute(
                "SELECT pokemon_name AS name, pokemon_id_norm AS slug, COUNT(*) AS c "
                "FROM slots WHERE pokemon_name != '' "
                "GROUP BY pokemon_name, pokemon_id_norm "
                "ORDER BY c DESC, pokemon_name ASC LIMIT ?",
                (top_n,),
            )
            top = [(r["name"], r["slug"] or "", r["c"]) for r in cur.fetchall()]
            return Stats(n_teams=n_teams, n_tournaments=n_tourneys, top_pokemon=top)
        finally:
            conn.close()

    # ----- catalog (canonical tokens for comboboxes) ------------------------
    def catalog(self, kind: str) -> list[str]:
        kind = kind.lower()
        col_map = {
            "pokemon": ("DISTINCT pokemon_id_norm", "slots", "pokemon_id_norm"),
            "moves": ("DISTINCT move_norm", "slot_moves", "move_norm"),
            "items": ("DISTINCT item_norm", "slots", "item_norm"),
            "abilities": ("DISTINCT ability_norm", "slots", "ability_norm"),
            "teras": ("DISTINCT tera_norm", "slots", "tera_norm"),
            "natures": ("DISTINCT nature_norm", "slots", "nature_norm"),
        }
        if kind not in col_map:
            raise ValueError(f"unknown catalog kind: {kind}")
        sel, table, col = col_map[kind]
        conn = self._conn()
        try:
            cur = conn.cursor()
            cur.execute(
                f"SELECT {sel} AS v FROM {table} WHERE {col} != '' ORDER BY v ASC"
            )
            return [r["v"] for r in cur.fetchall()]
        finally:
            conn.close()


# --------------------------------------------------------------------------- #
# Schema bootstrap (used by rebuild_store.py)
# --------------------------------------------------------------------------- #
def init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript("PRAGMA journal_mode=WAL;")
    conn.executescript(_SCHEMA)