"""Verifikasi atap pelana dari screenshot tampilan 'Depan':
- Bidang kamera depan: sumbu X = x denah (0..6 m), ridge di x=3.
- Atap BENAR (puncak/peak): piksel warna atap (genteng merah / nok) berada
  lebih TINGGI (y lebih kecil) di sekitar x tengah bangunan.
- Atap TERBALIK (valley): warna atap lebih tinggi di sisi kiri/kanan.
Analisis: cari piksel 'genteng' (merah bata ~ (150,82,74) dengan variasi) dan
'nok' gelap, lalu bandingkan rata-rata posisi y piksel atap pada kolom
tengah vs kolom pinggir dalam area bangunan.
"""
from PIL import Image
import sys

img = Image.open("/tmp/render/depan.png").convert("RGB")
w, h = img.size
px = img.load()

def is_roof_color(c):
    r, g, b = c
    # genteng merah bata: merah dominan, cukup jenuh
    return r > 100 and r < 200 and g < 110 and b < 110 and (r - g) > 40 and (r - b) > 40

# hitung bounding box piksel atap
roof_px = [(x, y) for y in range(h) for x in range(w) if is_roof_color(px[x, y])]
if not roof_px:
    print("TIDAK ADA piksel genteng terdeteksi — periksa render")
    sys.exit(1)

xs = [p[0] for p in roof_px]
ys = [p[1] for p in roof_px]
x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
print(f"Ukuran gambar: {w}x{h}")
print(f"BBox piksel genteng: x {x0}-{x1}, y {y0}-{y1}")

# profil: untuk tiap kolom x, tinggi teratas piksel atap
top_by_x = {}
for (x, y) in roof_px:
    if x not in top_by_x or y < top_by_x[x]:
        top_by_x[x] = y

lo, hi = x0, x1
mid_lo = int(x0 + (x1 - x0) * 0.40)
mid_hi = int(x0 + (x1 - x0) * 0.60)

def avg_top(a, b):
    vals = [top_by_x[x] for x in top_by_x if a <= x <= b]
    return sum(vals) / len(vals) if vals else None

t_edge_l = avg_top(lo, lo + (mid_lo - lo) // 3)
t_center = avg_top(mid_lo, mid_hi)
t_edge_r = avg_top(hi - (hi - mid_hi) // 3, hi)
print(f"puncak atap di tepi kiri : y~{t_edge_l:.1f}")
print(f"puncak atap di tengah    : y~{t_center:.1f}")
print(f"puncak atap di tepi kanan: y~{t_edge_r:.1f}")

if t_center is None:
    print("GAGAL: tidak ada piksel atap di area tengah")
    sys.exit(1)

ok_peak = t_center < min(t_edge_l or 1e9, t_edge_r or 1e9)
diff_l = (t_edge_l - t_center) if t_edge_l else 0
diff_r = (t_edge_r - t_center) if t_edge_r else 0
print(f"Selisih tinggi ridge vs eaves: kiri {diff_l:.1f}px, kanan {diff_r:.1f}px")
print("KESIMPULAN:", "ATAP BENAR (puncak di ridge, membentuk gunung)" if ok_peak else "ATAP MASIH TERBALIK (valley/kepikul)")
