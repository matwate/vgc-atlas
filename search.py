#!/usr/bin/env python3
"""
search.py — Search VGC (Pokémon Champions) team placement data.

Thin CLI face over `store.SearchStore` (SQLite-backed). Flags and output are
unchanged from the previous CSV-scanning version; queries now run against
indexed columns so dataset size no longer affects latency.

Usage examples:
    python search.py search --pokemon dragapult
    python search.py search -p charizard -p pelipper --pokemon-mode all
    python search.py search -m "heat wave" -m protect
    python search.py search -c "charizard:heat wave" -c "pelipper:tailwind"
    python search.py search -p incineroar --item "Safety Goggles"
    python search.py search -p "rotom-wash" --tera electric --min-players 16
    python search.py search -p flutter-mane --limit 10 --show-team
"""

from __future__ import annotations

from enum import Enum
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from store import DEFAULT_DB, MatchMode, SearchStore, Team

app = typer.Typer(add_completion=False, help="Search VGC (Pokémon Champions) team placement data.")
console = Console()


class SearchMatchers(str, Enum):
    all = "all"
    any = "any"


# --------------------------------------------------------------------------- #
# Presentation
# --------------------------------------------------------------------------- #
def render_results(teams: list[Team], show_team: bool, limit: int) -> None:
    if not teams:
        console.print("[yellow]No teams matched your filters.[/yellow]")
        return

    table = Table(title=f"Matching teams (showing {min(limit, len(teams))} of {len(teams)})")
    table.add_column("Top %", justify="right", style="bold green")
    table.add_column("Place", justify="right")
    table.add_column("Players", justify="right")
    table.add_column("Tournament", overflow="fold")
    if show_team:
        table.add_column("Team", overflow="fold")
    for t in teams[:limit]:
        top_pct = f"{t.top_pct:.1f}%" if t.top_pct is not None else "—"
        place = str(t.place) if t.place is not None else "—"
        players = str(t.tourney_players) if t.tourney_players is not None else "—"
        row = [top_pct, place, players, t.tourney_name]
        if show_team:
            row.append(", ".join(t.pokemon_names()))
        table.add_row(*row)

    console.print(table)


def render_team_detail(team: Team) -> None:
    top_pct = f"{team.top_pct:.1f}%" if team.top_pct is not None else "—"
    console.print(
        f"\n[bold]{team.tourney_name}[/bold]  "
        f"(place {team.place}/{team.tourney_players}, top {top_pct})"
    )
    table = Table(show_header=True, header_style="bold cyan")
    for col in ["Pokémon", "Item", "Ability", "Nature", "Tera", "Moves"]:
        table.add_column(col, overflow="fold")
    for s in team.slots:
        table.add_row(
            s.name, s.item, s.ability, s.nature, s.tera or "—", ", ".join(m for m in s.moves if m)
        )
    console.print(table)


def parse_combo(raw: str) -> tuple[str, str]:
    """Parse 'pokemon:move' or 'pokemon=move' into (pokemon, move)."""
    for sep in (":", "="):
        if sep in raw:
            poke, move = raw.split(sep, 1)
            return poke, move
    raise typer.BadParameter(
        f"Combo filter '{raw}' must be in the form 'pokemon:move', e.g. 'charizard:heat wave'"
    )


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
@app.command()
def search(
    pokemon: list[str] = typer.Option(
        [], "--pokemon", "-p", help="Pokémon that must appear on the team. Repeatable."
    ),
    pokemon_mode: SearchMatchers = typer.Option(
        SearchMatchers.all, "--pokemon-mode", help="Require ALL or ANY of --pokemon to be present."
    ),
    move: list[str] = typer.Option(
        [], "--move", "-m", help="Move that some Pokémon on the team must know. Repeatable."
    ),
    move_mode: SearchMatchers = typer.Option(
        SearchMatchers.all, "--move-mode", help="Require ALL or ANY of --move to be present."
    ),
    combo: list[str] = typer.Option(
        [],
        "--combo",
        "-c",
        help="Specific pokemon+move pairing, e.g. -c 'charizard:heat wave'. Repeatable, always AND.",
    ),
    item: list[str] = typer.Option([], "--item", help="Held item that must appear somewhere on the team."),
    ability: list[str] = typer.Option([], "--ability", help="Ability that must appear somewhere on the team."),
    tera: list[str] = typer.Option([], "--tera", help="Tera type that must appear somewhere on the team."),
    nature: list[str] = typer.Option([], "--nature", help="Nature that must appear somewhere on the team."),
    min_players: int = typer.Option(
        0, "--min-players", help="Ignore tournaments with fewer than this many players (reduces small-bracket bias)."
    ),
    tourney_contains: str = typer.Option(
        "", "--tourney", help="Only include tournaments whose name contains this substring."
    ),
    sort_by: str = typer.Option(
        "top_pct", "--sort-by", help="Sort by 'top_pct' (default, lower/better first) or 'place'."
    ),
    limit: int = typer.Option(25, "--limit", "-n", help="Max number of teams to display."),
    show_team: bool = typer.Option(
        False, "--show-team/--no-show-team", help="Show the full 6-mon lineup inline in the results table."
    ),
    detail: bool = typer.Option(
        False, "--detail", help="After the summary table, print full team sheets for the matches."
    ),
    db_path: Path = typer.Option(DEFAULT_DB, "--db", help="Path to the teams.db SQLite file."),
):
    """
    Search teams by Pokémon / moves / items / abilities / tera, ranked by
    tournament top% (place / players) so results aren't biased toward tiny
    tournaments where 1st place might just mean beating 4 people.
    """
    try:
        store = SearchStore(db_path)
    except FileNotFoundError as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(code=1)

    norm_combos = [parse_combo(c) for c in combo]
    pm_mode = MatchMode(pokemon_mode.value)
    mv_mode = MatchMode(move_mode.value)

    matched = store.search(
        pokemon=pokemon,
        pokemon_mode=pm_mode,
        moves=move,
        move_mode=mv_mode,
        combos=norm_combos,
        items=item,
        abilities=ability,
        teras=tera,
        natures=nature,
        min_players=min_players,
        tourney_contains=tourney_contains,
        sort_by=sort_by,
        limit=limit,
    )

    render_results(matched, show_team=show_team, limit=limit)

    if detail:
        for t in matched[:limit]:
            render_team_detail(t)


@app.command()
def stats(db_path: Path = typer.Option(DEFAULT_DB, "--db", help="Path to the teams.db SQLite file.")):
    """Print quick dataset stats: number of teams, tournaments, top pokemon usage."""
    try:
        store = SearchStore(db_path)
    except FileNotFoundError as e:
        console.print(f"[red]{e}[/red]")
        raise typer.Exit(code=1)

    s = store.stats(top_n=20)
    console.print(f"Teams: [bold]{s.n_teams}[/bold]   Tournaments: [bold]{s.n_tournaments}[/bold]")
    table = Table(title="Top 20 most-used Pokémon")
    table.add_column("Pokémon")
    table.add_column("Teams", justify="right")
    for name, count in s.top_pokemon:
        table.add_row(name, str(count))
    console.print(table)


if __name__ == "__main__":
    app()