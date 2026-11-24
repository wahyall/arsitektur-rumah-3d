/**
 * Mesin perhitungan rumah 6x6 m (standar praktik Indonesia):
 * - definisi denah (dinding luar/dalam + bukaan pintu, jendela & lubang angin permanen)
 * - generator susunan bata per lajur (batu demi batu, ikatan berselang)
 * - kalkulasi volume adukan/nat, luas bersih tiap ruangan, dan kuantitas RAB
 * - kuantitas struktur: galian, pondasi (batu kali strip ATAU cakar ayam sistem
 *   Sedyatmo: pelat beton + buis), sloof 15/20, kolom praktis 15/15, ring balk
 *   15/20, atap pelana (kuda-kuda, reng, genteng)
 *
 * Semua ukuran dalam meter kecuali disebutkan lain (nat dalam mm, atap dalam
 * derajat). Acuan praktik: SNI 8640:2018 (bata ringan), SNI 03-2965-1992
 * (pencahayaan alami), AHSP 2022 (analisa harga satuan), PUIL 2011 (listrik).
 */

export type Axis = "h" | "v"; // h: dinding membentang sepanjang sumbu X denah, v: sepanjang Y

export type OpeningKind = "pintu" | "jendela" | "vent";

export interface OpeningSpec {
  from: number; // koordinat absolut sepanjang sumbu dinding (meter)
  to: number;
  sill: number; // tinggi ambang bawah (0 untuk pintu)
  top: number; // tinggi ambang atas
  kind: OpeningKind;
  label: string;
  swing?: 1 | -1; // arah ayun daun pintu pada denah (wal dinding: +Y/-Y, vertikal: +X/-X)
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
  gable?: { apexAt: number; apexAdd: number; halfSpan: number }; // dinding ujung atap pelana (apexAdd dioverride oleh kemiringan atap)
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
  mep: MepSpec;
}

// ------------------------------------------------------------- instalasi --

/** Titik instalasi (MEP): fitel air, titik listrik, panel, meteran. */
export type MepKind =
  | "meter_air"
  | "panel"
  | "lampu"
  | "saklar"
  | "stopkontak"
  | "kran"
  | "shower"
  | "kloset"
  | "drain";

/** Titik jalur instalasi. h = ketinggian (m); rel=true -> dihitung dari plafon (tinggi + h). */
export interface MepPt {
  x: number;
  z: number;
  h: number;
  rel?: boolean;
}

export interface MepPointSpec {
  id: string;
  kind: MepKind;
  label: string;
  x: number;
  z: number;
  h: number; // 0 = di lantai (fitel); tinggi mutlak utk item dinding
  rel?: boolean;
}

export type MepJenis = "air_bersih" | "air_kotor" | "listrik";

/** Polyline jalur instalasi 3D (x, z denah; h ketinggian, rel = tinggi + h). */
export interface MepRouteSpec {
  id: string;
  jenis: MepJenis;
  label: string;
  sirkuit?: "lampu" | "kontak"; // khusus listrik: circuit lampu 1,5 mm2 / stop kontak 2,5 mm2
  pts: MepPt[];
}

export interface MepSpec {
  points: MepPointSpec[];
  routes: MepRouteSpec[];
  septic: { x: number; z: number };
  resapan: { x: number; z: number };
}

const P = (x: number, z: number, h: number, rel = false): MepPt => ({ x, z, h, rel });

/** Ketinggian standar praktik: saklar 140 cm, stop kontak 30 cm, kran 105 cm, panel 150 cm. */
const H_SAKLAR = 1.4;
const H_KONTAK = 0.3;
const H_KRAN = 1.05;
const H_PANEL = 1.5;
const H_SHOWER = 2.05;
const Y_BERSIH = -0.32; // pipa air bersih bawah rabat (dalam urugan pasir)
const Y_KOTOR = -0.55; // pipa limbah bawah lantai, diberi kemiringan ke septic

/**
 * MEP preset "2br" — meteran di belakang dekat dapur; jalur limbah keluar
 * belakang ke septic + resapan; panel MCB di dinding depan dekat pintu utama;
 * conduit di rongga plafon (tinggi + 12 cm) dengan drop ke saklar/stop kontak.
 */
