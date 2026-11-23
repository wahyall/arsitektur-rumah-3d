/**
 * Mesin perhitungan rumah 6x6 m:
 * - definisi denah (dinding luar/dalam + bukaan pintu & jendela)
 * - generator susunan bata per lajur (batu demi batu, ikatan berselang)
 * - kalkulasi volume adukan/nat, luas bersih tiap ruangan, dan kuantitas RAB
 *
 * Semua ukuran dalam meter kecuali disebutkan lain (nat dalam mm).
 */

export type Axis = "h" | "v"; // h: dinding membentang sepanjang sumbu X denah, v: sepanjang Y

export type OpeningKind = "pintu" | "jendela";

export interface OpeningSpec {
  from: number; // koordinat absolut sepanjang sumbu dinding (meter)
  to: number;
  sill: number; // tinggi ambang bawah (0 untuk pintu)
  top: number; // tinggi ambang atas
  kind: OpeningKind;
  label: string;
}

export interface WallSpec {
  id: string;
  name: string;
  axis: Axis;
  edge?: number; // dinding luar: garis tepi luar bidang tanah (0 atau 6)
  pos?: number; // posisi centerline dinding dalam (atau dinding luar tanpa edge)
  from: number | ((t: { tL: number; tD: number }) => number); // awal band dinding
  to: number | ((t: { tL: number; tD: number }) => number); // akhir band dinding
  outer: boolean;
  gable?: { apexAt: number; apexAdd: number; halfSpan: number }; // dinding ujung atap pelana
  openings: OpeningSpec[];
}

