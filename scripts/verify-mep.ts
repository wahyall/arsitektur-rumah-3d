/** Verifikasi kuantitas MEP & RAB divisi VIII dari model 3D. */
import { buildModel, buildRab, DEFAULT_CONFIG, DEFAULT_PRICES } from "../src/lib/house/engine";

for (const preset of ["2br", "studio"] as const) {
  const model = buildModel({ ...DEFAULT_CONFIG, preset });
  const m = model.mep;
  console.log(`\n=== preset ${preset} ===`);
  console.log(`routes: ${m.routes.length}, points: ${m.points.length}`);
  console.log(`air bersih: ${m.airBersihM.toFixed(2)} m | air kotor: ${m.airKotorM.toFixed(2)} m`);
  console.log(`conduit: ${m.conduitM.toFixed(2)} m | kabel lampu 1,5: ${m.kabelLampuM.toFixed(2)} m | kabel kontak 2,5: ${m.kabelKontakM.toFixed(2)} m`);
  console.log(`titik: ${m.titikLampu} lampu, ${m.saklar} saklar, ${m.stopkontak} stopkontak, ${m.kloset} kloset, ${m.shower} shower, ${m.kran} kran, ${m.drain} drain`);
  console.log(`septic: (${m.septic.x}, ${m.septic.z}) resapan: (${m.resapan.x}, ${m.resapan.z})`);
  // sanity: semua titik dalam/tak jauh dari denah 0..6
  let bad = 0;
  for (const p of m.points) {
    if (p.x < -1.5 || p.x > 7.5 || p.z < -1.5 || p.z > 7.5 || p.y < -1.5 || p.y > 4.2) {
      console.log(`  OUT OF RANGE: ${p.id} (${p.kind}) x=${p.x} y=${p.y} z=${p.z}`);
      bad++;
    }
  }
  if (bad === 0) console.log("semua titik dalam rentang wajar ✓");
}

const model2 = buildModel(DEFAULT_CONFIG);
const rab = buildRab(model2, DEFAULT_PRICES, 25);
const d8 = rab.divisions.find((d) => d.id === "d8")!;
console.log("\n=== RAB divisi VIII (2br) ===");
for (const r of d8.rows) {
  console.log(`${r.id.padEnd(18)} qty=${String(r.qty).padStart(4)} ${r.unit.padEnd(5)} harga=${r.harga} sub=${r.subtotal}`);
}
console.log(`subtotal d8: ${d8.subtotal}`);
console.log(`TOTAL RAB (material+upah 25%): ${rab.total} (per m2 net: ${Math.round(rab.perM2Net)})`);
const totalRows = rab.rows.reduce((s, r) => s + r.subtotal, 0);
console.log(`cek: sum rows = ${totalRows} = materialTotal ${rab.materialTotal} -> ${totalRows === rab.materialTotal ? "OK" : "MISMATCH!"}`);
// aritmetika subtotal tiap baris
const bad = rab.rows.filter((r) => Math.round(r.qty * r.harga) !== r.subtotal);
console.log(bad.length === 0 ? "semua subtotal qty*harga konsisten ✓" : `MISMATCH: ${bad.map((b) => b.id).join(",")}`);