const MEP_2BR: MepSpec = {
  points: [
    { id: "mtr", kind: "meter_air", label: "Meter air + stop kran", x: 5.35, z: -0.75, h: -0.35 },
    { id: "krn", kind: "kran", label: "Kran dapur", x: 5.35, z: 0.14, h: H_KRAN },
    { id: "shr", kind: "shower", label: "Shower KM", x: 4.22, z: 1.05, h: H_SHOWER },
    { id: "klt", kind: "kloset", label: "Kloset duduk", x: 3.75, z: 0.42, h: 0 },
    { id: "drn", kind: "drain", label: "Floor drain KM", x: 3.3, z: 1.2, h: 0.02 },
    { id: "pnl", kind: "panel", label: "Panel MCB + meteran listrik", x: 5.55, z: 6.1, h: H_PANEL },
    { id: "l1", kind: "lampu", label: "Lampu ruang keluarga", x: 4.5, z: 3.75, h: -0.01, rel: true },
    { id: "l2", kind: "lampu", label: "Lampu dapur", x: 5.25, z: 0.75, h: -0.01, rel: true },
    { id: "l3", kind: "lampu", label: "Lampu KM", x: 3.75, z: 0.75, h: -0.01, rel: true },
    { id: "l4", kind: "lampu", label: "Lampu kamar 1", x: 1.5, z: 4.5, h: -0.01, rel: true },
    { id: "l5", kind: "lampu", label: "Lampu kamar 2", x: 1.5, z: 1.5, h: -0.01, rel: true },
    { id: "l6", kind: "lampu", label: "Lampu teras", x: 4.65, z: 6.35, h: 2.4 },
    { id: "l7", kind: "lampu", label: "Lampu belakang", x: 5.3, z: -0.35, h: 2.4 },
    { id: "s1", kind: "saklar", label: "Saklar keluarga + teras", x: 5.3, z: 5.93, h: H_SAKLAR },
    { id: "s2", kind: "saklar", label: "Saklar kamar 1", x: 2.9, z: 4.35, h: H_SAKLAR },
    { id: "s3", kind: "saklar", label: "Saklar kamar 2", x: 2.9, z: 1.05, h: H_SAKLAR },
    { id: "s4", kind: "saklar", label: "Saklar KM", x: 4.42, z: 1.3, h: H_SAKLAR },
    { id: "s5", kind: "saklar", label: "Saklar dapur + belakang", x: 5.6, z: 0.12, h: H_SAKLAR },
    { id: "sk1", kind: "stopkontak", label: "Stop kontak kamar 1", x: 0.12, z: 3.5, h: H_KONTAK },
    { id: "sk2", kind: "stopkontak", label: "Stop kontak kamar 1 (b)", x: 2.9, z: 5.5, h: H_KONTAK },
    { id: "sk3", kind: "stopkontak", label: "Stop kontak kamar 2", x: 0.12, z: 1.3, h: H_KONTAK },
    { id: "sk4", kind: "stopkontak", label: "Stop kontak kamar 2 (b)", x: 2.9, z: 2.2, h: H_KONTAK },
    { id: "sk5", kind: "stopkontak", label: "Stop kontak keluarga", x: 5.88, z: 3.5, h: H_KONTAK },
    { id: "sk6", kind: "stopkontak", label: "Stop kontak keluarga (b)", x: 3.1, z: 2.2, h: H_KONTAK },
    { id: "sk7", kind: "stopkontak", label: "Stop kontak dapur", x: 5.88, z: 0.75, h: H_KONTAK },
    { id: "sk8", kind: "stopkontak", label: "Stop kontak KM", x: 3.1, z: 0.3, h: H_KONTAK },
    { id: "sk9", kind: "stopkontak", label: "Stop kontak teras", x: 5.75, z: 6.08, h: H_KONTAK },
  ],
  routes: [
    { id: "ab1", jenis: "air_bersih", label: "Meter → dapur", pts: [P(5.35, -0.75, -0.35), P(5.35, 0.14, Y_BERSIH), P(5.35, 0.14, H_KRAN)] },
    { id: "ab2", jenis: "air_bersih", label: "Bawah lantai → KM", pts: [P(5.35, 0.3, Y_BERSIH), P(4.22, 0.3, Y_BERSIH), P(4.22, 1.05, Y_BERSIH), P(4.22, 1.05, H_SHOWER)] },
    { id: "ab3", jenis: "air_bersih", label: "Cabang kloset", pts: [P(4.22, 0.3, Y_BERSIH), P(3.75, 0.42, Y_BERSIH), P(3.75, 0.42, 0.2)] },
    { id: "ak1", jenis: "air_kotor", label: "Kloset → jalur utama", pts: [P(3.75, 0.42, 0.2), P(3.75, 0.42, Y_KOTOR), P(5.35, 0.42, -0.58)] },
    { id: "ak2", jenis: "air_kotor", label: "Sink dapur → utama", pts: [P(5.35, 0.14, 0.35), P(5.35, 0.14, -0.5), P(5.35, 0.42, -0.58)] },
    { id: "ak3", jenis: "air_kotor", label: "Shower → utama", pts: [P(4.22, 1.05, 0.02), P(4.22, 1.05, -0.5), P(4.22, 0.42, -0.56)] },
    { id: "ak4", jenis: "air_kotor", label: "Floor drain → utama", pts: [P(3.3, 1.2, 0.02), P(3.3, 1.2, -0.47), P(3.3, 0.42, -0.52), P(3.75, 0.42, Y_KOTOR)] },
    {
      id: "ak5",
      jenis: "air_kotor",
      label: "Jalur utama → septic",
      pts: [P(3.75, 0.42, Y_KOTOR), P(5.35, 0.42, -0.58), P(5.35, 0, -0.6), P(5.35, -0.9, -0.64), P(5.35, -1.55, -0.68), P(5.35, -1.55, -0.4)],
    },
    { id: "ak6", jenis: "air_kotor", label: "Septic → resapan", pts: [P(5.35, -3.1, -1.1), P(5.35, -3.9, -1.1), P(5.35, -3.9, -0.55)] },
    { id: "l0", jenis: "listrik", label: "Panel → plafon", pts: [P(5.55, 6.1, H_PANEL), P(5.5, 5.93, H_PANEL), P(5.5, 5.93, 0.12, true)] },
    { id: "l1", jenis: "listrik", label: "Lampu keluarga", pts: [P(5.5, 5.93, 0.12, true), P(4.5, 5.93, 0.12, true), P(4.5, 3.75, 0.12, true), P(4.5, 3.75, -0.01, true)] },
    { id: "l2", jenis: "listrik", label: "Lampu teras", pts: [P(5.5, 5.93, 0.12, true), P(4.65, 5.93, 0.12, true), P(4.65, 6.1, 2.55), P(4.65, 6.35, 2.4)] },
    { id: "l3", jenis: "listrik", label: "Lampu kamar 1", pts: [P(5.5, 5.93, 0.12, true), P(3, 5.93, 0.12, true), P(3, 4.5, 0.12, true), P(1.5, 4.5, 0.12, true), P(1.5, 4.5, -0.01, true)] },
    { id: "l4", jenis: "listrik", label: "Lampu kamar 2", pts: [P(3, 4.5, 0.12, true), P(3, 1.5, 0.12, true), P(1.5, 1.5, 0.12, true), P(1.5, 1.5, -0.01, true)] },
    { id: "l5", jenis: "listrik", label: "Lampu dapur", pts: [P(5.5, 5.93, 0.12, true), P(5.5, 3, 0.12, true), P(5.25, 3, 0.12, true), P(5.25, 0.75, 0.12, true), P(5.25, 0.75, -0.01, true)] },
    { id: "l6", jenis: "listrik", label: "Lampu KM", pts: [P(5.25, 0.75, 0.12, true), P(3.75, 0.75, 0.12, true), P(3.75, 0.75, -0.01, true)] },
    {
      id: "l7",
      jenis: "listrik",
      label: "Lampu belakang",
      pts: [P(5.25, 0.75, 0.12, true), P(5.6, 0.75, 0.12, true), P(5.6, 0.12, 0.12, true), P(5.6, 0.12, 2.55), P(5.3, -0.35, 2.4)],
    },
    { id: "s1r", jenis: "listrik", label: "Saklar keluarga", pts: [P(5.5, 5.93, 0.12, true), P(5.3, 5.93, 0.12, true), P(5.3, 5.93, H_SAKLAR)] },
    { id: "s2r", jenis: "listrik", label: "Saklar kamar 1", pts: [P(3, 4.5, 0.12, true), P(3, 4.35, 0.12, true), P(2.9, 4.35, H_SAKLAR)] },
    { id: "s3r", jenis: "listrik", label: "Saklar kamar 2", pts: [P(3, 1.5, 0.12, true), P(3, 1.05, 0.12, true), P(2.9, 1.05, H_SAKLAR)] },
    { id: "s4r", jenis: "listrik", label: "Saklar KM", pts: [P(3.75, 0.75, 0.12, true), P(3.75, 1.3, 0.12, true), P(4.42, 1.3, 0.12, true), P(4.42, 1.3, H_SAKLAR)] },
    { id: "s5r", jenis: "listrik", label: "Saklar dapur", pts: [P(5.25, 0.75, 0.12, true), P(5.6, 0.75, 0.12, true), P(5.6, 0.12, 0.12, true), P(5.6, 0.12, H_SAKLAR)] },
    { id: "k1", jenis: "listrik", sirkuit: "kontak", label: "SK kamar 1", pts: [P(1.5, 4.5, 0.12, true), P(0.12, 4.5, 0.12, true), P(0.12, 3.5, 0.12, true), P(0.12, 3.5, H_KONTAK)] },
    { id: "k2", jenis: "listrik", sirkuit: "kontak", label: "SK kamar 1 (b)", pts: [P(3, 5.93, 0.12, true), P(3, 5.5, 0.12, true), P(2.9, 5.5, H_KONTAK)] },
    { id: "k3", jenis: "listrik", sirkuit: "kontak", label: "SK kamar 2", pts: [P(1.5, 1.5, 0.12, true), P(0.12, 1.5, 0.12, true), P(0.12, 1.3, 0.12, true), P(0.12, 1.3, H_KONTAK)] },
    { id: "k4", jenis: "listrik", sirkuit: "kontak", label: "SK kamar 2 (b)", pts: [P(3, 1.5, 0.12, true), P(3, 2.2, 0.12, true), P(2.9, 2.2, H_KONTAK)] },
    { id: "k5", jenis: "listrik", sirkuit: "kontak", label: "SK keluarga", pts: [P(5.5, 3, 0.12, true), P(5.88, 3, 0.12, true), P(5.88, 3.5, 0.12, true), P(5.88, 3.5, H_KONTAK)] },
    { id: "k6", jenis: "listrik", sirkuit: "kontak", label: "SK keluarga (b)", pts: [P(4.5, 3.75, 0.12, true), P(3.1, 3.75, 0.12, true), P(3.1, 2.2, 0.12, true), P(3.1, 2.2, H_KONTAK)] },
    { id: "k7", jenis: "listrik", sirkuit: "kontak", label: "SK dapur", pts: [P(5.25, 0.75, 0.12, true), P(5.88, 0.75, 0.12, true), P(5.88, 0.75, H_KONTAK)] },
    { id: "k8", jenis: "listrik", sirkuit: "kontak", label: "SK KM", pts: [P(3.75, 0.75, 0.12, true), P(3.1, 0.75, 0.12, true), P(3.1, 0.3, 0.12, true), P(3.1, 0.3, H_KONTAK)] },
    { id: "k9", jenis: "listrik", sirkuit: "kontak", label: "SK teras", pts: [P(5.5, 5.93, 0.12, true), P(5.75, 5.95, 0.12, true), P(5.75, 6.08, H_KONTAK)] },
  ],
  septic: { x: 5.35, z: -2.4 },
  resapan: { x: 5.35, z: -3.9 },
};