export interface RoomSpec {
  id: string;
  name: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface LayoutPreset {
  id: string;
  name: string;
  desc: string;
  walls: WallSpec[];
  rooms: RoomSpec[];
}

// ---------------------------------------------------------------- presets --

const PINTU_W = 0.9;
const PINTU_H = 2.1;
const JENDELA_H_ATAS = 2.1;
const JENDELA_SILL = 0.9;

function pintu(from: number, label: string): OpeningSpec {
  return { from, to: from + PINTU_W, sill: 0, top: PINTU_H, kind: "pintu", label };
}
function jendela(from: number, w: number, label: string, sill = JENDELA_SILL, top = JENDELA_H_ATAS): OpeningSpec {
  return { from, to: from + w, sill, top, kind: "jendela", label };
}

const GABLE = { apexAt: 3, apexAdd: 1.5, halfSpan: 3 };

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: "2br",
    name: "2 Kamar (Tipe 36)",
    desc: "Dua kamar tidur 3x3, ruang keluarga + dapur, kamar mandi 1,5x1,5",
    walls: [
      {
        id: "belakang", name: "Dinding belakang (dapur & KM)", axis: "h", edge: 0,
        from: 0, to: 6, outer: true, gable: GABLE,
        openings: [
          jendela(3.3, 0.6, "Jendela KM", 1.4, 2.0),
          jendela(4.9, 0.9, "Jendela dapur", 1.0, 2.0),
        ],
      },
      {
        id: "depan", name: "Dinding depan", axis: "h", edge: 6,
        from: 0, to: 6, outer: true, gable: GABLE,
        openings: [
          jendela(1.0, 1.0, "Jendela kamar 1"),
          pintu(4.2, "Pintu utama"),
        ],
      },
      {
        id: "kiri", name: "Dinding sisi kiri", axis: "v", edge: 0,
        from: (t) => t.tL, to: (t) => 6 - t.tL, outer: true,
        openings: [
          jendela(1.0, 1.0, "Jendela kamar 2"),
          jendela(4.0, 1.0, "Jendela kamar 1"),
        ],
      },
      {
        id: "kanan", name: "Dinding sisi kanan", axis: "v", edge: 6,
        from: (t) => t.tL, to: (t) => 6 - t.tL, outer: true,
        openings: [jendela(3.9, 1.2, "Jendela ruang keluarga")],
      },
      {
        id: "w5", name: "Sekat kamar (vertikal)", axis: "v", pos: 3,
        from: (t) => t.tL, to: (t) => 6 - t.tL, outer: false,
        openings: [pintu(1.0, "Pintu kamar 2"), pintu(4.3, "Pintu kamar 1")],
      },
      {
        id: "w6", name: "Sekat antar kamar", axis: "h", pos: 3,
        from: (t) => t.tL, to: (t) => 3 - t.tD / 2, outer: false,
        openings: [],
      },
      {
        id: "w7", name: "Sekat area basah", axis: "h", pos: 1.5,
        from: (t) => 3 + t.tD / 2, to: (t) => 6 - t.tL, outer: false,
        openings: [pintu(3.3, "Pintu kamar mandi")],
      },
      {
        id: "w8", name: "Sekat kamar mandi", axis: "v", pos: 4.5,
        from: (t) => t.tL, to: (t) => 1.5 - t.tD / 2, outer: false,
        openings: [],
      },
    ],
    rooms: [
      { id: "kamar1", name: "Kamar Tidur 1", x0: 0, y0: 3, x1: 3, y1: 6 },
      { id: "kamar2", name: "Kamar Tidur 2", x0: 0, y0: 0, x1: 3, y1: 3 },
      { id: "keluarga", name: "Ruang Keluarga & Dapur", x0: 3, y0: 1.5, x1: 6, y1: 6 },
      { id: "km", name: "Kamar Mandi", x0: 3, y0: 0, x1: 4.5, y1: 1.5 },
      { id: "dapur", name: "Area Dapur", x0: 4.5, y0: 0, x1: 6, y1: 1.5 },
    ],
  },
  {
    id: "studio",
    name: "Studio (1 ruang besar)",
    desc: "Satu ruang serbaguna + kamar mandi pojok 1,5x2 m",
    walls: [
      {
        id: "belakang", name: "Dinding belakang", axis: "h", edge: 0,
        from: 0, to: 6, outer: true, gable: GABLE,
        openings: [
          jendela(1.0, 1.0, "Jendela dapur"),
          jendela(5.1, 0.6, "Jendela KM", 1.4, 2.0),
        ],
      },
      {
        id: "depan", name: "Dinding depan", axis: "h", edge: 6,
        from: 0, to: 6, outer: true, gable: GABLE,
        openings: [pintu(2.5, "Pintu utama"), jendela(4.3, 1.3, "Jendela depan")],
      },
      {
        id: "kiri", name: "Dinding sisi kiri", axis: "v", edge: 0,
        from: (t) => t.tL, to: (t) => 6 - t.tL, outer: true,
        openings: [jendela(2.6, 1.5, "Jendela studio")],
      },
      {
        id: "kanan", name: "Dinding sisi kanan", axis: "v", edge: 6,
        from: (t) => t.tL, to: (t) => 6 - t.tL, outer: true,
        openings: [
          jendela(0.5, 0.6, "Jendela KM", 1.4, 2.0),
          jendela(2.9, 1.5, "Jendela studio"),
        ],
      },
      {
        id: "w8", name: "Sekat kamar mandi", axis: "v", pos: 4.5,
        from: (t) => t.tL, to: (t) => 2 - t.tD / 2, outer: false,
        openings: [pintu(0.9, "Pintu kamar mandi")],
      },
      {
        id: "w7", name: "Sekat area basah", axis: "h", pos: 2,
        from: (t) => 4.5 + t.tD / 2, to: (t) => 6 - t.tL, outer: false,
        openings: [],
      },
    ],
    rooms: [
      { id: "studio-a", name: "Ruang Studio (utama)", x0: 0, y0: 0, x1: 4.5, y1: 6 },
      { id: "studio-b", name: "Ruang Studio (area dapur)", x0: 4.5, y0: 2, x1: 6, y1: 6 },
      { id: "km", name: "Kamar Mandi", x0: 4.5, y0: 0, x1: 6, y1: 2 },
    ],
  },
];

// ------------------------------------------------------------------ types --

