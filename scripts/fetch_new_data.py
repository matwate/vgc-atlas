import json
import loguru
from loguru import logger
import time
import collections
import httpx
import jq
from typing import List
from pathlib import Path


PREFIX = "https://play.limitlesstcg.com/api"
GAME = "VGC"
FORMAT = "M-C"

RATE_LIMIT_MAX = 50
RATE_LIMIT_WINDOW = 5 * 60

OUTPUT = Path("data/jsonl")

class RateLimiter:
    def __init__(self, max_calls: int, window_seconds: int):
        self.max_calls = max_calls
        self.window = window_seconds
        self.timestamps: collections.deque = collections.deque()

    def _prune(self, now: float) -> None:
        while self.timestamps and now - self.timestamps[0] >= self.window:
            self.timestamps.popleft()

    def acquire(self) -> None:
        while True:
            now = time.monotonic()
            self._prune(now)
            if len(self.timestamps) < self.max_calls:
                self.timestamps.append(now)
                return
            sleep_for = self.window - (now - self.timestamps[0]) + 0.05
            time.sleep(max(sleep_for, 0.1))


_limiter = RateLimiter(RATE_LIMIT_MAX, RATE_LIMIT_WINDOW)


def _get(url, **kwargs):
    _limiter.acquire()
    return httpx.get(url, **kwargs)


def urlof(suffix: str):
    return f"{PREFIX}{suffix}"


def fetch_new_tourneys():
    # Lists every tournament in the format; fetch_and_store_teams skips the ones
    # already in teams.jsonl. Only a few pages, and it backfills any gaps.
    tourneys = []

    i = 1
    while True:
        params = {"game": GAME, "format": FORMAT, "page": i}
        resp = _get(urlof("/tournaments"), params=params)
        logger.info(f"Page {i} fetched")
        if resp.status_code != 200:
            logger.info(f"Stopping: page {i} returned {resp.status_code}")
            break

        page_tourneys = resp.json()
        if not page_tourneys:
            logger.info(f"Stopping: page {i} empty")
            break
        tourneys.extend([  {'id': x['id'], 'name': x['name'], 'players': x['players'] } for x in page_tourneys])
        i += 1
    return tourneys
 

def fetch_and_store_teams(tournaments: List[dict], teams_path: str = "data/teams.jsonl") -> None:
    path = Path(teams_path)
    done = set()
    if path.exists():
        for line in path.read_text().splitlines():
            if line:
                done.add(json.loads(line)["tournament_id"])

    new_tourneys = [t for t in tournaments if t["id"] not in done]
    logger.info(f"Will fetch {len(new_tourneys)} tournaments (skipped {len(done)} already done)")

    with open(path, "a") as out:
        for i, t in enumerate(new_tourneys, 1):
            tid = t["id"]
            resp = _get(urlof(f"/tournaments/{tid}/standings"))
            logger.info(f"Tournament {i}/{len(new_tourneys)}: {t.get('name', tid)} ({t.get('players', '?')} players) -> {resp.status_code}")
            resp.raise_for_status()
            lines = []
            for player in resp.json():
                player["tournament_id"] = tid
                try:
                        place = player["placing"],
                except KeyError:
                        place =  None 

                try:
                        team=  player["decklist"]
                except KeyError:
                        team = None

                important = { "place":place,  "team": team, "tournament_id": tid,
                              "tourney_name": t.get("name"), "tourney_players": t.get("players")}

                lines.append(json.dumps(important) + "\n")
            out.write("".join(lines))
            out.flush()


def update_new_tournaments(): 

    new_tourneys = fetch_new_tourneys()

    logger.info(f"Found {len(new_tourneys)} new tournaments")

    fetch_and_store_teams(new_tourneys)


def rebuild_from_scratch(): 

    
    Path("data/teams.jsonl").unlink(missing_ok=True)

    new_tourneys = fetch_new_tourneys()

    logger.info(f"Found {len(new_tourneys)} new tournaments")

    fetch_and_store_teams(new_tourneys)
