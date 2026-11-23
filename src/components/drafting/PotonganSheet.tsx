"use client";

import type { HouseModel, WallRT } from "@/lib/house/engine";
import { S, INK, INK_SOFT, INK_FADED, PAPER, fmtM, HDim, VDim, LevelMark, HatchDefs, TitleBlock, Balloon } from "@/components/drafting/sheetUtils";

/**
 * Lembar A-04 — POTONGAN A-A (skala 1:100): potongan melintang pada y = 2,50 m
 * dilihat ke arah depan (+Y). Elemen terpotong diarsir (bata/beton), elemen di
 * belakang bidang potong digambar garis tipis (dinding depan, sekat w6, kuda-kuda).
 */
export function PotonganSheet({ model }: { model: HouseModel }) {
  const ov = model.roof.overhang;
  const pitch = model.roof.pitch;
  const t = model.config.tinggi;
  const rbTop = t + 0.2;
  const yR = model.roof.yRidge;
  const apex = model.roof.apexAdd;
  const top = yR + 0.3;
  const bottom = -1.3;
  const ML = 148;
  const MR = 122;
  const MT = 92;
  const MB = 150;
  const VW = ML + (6 + 2 * ov) * S + MR;
  const VH = MT + (top - bottom) * S + MB;
  const sx = (x: number) => ML + (x + ov) * S;
  const sy = (h: number) => MT + (top - h) * S;
  const planeY = (x: number) => (x < 3 ? yR - (3 - x) * pitch : yR - (x - 3) * pitch);
  const tL = model.config.tLuar / 1000;
  const tD = model.config.tDalam / 1000;
  const cakar = model.config.pondasi === "cakarayam" && model.structure.cakar;
  const cutWalls = (["kiri", "w5", "kanan"] as string[]).map((id) => model.walls.find((w) => w.id === id)).filter((w): w is WallRT => Boolean(w));
  const depan = model.walls.find((w) => w.id === "depan") ?? null;
  const w6 = model.walls.find((w) => w.id === "w6") ?? null;
  const band = 0.15;
  const legend: { n: number; text: string }[] = [
    { n: 1, text: cakar ? "PELAT CAKAR AYAM 6x6 m t10 cm + BUIS Ø40" : "PONDASI BATU KALI STRIP 40 x 60 cm" },
    { n: 2, text: "SLOOF BETON 15/20 (6D10 + begel 8-150)" },
    { n: 3, text: `PASANGAN BATA ${model.config.jenis === "hebel" ? "RINGAN/HEBEL 60 x 20 cm" : "MERAH 20 x 10 x 5 cm"}` },
    { n: 4, text: "PLESTERAN 1:5 t10-15 mm + ACIAN" },
    { n: 5, text: "RING BALK BETON 15/20" },
    { n: 6, text: "KUDA-KUDA BAJA RINGAN C75 @1200" },
    { n: 7, text: "RENG @400 + GENTENG BETON FLAT" },
    { n: 8, text: "PLAFON GYPSUM 9 mm + RANGKA HOLLOW" },
    { n: 9, text: "LANTAI RABAT BETON t10 + KERAMIK" },
    { n: 10, text: `OVERSTEK ATAP ${Math.round(ov * 100)} cm` },
  ];

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="h-auto w-full" role="img" aria-label="Lembar gambar potongan A-A rumah">
      <HatchDefs id="potongan" />
      <rect x={0} y={0} width={VW} height={VH} fill={PAPER} />
      <rect x={10} y={10} width={VW - 20} height={VH - 20} fill="none" stroke={INK} strokeWidth={1.8} />
      <rect x={15} y={15} width={VW - 30} height={VH - 30} fill="none" stroke={INK} strokeWidth={0.6} />

      {/* ---------- elemen di belakang bidang potong (garis tipis) ---------- */}
      {depan && (
        <g fill="none" stroke={INK_FADED} strokeWidth={1}>
          <rect x={sx(0)} y={sy(t)} width={6 * S} height={t * S} />
          <rect x={sx(0)} y={sy(rbTop)} width={6 * S} height={0.2 * S} />
          <polygon points={`${sx(0)},${sy(rbTop)} ${sx(6)},${sy(rbTop)} ${sx(3)},${sy(yR)}`} />
          {depan.openings.map((o) => (
            <rect key={`${depan.id}@${o.from}`} x={sx(o.from)} y={sy(o.top)} width={(o.to - o.from) * S} height={(o.top - o.sill) * S} strokeDasharray="5 3" />
          ))}
        </g>
      )}
      {w6 && <rect x={sx(w6.lo)} y={sy(t)} width={(w6.hi - w6.lo) * S} height={t * S} fill="none" stroke={INK_FADED} strokeWidth={1} />}

      {/* ---------- atap terpotong ---------- */}
      {[-1, 1].map((sgn) => {
        const xA = sgn < 0 ? -ov : 6 + ov;
        const yA = rbTop - ov * pitch;
        return (
          <polygon
            key={sgn}
            points={`${sx(xA)},${sy(yA)} ${sx(3)},${sy(yR)} ${sx(3)},${sy(yR + band)} ${sx(xA)},${sy(yA + band)}`}
            fill="#96524a"
            stroke={INK}
            strokeWidth={1.4}
          />
        );
      })}
      <rect x={sx(2.83)} y={sy(yR + band)} width={0.34 * S} height={0.14 * S} fill="#7c3f38" stroke={INK} strokeWidth={1.1} />

      {/* ---------- kuda-kuda baja ringan (di belakang potongan) ---------- */}
      <g stroke="#9a948a" strokeWidth={1.5} fill="none">
        <line x1={sx(0.2)} y1={sy(rbTop + 0.05)} x2={sx(5.8)} y2={sy(rbTop + 0.05)} />
        <line x1={sx(0.25)} y1={sy(rbTop + 0.09)} x2={sx(2.95)} y2={sy(yR - 0.03)} />
        <line x1={sx(5.75)} y1={sy(rbTop + 0.09)} x2={sx(3.05)} y2={sy(yR - 0.03)} />
        <line x1={sx(3)} y1={sy(rbTop + 0.09)} x2={sx(3)} y2={sy(yR - 0.05)} />
        <line x1={sx(1.5)} y1={sy(rbTop + 0.087)} x2={sx(0.85)} y2={sy(planeY(0.85) + 0.03)} />
        <line x1={sx(0.85)} y1={sy(planeY(0.85) + 0.03)} x2={sx(2.9)} y2={sy(rbTop + 0.09 + (apex - 0.14) * 0.55)} />
        <line x1={sx(4.5)} y1={sy(rbTop + 0.087)} x2={sx(5.15)} y2={sy(planeY(5.15) + 0.03)} />
        <line x1={sx(5.15)} y1={sy(planeY(5.15) + 0.03)} x2={sx(3.1)} y2={sy(rbTop + 0.09 + (apex - 0.14) * 0.55)} />
        {/* reng: tik tegak lurus bidang atap */}
        {[-1, 1].map((sgn) =>
          Array.from({ length: 8 }, (_, i) => {
            const hx = sgn < 0 ? 0.35 + i * 0.4 : 3.65 + i * 0.4;
            const y = planeY(hx);
            const nx = (sgn * pitch) / Math.hypot(1, pitch);
            const ny = 1 / Math.hypot(1, pitch);
            return <line key={`${sgn}${i}`} x1={sx(hx)} y1={sy(y + 0.02)} x2={sx(hx + nx * 0.09)} y2={sy(y + 0.02 + ny * 0.09)} />;
          }),
        )}
      </g>

      {/* ---------- lantai rabat + keramik ---------- */}
      <rect x={sx(tL)} y={sy(0)} width={(6 - 2 * tL) * S} height={0.1 * S} fill="url(#potongan-beton)" stroke={INK} strokeWidth={1.1} />
      <line x1={sx(tL)} y1={sy(0)} x2={sx(6 - tL)} y2={sy(0)} stroke={INK} strokeWidth={2.4} />

      {/* ---------- plafon ---------- */}
      <line x1={sx(tL)} y1={sy(t + 0.02)} x2={sx(6 - tL)} y2={sy(t + 0.02)} stroke={INK} strokeWidth={2.4} />
      <rect x={sx(tL)} y={sy(t + 0.02)} width={(6 - 2 * tL) * S} height={2.5} fill={PAPER} stroke={INK} strokeWidth={0.8} />

      {/* ---------- dinding terpotong (kiri, w5, kanan) + sloof + ring balk + pondasi ---------- */}
      {cutWalls.map((w) => {
        const tt = w.t;
        return (
          <g key={w.id}>
            {/* bata terpotong (arsir) */}
            <rect x={sx(w.c - tt / 2)} y={sy(t)} width={tt * S} height={t * S} fill="url(#potongan-bata)" stroke={INK} strokeWidth={1.3} />
            {/* ring balk */}
            <rect x={sx(w.c - 0.075)} y={sy(rbTop)} width={0.15 * S} height={0.2 * S} fill="url(#potongan-beton)" stroke={INK} strokeWidth={1.2} />
            {/* sloof */}
            <rect x={sx(w.c - 0.075)} y={sy(0)} width={0.15 * S} height={0.2 * S} fill="url(#potongan-beton)" stroke={INK} strokeWidth={1.2} />
            {/* pondasi */}
            {cakar ? (
              <rect x={sx(w.c - 0.2)} y={sy(-0.2)} width={0.4 * S} height={0.9 * S} fill="url(#potongan-tanah)" stroke={INK} strokeWidth={1.1} />
            ) : (
              <rect x={sx(w.c - 0.2)} y={sy(-0.2)} width={0.4 * S} height={0.4 * S} fill="url(#potongan-tanah)" stroke={INK} strokeWidth={1.1} />
            )}
          </g>
        );
      })}

      {/* pelat cakar ayam (memotong seluruh lebar) */}
      {cakar && (
        <g>
          <rect x={sx(0)} y={sy(-0.2)} width={6 * S} height={0.1 * S} fill="url(#potongan-beton)" stroke={INK} strokeWidth={1.2} />
          {model.structure.cakar!.buisPts
            .filter((b) => Math.abs(b.y - 2.5) < 1.1)
            .map((b, i) => (
              <g key={i}>
                <rect x={sx(b.x - 0.2)} y={sy(-0.2)} width={0.4 * S} height={0.9 * S} fill="url(#potongan-tanah)" stroke={INK} strokeWidth={1.1} />
                <circle cx={sx(b.x)} cy={sy(-0.65)} r={0.05 * S} fill={PAPER} stroke={INK} strokeWidth={0.8} />
              </g>
            ))}
        </g>
      )}

      {/* ---------- muka tanah ---------- */}
      <line x1={sx(-ov) - 14} y1={sy(-0.55)} x2={sx(6 + ov) + 14} y2={sy(-0.55)} stroke={INK} strokeWidth={2.2} />
      <rect x={sx(-ov) - 14} y={sy(-0.55)} width={(6 + 2 * ov) * S + 28} height={0.18 * S} fill="url(#potongan-tanah)" />

      {/* ---------- level ketinggian (kiri) ---------- */}
      <LevelMark x={sx(-ov) - 62} y={sy(0)} label="±0,00" />
      <LevelMark x={sx(-ov) - 62} y={sy(t)} label={`+${fmtM(t)}`} />
      <LevelMark x={sx(-ov) - 62} y={sy(rbTop)} label={`+${fmtM(rbTop)}`} />
      <LevelMark x={sx(-ov) - 62} y={sy(yR)} label={`+${fmtM(yR)}`} />
      <LevelMark x={sx(-ov) - 62} y={sy(-0.55)} label="MUKA TANAH" />

      {/* ---------- dimensi tinggi (kanan) ---------- */}
      <VDim yFrom={sy(0)} yTo={sy(t)} x={sx(6) + 52} label={fmtM(t)} side="right" />
      <VDim yFrom={sy(t)} yTo={sy(rbTop)} x={sx(6) + 52} label="0,20" side="right" />
      <VDim yFrom={sy(rbTop)} yTo={sy(yR)} x={sx(6) + 52} label={fmtM(apex)} side="right" />
      <VDim yFrom={sy(0)} yTo={sy(yR)} x={sx(6) + 88} label={fmtM(yR)} side="right" />
      <g stroke={INK_FADED} strokeWidth={0.6}>
        <line x1={sx(6)} y1={sy(0)} x2={sx(6) + 98} y2={sy(0)} />
        <line x1={sx(3)} y1={sy(yR)} x2={sx(6) + 98} y2={sy(yR)} />
      </g>

      {/* ---------- dimensi lebar (bawah) ---------- */}
      <g>
        <HDim xFrom={sx(-ov)} xTo={sx(0)} y={sy(-0.55) + 52} label={fmtM(ov)} above={false} />
        <HDim xFrom={sx(0)} xTo={sx(3)} y={sy(-0.55) + 52} label="3,00" above={false} />
        <HDim xFrom={sx(3)} xTo={sx(6)} y={sy(-0.55) + 52} label="3,00" above={false} />
        <HDim xFrom={sx(6)} xTo={sx(6 + ov)} y={sy(-0.55) + 52} label={fmtM(ov)} above={false} />
        <g stroke={INK_FADED} strokeWidth={0.6}>
          <line x1={sx(-ov)} y1={sy(-0.55) + 6} x2={sx(-ov)} y2={sy(-0.55) + 56} />
          <line x1={sx(6 + ov)} y1={sy(-0.55) + 6} x2={sx(6 + ov)} y2={sy(-0.55) + 56} />
        </g>
      </g>

      {/* ---------- balon detail (1-10) ---------- */}
      <Balloon n={1} x={sx(1.05)} y={sy(-0.42)} toX={sx(0.22)} toY={sy(-0.4)} />
      <Balloon n={2} x={sx(2.2)} y={sy(-0.09)} toX={sx(0.14)} toY={sy(-0.1)} />
      <Balloon n={3} x={sx(1.1)} y={sy(1.35)} toX={sx(0.06)} toY={sy(1.35)} />
      <Balloon n={4} x={sx(2.0)} y={sy(2.42)} toX={sx(0.05)} toY={sy(2.45)} />
      <Balloon n={5} x={sx(1.35)} y={sy(t + 0.42)} toX={sx(0.06)} toY={sy(t + 0.1)} />
      <Balloon n={6} x={sx(4.6)} y={sy(rbTop + 0.52)} toX={sx(3.7)} toY={sy(rbTop + 0.35)} />
      <Balloon n={7} x={sx(4.8)} y={sy(planeY(1.9) - 0.52)} toX={sx(4.6)} toY={sy(planeY(1.9) + 0.04)} />
      <Balloon n={8} x={sx(2.25)} y={sy(t - 0.22)} toX={sx(2.5)} toY={sy(t + 0.02)} />
      <Balloon n={9} x={sx(4.75)} y={sy(0.42)} toX={sx(4.55)} toY={sy(0)} />
      <Balloon n={10} x={sx(6.55)} y={sy(rbTop + 0.18)} toX={sx(6.32)} toY={sy(rbTop - 0.35 * pitch + 0.04)} />

      {/* ---------- legenda balon (bawah lembar, 2 kolom) ---------- */}
      <g>
        <text x={20} y={VH - 118} fontSize={9.5} fontWeight={700} fill={INK}>
          KETERANGAN POTONGAN A-A
        </text>
        {legend.map((l, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = 20 + col * 350;
          const y = VH - 100 + row * 16;
          return (
            <g key={l.n}>
              <circle cx={x + 8} cy={y - 3} r={8} fill={PAPER} stroke={INK} strokeWidth={0.9} />
              <text x={x + 8} y={y} textAnchor="middle" fontSize={8} fontWeight={700} fill={INK}>
                {l.n}
              </text>
              <text x={x + 22} y={y} fontSize={8} fill={INK_SOFT}>
                {l.text}
              </text>
            </g>
          );
        })}
      </g>

      <TitleBlock x={VW - 258} y={VH - 24} w={240} judul="POTONGAN A-A" kode="A-04" />
      <text x={16} y={VH - 21} fontSize={8} fill={INK_FADED}>
        Bidang potong pada as y = 2,50 m dilihat ke arah depan — arsir = terpotong, garis tipis putus-putus = di belakang bidang potong
      </text>
    </svg>
  );
}