export interface WallRT {
  spec: WallSpec;
  id: string;
  name: string;
  axis: Axis;
  c: number; // posisi centerline (y untuk axis h, x untuk axis v)
  lo: number; // awal band sepanjang axis (batas pasangan bata)
  hi: number; // akhir band sepanjang axis
  t: number; // tebal dinding (m)
  h: number; // tinggi dinding datar (m)
  gable?: { apexAt: number; apexAdd: number; halfSpan: number };
  openings: OpeningSpec[];
  outer: boolean;
  explodeDir: [number, number];
}

export interface BrickInstance {
  wallId: string;
  outer: boolean;
  x: number; // pusat bata, koordinat denah
  y: number; // pusat bata, koordinat denah
  z: number; // elevasi dasar bata (m, dari lantai)
  len: number; // panjang terpasang (m, bisa potongan)
  hgt: number; // tinggi terpasang (m, dipotong mengikuti dinding atap)
  rotY: number; // 0 = sepanjang X, Math.PI/2 = sepanjang Y
}

export interface RoomNet {
  id: string;
  name: string;
  w: number; // dimensi bersih (m)
  d: number;
  area: number;
  cx: number; // pusat ruangan (koordinat denah, untuk label 3D)
  cy: number;
}

export interface HouseConfig {
  preset: string;
  tinggi: number;
  jenis: "hebel" | "merah";
  tLuar: number; // mm
  tDalam: number; // mm
  natMm: number;
  wastePct: number;
  plesteran: boolean;
}

export const BRICK = {
  hebel: { L: 0.6, H: 0.2, label: "Bata putih / hebel AAC 60 x 20 cm" },
  merah: { L: 0.2, H: 0.05, label: "Bata merah 20 x 10 x 5 cm (pasangan 1/2 batu)" },
} as const;

export const HEBEL_THICK = [75, 100, 125, 150, 200];
export const MERAH_THICK = [100, 200];

export const DEFAULT_CONFIG: HouseConfig = {
  preset: "2br",
  tinggi: 3.0,
  jenis: "hebel",
  tLuar: 100,
  tDalam: 75,
  natMm: 3,
  wastePct: 5,
  plesteran: false,
};

export const DEFAULT_CONFIG_MERAH: HouseConfig = {
  ...DEFAULT_CONFIG,
  jenis: "merah",
  tLuar: 100,
  tDalam: 100,
  natMm: 10,
  plesteran: true,
};

// ---------------------------------------------------------------- helpers --

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

interface Interval {
  lo: number;
  hi: number;
}

function subtractIntervals(base: Interval, cuts: Interval[]): Interval[] {
  let pieces: Interval[] = [{ ...base }];
  for (const c of cuts) {
    const next: Interval[] = [];
    for (const p of pieces) {
      if (c.hi <= p.lo || c.lo >= p.hi) {
        next.push(p);
        continue;
      }
      if (c.lo > p.lo) next.push({ lo: p.lo, hi: c.lo });
      if (c.hi < p.hi) next.push({ lo: c.hi, hi: p.hi });
    }
    pieces = next;
  }
  return pieces.filter((p) => p.hi - p.lo > 0.015); // buang irisan sangat tipis
}

// ----------------------------------------------------------------- engine --

export interface HouseModel {
  config: HouseConfig;
  walls: WallRT[];
  brickDims: { L: number; H: number };
  bricks: BrickInstance[];
  count: {
    outerPieces: number;
    innerPieces: number;
    totalPieces: number;
    buyOuter: number;
    buyInner: number;
    totalBuy: number;
  };
  mortar: {
    volM3: number;
    semenZak: number;
    pasirM3: number;
    perekatKg: number;
    perekatZak: number;
    natMm: number;
  };
  areas: {
    gross: number;
    netFloor: number;
    rooms: RoomNet[];
    reduksiM2: number;
    reduksiPct: number;
    wallFace: number;
    plasterArea: number;
    wallFootprint: number;
  };
  openings: { doors: number; windows: number };
  roof: { areaM2: number; apexAdd: number; overhang: number };
  wallLenTotal: number;
  pondasiVolM3: number;
}