/** MEP preset "studio" — KM di pojok kanan-belakang, dapur di sepanjang dinding kanan. */
const MEP_STUDIO: MepSpec = {
  points: [
    { id: "mtr", kind: "meter_air", label: "Meter air + stop kran", x: 5.3, z: -0.75, h: -0.35 },
    { id: "krn", kind: "kran", label: "Kran dapur (dinding kanan)", x: 5.86, z: 2.6, h: H_KRAN },
    { id: "shr", kind: "shower", label: "Shower KM", x: 4.72, z: 1.5, h: H_SHOWER },
    { id: "klt", kind: "kloset", label: "Kloset duduk", x: 5.25, z: 0.42, h: 0 },
    { id: "drn", kind: "drain", label: "Floor drain KM", x: 4.8, z: 0.35, h: 0.02 },
    { id: "pnl", kind: "panel", label: "Panel MCB + meteran listrik", x: 3.85, z: 6.1, h: H_PANEL },
    { id: "l1", kind: "lampu", label: "Lampu studio", x: 2.25, z: 3, h: -0.01, rel: true },
    { id: "l2", kind: "lampu", label: "Lampu area dapur", x: 5.25, z: 4, h: -0.01, rel: true },
    { id: "l3", kind: "lampu", label: "Lampu KM", x: 5.25, z: 1, h: -0.01, rel: true },
    { id: "l4", kind: "lampu", label: "Lampu teras", x: 2.95, z: 6.35, h: 2.4 },
    { id: "l5", kind: "lampu", label: "Lampu belakang", x: 5.3, z: -0.35, h: 2.4 },
    { id: "s1", kind: "saklar", label: "Saklar studio + teras", x: 3.75, z: 5.93, h: H_SAKLAR },
    { id: "s2", kind: "saklar", label: "Saklar KM", x: 4.58, z: 0.65, h: H_SAKLAR },
    { id: "sk1", kind: "stopkontak", label: "Stop kontak studio", x: 0.12, z: 2.2, h: H_KONTAK },
    { id: "sk2", kind: "stopkontak", label: "Stop kontak studio (b)", x: 0.12, z: 4.6, h: H_KONTAK },
    { id: "sk3", kind: "stopkontak", label: "Stop kontak dapur", x: 5.86, z: 4.8, h: H_KONTAK },
    { id: "sk4", kind: "stopkontak", label: "Stop kontak dapur (b)", x: 5.86, z: 3.3, h: H_KONTAK },
    { id: "sk5", kind: "stopkontak", label: "Stop kontak KM", x: 4.58, z: 0.35, h: H_KONTAK },
    { id: "sk6", kind: "stopkontak", label: "Stop kontak teras", x: 2.2, z: 6.08, h: H_KONTAK },
  ],
  routes: [
    { id: "ab1", jenis: "air_bersih", label: "Meter → kran dapur", pts: [P(5.3, -0.75, -0.35), P(5.3, 2.6, Y_BERSIH), P(5.86, 2.6, Y_BERSIH), P(5.86, 2.6, H_KRAN)] },
    { id: "ab2", jenis: "air_bersih", label: "Bawah lantai → KM", pts: [P(5.3, 0.2, Y_BERSIH), P(4.72, 0.2, Y_BERSIH), P(4.72, 1.5, Y_BERSIH), P(4.72, 1.5, H_SHOWER)] },
    { id: "ab3", jenis: "air_bersih", label: "Cabang kloset", pts: [P(4.72, 0.2, Y_BERSIH), P(5.25, 0.42, Y_BERSIH), P(5.25, 0.42, 0.2)] },
    {
      id: "ak1",
      jenis: "air_kotor",
      label: "Kloset → septic",
      pts: [P(5.25, 0.42, 0.2), P(5.25, 0.42, Y_KOTOR), P(5.25, 0, -0.58), P(5.25, -0.9, -0.62), P(5.25, -1.55, -0.66), P(5.25, -1.55, -0.4)],
    },
    { id: "ak2", jenis: "air_kotor", label: "Sink → utama", pts: [P(5.86, 2.6, 0.35), P(5.86, 2.6, -0.45), P(5.86, 0.42, -0.5), P(5.25, 0.42, Y_KOTOR)] },
    { id: "ak3", jenis: "air_kotor", label: "Shower → utama", pts: [P(4.72, 1.5, 0.02), P(4.72, 1.5, -0.48), P(4.72, 0.42, -0.52), P(5.25, 0.42, Y_KOTOR)] },
    { id: "ak4", jenis: "air_kotor", label: "Floor drain → utama", pts: [P(4.8, 0.35, 0.02), P(4.8, 0.35, -0.44), P(5.25, 0.42, -0.48)] },
    { id: "ak5", jenis: "air_kotor", label: "Septic → resapan", pts: [P(5.25, -3.1, -1.1), P(5.25, -3.9, -1.1), P(5.25, -3.9, -0.55)] },
    { id: "l0", jenis: "listrik", label: "Panel → plafon", pts: [P(3.85, 6.1, H_PANEL), P(3.8, 5.93, H_PANEL), P(3.8, 5.93, 0.12, true)] },
    { id: "l1", jenis: "listrik", label: "Lampu studio", pts: [P(3.8, 5.93, 0.12, true), P(2.25, 5.93, 0.12, true), P(2.25, 3, 0.12, true), P(2.25, 3, -0.01, true)] },
    { id: "l2", jenis: "listrik", label: "Lampu dapur", pts: [P(3.8, 5.93, 0.12, true), P(3.8, 4, 0.12, true), P(5.25, 4, 0.12, true), P(5.25, 4, -0.01, true)] },
    { id: "l3", jenis: "listrik", label: "Lampu KM", pts: [P(5.25, 4, 0.12, true), P(5.25, 1, 0.12, true), P(5.25, 1, -0.01, true)] },
    { id: "l4", jenis: "listrik", label: "Lampu teras", pts: [P(3.8, 5.93, 0.12, true), P(2.95, 5.93, 0.12, true), P(2.95, 6.1, 2.55), P(2.95, 6.35, 2.4)] },
    { id: "l5", jenis: "listrik", label: "Lampu belakang", pts: [P(5.25, 1, 0.12, true), P(5.6, 0.12, 0.12, true), P(5.6, 0, 2.55), P(5.3, -0.35, 2.4)] },
    { id: "s1r", jenis: "listrik", label: "Saklar studio", pts: [P(3.8, 5.93, 0.12, true), P(3.75, 5.93, 0.12, true), P(3.75, 5.93, H_SAKLAR)] },
    { id: "s2r", jenis: "listrik", label: "Saklar KM", pts: [P(5.25, 1, 0.12, true), P(5.25, 0.65, 0.12, true), P(4.58, 0.65, 0.12, true), P(4.58, 0.65, H_SAKLAR)] },
    { id: "k1", jenis: "listrik", sirkuit: "kontak", label: "SK studio", pts: [P(2.25, 3, 0.12, true), P(0.12, 3, 0.12, true), P(0.12, 2.2, 0.12, true), P(0.12, 2.2, H_KONTAK)] },
    { id: "k2", jenis: "listrik", sirkuit: "kontak", label: "SK studio (b)", pts: [P(2.25, 4.6, 0.12, true), P(0.12, 4.6, 0.12, true), P(0.12, 4.6, H_KONTAK)] },
    { id: "k3", jenis: "listrik", sirkuit: "kontak", label: "SK dapur", pts: [P(5.25, 4, 0.12, true), P(5.86, 4.8, 0.12, true), P(5.86, 4.8, H_KONTAK)] },
    { id: "k4", jenis: "listrik", sirkuit: "kontak", label: "SK dapur (b)", pts: [P(5.25, 4, 0.12, true), P(5.86, 3.3, 0.12, true), P(5.86, 3.3, H_KONTAK)] },
    { id: "k5", jenis: "listrik", sirkuit: "kontak", label: "SK KM", pts: [P(5.25, 1, 0.12, true), P(5.25, 0.35, 0.12, true), P(4.58, 0.35, 0.12, true), P(4.58, 0.35, H_KONTAK)] },
    { id: "k6", jenis: "listrik", sirkuit: "kontak", label: "SK teras", pts: [P(3.8, 5.93, 0.12, true), P(2.2, 5.95, 0.12, true), P(2.2, 6.08, H_KONTAK)] },
  ],
  septic: { x: 5.25, z: -2.4 },
  resapan: { x: 5.25, z: -3.9 },
};

