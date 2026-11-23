#!/usr/bin/env python3
"""Verifikasi programatik tangkapan layar: file ada, tidak blank, dan tiap tahapan berbeda + warna kunci hadir."""
from PIL import Image
import os, sys

SH = "/home/z/my-project/shots"
files = sorted(os.listdir(SH))

def stats(path):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    # area kanvas: kira-kira y 150..710 (header ~150px)
    crop = im.crop((0, 150, w, 710))
    px = list(crop.getdata())
    n = len(px)
    nonwhite = sum(1 for p in px if not (p[0] > 240 and p[1] > 240 and p[2] > 240))
    # warna kunci
    def near(p, target, tol=28):
        return all(abs(a - b) <= tol for a, b in zip(p, target))
    ivory = (237, 231, 219)   # cat #ede7db
    beton = (143, 144, 137)   # #8f9089
    genteng = (150, 82, 74)   # #96524a
    plinth = (180, 177, 168)  # #b4b1a8
    baja = (154, 168, 178)    # #9aa8b2
    c_ivory = sum(1 for p in px if near(p, ivory))
    c_beton = sum(1 for p in px if near(p, beton))
    c_genteng = sum(1 for p in px if near(p, genteng))
    c_plinth = sum(1 for p in px if near(p, plinth))
    c_baja = sum(1 for p in px if near(p, baja))
    return dict(
        size=(w, h), nonwhite_pct=round(nonwhite / n * 100, 1),
        ivory_pct=round(c_ivory / n * 100, 2), beton_pct=round(c_beton / n * 100, 2),
        genteng_pct=round(c_genteng / n * 100, 2), plinth_pct=round(c_plinth / n * 100, 2),
        baja_pct=round(c_baja / n * 100, 2),
    )

ok = True
for f in files:
    p = os.path.join(SH, f)
    kb = os.path.getsize(p) // 1024
    s = stats(p)
    if kb < 30 or s["nonwhite_pct"] < 3:
        print(f"FAIL {f}: kemungkinan blank ({kb} KB, konten {s['nonwhite_pct']}%)")
        ok = False
    print(f"{f}: {kb}KB konten={s['nonwhite_pct']}% ivory={s['ivory_pct']}% beton={s['beton_pct']}% genteng={s['genteng_pct']}% plinth={s['plinth_pct']}% baja={s['baja_pct']}%")

# perbedaan antar tahapan
def diff(a, b):
    ia = Image.open(os.path.join(SH, a)).convert("RGB").crop((0, 150, 1440, 710))
    ib = Image.open(os.path.join(SH, b)).convert("RGB").crop((0, 150, 1440, 710))
    da = ia.getdata(); db = ib.getdata()
    n = len(da)
    d = sum(1 for p, q in zip(da, db) if any(abs(x - y) > 18 for x, y in zip(p, q)))
    return d / n * 100

pairs = [("00-default.png", "01-stage1-pondasi.png"), ("01-stage1-pondasi.png", "03-stage3-dinding.png"),
         ("03-stage3-dinding.png", "05-stage5-rangka.png"), ("05-stage5-rangka.png", "07-stage7-plester.png"),
         ("07-stage7-plester.png", "08-stage8-cat.png")]
for a, b in pairs:
    d = diff(a, b)
    status = "OK" if d > 5 else "MIRIP"
    if d <= 5: ok = False
    print(f"diff {a} vs {b}: {d:.1f}% {status}")

# ekspektasi warna
res = {f: stats(os.path.join(SH, f)) for f in files}
def expect(f, key, minv, label):
    global ok
    v = res[f][key]
    good = v >= minv
    if not good: ok = False
    print(f"{'OK ' if good else 'FAIL'} {label}: {f} {key}={v}% (min {minv}%)")

expect("01-stage1-pondasi.png", "plinth_pct", 0.5, "pondasi batu kali terlihat (plinth)")
expect("01-stage1-pondasi.png", "ivory_pct", 0.0, "no cat")
expect("03-stage3-dinding.png", "beton_pct", 0.2, "sloof/kolom beton terlihat")
expect("05-stage5-rangka.png", "baja_pct", 0.3, "rangka baja terlihat")
expect("05-stage5-rangka.png", "genteng_pct", 0.0, "genteng tersembunyi di tahap 5 (bukan > 0.3)")
expect("00-default.png", "genteng_pct", 0.3, "genteng terlihat di default")
expect("07-stage7-plester.png", "ivory_pct", 3, "plester/abu muda menutup dinding")

print("SELESAI-OK" if ok else "ADA-FAIL")
sys.exit(0 if ok else 1)
