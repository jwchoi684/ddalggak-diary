"""
Convert /public/moods/*.png from opaque white-background PNGs to alpha-channel
PNGs by flood-filling the white area from the four corners. Inner whites
(e.g. the mask in sick.png) are preserved because flood-fill only spreads
through contiguous near-white pixels.

Run once after dropping new artwork into public/moods/.
"""
from pathlib import Path
from PIL import Image, ImageDraw


def transparentize(path: Path) -> tuple[int, int]:
    img = Image.open(path).convert('RGBA')
    w, h = img.size
    # Flood-fill from each corner with a small color tolerance so off-white
    # JPEG-ish edges also get caught.
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    for seed in seeds:
        ImageDraw.floodfill(img, seed, (0, 0, 0, 0), thresh=20)
    before = path.stat().st_size
    img.save(path, optimize=True)
    return before, path.stat().st_size


root = Path('public/moods')
if not root.exists():
    raise SystemExit(f'{root} not found — run from repo root.')

total_before = 0
total_after = 0
for png in sorted(root.glob('*.png')):
    before, after = transparentize(png)
    total_before += before
    total_after += after
    print(f'{png.name:18} {before/1024:6.1f}KB → {after/1024:6.1f}KB')

print(f'\nTotal: {total_before/1024:.1f}KB → {total_after/1024:.1f}KB')
