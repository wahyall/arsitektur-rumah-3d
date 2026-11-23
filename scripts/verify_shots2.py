#!/usr/bin/env python3
"""Cek terarah: genteng (warna hangat) di default vs tahap 5; cat vs plester pada dinding depan; cakar ayam (buis abu di area pondasi)."""
from PIL import Image
import os

SH = "/home/z/my-project/shots"

def warm_ratio(path, box):
    im = Image.open(os.path.join(SH, path)).convert("RGB").crop(box)
    px = list(im.getdata())
    n = len(px)
    warm = sum(1 for r, g, b in px if r > 100 and (r - g) > 22 and (r - b) > 22)
    return warm / n * 100

def mean_rgb(path, box):
    im = Image.open(os.path.join(SH, path)).convert("RGB").crop(box)
    px = list(im.getdata())
    n = len(px)
    r = sum(p[0] for p in px) / n
    g = sum(p[1] for p in px) / n
    b = sum(p[2] for p in px) / n
    return (round(r, 1), round(g, 1), round(b, 1))

# area atap (atas kanvas tengah)
ROOF = (400, 170, 1040, 380)
# area dinding depan (tengah bawah kanvas)
WALL = (500, 430, 940, 620)

print("== genteng (warm %) di area atap ==")
for f in ["00-default.png", "05-stage5-rangka.png", "08-stage8-cat.png"]:
    print(f, round(warm_ratio(f, ROOF), 2), "%")

print("== dinding depan mean RGB (plester vs cat) ==")
for f in ["03-stage3-dinding.png", "07-stage7-plester.png", "08-stage8-cat.png"]:
    print(f, mean_rgb(f, WALL))

print("== area kanvas penuh mean (tahap1: harus didominasi tanah hijau) ==")
for f in ["01-stage1-pondasi.png"]:
    im = Image.open(os.path.join(SH, f)).convert("RGB").crop((0, 160, 1440, 730))
    px = list(im.getdata())
    n = len(px)
    green = sum(1 for r, g, b in px if g > r and g > b and g > 120)
    gray = sum(1 for r, g, b in px if abs(r - g) < 12 and abs(g - b) < 12 and 100 < r < 200)
    print(f"tanah hijau={green / n * 100:.1f}%  abu-abu (pondasi/beton)={gray / n * 100:.1f}%")
