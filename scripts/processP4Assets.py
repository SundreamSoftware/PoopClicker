"""Normalize P4 PNG pack: transparent skins, renamed expressions/envs, thumbnails."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / "public" / "assets"
SRC_SKINS = ROOT / "P4-skins"
SRC_EXPR = ROOT / "P4-expressions"
SRC_ENV = ROOT / "P4_environment"
OUT_SKINS = ROOT / "P4_skins"
OUT_EXPR = ROOT / "P4_expressions"
OUT_ENV = ROOT / "P4_environments"
OUT_THUMBS = OUT_SKINS / "_thumbnails"


def log(msg: str) -> None:
    print(msg, flush=True)


def remove_white_background(img: Image.Image, tol: int = 18) -> Image.Image:
    rgba = img.convert("RGBA")
    # Seed flood-fill from corners/edges; thresh matches near-white RGB.
    seeds = [
        (0, 0),
        (rgba.width - 1, 0),
        (0, rgba.height - 1),
        (rgba.width - 1, rgba.height - 1),
        (rgba.width // 2, 0),
        (0, rgba.height // 2),
        (rgba.width - 1, rgba.height // 2),
        (rgba.width // 2, rgba.height - 1),
    ]
    for seed in seeds:
        ImageDraw.floodfill(rgba, seed, (0, 0, 0, 0), thresh=tol)
    return rgba


def main() -> None:
    OUT_SKINS.mkdir(parents=True, exist_ok=True)
    OUT_EXPR.mkdir(parents=True, exist_ok=True)
    OUT_ENV.mkdir(parents=True, exist_ok=True)
    OUT_THUMBS.mkdir(parents=True, exist_ok=True)

    log(f"Processing skins from {SRC_SKINS}")
    for path in sorted(SRC_SKINS.glob("*.png")):
        name = path.stem.lower()
        log(f"  skin {name}")
        with Image.open(path) as src:
            out = remove_white_background(src, tol=18)
        out_path = OUT_SKINS / f"{name}.png"
        out.save(out_path, optimize=True)
        thumb = out.copy()
        thumb.thumbnail((192, 192), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (192, 192), (0, 0, 0, 0))
        canvas.paste(
            thumb,
            ((192 - thumb.width) // 2, (192 - thumb.height) // 2),
            thumb,
        )
        canvas.save(OUT_THUMBS / f"{name}_192.png", optimize=True)
        corner = out.getpixel((0, 0))
        log(f"    corner A={corner[3]} -> {out_path.name}")

    log("Copying expressions")
    for i in range(1, 7):
        src = SRC_EXPR / f"expression lv{i}.png"
        dst = OUT_EXPR / f"expr_{i:02d}.png"
        with Image.open(src) as im:
            im.convert("RGBA").save(dst, optimize=True)
        log(f"  {dst.name}")

    log("Copying environments")
    for path in sorted(SRC_ENV.glob("*.png")):
        m = re.search(r"L\s*(\d+)", path.name, flags=re.IGNORECASE)
        if not m:
            log(f"  SKIP {path.name}")
            continue
        num = int(m.group(1))
        dst = OUT_ENV / f"L{num}.png"
        with Image.open(path) as im:
            im.convert("RGB").save(dst, optimize=True)
        log(f"  {dst.name}")

    log("Done.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr, flush=True)
        raise
