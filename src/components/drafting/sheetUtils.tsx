/**
 * Utilitas gambar teknik (SVG) untuk lembar kerja arsitektur:
 * konstanta tinta, komponen dimensi (rantai ukuran), tanda level, balon label,
 * pola arsiran, kop gambar (title block), dan jadwal bukaan dari model 3D.
 * Skala layar: 100 px = 1 m (1 : 100).
 */
import type { HouseModel } from "@/lib/house/engine";
import type { WallRT, OpeningSpec } from "@/lib/house/engine";

export const S = 100; // px per meter
export const INK = "#2c2b27";
export const INK_SOFT = "#6f6a60";
export const INK_FADED = "#b9b3a7";
export const DIM = "#8a6d3b";
export const PAPER = "#f8f7f2";

export const fmtM = (v: number) => v.toFixed(2).replace(".", ",");

/** Garis dimensi horizontal dengan tick arsitektur + label di tengah. */
export function HDim({ xFrom, xTo, y, label, above = true }: { xFrom: number; xTo: number; y: number; label: string; above?: boolean }) {
  return (
    <g stroke={DIM} strokeWidth={1} fill={DIM}>
      <line x1={xFrom} y1={y} x2={xTo} y2={y} />
      <line x1={xFrom - 3} y1={y + 3} x2={xFrom + 3} y2={y - 3} />
      <line x1={xTo - 3} y1={y + 3} x2={xTo + 3} y2={y - 3} />
      <text x={(xFrom + xTo) / 2} y={above ? y - 5 : y + 11} textAnchor="middle" fontSize={9.5} fontWeight={600} stroke="none">
        {label}
      </text>
    </g>
  );
}

/** Garis dimensi vertikal dengan tick + label (diputar mengikuti arah garis). */
export function VDim({ yFrom, yTo, x, label, side = "left" }: { yFrom: number; yTo: number; x: number; label: string; side?: "left" | "right" }) {
  const midY = (yFrom + yTo) / 2;
  const ty = side === "left" ? x - 5 : x + 12;
  return (
    <g stroke={DIM} strokeWidth={1} fill={DIM}>
      <line x1={x} y1={yFrom} x2={x} y2={yTo} />
      <line x1={x - 3} y1={yFrom + 3} x2={x + 3} y2={yFrom - 3} />
      <line x1={x - 3} y1={yTo + 3} x2={x + 3} y2={yTo - 3} />
      <text x={ty} y={midY + 3} textAnchor="middle" fontSize={9.5} fontWeight={600} stroke="none" transform={`rotate(-90 ${ty} ${midY + 3})`}>
        {label}
      </text>
    </g>
  );
}

/** Tanda level ketinggian (datum) di sisi kiri gambar potongan/tampak. */
export function LevelMark({ y, x, label }: { y: number; x: number; label: string }) {
  return (
    <g stroke={INK_SOFT} strokeWidth={1} fill={INK_SOFT}>
      <path d={`M ${x} ${y} l 14 -5 l 0 10 Z`} fill="none" />
      <line x1={x + 14} y1={y} x2={x + 38} y2={y} />
      <text x={x + 20} y={y - 4} fontSize={9} fontWeight={600} stroke="none">
        {label}
      </text>
    </g>
  );
}

/** Balon penomoran detail (lingkaran + garis penunjuk) ala gambar kerja. */
export function Balloon({ x, y, toX, toY, n }: { x: number; y: number; toX: number; toY: number; n: number }) {
  return (
    <g>
      <line x1={x} y1={y} x2={toX} y2={toY} stroke={DIM} strokeWidth={0.9} />
      <circle cx={x} cy={y} r={9} fill={PAPER} stroke={DIM} strokeWidth={1.1} />
      <text x={x} y={y + 3} textAnchor="middle" fontSize={9} fontWeight={700} fill={DIM}>
        {n}
      </text>
    </g>
  );
}

/** Label teks dengan garis penunjuk (leader) untuk catatan material. */
export function LeaderLabel({ x, y, toX, toY, text, anchor = "start" }: { x: number; y: number; toX: number; toY: number; text: string; anchor?: "start" | "end" }) {
  return (
    <g>
      <line x1={toX} y1={toY} x2={x} y2={y - 4} stroke={INK_SOFT} strokeWidth={0.9} />
      <circle cx={toX} cy={toY} r={1.6} fill={INK_SOFT} />
      <text x={anchor === "start" ? x + 2 : x - 2} y={y} textAnchor={anchor} fontSize={9} fontWeight={600} fill={INK_SOFT}>
        {text}
      </text>
    </g>
  );
}

/** Definisi pola arsiran SVG (bata terpotong, beton, tanah). */
export function HatchDefs({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={`${id}-bata`} width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="6" stroke={INK} strokeWidth={0.65} opacity={0.65} />
      </pattern>
      <pattern id={`${id}-beton`} width="16" height="16" patternUnits="userSpaceOnUse">
        <path d="M 0 16 L 16 0" stroke={INK} strokeWidth={0.7} opacity={0.7} />
        <path d="M 0 8 L 8 0" stroke={INK} strokeWidth={0.5} opacity={0.45} />
        <circle cx={4} cy={12} r={1} fill={INK} opacity={0.6} />
        <circle cx={12} cy={4} r={1} fill={INK} opacity={0.6} />
      </pattern>
      <pattern id={`${id}-tanah`} width="18" height="10" patternUnits="userSpaceOnUse">
        <path d="M 0 10 l 5 -6 l 5 6 l 5 -6 l 4 6" stroke={INK} strokeWidth={0.7} fill="none" opacity={0.45} />
      </pattern>
    </defs>
  );
}

