"""Rebuild data/teams.db from data/teams.jsonl.

Atomic swap: writes to data/teams.db.new, then os.replace()s onto the live
file. Concurrent read-only connections (e.g. a running API server) finish
their queries against the old inode; new connections pick up the new one.

Usage:
    python scripts/rebuild_store.py
    python scripts/rebuild_store.py --src data/teams.jsonl --dst data/teams.db
"""
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import tempfile
from pathlib import Path

from store import DEFAULT_DB, init_schema, normalize

SRC = Path("data/teams.jsonl")
DST = Path(DEFAULT_DB)


def _top_pct(place, players):
    if place is None or not players:
        return None
    try:
        return round(float(place) / float(players) * 100, 2)
    except (TypeError, ValueError):
        return None


def build(src: Path, dst: Path) -> tuple[int, int]:
    n_teams = 0
    n_slots = 0

    tmp_path = str(dst) + ".new"
    if os.path.exists(tmp_path):
        os.remove(tmp_path)

    conn = sqlite3.connect(tmp_path)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA journal_mode=WAL;")
        init_schema(conn)
        conn.execute("PRAGMA foreign_keys=OFF;")
        conn.execute("BEGIN;")

        team_rows = []
        slot_rows = []
        move_rows = []

        for team_id, line in enumerate(src.open()):
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            team = rec.get("team")
            if not team:
                continue

            n_teams += 1
            tourney_name = rec.get("tourney_name") or ""
            tourney_players = rec.get("tourney_players") or 0
            place_list = rec.get("place") or [None]
            place = place_list[0] if place_list else None
            top_pct = _top_pct(place, tourney_players)

            team_rows.append(
                (
                    str(team_id),
                    tourney_name,
                    normalize(tourney_name),
                    int(tourney_players) if tourney_players else None,
                    int(place) if place is not None else None,
                    top_pct,
                )
            )

            for slot_idx, p in enumerate(team, 1):
                n_slots += 1
                pid = p.get("id", "") or ""
                pname = p.get("name", "") or ""
                item = p.get("item", "") or ""
                ability = p.get("ability", "") or ""
                nature = p.get("nature", "") or ""
                tera = p.get("tera") or ""
                slot_rows.append(
                    (
                        str(team_id),
                        slot_idx,
                        pid, normalize(pid),
                        pname, normalize(pname),
                        item, normalize(item),
                        ability, normalize(ability),
                        nature, normalize(nature),
                        tera or "", normalize(tera) if tera else "",
                    )
                )
                for m in (p.get("attacks") or []):
                    if not m:
                        continue
                    move_rows.append((str(team_id), slot_idx, m, normalize(m)))

        conn.executemany(
            "INSERT INTO teams (team_id, tourney_name, tourney_name_norm, "
            "tourney_players, place, top_pct) VALUES (?, ?, ?, ?, ?, ?)",
            team_rows,
        )
        conn.executemany(
            "INSERT INTO slots (team_id, slot_idx, pokemon_id, pokemon_id_norm, "
            "pokemon_name, pokemon_name_norm, item, item_norm, ability, ability_norm, "
            "nature, nature_norm, tera, tera_norm) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            slot_rows,
        )
        conn.executemany(
            "INSERT INTO slot_moves (team_id, slot_idx, move, move_norm) "
            "VALUES (?, ?, ?, ?)",
            move_rows,
        )
        conn.execute("COMMIT;")
        conn.execute("PRAGMA optimize;")
        conn.commit()
    finally:
        conn.close()

    os.replace(tmp_path, dst)
    return n_teams, n_slots


def main() -> None:
    ap = argparse.ArgumentParser(description="Rebuild teams.db from teams.jsonl")
    ap.add_argument("--src", type=Path, default=SRC)
    ap.add_argument("--dst", type=Path, default=DST)
    args = ap.parse_args()

    dst = args.dst
    dst.parent.mkdir(parents=True, exist_ok=True)

    n_teams, n_slots = build(args.src, dst)
    size_mb = dst.stat().st_size / (1024 * 1024)
    print(
        f"Built {dst} : teams={n_teams}  slots={n_slots}  "
        f"size={size_mb:.2f} MB"
    )


if __name__ == "__main__":
    main()