/** Verifikasi katalog bagian (parts.ts) konsisten dengan buildRab untuk semua konfigurasi. */
import {
  buildModel,
  buildRab,
  DEFAULT_CONFIG,
  DEFAULT_CONFIG_MERAH,
  DEFAULT_PRICES,
} from "../src/lib/house/engine";
import { getPartInfo, partEye, partVisible, partTogglePatch, type PartId } from "../src/lib/house/parts";
import { DEFAULT_VIEW } from "../src/lib/house/studio";

const ALL_PARTS: PartId[] = [
  "pondasi", "sloof", "kolom", "ringbalk", "dinding", "pintu", "jendela", "vent",
  "lantai", "rangka", "lisplank", "genteng", "plafon", "plester", "cat",
  "pipaAirBersih", "pipaAirKotor", "septic", "meterAir", "kran", "shower", "kloset", "drain",
  "listrikLampu", "listrikKontak", "titikLampu", "saklar", "stopkontak", "panelMcb",
];

let fail = 0;
const cfgs = [
  { label: "hebel+batukali", cfg: DEFAULT_CONFIG },
  { label: "hebel+cakarayam", cfg: { ...DEFAULT_CONFIG, pondasi: "cakarayam" as const } },
  { label: "merah+batukali", cfg: DEFAULT_CONFIG_MERAH },
  { label: "merah+cakarayam", cfg: { ...DEFAULT_CONFIG_MERAH, pondasi: "cakarayam" as const } },
  { label: "studio", cfg: { ...DEFAULT_CONFIG, preset: "studio" } },
];

for (const { label, cfg } of cfgs) {
  const model = buildModel(cfg);
  const rab = buildRab(model, DEFAULT_PRICES, 25);
  const rowIds = new Set(rab.rows.map((r) => r.id));
  const missing: string[] = [];
  const okMissing = new Set(["plesteran"]); // sah absen bila plesteran nonaktif di konfigurasi

  console.log(`\n=== ${label} ===`);
  for (const id of ALL_PARTS) {
    const info = getPartInfo(id, model);
    if (!info) {
      console.log(`  TANPA INFO: ${id}`);
      fail++;
      continue;
    }
    if (!info.ringkas || info.specs.length < 3 || !info.group) {
      console.log(`  INFO KURANG: ${id} (ringkas/specs/group)`);
      fail++;
    }
    for (const rid of info.rowIds) {
      if (!rowIds.has(rid) && !okMissing.has(rid)) {
        console.log(`  ROW HILANG: bagian '${id}' -> row RAB '${rid}'`);
        fail++;
      }
    }
  }
  // visibilitas & patch
  const view = { ...DEFAULT_VIEW };
  const p = "pondasi" as PartId;
  if (!partVisible(p, view)) { console.log("  pondasi harus terlihat default"); fail++; }
  const patch = partTogglePatch(p, view);
  if (!patch.hidden?.includes(p)) { console.log("  toggle pondasi gagal"); fail++; }
  if (partVisible(p, { ...view, ...patch } as typeof view)) { console.log("  hidden pondasi tidak berfungsi"); fail++; }
  const back = partTogglePatch(p, { ...view, ...patch } as typeof view);
  if ((back.hidden ?? []).includes(p)) { console.log("  un-hide pondasi gagal"); fail++; }
  // flag-based: dinding
  const eyeD = partEye("dinding");
  if (eyeD.kind !== "flag" || eyeD.key !== "showDinding") { console.log("  eye dinding salah"); fail++; }
  if (!partVisible("dinding", view)) { console.log("  dinding harus terlihat"); fail++; }

  // ringkasan jumlah bagian ber-harga
  const withRows = ALL_PARTS.filter((id) => {
    const info = getPartInfo(id, model);
    return info && info.rowIds.some((r) => rowIds.has(r));
  });
  console.log(`  bagian dengan item RAB aktif: ${withRows.length}/${ALL_PARTS.length}`);
}

console.log(fail === 0 ? "\nSEMUA CEK KATALOG BAGIAN LULUS ✓" : `\n${fail} masalah ditemukan!`);
