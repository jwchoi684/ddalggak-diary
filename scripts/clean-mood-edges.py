"""
Cleans up the soft-edge halo that removebg leaves on mood PNGs.

The new artwork lands with a proper alpha channel, but the anti-aliased
border has a few hundred pixels at very low alpha whose RGB is near-white.
On a non-white background those pixels render as a faint halo around each
icon. We hard-clip any pixel under the alpha threshold to fully transparent.

Run once after dropping fresh removebg PNGs into public/moods/.
"""
from pathlib import Path
from PIL import Image

ALPHA_THRESHOLD = 50  # pixels under this alpha become fully transparent


def clean(path: Path) -> tuple[int, int]:
    img = Image.open(path).convert('RGBA')
    pixels = img.load()
    w, h = img.size
    cleared = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if 0 < a < ALPHA_THRESHOLD:
                pixels[x, y] = (0, 0, 0, 0)
                cleared += 1
    img.save(path, optimize=True)
    return cleared, path.stat().st_size


root = Path('public/moods')
if not root.exists():
    raise SystemExit(f'{root} not found — run from repo root.')

total_cleared = 0
total_size = 0
for png in sorted(root.glob('*.png')):
    cleared, size = clean(png)
    total_cleared += cleared
    total_size += size
    print(f'{png.name:18} cleared {cleared:5}  ({size/1024:.1f}KB)')

print(f'\nTotal cleared: {total_cleared}  Total size: {total_size/1024:.1f}KB')
