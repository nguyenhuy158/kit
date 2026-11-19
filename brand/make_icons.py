import argparse
import base64
import io
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SUPERSAMPLE = 4
WEB_RADIUS = 0.22
SMALL_RADIUS = 0.2
APPLE_TOUCH_SIZE = 180
APPLE_TOUCH_SCALE = 1.06
MASKABLE_SIZE = 512
MASKABLE_SCALE = 0.80
FAVICON_SIZES = [(16, 16), (32, 32), (48, 48)]
SVG_EMBED_SIZE = 128

DESKTOP_CANVAS = 1024
DESKTOP_TILE = 824
DESKTOP_RADIUS = 0.225
DESKTOP_SHADOW_BLUR = 14
DESKTOP_SHADOW_OFFSET = 10
DESKTOP_SHADOW_ALPHA = 70
TAURI_PNGS = {"32x32.png": 32, "128x128.png": 128, "128x128@2x.png": 256, "icon.png": 512}
ICONSET_SIZES = [16, 32, 128, 256, 512]


def square(path):
    art = Image.open(path).convert("RGBA")
    side = min(art.size)
    return art.crop((0, 0, side, side))


def rounded(art, size, radius):
    tile = art.resize((size, size), Image.LANCZOS)
    big = size * SUPERSAMPLE
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, big - 1, big - 1], radius=int(big * radius), fill=255)
    tile.putalpha(mask.resize((size, size), Image.LANCZOS))
    return tile


def on_background(art, size, scale, bg):
    base = Image.new("RGBA", (size, size), bg + (255,))
    inner = int(size * scale)
    offset = (size - inner) // 2
    base.alpha_composite(rounded(art, 512, WEB_RADIUS).resize((inner, inner), Image.LANCZOS), (offset, offset))
    return base.convert("RGB")


def desktop_icon(art):
    canvas = Image.new("RGBA", (DESKTOP_CANVAS, DESKTOP_CANVAS), (0, 0, 0, 0))
    offset = (DESKTOP_CANVAS - DESKTOP_TILE) // 2
    tile = rounded(art, DESKTOP_TILE, DESKTOP_RADIUS)
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow.paste((0, 0, 0, DESKTOP_SHADOW_ALPHA), (offset, offset + DESKTOP_SHADOW_OFFSET), tile.getchannel("A"))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(DESKTOP_SHADOW_BLUR)))
    canvas.alpha_composite(tile, (offset, offset))
    return canvas


def write_icns(icon, target):
    with tempfile.TemporaryDirectory() as tmp:
        iconset = Path(tmp) / "icon.iconset"
        iconset.mkdir()
        for size in ICONSET_SIZES:
            icon.resize((size, size), Image.LANCZOS).save(iconset / f"icon_{size}x{size}.png")
            icon.resize((size * 2, size * 2), Image.LANCZOS).save(iconset / f"icon_{size}x{size}@2x.png")
        subprocess.run(["iconutil", "-c", "icns", str(iconset), "-o", str(target)], check=True)


def make_web(art, bg, out):
    rounded(art, 512, WEB_RADIUS).save(out / "icon-512.png")
    rounded(art, 192, WEB_RADIUS).save(out / "icon-192.png")
    rounded(art, 32, SMALL_RADIUS).save(out / "favicon-32.png")
    on_background(art, APPLE_TOUCH_SIZE, APPLE_TOUCH_SCALE, bg).save(out / "apple-touch-icon.png")
    on_background(art, MASKABLE_SIZE, MASKABLE_SCALE, bg).save(out / "icon-maskable-512.png")
    rounded(art, 64, SMALL_RADIUS).save(out / "favicon.ico", sizes=FAVICON_SIZES)
    buf = io.BytesIO()
    rounded(art, SVG_EMBED_SIZE, WEB_RADIUS).save(buf, "PNG")
    data = base64.b64encode(buf.getvalue()).decode()
    (out / "favicon.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SVG_EMBED_SIZE} {SVG_EMBED_SIZE}"><title>icon</title>'
        f'<image width="{SVG_EMBED_SIZE}" height="{SVG_EMBED_SIZE}" href="data:image/png;base64,{data}"/></svg>\n'
    )


def make_desktop(art, out):
    icon = desktop_icon(art)
    icon.save(out / "app-icon-1024.png")
    for name, size in TAURI_PNGS.items():
        icon.resize((size, size), Image.LANCZOS).save(out / name)
    if shutil.which("iconutil"):
        write_icns(icon, out / "icon.icns")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("art", help="square art: Codex output or an existing icon-512.png")
    parser.add_argument("out", type=Path)
    parser.add_argument("--bg", help="app background #rrggbb from docs/BRAND.md, needed for web icons")
    parser.add_argument("--desktop", action="store_true", help="only the desktop app icon set (Tauri, macOS Dock)")
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    art = square(args.art)
    if args.desktop:
        make_desktop(art, args.out)
    else:
        if not args.bg:
            parser.error("--bg is required for web icons")
        make_web(art, tuple(int(args.bg.lstrip("#")[i : i + 2], 16) for i in (0, 2, 4)), args.out)
    print("ok", args.out)


if __name__ == "__main__":
    main()
