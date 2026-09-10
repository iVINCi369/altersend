#!/usr/bin/env python3
"""Generate every Ruqa brand raster and illustration from one geometric source.

The mark is concept C: two nodes joined by a direct line with a single spike in
the middle - keys-not-IPs addressing, and the handshake at the midpoint.

Run from the repository root:

    python scripts/make-brand-assets.py

Requires Pillow. Everything is drawn from the coordinates below, so changing a
number here regenerates the whole set consistently.
"""

import os
import struct
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
SS = 4  # supersampling factor

# ---------------------------------------------------------------- palette ---
INK_LIGHT = (23, 23, 23, 255)  # #171717 - mark on light grounds
INK_DARK = (231, 234, 240, 255)  # #e7eaf0 - mark on dark grounds
GROUND = (22, 24, 29, 255)  # #16181d - icon ground, matches colorBackground
ACCENT_LIGHT = (31, 111, 107, 255)  # #1f6f6b
ACCENT_DARK = (92, 182, 174, 255)  # #5cb6ae

# SVG illustrations use fixed colors that hold on both app grounds.
SVG_INK = "#7e8796"
SVG_ACCENT = "#35a199"
SVG_DANGER = "#cc6b6b"

# --------------------------------------------------------------- geometry ---
# All coordinates live in a 120x120 space, y pointing down.

MARK_WIDE = {
    "nodes": [(24, 60, 12), (96, 60, 12)],
    "line": [(36, 60), (54, 60), (62, 44), (70, 76), (78, 60), (84, 60)],
    "width": 8,
    "accent_from": 1,
    "accent_to": 4,
}

MARK_ICON = {
    "nodes": [(20, 60, 11), (100, 60, 11)],
    "line": [(31, 60), (50, 60), (58, 39), (70, 81), (78, 60), (89, 60)],
    "width": 9,
    "accent_from": 1,
    "accent_to": 4,
}


def _bounds(mark):
    xs, ys = [], []
    for cx, cy, r in mark["nodes"]:
        xs += [cx - r, cx + r]
        ys += [cy - r, cy + r]
    half = mark["width"] / 2
    for x, y in mark["line"]:
        xs += [x - half, x + half]
        ys += [y - half, y + half]
    return min(xs), min(ys), max(xs), max(ys)


def _thick_line(draw, pts, width, color):
    """Polyline with round caps and joins - Pillow has no stroke-linejoin."""
    r = width / 2
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        draw.line([(x0, y0), (x1, y1)], fill=color, width=int(round(width)))
    for x, y in pts:
        draw.ellipse([x - r, y - r, x + r, y + r], fill=color)