// ---------------------------------------------------------------- presets --

const PINTU_W = 0.9;
const PINTU_H = 2.1;
const JENDELA_H_ATAS = 2.1;
const JENDELA_SILL = 0.9;

function pintu(from: number, label: string, swing?: 1 | -1): OpeningSpec {
  return { from, to: from + PINTU_W, sill: 0, top: PINTU_H, kind: "pintu", label, swing };
}
function jendela(from: number, w: number, label: string, sill = JENDELA_SILL, top = JENDELA_H_ATAS): OpeningSpec {
  return { from, to: from + w, sill, top, kind: "jendela", label };
}

/**
 * Lubang angin permanen (roster beton / kisi-kisi, tidak bisa ditutup).
 * mode "atas": dekat puncak dinding (sill = tinggi dinding - 60 cm).
 * mode "pelana": di segitiga dinding pelana untuk ventilasi rongga atap.
 * (sill/top berupa sentinel; diselesaikan resolveVent saat model dibangun)
 */
function lubangAngin(from: number, label: string, w = 0.4, mode: "atas" | "pelana" = "atas"): OpeningSpec {
  return { from, to: from + w, sill: mode === "atas" ? -2 : -1, top: -3, kind: "vent", label };
}

// dinding ujung pelana: apex dipusat (3,3); apexAdd dihitung dari kemiringan atap
const GABLE = { apexAt: 3, apexAdd: 0, halfSpan: 3 };

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
          lubangAngin(2.4, "Lubang angin kamar 2"),
          lubangAngin(4.05, "Lubang angin kamar mandi"),
          lubangAngin(2.7, "Ventilasi rongga atap (belakang)", 0.6, "pelana"),
        ],
      },
      {
        id: "depan", name: "Dinding depan", axis: "h", edge: 6,
        from: 0, to: 6, outer: true, gable: GABLE,
        openings: [
          jendela(1.0, 1.0, "Jendela kamar 1"),
          pintu(4.2, "Pintu utama"),
          lubangAngin(5.55, "Lubang angin ruang keluarga"),
          lubangAngin(2.7, "Ventilasi rongga atap (depan)", 0.6, "pelana"),
        ],
      },
      {
        id: "kiri", name: "Dinding sisi kiri", axis: "v", edge: 0,
        from: (t) => t.tL, to: (t) => 6 - t.tL, outer: true,
        openings: [
          jendela(1.0, 1.0, "Jendela kamar 2"),
          jendela(4.0, 1.0, "Jendela kamar 1"),
          lubangAngin(5.35, "Lubang angin kamar 1"),
        ],
      },
      {
        id: "kanan", name: "Dinding sisi kanan", axis: "v", edge: 6,
        from: (t) => t.tL, to: (t) => 6 - t.tL, outer: true,
        openings: [jendela(3.9, 1.2, "Jendela ruang keluarga"), lubangAngin(0.7, "Lubang angin dapur")],
      },
      {
        id: "w5", name: "Sekat kamar (vertikal)", axis: "v", pos: 3,
        from: (t) => t.tL, to: (t) => 6 - t.tL, outer: false,
        openings: [pintu(1.0, "Pintu kamar 2", -1), pintu(4.3, "Pintu kamar 1", -1)],
      },
      {
        id: "w6", name: "Sekat antar kamar", axis: "h", pos: 3,
        from: (t) => t.tL, to: (t) => 3 - t.tD / 2, outer: false,
        openings: [],
      },
      {
        id: "w7", name: "Sekat area basah", axis: "h", pos: 1.5,
        from: (t) => 3 + t.tD / 2, to: (t) => 6 - t.tL, outer: false,
        openings: [pintu(3.3, "Pintu kamar mandi", -1)],
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
    mep: MEP_2BR,
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
          lubangAngin(2.6, "Lubang angin ruang studio"),
          lubangAngin(2.7, "Ventilasi rongga atap (belakang)", 0.6, "pelana"),
        ],
      },
      {
        id: "depan", name: "Dinding depan", axis: "h", edge: 6,
        from: 0, to: 6, outer: true, gable: GABLE,
        openings: [
          pintu(2.5, "Pintu utama"),
          jendela(4.3, 1.3, "Jendela depan"),
          lubangAngin(1.3, "Lubang angin ruang studio"),
          lubangAngin(2.7, "Ventilasi rongga atap (depan)", 0.6, "pelana"),
        ],
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
          lubangAngin(1.6, "Lubang angin kamar mandi"),
          lubangAngin(5.0, "Lubang angin dapur"),
        ],
      },
      {
        id: "w8", name: "Sekat kamar mandi", axis: "v", pos: 4.5,
        from: (t) => t.tL, to: (t) => 2 - t.tD / 2, outer: false,
        openings: [pintu(0.9, "Pintu kamar mandi", 1)],
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
    mep: MEP_STUDIO,
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
  gable?: { apexAt: number; apexAdd: number; halfSpan: number; baseZ: number }; // baseZ = puncak ring balk
  openings: OpeningSpec[];
  outer: boolean;
  outDir: [number, number]; // arah normal dinding menjauhi pusat denah (dipakai exploded view)
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

export interface KolomRT {
  x: number;
  y: number;
}

/** Kuantitas pondasi cakar ayam (pelat + buis beton) dari model 3D. */
export interface CakarAyamRT {
  slabM3: number; // volume pelat beton
  buisCount: number; // jumlah buis tertanam
  buisM3: number; // volume beton buis (pipa)
  uruganM3: number; // urugan pasir lantai kerja
  galianM3: number; // galian lubang buis + perataan bed
  betonM3: number; // total beton pelat + buis
  buisPts: { x: number; y: number }[]; // posisi buis (koordinat denah)
}

export interface HouseConfig {
  preset: string;
  tinggi: number;
  jenis: "hebel" | "merah";
  pondasi: "batukali" | "cakarayam";
  tLuar: number; // mm
  tDalam: number; // mm
  natMm: number;
  wastePct: number;
  plesteran: boolean;
  atapDeg: number; // kemiringan atap (derajat dari mendatar)
  overhang: number; // overstek atap (m)
  keramikCm: 30 | 40; // ukuran keramik lantai (cm)
}

export const BRICK = {
  hebel: { L: 0.6, H: 0.2, label: "Bata putih / hebel AAC 60 x 20 cm" },
  merah: { L: 0.2, H: 0.05, label: "Bata merah 20 x 10 x 5 cm (pasangan 1/2 batu)" },
} as const;

export const HEBEL_THICK = [75, 100, 125, 150, 200];
export const MERAH_THICK = [100, 200];

// dimensi struktur standar rumah sederhana 1 lantai (praktik Indonesia)
export const RB_H = 0.2; // tinggi ring balk / sloof 15/20 (m)
export const SLOOF_W = 0.15; // lebar sloof & ring balk 15 cm
export const KOLOM_S = 0.15; // kolom praktis 15/15
export const PONDASI_W = 0.4; // lebar pondasi batu kali strip (m)
export const PONDASI_D = 0.6; // kedalaman pondasi (m)
export const GALIAN_W = 0.6; // lebar galian tanah pondasi (m)
export const URUGAN_T = 0.1; // tebal urugan pasir bawah pondasi (m)
export const KUDA_SPACING = 1.2; // jarak maksimum kuda-kuda baja ringan (m)

/**
 * Pondasi cakar ayam (sistem Sedyatmo): pelat beton bertulang tipis yang
 * ditopang buis-buis beton vertikal menancap ke tanah. Jarak buis untuk rumah
 * tinggal lazim 2,5-3 m; di model ini buis diletakkan di tiap titik kolom
 * praktis + grid tengah (jarak maks ~3 m).
 */
export const CAKAR = {
  slabT: 0.1, // tebal pelat beton (m)
  buisDia: 0.4, // diameter buis beton (m)
  buisWall: 0.05, // tebal dinding buis (m)
  buisL: 0.8, // panjang buis tertanam (m)
  bed: 0.05, // tebal pasir lantai kerja di bawah pelat (m)
} as const;

export const DEFAULT_CONFIG: HouseConfig = {
  preset: "2br",
  tinggi: 3.0,
  jenis: "hebel",
  pondasi: "batukali",
  tLuar: 100,
  tDalam: 75,
  natMm: 3,
  wastePct: 5,
  plesteran: false,
  atapDeg: 30,
  overhang: 0.6,
  keramikCm: 40,
};

export const DEFAULT_CONFIG_MERAH: HouseConfig = {
  ...DEFAULT_CONFIG,
  jenis: "merah",
  tLuar: 100,
  tDalam: 100,
  natMm: 15, // spesi bata merah lazim 1-1,5 cm (AHSP: ±70 bata/m2)
  wastePct: 10,
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

/**
 * Selesaikan sentinel lubang angin menjadi elevasi nyata.
 * "atas"  -> sill = tinggi dinding - 60 cm (dekat puncak dinding, di bawah ring balk)
 * "pelana"-> di segitiga pelana, menjorok sedikit di bawah puncak apex
 */
function resolveVent(
  o: OpeningSpec,
  t: { rbTop: number; apexAdd: number; tinggi: number },
): OpeningSpec | null {
  if (o.kind !== "vent") return o;
  const hgt = Math.min(0.22, o.to - o.from); // tinggi roster (maks 22 cm)
  if (o.sill === -1) {
    const cap = t.rbTop + t.apexAdd;
    const top = cap - 0.16;
    const sill = top - hgt;
    return sill < t.rbTop + 0.12 ? null : { ...o, sill, top }; // pelana terlalu landai
  }
  const sill = t.tinggi - 0.6;
  return { ...o, sill, top: sill + hgt };
}

// ----------------------------------------------------------------- engine --

export interface MepRouteRT {
  id: string;
  jenis: MepJenis;
  label: string;
  sirkuit: "lampu" | "kontak" | null;
  pts: { x: number; y: number; z: number }[]; // y = ketinggian mutlak (m)
  len: number; // panjang polyline (m)
}

export interface MepPointRT {
  id: string;
  kind: MepKind;
  label: string;
  x: number;
  y: number;
  z: number;
}

/** Instalasi teresolusi: panjang jalur, jumlah titik, posisi 3D (untuk scene & RAB). */
export interface MepRT {
  airBersihM: number; // pipa 1/2" + cabang
  airKotorM: number; // pipa 3" ke septic
  conduitM: number; // conduit PVC 20 mm
  kabelLampuM: number; // circuit lampu (NYM 2x1,5)
  kabelKontakM: number; // circuit stop kontak (NYM 2x2,5)
  titikLampu: number;
  saklar: number;
  stopkontak: number;
  kloset: number;
  shower: number;
  kran: number;
  drain: number;
  routes: MepRouteRT[];
  points: MepPointRT[];
  septic: { x: number; z: number };
  resapan: { x: number; z: number };
}

function polylineLen(pts: { x: number; y: number; z: number }[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) {
    L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y, pts[i].z - pts[i - 1].z);
  }
  return L;
}

function buildMepRT(spec: MepSpec, tinggi: number): MepRT {
  const routes: MepRouteRT[] = spec.routes.map((r) => {
    const pts = r.pts.map((p) => ({ x: p.x, y: p.rel ? tinggi + p.h : p.h, z: p.z }));
    return { id: r.id, jenis: r.jenis, label: r.label, sirkuit: r.sirkuit ?? null, pts, len: polylineLen(pts) };
  });
  const points: MepPointRT[] = spec.points.map((p) => ({
    id: p.id,
    kind: p.kind,
    label: p.label,
    x: p.x,
    y: p.rel ? tinggi + p.h : p.h,
    z: p.z,
  }));
  const byJenis = (j: MepJenis) => routes.filter((r) => r.jenis === j).reduce((s, r) => s + r.len, 0);
  const cnt = (k: MepKind) => points.filter((p) => p.kind === k).length;
  return {
    airBersihM: byJenis("air_bersih"),
    airKotorM: byJenis("air_kotor"),
    conduitM: byJenis("listrik"),
    kabelLampuM: routes.filter((r) => r.jenis === "listrik" && r.sirkuit !== "kontak").reduce((s, r) => s + r.len, 0),
    kabelKontakM: routes.filter((r) => r.jenis === "listrik" && r.sirkuit === "kontak").reduce((s, r) => s + r.len, 0),
    titikLampu: cnt("lampu"),
    saklar: cnt("saklar"),
    stopkontak: cnt("stopkontak"),
    kloset: cnt("kloset"),
    shower: cnt("shower"),
    kran: cnt("kran"),
    drain: cnt("drain"),
    routes,
    points,
    septic: spec.septic,
    resapan: spec.resapan,
  };
}

/** Grid keramik satu ruangan (luas bersih, koordinat denah). */
export interface FloorRoomRT {
  id: string;
  name: string;
  x0: number; // sisi kiri bersih (m)
  x1: number;
  z0: number; // sisi belakang bersih (m)
  z1: number;
  nx: number; // jumlah keping arah X (termasuk keping potong di tepi)
  nz: number; // jumlah keping arah Z
  pcs: number; // total keping ruangan (nx x nz)
  basah: boolean; // ruang basah -> keramik anti-slip
}

/** Lantai keramik dari model 3D: grid keping per ruangan mengikuti ukuran pilihan. */
export interface FloorRT {
  tileCm: number; // ukuran keramik pilihan (cm)
  tileM: number; // ukuran keramik (m)
  rooms: FloorRoomRT[];
  totalPcs: number; // total keping seluruh rumah
  areaM2: number; // luas bersih lantai (m2)
}

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
  floor: FloorRT;
  openings: { doors: number; windows: number; vents: number; windowAreaM2: number };
  vent: { bukaanM2: number; pctLantai: number; okSni: boolean; okIdeal: boolean };
  roof: {
    areaM2: number;
    apexAdd: number;
    overhang: number;
    deg: number;
    pitch: number; // tan(deg)
    yRidge: number; // ketinggian nok (m)
    kudaKuda: number;
    rengPerSlope: number;
    gentengPcs: number;
  };
  wallLenTotal: number;
  koloms: KolomRT[];
  mep: MepRT;
  structure: {
    galianM3: number;
    uruganPasirM3: number;
    pondasiM3: number;
    sloofM3: number;
    kolomM3: number;
    ringbalkM3: number;
    lisplankM: number;
    talangM: number;
    cakar: CakarAyamRT | null;
  };
}

