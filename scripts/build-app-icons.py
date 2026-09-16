#!/usr/bin/env python3
"""
Regenerate the JustSwap mobile app icons from the ONE canonical brand mark.

Why this exists
---------------
The launcher/app icons used to be hand-made raster art that had drifted from the
brand: `icon.png` / `icon-ios.png` carried the **light-surface** mark (green J +
*navy* S) on a near-black tile — off-brand (the S must be white on dark) and very
low contrast — while the Android adaptive foreground carried the correct
**dark-surface** mark. The two platforms therefore shipped visibly different
icons. On top of that the adaptive foreground was drawn at ~69% of its layer, far
outside Android's adaptive-icon safe zone, so launchers clipped the J's foot and
the S's edge.

This script rebuilds all three icons from `apps/mobile/assets/logo-mark.png`
(identical to the web's `justswap-logo-mark-dark.png` — the canonical dark-surface
mark: green J, white S) so iOS and Android render the same brand at the same
optical size.

Sizing
------
`MARK_ON_TILE` is the mark's width as a fraction of the *visible* icon tile.
On iOS/legacy Android the visible tile is the whole 1024px square. On Android
adaptive icons only the centre 72/108 of the layer is ever visible, so the mark is
drawn at `MARK_ON_TILE * 72/108` of the layer — that is what makes the mark come
out the same relative size on both platforms, and what keeps every pixel of ink
inside the guaranteed-visible 66dp safe circle.

Usage:  python scripts/build-app-icons.py          (needs Pillow)
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - dev tool
    sys.exit("Pillow is required:  pip install Pillow")

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "apps" / "mobile" / "assets"
SOURCE = ASSETS / "logo-mark.png"

# colors.background from @swap/config — the same token the splash screen and the
# Android adaptive-icon background already use.
BACKGROUND = (0x0A, 0x0E, 0x1A)

TILE = 1024
# Mark width as a fraction of the visible tile.
MARK_ON_TILE = 0.62
# Android adaptive icons: 108dp layer, only the centre 72dp is ever visible.
ADAPTIVE_VIEWPORT = 72 / 108
# Google's guaranteed-visible safe zone: a centred circle 66dp across.
SAFE_CIRCLE_RADIUS = TILE * (66 / 108) / 2


def load_mark() -> Image.Image:
    """The canonical mark, cropped to its ink so scaling is padding-independent."""
    mark = Image.open(SOURCE).convert("RGBA")
    # alpha > 8 ignores the imperceptible near-zero halo in the source art.
    box = mark.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if box is None:
        sys.exit(f"{SOURCE} has no opaque pixels")
    return mark.crop(box)


def place(mark: Image.Image, width: float) -> Image.Image:
    """Centre the mark, scaled to `width` px wide, on a transparent TILE square."""
    scale = width / mark.width
    resized = mark.resize((round(mark.width * scale), round(mark.height * scale)), Image.LANCZOS)
    layer = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    layer.alpha_composite(resized, ((TILE - resized.width) // 2, (TILE - resized.height) // 2))
    return layer


def flatten(layer: Image.Image) -> Image.Image:
    """Composite onto the brand background and drop alpha.

    Opaque output matters: Apple rejects app icons that carry an alpha channel,
    and the store icons must not be transparent either.
    """
    tile = Image.new("RGBA", (TILE, TILE), (*BACKGROUND, 255))
    tile.alpha_composite(layer)
    return tile.convert("RGB")


def max_ink_radius(layer: Image.Image) -> float:
    """Furthest opaque pixel from the layer centre — the adaptive safe-zone check."""
    alpha = layer.getchannel("A")
    box = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
    left, top, right, bottom = box
    centre = TILE / 2
    return max(
        math.hypot(x - centre, y - centre)
        for x, y in ((left, top), (right, top), (left, bottom), (right, bottom))
    )


def main() -> None:
    mark = load_mark()
    print(f"source {SOURCE.name}: ink {mark.width}x{mark.height}")

    # iOS app icon + Android legacy launcher icon: full-bleed tile, no baked
    # rounded corners (both platforms mask the square themselves — baking a
    # rounded tile in is what produced the dark double-rounded border).
    tile_layer = place(mark, TILE * MARK_ON_TILE)
    flatten(tile_layer).save(ASSETS / "icon.png")
    flatten(tile_layer).save(ASSETS / "icon-ios.png")

    # Android adaptive foreground: transparent, background supplied by
    # android.adaptiveIcon.backgroundColor, mark inside the safe zone.
    adaptive = place(mark, TILE * MARK_ON_TILE * ADAPTIVE_VIEWPORT)
    adaptive.save(ASSETS / "adaptive-icon.png")

    radius = max_ink_radius(adaptive)
    status = "OK" if radius <= SAFE_CIRCLE_RADIUS else "OUTSIDE SAFE ZONE"
    print(f"adaptive ink radius {radius:.0f}px / safe {SAFE_CIRCLE_RADIUS:.0f}px -> {status}")
    if radius > SAFE_CIRCLE_RADIUS:
        sys.exit("adaptive foreground would be clipped by circular launcher masks")

    # Google Play store listing icon. Play asks for a 512x512 **32-bit** PNG, so this
    # is RGBA — but with a fully opaque alpha channel, because the listing icon must
    # not actually be transparent (Play composites its own rounding and shadow).
    store = ROOT / "docs" / "app-store" / "play-store-icon-512.png"
    store.parent.mkdir(parents=True, exist_ok=True)
    store_img = flatten(tile_layer).resize((512, 512), Image.LANCZOS).convert("RGBA")
    store_img.putalpha(255)
    store_img.save(store)

    for path in (ASSETS / "icon.png", ASSETS / "icon-ios.png", ASSETS / "adaptive-icon.png", store):
        print(f"wrote {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
