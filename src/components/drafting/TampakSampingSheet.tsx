"use client";

import type { HouseModel } from "@/lib/house/engine";
import { fmtNum } from "@/lib/house/engine";
import { S, INK, INK_SOFT, INK_FADED, PAPER, fmtM, HDim, VDim, LevelMark, HatchDefs, TitleBlock, LeaderLabel } from "@/components/drafting/sheetUtils";
import { DoorElev, WindowElev, VentElev } from "@/components/drafting/TampakSheet";

/** Lembar A-03 — TAMPAK SAMPING KANAN: dinding persegi di bawah bidang atap (edge-on), bukaan dinding sisi kanan. */
export function TampakSampingSheet({ model }: { model: HouseModel }) {
  const ov = model.roof.overhang;
  const pitch = model.roof.pitch;
  const t = model.config.tinggi;
  const rbTop = t + 0.2;
  const yR = model.roof.yRidge;
  const apex = model.roof.apexAdd;
  const top = yR + 0.35;
  const bottom = -0.75;
  const ML = 132;
  const MR = 128;
  const MT = 92;
  const MB = 138;
  const VW = ML + (6 + 2 * ov) * S + MR;
  const VH = MT + (top - bottom) * S + MB;
  const sx = (z: number) => ML + (z + ov) * S; // sumbu horizontal = arah Y denah (0 belakang -> 6 depan)
  const sy = (h: number) => MT + (top - h) * S;
  const kanan = model.walls.find((w) => w.id === "kanan") ?? null;
  const kiri = model.walls.find((w) => w.id === "kiri") ?? null;
  const yEave = rbTop - ov * pitch; // titik terendah bidang atap (tepi overstek)

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="h-auto w-full" role="img" aria-label="Lembar gambar tampak samping rumah">
      <HatchDefs id="samping" />
      <rect x={0} y={0} width={VW} height={VH} fill={PAPER} />
      <rect x={10} y={10} width={VW - 20} height={VH - 20} fill="none" stroke={INK} strokeWidth={1.8} />
      <rect x={15} y={15} width={VW - 30} height={VH - 30} fill="none" stroke={INK} strokeWidth={0.6} />

      {/* ---------- bidang atap dilihat edge-on + nok ---------- */}
      <rect x={sx(-ov)} y={sy(yR)} width={(6 + 2 * ov) * S} height={(yR - yEave) * S} fill="#96524a" stroke={INK} strokeWidth={1.4} />
      <rect x={sx(-ov)} y={sy(yR + 0.12)} width={(6 + 2 * ov) * S} height={0.12 * S} fill="#7c3f38" stroke={INK} strokeWidth={1.1} />
      {[0, 1].map((i) => (
        <rect key={i} x={i === 0 ? sx(-ov) : sx(6 + ov) - 4} y={sy(yEave + 0.22)} width={4} height={0.22 * S} fill="#d8c9a8" stroke={INK} strokeWidth={0.9} />
      ))}

      {/* ---------- dinding samping + ring balk ---------- */}
      <rect x={sx(0)} y={sy(t)} width={6 * S} height={t * S} fill="#f4f2ec" stroke={INK} strokeWidth={1.4} />
      <rect x={sx(0)} y={sy(rbTop)} width={6 * S} height={0.2 * S} fill="#98958c" stroke={INK} strokeWidth={1.2} />

      {/* ---------- bukaan dinding kanan (near) ---------- */}
      {kanan &&
        [...kanan.openings]
          .sort((a, b) => a.from - b.from)
          .map((o) => {
            const key = `${kanan.id}@${o.from}`;
            if (o.kind === "pintu") return <DoorElev key={key} x1={sx(o.from)} x2={sx(o.to)} yBot={sy(o.sill)} yTop={sy(o.top)} />;
            if (o.kind === "jendela") return <WindowElev key={key} x1={sx(o.from)} x2={sx(o.to)} yBot={sy(o.sill)} yTop={sy(o.top)} />;
            return <VentElev key={key} x1={sx(o.from)} x2={sx(o.to)} yBot={sy(o.sill)} yTop={sy(o.top)} />;
          })}

      {/* ---------- bukaan dinding kiri (jauh — garis tipis) ---------- */}
      {kiri &&
        [...kiri.openings]
          .sort((a, b) => a.from - b.from)
          .map((o) => (
            <rect
              key={`${kiri.id}@${o.from}`}
              x={sx(o.from)}
              y={sy(o.top)}
              width={(o.to - o.from) * S}
              height={(o.top - o.sill) * S}
              fill="none"
              stroke={INK_FADED}
              strokeWidth={1}
              strokeDasharray="5 3"
            />
          ))}

      {/* ---------- muka tanah + arsir ---------- */}
      <line x1={sx(-ov) - 12} y1={sy(-0.55)} x2={sx(6 + ov) + 12} y2={sy(-0.55)} stroke={INK} strokeWidth={2.2} />
      <rect x={sx(-ov) - 12} y={sy(-0.55)} width={(6 + 2 * ov) * S + 24} height={0.2 * S} fill="url(#samping-tanah)" />

      {/* ---------- level & dimensi tinggi ---------- */}
      <LevelMark x={sx(-ov) - 58} y={sy(0)} label="±0,00" />
      <LevelMark x={sx(-ov) - 58} y={sy(t)} label={`+${fmtM(t)}`} />
      <LevelMark x={sx(-ov) - 58} y={sy(rbTop)} label={`+${fmtM(rbTop)}`} />
      <LevelMark x={sx(-ov) - 58} y={sy(yR)} label={`+${fmtM(yR)}`} />
      <VDim yFrom={sy(0)} yTo={sy(t)} x={sx(6) + 54} label={fmtM(t)} side="right" />
      <VDim yFrom={sy(t)} yTo={sy(rbTop)} x={sx(6) + 54} label="0,20" side="right" />
      <VDim yFrom={sy(rbTop)} yTo={sy(yR)} x={sx(6) + 54} label={fmtM(apex)} side="right" />
      <VDim yFrom={sy(0)} yTo={sy(yR)} x={sx(6) + 92} label={fmtM(yR)} side="right" />
      <g stroke={INK_FADED} strokeWidth={0.6}>
        <line x1={sx(0)} y1={sy(0)} x2={sx(6) + 102} y2={sy(0)} />
        <line x1={sx(3)} y1={sy(yR)} x2={sx(6) + 102} y2={sy(yR)} />
      </g>

      {/* ---------- dimensi lebar ---------- */}
      <g>
        <HDim xFrom={sx(-ov)} xTo={sx(0)} y={sy(-0.55) + 48} label={fmtM(ov)} above={false} />
        <HDim xFrom={sx(0)} xTo={sx(6)} y={sy(-0.55) + 48} label="6,00" above={false} />
        <HDim xFrom={sx(6)} xTo={sx(6 + ov)} y={sy(-0.55) + 48} label={fmtM(ov)} above={false} />
        <g stroke={INK_FADED} strokeWidth={0.6}>
          <line x1={sx(-ov)} y1={sy(-0.55) + 4} x2={sx(-ov)} y2={sy(-0.55) + 52} />
          <line x1={sx(6 + ov)} y1={sy(-0.55) + 4} x2={sx(6 + ov)} y2={sy(-0.55) + 52} />
        </g>
      </g>

      {/* ---------- label material ---------- */}
      <LeaderLabel x={sx(1.6)} y={sy(yR) - 26} toX={sx(2.2)} toY={sy(yR - 0.06)} text="GENTENG BETON (BIDANG ATAP)" />
      <LeaderLabel x={sx(0.15)} y={sy(2.0)} toX={sx(0.6)} toY={sy(1.7)} text="DINDING BATA + PLESTER & CAT" anchor="end" />
      <LeaderLabel x={sx(4.6)} y={sy(1.4) - 22} toX={sx(4.5)} toY={sy(1.5)} text="JENDELA RANGKA KELUARGA (J4)" />
      <LeaderLabel x={sx(1.9)} y={sy(1.3)} toX={sx(0.9)} toY={sy(2.4)} text="ROSTER LUBANG ANGIN DAPUR" anchor="end" />
      <LeaderLabel x={sx(0.15)} y={sy(t + 0.1) + 24} toX={sx(0.5)} toY={sy(t + 0.1)} text="RING BALK 15/20" anchor="end" />
      <LeaderLabel x={sx(6.55)} y={sy(yEave + 0.15)} toX={sx(6.35)} toY={sy(yEave + 0.02)} text={`OVERSTEK ${fmtNum(ov * 100, 0)} cm`} />
      <LeaderLabel x={sx(1.8)} y={sy(-0.28)} toX={sx(2.6)} toY={sy(-0.55)} text="MUKA TANAH -0,55" anchor="end" />

      <TitleBlock x={VW - 258} y={VH - 24} w={240} judul="TAMPAK SAMPING (KANAN)" kode="A-03" />
      <text x={16} y={VH - 21} fontSize={8} fill={INK_FADED}>
        Sumbu horizontal = arah belakang (kiri) ke depan (kanan) — bukaan putus-putus = dinding kiri di belakang
      </text>
    </svg>
  );
}
