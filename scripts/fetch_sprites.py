"""Fetch Pokémon sprites + official artwork from PokéAPI.

Idempotent: skips slugs whose PNGs are already on disk. ~232 species in our
dataset; the bulk hit `pokemon/{slug}/` directly. A handful of slugs are
split-form species where the default Pokémon entry lives at a different name
(e.g. dataset slug `aegislash` → PokéAPI `aegislash-shield`). For those we
fall back to `pokemon-species/{slug}/`, walk the varieties, pick the default,
and fetch against the variety's URL.

A tiny alias map handles two edge-case Paldea combat breed slugs that
PokéAPI lumps under a generic name. Whatever still 404s after both fallbacks
is logged at the end as a letter-fill candidate — the frontend renders a
2-letter token of the same shape, so there's no layout shift.

Outputs:
    frontend/public/sprites/{slug}.png   — pixel sprite (front_default)
    frontend/public/art/{slug}.png      — official artwork front_default

Usage:
    python scripts/fetch_sprites.py
    python scripts/fetch_sprites.py --delay 0.5 --force
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC = ROOT / "data" / "teams.jsonl"
SPRITES_DIR = ROOT / "frontend" / "public" / "sprites"
ART_DIR = ROOT / "frontend" / "public" / "art"

API = "https://pokeapi.co/api/v2"
TIMEOUT = 20

# Hand-curated aliases for slugs the dataset uses but PokéAPI names differently.
ALIAS: dict[str, str] = {
    "tauros-paldea-aqua": "tauros-paldea-aqua-breed",
    "tauros-paldea-blaze": "tauros-paldea-blaze-breed",
    "basculegion-f": "basculegion-female",
    "meowstic-f": "meowstic-female",
}


def _http_get(url: str) -> tuple[int, bytes]:
    req = urllib.request.Request(url, headers={"User-Agent": "vgc-team-atlas/fetch-sprites"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b""
    except Exception:
        return 0, b""


def _download(url: str, dst: Path) -> bool:
    if dst.exists() and dst.stat().st_size > 0:
        return True  # idempotent
    if not url:
        return False
    code, body = _http_get(url)
    if code != 200 or not body:
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(body)
    return True


def _sprites_for(slug: str) -> dict | None:
    """Resolve sprite URLs for `slug`, trying direct → species-fallback."""
    # 1. Direct record.
    code, body = _http_get(f"{API}/pokemon/{slug}/")
    if code == 200 and body:
        try:
            s = (json.loads(body.decode("utf-8")).get("sprites") or {})
            art = ((s.get("other") or {}).get("official-artwork") or {})
            urls = {"pixel": s.get("front_default") or "", "art": art.get("front_default") or ""}
            if urls["pixel"] or urls["art"]:
                return urls
        except json.JSONDecodeError:
            pass

    # 2. Hand-curated alias (different Pokémon form on PokéAPI).
    if slug in ALIAS:
        aliased = ALIAS[slug]
        code, body = _http_get(f"{API}/pokemon/{aliased}/")
        if code == 200 and body:
            try:
                s = (json.loads(body.decode("utf-8")).get("sprites") or {})
                art = ((s.get("other") or {}).get("official-artwork") or {})
                urls = {"pixel": s.get("front_default") or "", "art": art.get("front_default") or ""}
                if urls["pixel"] or urls["art"]:
                    return urls
            except json.JSONDecodeError:
                pass

    # 3. Species endpoint: walk varieties, pick the default's Pokémon URL.
    code, body = _http_get(f"{API}/pokemon-species/{slug}/")
    if code == 200 and body:
        try:
            sp = json.loads(body.decode("utf-8"))
            for v in (sp.get("varieties") or []):
                if v.get("is_default"):
                    poke_url = (v.get("pokemon") or {}).get("url") or ""
                    if not poke_url:
                        continue
                    # poke_url points at /pokemon/{id-or-name}/
                    code_p, body_p = _http_get(poke_url)
                    if code_p == 200 and body_p:
                        s = (json.loads(body_p.decode("utf-8")).get("sprites") or {})
                        art = ((s.get("other") or {}).get("official-artwork") or {})
                        return {"pixel": s.get("front_default") or "", "art": art.get("front_default") or ""}
            # No default variety flagged — use the first variety as a best-effort.
            varieties = sp.get("varieties") or []
            if varieties:
                poke_url = (varieties[0].get("pokemon") or {}).get("url") or ""
                if poke_url:
                    code_p, body_p = _http_get(poke_url)
                    if code_p == 200 and body_p:
                        s = (json.loads(body_p.decode("utf-8")).get("sprites") or {})
                        art = ((s.get("other") or {}).get("official-artwork") or {})
                        return {"pixel": s.get("front_default") or "", "art": art.get("front_default") or ""}
        except json.JSONDecodeError:
            pass

    return None


def collect_slugs(src: Path) -> list[str]:
    slugs: set[str] = set()
    with src.open() as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            for p in (rec.get("team") or []):
                pid = (p.get("id") or "").strip()
                if pid:
                    slugs.add(pid)
    return sorted(slugs)


def main() -> None:
    ap = argparse.ArgumentParser(description="Fetch Pokémon sprites + official artwork.")
    ap.add_argument("--src", type=Path, default=DEFAULT_SRC)
    ap.add_argument("--delay", type=float, default=0.10,
                    help="Sleep between PokéAPI calls (seconds). PokéAPI rate-limit is 100/min/IP; keep >0.4 if you re-run.")
    ap.add_argument("--force", action="store_true",
                    help="Re-fetch even when local files already exist.")
    args = ap.parse_args()

    if not args.src.exists():
        print(f"source not found: {args.src}", file=sys.stderr)
        sys.exit(1)

    slugs = collect_slugs(args.src)
    print(f"unique slugs in dataset: {len(slugs)}")

    SPRITES_DIR.mkdir(parents=True, exist_ok=True)
    ART_DIR.mkdir(parents=True, exist_ok=True)

    if args.force:
        for d in (SPRITES_DIR, ART_DIR):
            for f in d.glob("*.png"):
                f.unlink()

    missing: list[str] = []
    fetched = 0
    skipped = 0

    for i, slug in enumerate(slugs, 1):
        sprite_path = SPRITES_DIR / f"{slug}.png"
        art_path = ART_DIR / f"{slug}.png"

        already = sprite_path.exists() and sprite_path.stat().st_size > 0 \
                  and art_path.exists() and art_path.stat().st_size > 0
        if already and not args.force:
            skipped += 1
            continue

        urls = _sprites_for(slug)
        if urls is None:
            missing.append(slug)
            print(f"  missing  {slug}")
            time.sleep(args.delay)
            continue

        ok_p = _download(urls["pixel"], sprite_path)
        ok_a = _download(urls["art"],   art_path)
        if ok_p and ok_a:
            fetched += 1
            print(f"  fetched  {slug}")
        else:
            miss_reason = []
            if not ok_p: miss_reason.append("pixel")
            if not ok_a: miss_reason.append("art")
            missing.append(slug)
            print(f"  partial  {slug}  missing {', '.join(miss_reason)}")

        time.sleep(args.delay)

    total = len(slugs)
    print()
    print(f"summary: {fetched} fetched, {skipped} skipped, "
          f"{len(missing)} missing ({total - len(missing)}/{total} have both tiers)")
    if missing:
        print("\nfallback list (for letter-fill icon in frontend):")
        for slug in missing:
            print(f"  - {slug}")


if __name__ == "__main__":
    main()