/** Kop gambar (title block) di kanan-bawah lembar. */
export function TitleBlock({ x, y, w, judul, kode }: { x: number; y: number; w: number; judul: string; kode: string }) {
  const rows: [string, string][] = [
    ["PROYEK", "PROTOTYPE RUMAH TINGGAL 6 x 6 M"],
    ["JUDUL", judul],
    ["SKALA", "1 : 100 (layar) \u2014 100 px/m"],
    ["SATUAN", "METER"],
    ["LEMBAR", kode],
  ];
  const h = rows.length * 13 + 6;
  return (
    <g>
      <rect x={x} y={y - h} width={w} height={h} fill="none" stroke={INK} strokeWidth={1.4} />
      {rows.map(([k, v], i) => {
        const ry = y - h + 2 + (i + 1) * 13;
        return (
          <g key={k}>
            {i > 0 && <line x1={x} y1={y - h + 2 + i * 13} x2={x + w} y2={y - h + 2 + i * 13} stroke={INK} strokeWidth={0.5} />}
            <text x={x + 5} y={ry - 3} fontSize={7.5} fontWeight={700} fill={INK_SOFT} letterSpacing={0.6}>
              {k}
            </text>
            <text x={x + 52} y={ry - 3} fontSize={8} fill={INK}>
              {v}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Panah arah utara + huruf U. */
export function NorthArrow({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={15} fill="none" stroke={INK} strokeWidth={1.2} />
      <path d="M 0 -11 L 5 8 L 0 4 L -5 8 Z" fill={INK} />
      <text x={11} y={-6} fontSize={9} fontWeight={700} fill={INK}>
        U
      </text>
    </g>
  );
}

/** Bar skala 0-3 m dengan blok hitam-putih berselang. */
export function ScaleBar({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <rect key={i} x={x + i * S} y={y} width={S} height={6} fill={i % 2 === 0 ? INK : PAPER} stroke={INK} strokeWidth={0.8} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <text key={i} x={x + i * S} y={y + 16} textAnchor="middle" fontSize={7.5} fill={INK_SOFT}>
          {i}
        </text>
      ))}
      <text x={x + 1.5 * S} y={y + 25} textAnchor="middle" fontSize={7.5} fill={INK_SOFT}>
        SKALA 1 : 100 (meter)
      </text>
    </g>
  );
}

/** Segitiga grid (as) denah: lingkaran berkode + garis as panjang. */
export function GridBubble({ cx, cy, r, label, lineX2, lineY2, vertical }: { cx: number; cy: number; r: number; label: string; lineX2: number; lineY2: number; vertical: boolean }) {
  return (
    <g>
      <line x1={cx} y1={cy} x2={vertical ? cx : lineX2} y2={vertical ? lineY2 : cy} stroke={INK_FADED} strokeWidth={0.6} strokeDasharray="10 5 2 5" />
      <circle cx={cx} cy={cy} r={r} fill={PAPER} stroke={INK} strokeWidth={1.1} />
      <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={INK}>
        {label}
      </text>
    </g>
  );
}

// ---------------------------------------------------------------- jadwal --

export interface OpeningRow {
  tag: string;
  jenis: string;
  lokasi: string;
  lebar: number;
  tinggi: number;
  bawah: number;
}

/** Kode bukaan P/J/LA berurutan + jadwal lengkap dari model 3D. */
export function openingSchedule(model: HouseModel): { rows: OpeningRow[]; tags: Map<string, { wall: WallRT; o: OpeningSpec; tag: string }> } {
  const rows: OpeningRow[] = [];
  const tags = new Map<string, { wall: WallRT; o: OpeningSpec; tag: string }>();
  let p = 0;
  let j = 0;
  let la = 0;
  for (const w of model.walls) {
    const ops = [...w.openings].sort((a, b) => a.from - b.from);
    for (const o of ops) {
      const idx = `${w.id}@${o.from}`;
      let tag: string;
      let jenis: string;
      if (o.kind === "pintu") {
        tag = `P${++p}`;
        jenis = "Pintu";
      } else if (o.kind === "jendela") {
        tag = `J${++j}`;
        jenis = "Jendela";
      } else {
        tag = `LA${++la}`;
        jenis = "Lubang angin";
      }
      tags.set(idx, { wall: w, o, tag });
      rows.push({
        tag,
        jenis,
        lokasi: w.name.replace(/\(.*\)/, "").trim(),
        lebar: o.to - o.from,
        tinggi: o.top - o.sill,
        bawah: o.sill,
      });
    }
  }
  return { rows, tags };
}

/** Kotak tag kecil (P1 / J1 / LA1) pada denah. */
export function TagBox({ x, y, tag }: { x: number; y: number; tag: string }) {
  const w = tag.length > 2 ? 24 : 18;
  return (
    <g>
      <rect x={x - w / 2} y={y - 6.5} width={w} height={13} rx={3} fill={PAPER} stroke={INK_SOFT} strokeWidth={0.8} />
      <text x={x} y={y + 3} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={INK}>
        {tag}
      </text>
    </g>
  );
}
