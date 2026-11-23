import { buildModel, DEFAULT_CONFIG, DEFAULT_CONFIG_MERAH, buildRab, DEFAULT_PRICES } from "../src/lib/house/engine";

function check(label: string, got: number, expectLo: number, expectHi: number) {
  const ok = got >= expectLo && got <= expectHi;
  console.log(`${ok ? "OK " : "XX "} ${label}: ${got.toFixed(2)} (harapan ${expectLo}..${expectHi})`);
}

console.log("=== MODE HEBEL 100/75, nat 3mm, tinggi 3m, preset 2BR ===");
const m1 = buildModel(DEFAULT_CONFIG);
console.log("Bata terpasang:", m1.count.totalPieces.toFixed(1), "| beli:", m1.count.totalBuy, "(luar", m1.count.buyOuter, "+ dalam", m1.count.buyInner + ")");
check("jumlah bata total", m1.count.totalPieces, 800, 900);
check("luas bersih", m1.areas.netFloor, 30, 34);
check("luas muka dinding", m1.areas.wallFace, 90, 110);
check("perekat zak", m1.mortar.perekatZak, 8, 12);
console.log("Kamar 1:", m1.areas.rooms[0].w.toFixed(3), "x", m1.areas.rooms[0].d.toFixed(3), "=", m1.areas.rooms[0].area.toFixed(2), "m2");
console.log("Ruang keluarga:", m1.areas.rooms[2].area.toFixed(2), "m2 | KM:", m1.areas.rooms[3].area.toFixed(2), "m2");
console.log("Pintu:", m1.openings.doors, "| Jendela:", m1.openings.windows, "| Atap m2:", m1.roof.areaM2.toFixed(1));

console.log("\n=== MODE BATA MERAH 100/100, nat 10mm ===");
const m2 = buildModel(DEFAULT_CONFIG_MERAH);
console.log("Bata terpasang:", m2.count.totalPieces.toFixed(0), "| beli:", m2.count.totalBuy);
check("jumlah bata merah", m2.count.totalPieces, 7000, 9500);
check("volume adukan m3", m2.mortar.volM3, 1.0, 2.2);
check("semen zak", m2.mortar.semenZak, 7, 16);
console.log("Adukan m3:", m2.mortar.volM3.toFixed(3), "| semen zak:", m2.mortar.semenZak.toFixed(1), "| pasir m3:", m2.mortar.pasirM3.toFixed(2));
check("luas bersih merah", m2.areas.netFloor, 30, 34);

console.log("\n=== PRESET STUDIO (hebel) ===");
const m3 = buildModel({ ...DEFAULT_CONFIG, preset: "studio" });
check("bata studio", m3.count.totalPieces, 550, 750);
check("luas bersih studio", m3.areas.netFloor, 31, 35);
console.log("Studio neto:", m3.areas.netFloor.toFixed(2), "m2 | pintu:", m3.openings.doors, "| jendela:", m3.openings.windows);

console.log("\n=== RAB hebel ===");
const r1 = buildRab(m1, DEFAULT_PRICES, 25);
console.log("Baris RAB:", r1.rows.length, "| material:", r1.materialTotal, "| total:", r1.total, "| /m2 bersih:", r1.perM2Net.toFixed(0));
const r2 = buildRab(m2, DEFAULT_PRICES, 25);
console.log("RAB merah total:", r2.total);

console.log("\n=== TEBAL DINDING 200mm (hebel) memakan luas ===");
const m4 = buildModel({ ...DEFAULT_CONFIG, tLuar: 200, tDalam: 100 });
console.log("Luas bersih 200/100:", m4.areas.netFloor.toFixed(2), "m2 (reduksi", m4.areas.reduksiM2.toFixed(2), "m2 /", m4.areas.reduksiPct.toFixed(1) + "%)");
check("reduksi 200mm", m4.areas.reduksiM2, 4, 7);