export function buildModel(config: HouseConfig): HouseModel {
  const preset = LAYOUT_PRESETS.find((p) => p.id === config.preset) ?? LAYOUT_PRESETS[0];
  const tL = config.tLuar / 1000;
  const tD = config.tDalam / 1000;
  const dims = BRICK[config.jenis];
  const j = config.natMm / 1000;

  // ----- dinding runtime
  const walls: WallRT[] = preset.walls.map((spec) => {
    const t = spec.outer ? tL : tD;
    let c: number;
    if (spec.edge !== undefined) {
      c = spec.edge === 0 ? t / 2 : 6 - t / 2;
    } else {
      c = spec.pos ?? 0;
    }
    const lo = typeof spec.from === "function" ? spec.from({ tL, tD }) : spec.from;
    const hi = typeof spec.to === "function" ? spec.to({ tL, tD }) : spec.to;
    const explodeDir: [number, number] =
      spec.axis === "h"
        ? spec.edge === 6 || (!spec.outer && (spec.pos ?? 0) < 3)
          ? [0, 1]
          : [0, -1]
        : spec.edge === 6 || (!spec.outer && (spec.pos ?? 0) > 3)
          ? [1, 0]
          : [-1, 0];
    return {
      spec,
      id: spec.id,
      name: spec.name,
      axis: spec.axis,
      c,
      lo,
      hi,
      t,
      h: config.tinggi,
      gable: spec.gable,
      openings: spec.openings.filter((o) => o.to > lo && o.from < hi && o.top > 0.2),
      outer: spec.outer,
      explodeDir,
    };
  });

  // ----- susunan bata per dinding
  const bricks: BrickInstance[] = [];
  let outerPieces = 0;
  let innerPieces = 0;
  let wallFace = 0;
  let bandVol = 0;
  let brickVol = 0;
  let wallFootprint = 0;
  let wallLenTotal = 0;

  const cellL = dims.L + j;
  const cellH = dims.H + j;

  for (const w of walls) {
    const len = w.hi - w.lo;
    wallLenTotal += len;
    wallFootprint += len * w.t;

    const hAt = w.gable
      ? (x: number) => w.h + w.gable!.apexAdd * clamp01(1 - Math.abs(x - w.gable!.apexAt) / w.gable!.halfSpan)
      : () => w.h;

    // luas muka satu sisi (net bukaan) + volume band
    const gableArea = w.gable ? w.gable.apexAdd * (w.hi - w.lo) * 0.5 : 0;
    const openingArea = w.openings.reduce(
      (s, o) =>
        s +
        Math.max(0, Math.min(o.to, w.hi) - Math.max(o.from, w.lo)) *
          Math.min(o.top, hAt((o.from + o.to) / 2)),
      0,
    );
    wallFace += w.h * len + gableArea - openingArea;
    bandVol += (w.h * len + gableArea) * w.t - openingArea * w.t;

    const nCourses = Math.ceil((w.h + (w.gable ? w.gable.apexAdd : 0)) / cellH);
    for (let i = 0; i < nCourses; i++) {
      const zc = i * cellH;
      if (zc >= w.h + (w.gable ? w.gable.apexAdd : 0) - 0.001) break;

      // interval yang boleh dipasangi bata pada lajur ini:
      // 1) batasi oleh profil dinding atap (kalau lajur sudah di atas dinding datar)
      let allowed: Interval;
      if (w.gable && zc >= w.h) {
        const d = w.gable.halfSpan * (1 - (zc - w.h) / w.gable.apexAdd);
        if (d <= 0) continue;
        allowed = {
          lo: Math.max(w.lo, w.gable.apexAt - d),
          hi: Math.min(w.hi, w.gable.apexAt + d),
        };
      } else {
        allowed = { lo: w.lo, hi: w.hi };
      }
      if (allowed.hi - allowed.lo <= 0.015) continue;

      // 2) bukaan yang memotong lajur ini secara vertikal
      const activeCuts: Interval[] = w.openings
        .filter((o) => o.sill < zc + dims.H - 0.005 && o.top > zc + 0.005)
        .map((o) => ({ lo: Math.max(o.from, w.lo), hi: Math.min(o.to, w.hi) }));

      // 3) isi bata dengan ikatan berselang (stretcher bond)
      const phase = (i % 2) * cellL * 0.5;
      let p = allowed.lo - phase;
      while (p + dims.L <= allowed.lo) p += cellL;
      for (; p < allowed.hi; p += cellL) {
        const segs = subtractIntervals(
          { lo: Math.max(p, allowed.lo), hi: Math.min(p + dims.L, allowed.hi) },
          activeCuts,
        );
        for (const s of segs) {
          const cx = (s.lo + s.hi) / 2;
          const hgt = Math.min(dims.H, Math.max(0, hAt(cx) - zc));
          if (hgt <= 0.02) continue;
          const frac = ((s.hi - s.lo) / dims.L) * (hgt / dims.H);
          if (w.outer) outerPieces += frac;
          else innerPieces += frac;
          brickVol += frac * dims.L * dims.H * w.t;
          bricks.push(
            w.axis === "h"
              ? { wallId: w.id, outer: w.outer, x: cx, y: w.c, z: zc, len: s.hi - s.lo, hgt, rotY: 0 }
              : { wallId: w.id, outer: w.outer, x: w.c, y: cx, z: zc, len: s.hi - s.lo, hgt, rotY: Math.PI / 2 },
          );
        }
      }
    }
  }

  const mortarVol = Math.max(0, bandVol - brickVol);

  // ----- luas bersih ruangan (setelah dikurangi tebal dinding)
  interface Band {
    axis: Axis;
    x0: number;
    x1: number;
    y0: number;
    y1: number;
  }
  const bands: Band[] = walls.map((w) =>
    w.axis === "h"
      ? { axis: w.axis, x0: w.lo, x1: w.hi, y0: w.c - w.t / 2, y1: w.c + w.t / 2 }
      : { axis: w.axis, x0: w.c - w.t / 2, x1: w.c + w.t / 2, y0: w.lo, y1: w.hi },
  );
  const rooms: RoomNet[] = preset.rooms.map((r) => {
    let xl = 0, xr = 0, yb = 0, yt = 0;
    for (const b of bands) {
      const yOverlap = Math.min(b.y1, r.y1) - Math.max(b.y0, r.y0);
      const xOverlap = Math.min(b.x1, r.x1) - Math.max(b.x0, r.x0);
      // sisi kiri/kanan hanya oleh dinding vertikal, sisi bawah/atas hanya oleh dinding horizontal
      if (b.axis === "v") {
        if (b.x0 <= r.x0 + 0.02 && b.x1 > r.x0 && yOverlap > 0.05) xl = Math.max(xl, b.x1 - r.x0);
        if (b.x1 >= r.x1 - 0.02 && b.x0 < r.x1 && yOverlap > 0.05) xr = Math.max(xr, r.x1 - b.x0);
      } else {
        if (b.y0 <= r.y0 + 0.02 && b.y1 > r.y0 && xOverlap > 0.05) yb = Math.max(yb, b.y1 - r.y0);
        if (b.y1 >= r.y1 - 0.02 && b.y0 < r.y1 && xOverlap > 0.05) yt = Math.max(yt, r.y1 - b.y0);
      }
    }
    const wNet = Math.max(0, r.x1 - r.x0 - xl - xr);
    const dNet = Math.max(0, r.y1 - r.y0 - yb - yt);
    return { id: r.id, name: r.name, w: wNet, d: dNet, area: wNet * dNet, cx: (r.x0 + r.x1) / 2, cy: (r.y0 + r.y1) / 2 };
  });

  const netFloor = rooms.reduce((s, r) => s + r.area, 0);
  const gross = 36;

  // ----- material
  const waste = config.wastePct / 100;
  const mortarWithWaste = mortarVol * (1 + waste);
  const semenZak = config.jenis === "merah" ? mortarWithWaste * 6.3 : 0;
  const pasirM3 = config.jenis === "merah" ? mortarWithWaste * 1.0 : 0;
  const perekatKg = config.jenis === "hebel" ? wallFace * 4 : 0;
  const perekatZak = config.jenis === "hebel" ? perekatKg / 40 : 0;

  // ----- atap pelana (kemiringan 1:2, rang-overhang 60 cm)
  const apexAdd = 1.5;
  const ov = 0.6;
  const pitch = apexAdd / 3;
  const slopeHalf = Math.hypot(3 + ov, apexAdd + ov * pitch);
  const roofArea = 2 * slopeHalf * (6 + 2 * ov);

  const doors = walls.reduce((s, w) => s + w.openings.filter((o) => o.kind === "pintu").length, 0);
  const windows = walls.reduce((s, w) => s + w.openings.filter((o) => o.kind === "jendela").length, 0);

  const pondasiVolM3 = wallLenTotal * 0.25 * 0.6;

  return {
    config,
    walls,
    brickDims: { L: dims.L, H: dims.H },
    bricks,
    count: {
      outerPieces,
      innerPieces,
      totalPieces: outerPieces + innerPieces,
      buyOuter: Math.ceil(outerPieces * (1 + waste)),
      buyInner: Math.ceil(innerPieces * (1 + waste)),
      totalBuy: Math.ceil(outerPieces * (1 + waste)) + Math.ceil(innerPieces * (1 + waste)),
    },
    mortar: {
      volM3: mortarVol,
      semenZak,
      pasirM3,
      perekatKg,
      perekatZak,
      natMm: config.natMm,
    },
    areas: {
      gross,
      netFloor,
      rooms,
      reduksiM2: gross - netFloor,
      reduksiPct: ((gross - netFloor) / gross) * 100,
      wallFace,
      plasterArea: wallFace * 2,
      wallFootprint,
    },
    openings: { doors, windows },
    roof: { areaM2: roofArea, apexAdd, overhang: ov },
    wallLenTotal,
    pondasiVolM3,
  };
}

