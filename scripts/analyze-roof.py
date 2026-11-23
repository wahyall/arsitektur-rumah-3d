#!/usr/bin/env python3
"""Lokalisir bbox genteng lalu cari piksel terang DI DALAMNYA (bukan teks HUD)."""
from PIL import Image
import sys

img = Image.open(sys.argv[1]).convert("RGB")
w, h = img.size
px = img.load()

# 1) bbox genteng merah (r>110, r-g>25, r-b>25)
minx, miny, maxx, maxy, cnt = w, h, 0, 0, 0
for y in range(60, int(h * 0.7)):
    for x in range(0, w):
        r, g, b = px[x, y]
        if r > 110 and r - g > 25 and r - b > 25:
            cnt += 1
            if x < minx: minx = x
            if x > maxx: maxx = x
            if y < miny: miny = y
            if y > maxy: maxy = y
print(f"genteng merah: {cnt} px, bbox x {minx}-{maxx}, y {miny}-{maxy}")

if cnt == 0:
    print("tidak ketemu"); sys.exit()

# 2) dalam bbox (dikurangi margin), cari piksel TERANG (bukan merah): r>190, g>180, b>170, r-g<30
bright = []
for y in range(miny, maxy + 1):
    for x in range(minx, maxx + 1):
        r, g, b = px[x, y]
        if r > 185 and g > 175 and b > 165 and (r - g) < 35:
            bright.append((x, y, r, g, b))
print(f"piksel terang dalam area genteng: {len(bright)}")
if bright:
    xs = [p[0] for p in bright]
    ys = [p[1] for p in bright]
    print(f"sebaran: x {min(xs)}-{max(xs)}, y {min(ys)}-{max(ys)}")
    from collections import Counter
    c = Counter((p[2], p[3], p[4]) for p in bright).most_common(8)
    print("warna dominan:", [(f"#{r:02x}{g:02x}{b:02x}", n) for (r, g, b), n in c])
    # klaster kasar: hitung piksel per baris 8px
    rows = Counter(p[1] // 8 * 8 for p in bright)
    print("piksel per blok-y (top 10):", sorted(rows.items(), key=lambda kv: -kv[1])[:10])