export function buildModel(config: HouseConfig): HouseModel {
  const preset = LAYOUT_PRESETS.find((p) => p.id === config.preset) ?? LAYOUT_PRESETS[0];
  const tL = config.tLuar / 1000;
  const tD = config.tDalam / 1000;
  const dims = BRICK[config.jenis];
  const j = config.natMm / 1000;

  // geometri atap pelana: ridge memanjang arah Y denah (dinding ujung pelana = depan/belakang)
  const rad = (config.atapDeg * Math.PI) / 180;
  const apexAdd = 3 * Math.tan(rad); // setengah bentang 3 m -> naik ridge
  const pitch = Math.tan(rad);
  const rbTop = config.tinggi + RB_H; // puncak ring balk = dasar dinding pelana

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
    // arah normal keluar dinding (menjauhi pusat denah 3,3) — dasar arah
    // penguraian tiap komponen dinding pada exploded view granular
    const outDir: [number, number] =
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
      gable: spec.gable ? { ...spec.gable, apexAdd, baseZ: rbTop } : undefined,
      openings: spec.openings
        .map((o) => resolveVent(o, { rbTop, apexAdd, tinggi: config.tinggi }))
        .filter((o): o is OpeningSpec => !!o)
        .filter((o) => o.to > lo && o.from < hi && o.top > 0.2),
      outer: spec.outer,
      outDir,
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
      ? (x: number) => w.gable!.baseZ + w.gable!.apexAdd * clamp01(1 - Math.abs(x - w.gable!.apexAt) / w.gable!.halfSpan)
      : () => w.h;

    // luas muka satu sisi (net bukaan: tinggi bukaan = top - sill, dipotong tinggi
    // dinding datar / pelana; band ring balk tidak dihitung karena beton)
    const gableArea = w.gable ? w.gable.apexAdd * (w.hi - w.lo) * 0.5 : 0;
    const hAtMid = (o: OpeningSpec) =>
      Math.max(w.h, hAt((o.from + o.to) / 2));
    const openingArea = w.openings.reduce(
      (s, o) =>
        s +
        Math.max(0, Math.min(o.to, w.hi) - Math.max(o.from, w.lo)) *
          Math.max(0, Math.min(o.top, hAtMid(o)) - o.sill),
      0,
    );
    wallFace += w.h * len + gableArea - openingArea;
    bandVol += (w.h * len + gableArea) * w.t - openingArea * w.t;

    const topZ = w.gable ? w.gable.baseZ + w.gable.apexAdd : w.h;
    const nCourses = Math.ceil(topZ / cellH);
    for (let i = 0; i < nCourses; i++) {
      const zc = i * cellH;
      if (zc >= topZ - 0.001) break;

      // interval yang boleh dipasangi bata pada lajur ini:
      // 1) band ring balk (w.h .. baseZ) tidak dipasangi bata; di atas baseZ
      //    bata mengikuti penyempitan segitiga pelana
      if (w.gable && zc >= w.h && zc < w.gable.baseZ) continue; // zona ring balk

      const allowed: Interval = { lo: w.lo, hi: w.hi };
      if (w.gable && zc >= w.gable.baseZ) {
        const d = w.gable.halfSpan * (1 - (zc - w.gable.baseZ) / w.gable.apexAdd);
        if (d <= 0) continue;
        allowed.lo = Math.max(w.lo, w.gable.apexAt - d);
        allowed.hi = Math.min(w.hi, w.gable.apexAt + d);
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
          // di bawah ring balk dipotong rata di tinggi dinding; di atas mengikuti kemiringan pelana
          const hgt =
            zc < w.h
              ? Math.min(dims.H, Math.max(0, w.h - zc))
              : Math.min(dims.H, Math.max(0, hAt(cx) - zc));
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

  // ----- lantai keramik: grid keping per ruangan mengikuti ukuran pilihan.
  // Keping dipasang ukuran penuh dari satu sisi; sisa tepi < ukuran penuh
  // dipotong (tetap dihitung 1 keping utuh terbeli) — seperti pemasangan nyata.
  const tileM = config.keramikCm / 100;
  const floorRooms: FloorRoomRT[] = rooms.map((r) => {
    const x0 = r.cx - r.w / 2;
    const x1 = r.cx + r.w / 2;
    const z0 = r.cy - r.d / 2;
    const z1 = r.cy + r.d / 2;
    const nx = Math.max(1, Math.ceil(r.w / tileM - 1e-9));
    const nz = Math.max(1, Math.ceil(r.d / tileM - 1e-9));
    const basah = r.id === "km" || /mandi|wc|basah/i.test(r.name);
    return { id: r.id, name: r.name, x0, x1, z0, z1, nx, nz, pcs: nx * nz, basah };
  });
  const floor: FloorRT = {
    tileCm: config.keramikCm,
    tileM,
    rooms: floorRooms,
    totalPcs: floorRooms.reduce((s, r) => s + r.pcs, 0),
    areaM2: netFloor,
  };

  // ----- kolom praktis 15/15: pada tiap pertemuan centerline dinding h x v
  const seen = new Set<string>();
  const koloms: KolomRT[] = [];
  const tol = 0.15;
  for (const h of walls) {
    if (h.axis !== "h") continue;
    for (const v of walls) {
      if (v.axis !== "v") continue;
      if (v.c >= h.lo - tol && v.c <= h.hi + tol && h.c >= v.lo - tol && h.c <= v.hi + tol) {
        const key = `${v.c.toFixed(2)}|${h.c.toFixed(2)}`;
        if (!seen.has(key)) {
          seen.add(key);
          koloms.push({ x: v.c, y: h.c });
        }
      }
    }
  }

  // ----- material
  const waste = config.wastePct / 100;
  const mortarWithWaste = mortarVol * (1 + waste);
  const semenZak = config.jenis === "merah" ? mortarWithWaste * 6.3 : 0;
  const pasirM3 = config.jenis === "merah" ? mortarWithWaste * 1.0 : 0;
  const perekatKg = config.jenis === "hebel" ? wallFace * 4 : 0;
  const perekatZak = config.jenis === "hebel" ? perekatKg / 40 : 0;

  // ----- atap pelana (kuda-kuda C75 jarak maks 1,2 m, genteng beton 10 pcs/m2)
  const ov = config.overhang;
  const yRidge = rbTop + apexAdd;
  const slopeHalf = Math.hypot(3 + ov, apexAdd + ov * pitch);
  const roofArea = 2 * slopeHalf * (6 + 2 * ov);
  // jumlah kuda-kuda: seluruh bentang 6 m dengan jarak antar rangka maks 1,2 m
  const kudaKuda = Math.max(4, Math.ceil(6 / KUDA_SPACING) + 1);
  const rengPerSlope = Math.ceil(3 / 0.4) + 1;
  const gentengPcs = Math.ceil(roofArea * 10);

  const doors = walls.reduce((s, w) => s + w.openings.filter((o) => o.kind === "pintu").length, 0);
  const windows = walls.reduce((s, w) => s + w.openings.filter((o) => o.kind === "jendela").length, 0);
  const vents = walls.reduce((s, w) => s + w.openings.filter((o) => o.kind === "vent").length, 0);
  const windowAreaM2 = walls.reduce(
    (s, w) => s + w.openings.filter((o) => o.kind === "jendela").reduce((a, o) => a + (o.to - o.from) * (o.top - o.sill), 0),
    0,
  );

  // ----- pondasi cakar ayam: buis di tiap titik kolom + grid tengah (jarak maks ~3 m)
  let cakar: CakarAyamRT | null = null;
  if (config.pondasi === "cakarayam") {
    const pts: { x: number; y: number }[] = koloms.map((k) => ({ x: k.x, y: k.y }));
    for (const gx of [1.5, 4.5]) for (const gy of [1.5, 4.5]) pts.push({ x: gx, y: gy });
    const buisPts: { x: number; y: number }[] = [];
    for (const p of pts) {
      if (!buisPts.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 0.45)) buisPts.push(p);
    }
    const rOut = CAKAR.buisDia / 2;
    const rIn = rOut - CAKAR.buisWall;
    const buisM3 = buisPts.length * Math.PI * (rOut * rOut - rIn * rIn) * CAKAR.buisL;
    const slabM3 = 36 * CAKAR.slabT;
    cakar = {
      slabM3,
      buisCount: buisPts.length,
      buisM3,
      uruganM3: 36 * CAKAR.bed,
      galianM3: 36 * CAKAR.bed + buisPts.length * Math.PI * rOut * rOut * CAKAR.buisL,
      betonM3: slabM3 + buisM3,
      buisPts,
    };
  }

  // ----- kuantitas struktur (galian & pondasi mengikuti jenis pondasi)
  const galianM3 =
    config.pondasi === "cakarayam" && cakar
      ? cakar.galianM3
      : wallLenTotal * PONDASI_D * GALIAN_W; // galian 60 x 60 cm
  const uruganPasirM3 = config.pondasi === "cakarayam" ? 0 : wallLenTotal * GALIAN_W * URUGAN_T;
  const pondasiM3 = config.pondasi === "cakarayam" ? 0 : wallLenTotal * PONDASI_W * PONDASI_D;
  const sloofM3 = wallLenTotal * SLOOF_W * RB_H;
  const kolomM3 = koloms.length * KOLOM_S * KOLOM_S * (config.tinggi + RB_H);
  const ringbalkM3 = wallLenTotal * SLOOF_W * RB_H;
  const lisplankM = 2 * (6 + 2 * ov) + 2 * slopeHalf; // eaves + kedua ujung pelana
  const talangM = 2 * (6 + 2 * ov);

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
    openings: { doors, windows, vents, windowAreaM2 },
    floor,
    vent: {
      bukaanM2: windowAreaM2,
      pctLantai: (windowAreaM2 / Math.max(0.01, netFloor)) * 100,
      okSni: windowAreaM2 >= 0.05 * netFloor,
      okIdeal: windowAreaM2 >= 0.1 * netFloor,
    },
    roof: { areaM2: roofArea, apexAdd, overhang: ov, deg: config.atapDeg, pitch, yRidge, kudaKuda, rengPerSlope, gentengPcs },
    wallLenTotal,
    koloms,
    mep: buildMepRT(preset.mep, config.tinggi),
    structure: { galianM3, uruganPasirM3, pondasiM3, sloofM3, kolomM3, ringbalkM3, lisplankM, talangM, cakar },
  };
}