// -------------------------------------------------------------------- RAB --

export interface RabRow {
  id: string;
  uraian: string;
  spek: string;
  qty: number;
  unit: string;
  harga: number;
  subtotal: number;
  exact: boolean; // true = kuantitas dihitung dari model 3D, false = estimasi
  priceKey: string; // kunci di PriceBook untuk edit harga satuan
}

export interface PriceBook {
  [id: string]: number;
}

export const DEFAULT_PRICES: PriceBook = {
  pondasi: 950000,
  bataLuarHebel75: 7500,
  bataLuarHebel100: 9000,
  bataLuarHebel125: 11000,
  bataLuarHebel150: 13000,
  bataLuarHebel200: 17000,
  bataMerah: 800,
  perekat: 72000,
  semen: 70000,
  pasir: 350000,
  plesteran: 95000,
  rabat: 220000,
  keramik: 95000,
  plafon: 145000,
  pintu: 1200000,
  jendela: 850000,
  rangkaAtap: 135000,
  genteng: 60000,
  listrikAir: 8000000,
};

export function hebelPriceId(mm: number): string {
  return `bataLuarHebel${mm}`;
}

export interface RabSummary {
  rows: RabRow[];
  materialTotal: number;
  upahPct: number;
  upah: number;
  total: number;
  perM2Gross: number;
  perM2Net: number;
}

