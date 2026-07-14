"""Flatten data/teams.jsonl into a tidy CSV (one row per Pokémon).

Output columns:
    team_id, place, slot, id, name, item, ability, nature, tera,
    attack_1, attack_2, attack_3, attack_4

Load with pandas:  pd.read_csv("data/teams_flat.csv")
Load with polars:  pl.read_csv("data/teams_flat.csv")
"""
import csv
import json
from pathlib import Path

SRC = Path("data/teams.jsonl")
DST = Path("data/teams_flat.csv")

COLS = [
    "team_id", "tourney_name", "tourney_players", "place", "top%", "slot",
    "id", "name", "item", "ability", "nature", "tera",
    "attack_1", "attack_2", "attack_3", "attack_4",
]


def main() -> None:
    n_teams = 0
    n_rows = 0
    with DST.open("w", newline="") as out:
        w = csv.DictWriter(out, fieldnames=COLS)
        w.writeheader()
        for team_id, line in enumerate(SRC.open()):
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            n_teams += 1
            team = rec.get("team")
            if not team:
                continue
            tourney_name = rec.get("tourney_name") or ""
            tourney_players = rec.get("tourney_players") or 0
            place_list = rec.get("place") or [None]
            place = place_list[0]
            if place is not None and tourney_players:
                try:
                    top_pct = round(float(place) / float(tourney_players) * 100, 2)
                except (TypeError, ValueError):
                    top_pct = ""
            else:
                top_pct = ""
            for slot, p in enumerate(team, 1):
                attacks = p.get("attacks") or []
                atk = (attacks + [None] * 4)[:4]
                w.writerow({
                    "team_id": team_id,
                    "tourney_name": tourney_name,
                    "tourney_players": tourney_players,
                    "place": "" if place is None else place,
                    "top%": top_pct,
                    "slot": slot,
                    "id": p.get("id", ""),
                    "name": p.get("name", ""),
                    "item": p.get("item", ""),
                    "ability": p.get("ability", ""),
                    "nature": p.get("nature", ""),
                    "tera": p.get("tera") or "",
                    "attack_1": atk[0] or "",
                    "attack_2": atk[1] or "",
                    "attack_3": atk[2] or "",
                    "attack_4": atk[3] or "",
                })
                n_rows += 1
    print(f"teams: {n_teams}  rows: {n_rows}  -> {DST}")


if __name__ == "__main__":
    main()