// -------------------------------------------------------------------- RAB --

export interface RabRow {
  id: string;
  divisi: string; // id divisi
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

export const DIVISIONS: { id: string; nama: string; kode: string }[] = [
  { id: "d1", nama: "Pekerjaan Persiapan", kode: "I" },
  { id: "d2", nama: "Pondasi & Struktur Bawah", kode: "II" },
  { id: "d3", nama: "Struktur Beton (Sloof, Kolom, Ring Balk)", kode: "III" },
  { id: "d4", nama: "Pekerjaan Dinding", kode: "IV" },
  { id: "d5", nama: "Pekerjaan Atap & Plafon", kode: "V" },
  { id: "d6", nama: "Pekerjaan Lantai", kode: "VI" },
  { id: "d7", nama: "Pintu & Jendela", kode: "VII" },
  { id: "d8", nama: "Instalasi Listrik & Air", kode: "VIII" },
  { id: "d9", nama: "Pekerjaan Finishing", kode: "IX" },
];

export const DEFAULT_PRICES: PriceBook = {
  bouwplank: 350000,
  galian: 110000,
  pondasi: 950000,
  urugan: 180000,
  cakarBeton: 2200000,
  sloof: 2000000,
  kolom: 2100000,
  ringbalk: 2000000,
  bataLuarHebel75: 7500,
  bataLuarHebel100: 9000,
  bataLuarHebel125: 11000,
  bataLuarHebel150: 13000,
  bataLuarHebel200: 17000,
  bataMerah: 800,
  perekat: 72000,
  semen: 68000,
  pasir: 350000,
  plesteran: 95000,
  lubangAngin: 60000,
  rangkaAtap: 135000,
  genteng: 60000,
  lisplank: 45000,
  talang: 60000,
  plafon: 145000,
  rabat: 220000,
  keramik: 95000, // (compat) harga per m2 — dipakai bila ukuran tak terdaftar
  keramik30: 85000, // keramik 30x30 cm per m2
  keramik40: 95000, // keramik 40x40 cm per m2
  pintu: 1200000,
  jendela: 850000,
  // instalasi air & listrik (divisi VIII) — kuantitas dari jalur 3D
  pipaAirBersih: 28000, // PVC AW 1/2" per meter
  pipaAirKotor: 95000, // PVC D-3" per meter
  septicResapan: 3500000, // septic tank + sumur resapan + pasang
  klosetDuduk: 1200000,
  showerSet: 650000,
  kranAir: 75000,
  floorDrain: 55000,
  fittingAir: 550000, // elbow, tee, stop kran, lem PVC (lot)
  conduit: 8500, // pipa conduit PVC Ø20 mm per meter
  kabelNym15: 18000, // NYM 2x1,5 mm2 per meter
  kabelNym25: 32000, // NYM 2x2,5 mm2 per meter
  titikLampu: 90000, // inbow box + piring + armatur kecil
  saklarInbow: 55000,
  stopkontakInbow: 65000,
  panelMcb: 850000, // box MCB 4 grup + MCB + kabel feeder
  grounding: 350000, // batang tembaga + kabel BC (lot)
  cat: 55000,
  pembersihan: 1000000,
};

export function hebelPriceId(mm: number): string {
  return `bataLuarHebel${mm}`;
}

export interface RabDivision {
  id: string;
  kode: string;
  nama: string;
  rows: RabRow[];
  subtotal: number;
}

export interface RabSummary {
  rows: RabRow[];
  divisions: RabDivision[];
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
  const push = (id: string, divisi: string, uraian: string, spek: string, qty: number, unit: string, exact: boolean, priceKey?: string) => {
    const key = priceKey ?? id;
    const harga = prices[key] ?? 0;
    // subtotal dibulatkan ke rupiah utuh (menghindari debu floating-point pada qty desimal)
    rows.push({ id, divisi, uraian, spek, qty, unit, harga, subtotal: Math.round(qty * harga), exact, priceKey: key });
  };