export function buildRab(model: HouseModel, prices: PriceBook, upahPct: number): RabSummary {
  const cfg = model.config;
  const rows: RabRow[] = [];
  const push = (id: string, uraian: string, spek: string, qty: number, unit: string, exact: boolean, priceKey?: string) => {
    const key = priceKey ?? id;
    const harga = prices[key] ?? 0;
    rows.push({ id, uraian, spek, qty, unit, harga, subtotal: qty * harga, exact, priceKey: key });
  };

  push("pondasi", "Pondasi batu kali + galian", "Estimasi strip 25x60 cm sepanjang seluruh dinding", model.pondasiVolM3, "m3", false);

  if (cfg.jenis === "hebel") {
    push(
      "bataLuar",
      `Bata putih (hebel) dinding luar ${cfg.tLuar} mm`,
      "60 x 20 cm, dihitung dari susunan 3D + waste",
      model.count.buyOuter,
      "buah",
      true,
      hebelPriceId(cfg.tLuar),
    );
    push(
      "bataDalam",
      `Bata putih (hebel) dinding dalam ${cfg.tDalam} mm`,
      "60 x 20 cm, dihitung dari susunan 3D + waste",
      model.count.buyInner,
      "buah",
      true,
      hebelPriceId(cfg.tDalam),
    );
    push(
      "perekat",
      "Perekat hebel (mortar instan)",
      "4 kg per m2 dinding, kemasan 40 kg/zak",
      Math.ceil(model.mortar.perekatZak),
      "zak",
      true,
    );
  } else {
    push("bataLuar", "Bata merah dinding luar (1/2 batu)", "20x10x5 cm, dihitung dari susunan 3D + waste", model.count.buyOuter, "buah", true, "bataMerah");
    push("bataDalam", "Bata merah dinding dalam (1/2 batu)", "20x10x5 cm, dihitung dari susunan 3D + waste", model.count.buyInner, "buah", true, "bataMerah");
    push(
      "semen",
      "Semen pasangan (campuran 1:5)",
      `Nat ${cfg.natMm} mm; volume adukan ${model.mortar.volM3.toFixed(2)} m3`,
      Math.ceil(model.mortar.semenZak),
      "zak",
      true,
    );
    push("pasir", "Pasir pasang", "Campuran adukan 1:5", Math.ceil(model.mortar.pasirM3 * 10) / 10, "m3", true);
  }

  if (cfg.plesteran) {
    push("plesteran", "Plesteran + aci (2 sisi dinding)", "Luas muka dinding x 2 sisi", Math.ceil(model.areas.plasterArea * 10) / 10, "m2", true);
  }

  push("rabat", "Rabat beton lantai kerja", "Tebal 10 cm di atas luas bersih lantai", Math.ceil(model.areas.netFloor * 10) / 10, "m2", false);
  push("keramik", "Keramik lantai + pemasangan", "40x40 cm golongan menengah", Math.ceil(model.areas.netFloor * 10) / 10, "m2", false);
  push("plafon", "Plafon gypsum + rangka", "Estimasi di atas luas bersih lantai", Math.ceil(model.areas.netFloor * 10) / 10, "m2", false);
  push("pintu", "Kusen + daun pintu lengkap", "Kayu 6x15 cm + daun panel + kunci", model.openings.doors, "unit", false);
  push("jendela", "Kusen + kaca jendela", "Aluminium + kaca 5 mm", model.openings.windows, "unit", false);
  push("rangkaAtap", "Rangka atap baja ringan", "C75 + reng, borongan material + pasang", Math.ceil(model.roof.areaM2), "m2", false);
  push("genteng", "Genteng beton flat", "10 pcs per m2", Math.ceil(model.roof.areaM2), "m2", false);
  push("listrikAir", "Instalasi listrik & air", "Titik lampu, MCB, air bersih + limbah", 1, "borongan", false);

  const materialTotal = rows.reduce((s, r) => s + r.subtotal, 0);
  const upah = Math.round((materialTotal * upahPct) / 100);
  const total = materialTotal + upah;
  return {
    rows,
    materialTotal,
    upahPct,
    upah,
    total,
    perM2Gross: total / model.areas.gross,
    perM2Net: total / Math.max(0.01, model.areas.netFloor),
  };
}

// --------------------------------------------------------------- format ---

export function fmtRp(v: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
}

export function fmtNum(v: number, digits = 0): string {
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}
