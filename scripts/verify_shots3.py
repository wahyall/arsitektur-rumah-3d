#!/usr/bin/env python3
"""Analisis area kanvas yang benar (417,224)-(1379,784): genteng, tanah, plester, cat."""
from PIL import Image
import os

SH = "/home/z/my-project/shots"
CANVAS = (417, 224, 1379, 784)

def crop(path):
    return Image.open(os.path.join(SH, path)).convert("RGB").crop(CANVAS)

def stats(f):
    im = crop(f)
    px = list(im.getdata())
    n = len(px)
    warm = sum(1 for r, g, b in px if r > 100 and (r - g) > 20 and (r - b) > 20)  # genteng/kayau/bricks merah
    green = sum(1 for r, g, b in px if g > r and g > b and g > 110)
    gray_beton = sum(1 for r, g, b in px if abs(r - g) < 14 and abs(g - b) < 14 and 90 < r < 200)
    ivory = sum(1 for r, g, b in px if r > 215 and g > 208 and b > 195 and (r - b) < 40)  # cat ivory / plester terang
    dark = sum(1 for r, g, b in px if r < 90 and g < 90 and b < 90)
    steel = sum(1 for r, g, b in px if b > r and b > 130 and b < 210 and abs(b - g) < 30)  # baja kebiruan
    return {k: round(v / n * 100, 2) for k, v in dict(warm=warm, green=green, beton=gray_beton, ivory=ivory, dark=dark, steel=steel).items()}

for f in ["00b-default.png", "01-stage1-pondasi.png", "03-stage3-dinding.png", "05-stage5-rangka.png", "07-stage7-plester.png", "08-stage8-cat.png"]:
    s = stats(f)
    print(f"{f}: {s}")