  push("bouwplank", "d1", "Pengukuran & bouwplank", "Profil kayu + patok as bangunan", 1, "lot", false);

  if (cfg.pondasi === "cakarayam" && model.structure.cakar) {
    const c = model.structure.cakar;
    push("galian", "d2", "Galian titik buis + lantai kerja pelat", "Lubang buis Ø40 cm sedalam 80 cm + perataan 5 cm di seluruh pelat", Math.ceil(c.galianM3 * 10) / 10, "m3", true);
    push("urugan", "d2", "Urugan pasir bawah pelat", "Pasir setempat 5 cm, dipadatkan sebelum cor pelat", Math.ceil(c.uruganM3 * 10) / 10, "m3", true, "urugan");
    push("cakarBeton", "d2", "Pondasi cakar ayam (sistem Sedyatmo)", `Pelat 6x6 m tebal 10 cm wiremesh D8 + ${c.buisCount} buis beton Ø40 cm panjang 80 cm, cor monolit`, Math.ceil(c.betonM3 * 100) / 100, "m3", true, "cakarBeton");
  } else {
    push("galian", "d2", "Galian tanah pondasi", "Galian 60 x 60 cm sedalam 60 cm sepanjang jalur dinding", Math.ceil(model.structure.galianM3 * 10) / 10, "m3", true);
    push("uruganPasir", "d2", "Urugan pasir bawah pondasi", "Pasir setempat 10 cm dipadatkan di dasar galian", Math.ceil(model.structure.uruganPasirM3 * 10) / 10, "m3", true, "urugan");
    push("pondasi", "d2", "Pondasi batu kali + campuran 1:5", "Strip 40 x 60 cm (kedalaman 60 cm)", Math.ceil(model.structure.pondasiM3 * 10) / 10, "m3", true);
  }

  push("sloof", "d3", "Sloof beton bertulang 15/20", "Beton K225, tulangan 6D10, begel Ø8-150", Math.ceil(model.structure.sloofM3 * 100) / 100, "m3", true);
  push("kolom", "d3", "Kolom praktis beton 15/15", "4D10, begel Ø6-200, jarak maks 3 m", Math.ceil(model.structure.kolomM3 * 100) / 100, "m3", true);
  push("ringbalk", "d3", "Ring balk beton bertulang 15/20", "Mengikat seluruh dinding di ketinggian 3 m", Math.ceil(model.structure.ringbalkM3 * 100) / 100, "m3", true);

