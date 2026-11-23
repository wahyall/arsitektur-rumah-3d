/** Uji cepat engine: pondasi cakar ayam, lubang angin, tahapan & RAB. */
import { buildModel, buildRab, DEFAULT_CONFIG, DEFAULT_PRICES, LAYOUT_PRESETS } from "../src/lib/house/engine";

function check(label: string, cond: boolean, detail = "") {
  console.log(`${cond ? "OK " : "FAIL"} | ${label}${detail ? ` | ${detail}` : ""}`);
  if (!cond) process.exitCode = 1;
}

for (const preset of LAYOUT_PRESETS.map((p) => p.id)) {
  for (const pondasi of ["batukali", "cakarayam"] as const) {
    const cfg = { ...DEFAULT_CONFIG, preset, pondasi };
    const m = buildModel(cfg);

    const galian = m.structure.galianM3;
    if (pondasi === "cakarayam") {
      const c = m.structure.cakar!;
      check(`[${preset}] cakar ayam aktif`, !!c && m.structure.pondasiM3 === 0);
      check(`[${preset}] jumlah buis masuk akal (>=4)`, c.buisCount >= 4, `buis=${c.buisCount}`);
      check(`[${preset}] volume beton pelat+buis`, c.betonM3 > 3 && c.betonM3 < 6, `${c.betonM3.toFixed(2)} m3`);
      check(
        `[${preset}] galian cakar < galian strip`,
        galian < m.wallLenTotal * 0.6 * 0.5,
        `${galian.toFixed(2)} vs strip ${(m.wallLenTotal * 0.3).toFixed(2)} m3`,
      );
      // buis tidak melebihi plot + margin wajar
      check(`[${preset}] buis di dalam denah`, c.buisPts.every((p) => p.x >= -0.2 && p.x <= 6.2 && p.y >= -0.2 && p.y <= 6.2));
    } else {
      check(`[${preset}] pondasi batu kali`, !m.structure.cakar && m.structure.pondasiM3 > 0, `${m.structure.pondasiM3.toFixed(2)} m3`);
    }

    // lubang angin
    check(`[${preset}] jumlah lubang angin >= 5`, m.openings.vents >= 5, `vents=${m.openings.vents}`);
    const ventOps = m.walls.flatMap((w) => w.openings).filter((o) => o.kind === "vent");
    check(
      `[${preset}] elevasi vent masuk akal`,
      ventOps.every((o) => o.sill > 0.5 && o.top > o.sill && o.top - o.sill <= 0.23),
    );
    // gable vent harus berada di atas ring balk
    const gableVents = ventOps.filter((o) => o.sill > DEFAULT_CONFIG.tinggi);
    check(`[${preset}] vent pelana di atas ring balk`, gableVents.every((o) => o.sill > DEFAULT_CONFIG.tinggi + 0.2), `n=${gableVents.length}`);

    // RAB
    const rab = buildRab(m, DEFAULT_PRICES, 25);
    const uraian = rab.rows.map((r) => r.uraian).join("||");
    if (pondasi === "cakarayam") {
      check(`[${preset}] RAB memuat cakar ayam`, uraian.includes("cakar ayam"));
      check(`[${preset}] RAB tanpa baris batu kali`, !uraian.includes("Pondasi batu kali"));
    } else {
      check(`[${preset}] RAB memuat batu kali`, uraian.includes("Pondasi batu kali"));
    }
    check(`[${preset}] RAB memuat lubang angin`, uraian.includes("Lubang angin permanen"));
    const ventRow = rab.rows.find((r) => r.id === "lubangAngin");
    check(`[${preset}] qty roster = jumlah vent`, ventRow?.qty === m.openings.vents);

    // plesteran & cat rows
    check(`[${preset}] RAB memuat cat dinding`, uraian.includes("Cat dinding"));

    // total positif & per m2
    check(`[${preset}] total RAB positif`, rab.total > 50_000_000, `Rp${rab.total.toLocaleString("id-ID")}`);
  }
}

// perbandingan biaya pondasi
const bk = buildRab(buildModel({ ...DEFAULT_CONFIG, pondasi: "batukali" }), DEFAULT_PRICES, 0);
const ca = buildRab(buildModel({ ...DEFAULT_CONFIG, pondasi: "cakarayam" }), DEFAULT_PRICES, 0);
const bkD2 = bk.divisions.find((d) => d.id === "d2")!.subtotal;
const caD2 = ca.divisions.find((d) => d.id === "d2")!.subtotal;
console.log(`Divisi II batu kali: Rp${bkD2.toLocaleString("id-ID")} | cakar ayam: Rp${caD2.toLocaleString("id-ID")}`);
check("cakar ayam tidak lebih murah drastis (wajar lebih mahal)", caD2 > bkD2 * 0.5 && caD2 < bkD2 * 2.5);

console.log("SELESAI");
