/**
 * Audit independen: hitung ulang kuantitas kunci dari model dengan rumus
 * terpisah dan bandingkan dengan output engine. Fokus: konsistensi internal,
 * aritmetika RAB, dan angka yang diklaim di UI/sheet.
 */
import {
  buildModel,
  buildRab,
  DEFAULT_CONFIG,
  DEFAULT_CONFIG_MERAH,
  DEFAULT_PRICES,
  LAYOUT_PRESETS,
  RB_H,
  SLOOF_W,
  KOLOM_S,
  PONDASI_W,
  PONDASI_D,
  BRICK,
} from "../src/lib/house/engine";

let fail = 0;
function chk(label: string, a: number, b: number, tol = 0.02, unit = "") {
  const ok = Math.abs(a - b) <= tol;
  if (!ok) fail++;
  console.log(
    `${ok ? "OK " : "FAIL"} | ${label}: independen=${a.toFixed(3)}${unit} vs engine=${b.toFixed(3)}${unit}${ok ? "" : "  <-- SELISIH"}`,
  );
}

for (const cfg of [DEFAULT_CONFIG, DEFAULT_CONFIG_MERAH, { ...DEFAULT_CONFIG, preset: "studio", pondasi: "cakarayam" as const }]) {
  const m = buildModel(cfg);
  const tag = `${cfg.preset}/${cfg.jenis}/${cfg.pondasi}`;
  console.log(`\n=== ${tag} ===`);

  // 1. panjang dinding total = jumlah band (dari preset runtime)
  const lenSum = m.walls.reduce((s, w) => s + (w.hi - w.lo), 0);
  chk("panjang dinding", lenSum, m.wallLenTotal, 0.001, " m");

  // 2. sloof & ring balk: panjang x 0,15 x 0,20
  chk("volume sloof", lenSum * SLOOF_W * RB_H, m.structure.sloofM3, 0.001, " m3");
  chk("volume ring balk", lenSum * SLOOF_W * RB_H, m.structure.ringbalkM3, 0.001, " m3");

  // 3. kolom: jumlah titik x 0,15^2 x tinggi total
  chk("volume kolom", m.koloms.length * KOLOM_S * KOLOM_S * (m.config.tinggi + RB_H), m.structure.kolomM3, 0.001, " m3");

  // 4. pondasi batu kali
  if (m.config.pondasi === "batukali") {
    chk("volume pondasi strip", lenSum * PONDASI_W * PONDASI_D, m.structure.pondasiM3, 0.001, " m3");
  }

  // 5. luas atap: 2 x panjang-lereng x panjang-total
  const ov = m.config.overhang;
  const rad = (m.config.atapDeg * Math.PI) / 180;
  const pitch = Math.tan(rad);
  const apex = 3 * pitch;
  const slope = Math.hypot(3 + ov, apex + ov * pitch);
  chk("luas atap", 2 * slope * (6 + 2 * ov), m.roof.areaM2, 0.001, " m2");
  chk("naik nok", apex, m.roof.apexAdd, 0.001, " m");

  // 6. jumlah pintu/jendela/vent dari preset asli
  const preset = LAYOUT_PRESETS.find((p) => p.id === m.config.preset)!;
  const countKind = (k: string) =>
    preset.walls.reduce((s, w) => s + w.openings.filter((o) => o.kind === k).length, 0);
  chk("jumlah pintu", countKind("pintu"), m.openings.doors, 0, "");
  chk("jumlah jendela", countKind("jendela"), m.openings.windows, 0, "");
  // vent: beberapa bisa terbuang oleh resolveVent (pelana terlalu landai) / filter band
  const ventAll = countKind("vent");
  console.log(
    `INFO | vent: preset=${ventAll} vs model=${m.openings.vents} (selisih wajar bila pelana landai terbuang)`,
  );

  // 7. jumlah bata: pendekatan luas muka / luas wajah bata (konsistensi kasar)
  const dims = BRICK[m.config.jenis];
  const nat = m.config.natMm / 1000;
  const perM2 = 1 / ((dims.L + nat) * (dims.H + nat));
  const est = m.areas.wallFace * perM2;
  const diff = Math.abs(est - m.count.totalPieces) / Math.max(1, m.count.totalPieces);
  console.log(
    `${diff < 0.12 ? "OK " : "WARN"} | estimasi bata dari luas muka: ${est.toFixed(0)} vs terpasang ${m.count.totalPieces.toFixed(0)} (dev ${ (diff * 100).toFixed(1)}%)`,
  );

  // 8. RAB: aritmetika subtotal & total
  const rab = buildRab(m, DEFAULT_PRICES, 25);
  const matSum = rab.rows.reduce((s, r) => s + r.qty * DEFAULT_PRICES[r.priceKey], 0);
  chk("total material RAB", matSum, rab.materialTotal, 1, " Rp");
  chk("upah 25%", Math.round(matSum * 0.25), rab.upah, 1, " Rp");
  chk("grand total", matSum + Math.round(matSum * 0.25), rab.total, 1, " Rp");
  const divSum = rab.divisions.reduce((s, d) => s + d.subtotal, 0);
  chk("subtotal divisi", divSum, rab.materialTotal, 1, " Rp");
  for (const r of rab.rows) {
    if (Math.abs(r.qty * r.harga - r.subtotal) > 0.5) {
      fail++;
      console.log(`FAIL | baris ${r.id}: qty*harga != subtotal`);
    }
  }
}

console.log(`\n${fail === 0 ? "SEMUA COCOK" : fail + " KEGAGALAN"}`);
process.exitCode = fail === 0 ? 0 : 1;