  if (cfg.jenis === "hebel") {
    push("bataLuar", "d4", `Bata putih (hebel) dinding luar ${cfg.tLuar} mm`, "60 x 20 cm SNI 8640, dihitung dari susunan 3D + waste", model.count.buyOuter, "buah", true, hebelPriceId(cfg.tLuar));
    push("bataDalam", "d4", `Bata putih (hebel) dinding dalam ${cfg.tDalam} mm`, "60 x 20 cm SNI 8640, dihitung dari susunan 3D + waste", model.count.buyInner, "buah", true, hebelPriceId(cfg.tDalam));
    push("perekat", "d4", "Perekat hebel (mortar instan)", "4 kg per m2 dinding, nat 2-3 mm, kemasan 40 kg/zak", Math.ceil(model.mortar.perekatZak), "zak", true);
  } else {
    push("bataLuar", "d4", "Bata merah dinding luar (1/2 batu)", "20x10x5 cm, dihitung dari susunan 3D + waste", model.count.buyOuter, "buah", true, "bataMerah");
    push("bataDalam", "d4", "Bata merah dinding dalam (1/2 batu)", "20x10x5 cm, dihitung dari susunan 3D + waste", model.count.buyInner, "buah", true, "bataMerah");
    push("semen", "d4", "Semen pasangan (campuran 1:5)", `Nat ${cfg.natMm} mm; volume adukan ${model.mortar.volM3.toFixed(2)} m3`, Math.ceil(model.mortar.semenZak), "zak", true);
    push("pasir", "d4", "Pasir pasang", "Campuran adukan 1:5", Math.ceil(model.mortar.pasirM3 * 10) / 10, "m3", true);
  }

  if (cfg.plesteran) {
    push("plesteran", "d4", "Plesteran + aci (2 sisi dinding)", "Campuran 1:5 tebal 10-15 mm", Math.ceil(model.areas.plasterArea * 10) / 10, "m2", true);
  }

  push("lubangAngin", "d4", "Lubang angin permanen (roster beton + pasang)", "Roster beton 20x20 cm di dinding & dinding pelana; ventilasi tetap terbuka", model.openings.vents, "buah", true, "lubangAngin");

  push("rangkaAtap", "d5", "Rangka atap baja ringan C75 + reng", `${model.roof.kudaKuda} kuda-kuda, jarak antar rangka maks ${KUDA_SPACING} m, borongan pasang`, Math.ceil(model.roof.areaM2), "m2", true);
  push("genteng", "d5", "Genteng beton flat + pasang", `10 pcs/m2 (${model.roof.gentengPcs} pcs), kemiringan ${cfg.atapDeg} derajat`, Math.ceil(model.roof.areaM2), "m2", true);
  push("lisplank", "d5", "Lisplank", "Papan penutup ujung rangka atap (eaves + kedua ujung pelana)", Math.ceil(model.structure.lisplankM * 10) / 10, "m1", true);
  push("talang", "d5", "Talang air + pipa turun", "PVC di kedua sisi eaves", Math.ceil(model.structure.talangM * 10) / 10, "m1", true);
  push("plafon", "d5", "Plafon gypsum + rangka hollow galvalum", "Gypsum 9 mm di atas luas bersih lantai", Math.ceil(model.areas.netFloor * 10) / 10, "m2", false);

  push("rabat", "d6", "Rabat beton lantai kerja", "Tebal 10 cm di atas luas bersih lantai", Math.ceil(model.areas.netFloor * 10) / 10, "m2", false);
  const tcm = cfg.keramikCm;
  const perM2 = 1 / (model.floor.tileM * model.floor.tileM);
  push(
    "keramik",
    "d6",
    `Keramik lantai ${tcm}x${tcm} + pemasangan`,
    `${tcm}x${tcm} cm golongan menengah — ${fmtNum(model.floor.totalPcs)} keping dari layout 3D (termasuk potongan tepi; ±${fmtNum(perM2, 1)} keping/m2)`,
    Math.ceil(model.areas.netFloor * 10) / 10,
    "m2",
    true,
    tcm === 30 ? "keramik30" : "keramik40",
  );

  push("pintu", "d7", "Kusen + daun pintu lengkap", "Kusen kayu berprofil + daun panel 2 susun + kunci handle + angkur", model.openings.doors, "unit", false);
  push("jendela", "d7", "Kusen + kaca jendela", "Kusen aluminium profil + kaca 5 mm + palang tengah + roster vent", model.openings.windows, "unit", false);

  // divisi VIII: instalasi air & listrik — kuantitas dihitung dari jalur 3D (model.mep)
  const mep = model.mep;
  push("pipaAirBersih", "d8", "Pipa air bersih PVC AW 1/2\"", "Meteran → kran dapur, shower & kloset (jalur di bawah lantai / dalam dinding)", Math.ceil(mep.airBersihM), "m1", true);
  push("pipaAirKotor", "d8", "Pipa limbah PVC D-3\"", "Kloset, sink, shower & floor drain → septic (kemiringan 1-2%)", Math.ceil(mep.airKotorM), "m1", true);
  push("septicResapan", "d8", "Septic tank + sumur resapan", `Posisi ${fmtNum(Math.abs(mep.septic.z), 1)} m di belakang rumah (lihat jalur 3D); jarak min 10 m dari sumur air bersih`, 1, "unit", true);
  push("klosetDuduk", "d8", "Kloset duduk lengkap", "Termasuk angkur & sambungan ke jalur 3/4\"", mep.kloset, "unit", true);
  push("showerSet", "d8", "Shower set", "Batang shower + kran campur panas-dingin", mep.shower, "set", true);
  push("kranAir", "d8", "Kran air", "Kran dapur / point pengambilan air", mep.kran, "bh", true);
  push("floorDrain", "d8", "Floor drain", "Saringan lantai KM (tipe lantai)", mep.drain, "bh", true);
  push("fittingAir", "d8", "Fitting & aksesoris pipa air", "Elbow, tee, sok, stop kran, lem PVC (estimasi lot)", 1, "lot", false);
  push("conduit", "d8", "Pipa conduit PVC Ø20 mm", "Jalur tertanam di dinding & drop dari plafon", Math.ceil(mep.conduitM), "m1", true);
  push("kabelNym15", "d8", "Kabel NYM 2x1,5 mm² (sirkuit lampu)", "Panel → titik lampu & saklar (PUIL 2011)", Math.ceil(mep.kabelLampuM), "m1", true);
  push("kabelNym25", "d8", "Kabel NYM 2x2,5 mm² (sirkuit stop kontak)", "Panel → titik stop kontak, daya lebih besar", Math.ceil(mep.kabelKontakM), "m1", true);
  push("titikLampu", "d8", "Titik lampu (inbow + armatur)", "Termasuk box inbow, piring & armatur kecil", mep.titikLampu, "bh", true);
  push("saklarInbow", "d8", "Saklar tunggal/ganda", "Tinggi pasang 140 cm (PUIL)", mep.saklar, "bh", true);
  push("stopkontakInbow", "d8", "Stop kontak", "Tinggi pasang 30 cm; KM/WC memakai unit kedap", mep.stopkontak, "bh", true);
  push("panelMcb", "d8", "Panel MCB + meteran listrik", "Box 4 grup, MCB utama 10 A, kabel feeder — di dinding depan", 1, "unit", true);
  push("grounding", "d8", "Grounding (arde)", "Batang tembaga 1,5 m + kabel BC ke panel (PUIL)", 1, "lot", false);

  push("cat", "d9", "Cat dinding (primer + 2 lapis)", "Di atas luas aci 2 sisi dinding", Math.ceil(model.areas.plasterArea * 10) / 10, "m2", true);
  push("pembersihan", "d9", "Pembersihan akhir & perapihan", "Serah terima pekerjaan", 1, "lot", false);

  const divisions: RabDivision[] = DIVISIONS.map((d) => {
    const drows = rows.filter((r) => r.divisi === d.id);
    return {
      id: d.id,
      kode: d.kode,
      nama: d.nama,
      rows: drows,
      subtotal: drows.reduce((s, r) => s + r.subtotal, 0),
    };
  }).filter((d) => d.rows.length > 0);

  const materialTotal = rows.reduce((s, r) => s + r.subtotal, 0);
  const upah = Math.round((materialTotal * upahPct) / 100);
  const total = materialTotal + upah;
  return {
    rows,
    divisions,
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
