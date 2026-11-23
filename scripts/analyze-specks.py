#!/usr/bin/env python3
"""Analisis piksel area atap: cari bintik putih/cerah dan klasifikasi warnanya."""
from PIL import Image
import sys

img = Image.open(sys.argv[1] if len(sys.argv) > 1 else "audit/28-default-v4.png").convert("RGB")
w, h = img.size
print(f"ukuran: {w}x{h}")

# kanvas 3D ada di area tengah (antara topbar ~48px dan timeline); asumsikan kanvas lebar penuh
# Ambil area atap: sekitar sepertiga atas-tengah kanvas
crop = img.crop((0, 60, w, int(h * 0.55)))
px = list(crop.getdata())
n = len(px)
print(f"crop: {crop.size}, {n} px")

# klasifikasi
white = [(i % crop.size[0], i // crop.size[0]) for i, (r, g, b) in enumerate(px) if r > 225 and g > 225 and b > 225]
bright = [(r, g, b) for (r, g, b) in px if r > 200 and g > 170 and b > 170 and abs(r - g) < 60]
tile_red = sum(1 for r, g, b in px if r > 100 and r > g + 30 and r > b + 30)
sky_dark = sum(1 for r, g, b in px if r < 80 and g < 80 and b < 80)

print(f"piksel sangat putih (r,g,b>225): {len(white)} ({len(white)/n*100:.3f}%)")
print(f"piksel terang kekuningan/cerah: {len(bright)} ({len(bright)/n*100:.2f}%)")
print(f"merah genteng: {tile_red/n*100:.1f}% | gelap background: {sky_dark/n*100:.1f}%")
if white:
    xs = [p[0] for p in white]; ys = [p[1] for p in white]
    print(f"area bintik putih: x {min(xs)}-{max(xs)}, y {min(ys)}-{max(ys)}, jumlah {len(white)}")
    # sampel warna sekitar bintik pertama
    x0, y0 = white[0]
    print("sampel sekitar bintik pertama:")
    for dy in (-2, 0, 2):
        row = []
        for dx in (-6, -3, 0, 3, 6):
            x, y = min(max(x0 + dx, 0), crop.size[0] - 1), min(max(y0 + dy, 0), crop.size[1] - 1)
            row.append(crop.getpixel((x, y)))
        print(" ", row)
if bright:
    from collections import Counter
    c = Counter(bright).most_common(6)
    print("warna terang dominan:", [(f"#{r:02x}{g:02x}{b:02x}", n_) for (r, g, b), n_ in c])