def draw_mark(size, mark, ink, accent, ground=None, fill=0.68):
    """Render the mark centred on a square canvas of `size` pixels."""
    canvas = size * SS
    img = Image.new("RGBA", (canvas, canvas), ground if ground else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    x0, y0, x1, y1 = _bounds(mark)
    scale = (canvas * fill) / (x1 - x0)
    off_x = (canvas - (x1 - x0) * scale) / 2 - x0 * scale
    off_y = (canvas - (y1 - y0) * scale) / 2 - y0 * scale

    def T(p):
        return (p[0] * scale + off_x, p[1] * scale + off_y)

    width = mark["width"] * scale
    for cx, cy, r in mark["nodes"]:
        px, py = T((cx, cy))
        pr = r * scale
        d.ellipse([px - pr, py - pr, px + pr, py + pr], fill=ink)

    _thick_line(d, [T(p) for p in mark["line"]], width, ink)
    spike = mark["line"][mark["accent_from"] : mark["accent_to"] + 1]
    _thick_line(d, [T(p) for p in spike], width, accent)

    return img.resize((size, size), Image.LANCZOS)


def draw_lockup(width, height, ink, accent, ground=None):
    """Mark plus the wordmark, centred as one group."""
    canvas_w, canvas_h = width * SS, height * SS
    img = Image.new("RGBA", (canvas_w, canvas_h), ground if ground else (0, 0, 0, 0))

    cap = int(canvas_h * 0.46)
    font_path = os.path.join(ROOT, "assets", "fonts", "NotoSans-JP-Bold.ttf")
    font = ImageFont.truetype(font_path, cap)

    probe = ImageDraw.Draw(img)
    tb = probe.textbbox((0, 0), "Ruqa", font=font)
    text_w, text_h = tb[2] - tb[0], tb[3] - tb[1]

    mark_size = int(canvas_h * 0.62)
    mark = draw_mark(mark_size, MARK_WIDE, ink, accent, fill=0.94)

    gap = int(canvas_h * 0.16)
    group_w = mark_size + gap + text_w
    left = (canvas_w - group_w) // 2

    img.alpha_composite(mark, (left, (canvas_h - mark_size) // 2))
    probe.text(
        (left + mark_size + gap - tb[0], (canvas_h - text_h) // 2 - tb[1]),
        "Ruqa",
        font=font,
        fill=ink,
    )
    return img.resize((width, height), Image.LANCZOS)


# ------------------------------------------------------------------- icns ---
ICNS_TYPES = [
    (b"icp4", 16),
    (b"icp5", 32),
    (b"icp6", 64),
    (b"ic07", 128),
    (b"ic08", 256),
    (b"ic09", 512),
    (b"ic10", 1024),
    (b"ic11", 32),
    (b"ic12", 64),
    (b"ic13", 256),
    (b"ic14", 512),
]


def write_icns(path, render):
    import io

    chunks = []
    for code, px in ICNS_TYPES:
        buf = io.BytesIO()
        render(px).save(buf, format="PNG")
        data = buf.getvalue()
        chunks.append(code + struct.pack(">I", len(data) + 8) + data)
    body = b"".join(chunks)
    with open(path, "wb") as fh:
        fh.write(b"icns" + struct.pack(">I", len(body) + 8) + body)


# -------------------------------------------------------------- svg scenes ---
def svg(view_w, view_h, body):
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s" '
        'width="%s" height="%s" role="img">\n'
        '  <g transform="translate(%s %s) scale(%s)">\n%s\n  </g>\n</svg>\n'
    ) % _fit(view_w, view_h, body)


def _fit(view_w, view_h, body):
    """Centre the 120x80 scene inside the file's original viewBox."""
    scale = min(view_w / 120.0, view_h / 80.0) * 0.82
    tx = (view_w - 120 * scale) / 2
    ty = (view_h - 80 * scale) / 2
    fmt = lambda v: ("%.3f" % v).rstrip("0").rstrip(".")
    return (
        fmt(view_w),
        fmt(view_h),
        fmt(view_w),
        fmt(view_h),
        fmt(tx),
        fmt(ty),
        fmt(scale),
        body,
    )


S = 'stroke-width="6" stroke-linecap="round" fill="none"'

SCENES = {
    "connecting.svg": (
        960,
        418.531,
        '    <circle cx="26" cy="40" r="9" fill="%s"/>\n'
        '    <circle cx="94" cy="40" r="9" stroke="%s" %s/>\n'
        '    <path d="M40 40 h12" stroke="%s" %s/>\n'
        '    <path d="M60 40 h8" stroke="%s" %s/>\n'
        '    <path d="M76 40 h6" stroke="%s" opacity="0.35" %s/>'
        % (SVG_INK, SVG_INK, S, SVG_INK, S, SVG_ACCENT, S, SVG_INK, S),
    ),
    "connection-lost.svg": (
        800,
        430.493,
        '    <circle cx="26" cy="40" r="9" fill="%s"/>\n'
        '    <circle cx="94" cy="40" r="9" fill="%s"/>\n'
        '    <path d="M40 40 h10" stroke="%s" %s/>\n'
        '    <path d="M70 40 h10" stroke="%s" %s/>\n'
        '    <path d="M54 30 l12 20 M66 30 l-12 20" stroke="%s" stroke-width="5" '
        'stroke-linecap="round" fill="none"/>'
        % (SVG_INK, SVG_INK, SVG_INK, S, SVG_INK, S, SVG_DANGER),
    ),
    "missing-files.svg": (
        1009.318,
        880,
        '    <rect x="34" y="16" width="40" height="50" rx="4" stroke="%s" %s/>\n'
        '    <path d="M46 34 h16 M46 46 h10" stroke="%s" stroke-width="5" '
        'stroke-linecap="round" opacity="0.4" fill="none"/>\n'
        '    <circle cx="82" cy="54" r="14" stroke="%s" %s/>\n'
        '    <path d="M92 64 l10 10" stroke="%s" %s/>'
        % (SVG_INK, S, SVG_INK, SVG_ACCENT, S, SVG_ACCENT, S),
    ),
    "private-sharing.svg": (
        914.683,
        797.647,
        '    <rect x="40" y="34" width="40" height="30" rx="4" stroke="%s" %s/>\n'
        '    <path d="M50 34 v-8 a10 10 0 0 1 20 0 v8" stroke="%s" %s/>\n'
        '    <circle cx="60" cy="49" r="4" fill="%s"/>' % (SVG_INK, S, SVG_INK, S, SVG_ACCENT),
    ),
    "share-link.svg": (
        608.838,
        800.065,
        '    <path d="M56 30 l-14 14 a12 12 0 0 0 17 17 l6 -6" stroke="%s" %s/>\n'
        '    <path d="M64 50 l14 -14 a12 12 0 0 0 -17 -17 l-6 6" stroke="%s" %s/>'
        % (SVG_INK, S, SVG_ACCENT, S),
    ),
    "sync_devices.svg": (
        1058,
        747.88979,
        '    <rect x="22" y="22" width="32" height="42" rx="4" stroke="%s" %s/>\n'
        '    <rect x="66" y="30" width="32" height="26" rx="4" stroke="%s" %s/>\n'
        '    <path d="M58 43 h4 M62 43 l-4 -4 M62 43 l-4 4" stroke="%s" stroke-width="5" '
        'stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
        % (SVG_INK, S, SVG_INK, S, SVG_ACCENT),
    ),
    "update.svg": (
        774,
        669.5,
        '    <path d="M60 20 a20 20 0 1 1 -19 26" stroke="%s" %s/>\n'
        '    <path d="M60 12 l10 8 -10 8" stroke="%s" stroke-width="6" '
        'stroke-linecap="round" stroke-linejoin="round" fill="none"/>' % (SVG_INK, S, SVG_ACCENT),
    ),
    "loading.svg": (
        791.308,
        533.417,
        '    <circle cx="34" cy="40" r="7" fill="%s" opacity="0.3"/>\n'
        '    <circle cx="60" cy="40" r="7" fill="%s" opacity="0.6"/>\n'
        '    <circle cx="86" cy="40" r="7" fill="%s"/>' % (SVG_INK, SVG_INK, SVG_ACCENT),
    ),
}


# ------------------------------------------------------------------ output ---
def out(*parts):
    path = os.path.join(ROOT, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def main():
    icon = lambda px: draw_mark(px, MARK_ICON, INK_DARK, ACCENT_DARK, GROUND, fill=0.74)

    written = []

    def save(img, *parts, **kw):
        path = out(*parts)
        img.save(path, **kw)
        written.append(os.path.relpath(path, ROOT))

    # Desktop application icons.
    save(icon(1024), "apps", "desktop", "build", "icon.png")
    icon(256).save(
        out("apps", "desktop", "build", "icon.ico"),
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    written.append("apps/desktop/build/icon.ico")
    write_icns(out("apps", "desktop", "build", "icon.icns"), icon)
    written.append("apps/desktop/build/icon.icns")

    # MSIX tiles - the Store rejects alpha, so these stay opaque.
    for name, px in [
        ("Square44x44Logo.png", 44),
        ("Square44x44Logo.scale-200.png", 88),
        ("Square71x71Logo.png", 71),
        ("Square71x71Logo.scale-200.png", 142),
        ("Square150x150Logo.png", 150),
        ("Square150x150Logo.scale-200.png", 300),
        ("Square310x310Logo.png", 310),
        ("StoreLogo.png", 50),
        ("StoreLogo.scale-200.png", 100),
        ("StoreTile300x300.png", 300),
    ]:
        save(icon(px).convert("RGB"), "apps", "desktop", "build", "msix-assets", name)

    # Standalone marks on transparent grounds.
    save(draw_mark(512, MARK_ICON, INK_LIGHT, ACCENT_LIGHT), "assets", "logo.png")
    save(
        draw_mark(512, MARK_ICON, INK_LIGHT, ACCENT_LIGHT),
        "assets",
        "01-logo-icon-logo-icon-512x512.png",
    )
    save(draw_mark(1024, MARK_ICON, INK_LIGHT, ACCENT_LIGHT), "assets", "logo-ruqa.png")
    save(draw_mark(1080, MARK_ICON, INK_LIGHT, ACCENT_LIGHT), "assets", "ruqa-full-logo.png")
    save(draw_mark(512, MARK_ICON, INK_LIGHT, ACCENT_LIGHT), "apps", "web", "src", "assets", "ruqa-mark.png")

    # Horizontal lockups, light and dark.
    for base in (("assets",), ("apps", "web", "src", "assets")):
        save(draw_lockup(1641, 400, INK_LIGHT, ACCENT_LIGHT), *base, "ruqa-logo.png")
        save(draw_lockup(1641, 400, INK_DARK, ACCENT_DARK), *base, "ruqa-logo-dark.png")

    # Interface state illustrations.
    for name, (w, h, body) in SCENES.items():
        path = out("assets", name)
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(svg(w, h, body))
        written.append("assets/" + name)

    for name in written:
        print("  " + name)
    print("готово: %d файлов" % len(written))


if __name__ == "__main__":
    main()
