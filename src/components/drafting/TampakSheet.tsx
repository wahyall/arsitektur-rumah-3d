"use client";

import type { HouseModel } from "@/lib/house/engine";
import { fmtNum } from "@/lib/house/engine";
import { S, INK, INK_SOFT, INK_FADED, PAPER, fmtM, HDim, VDim, LevelMark, HatchDefs, TitleBlock, LeaderLabel } from "@/components/drafting/sheetUtils";

/** Lembar A-02 — TAMPAK DEPAN (elevasi ortografis): dinding pelana, bukaan, dimensi & label material. */
export function TampakSheet({ model }: { model: HouseModel }) {
  const ov = model.roof.overhang;
  const pitch = model.roof.pitch;
  const t = model.config.tinggi;
  const rbTop = t + 0.2;
  const yR = model.roof.yRidge;
  const apex = model.roof.apexAdd;
  const top = yR + 0.35;
  const bottom = -0.5;
  const ML = 132;
  const MR = 126;
  const MT = 92;
  const MB = 138;
  const VW = ML + (6 + 2 * ov) * S + MR;
  const VH = MT + (top - bottom) * S + MB;
  const sx = (x: number) => ML + (x + ov) * S;
  const sy = (h: number) => MT + (top - h) * S;
  const planeY = (x: number) => (x < 3 ? yR - (3 - x) * pitch : yR - (x - 3) * pitch);
  const depan = model.walls.find((w) => w.id === "depan") ?? null;
  const band = 0.12; // tebal visual bidang atap (genteng + reng)

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="h-auto w-full" role="img" aria-label="Lembar gambar tampak depan rumah">
      <HatchDefs id="tampak" />
      <rect x={0} y={0} width={VW} height={VH} fill={PAPER} />
      <rect x={10} y={10} width={VW - 20} height={VH - 20} fill="none" stroke={INK} strokeWidth={1.8} />
      <rect x={15} y={15} width={VW - 30} height={VH - 30} fill="none" stroke={INK} strokeWidth={0.6} />

      {/* ---------- atap: dua bidang genteng + nok + lisplank ---------- */}
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
      <rect x={sx(2.83)} y={sy(yR + band)} width={0.34 * S} height={0.16 * S} fill="#7c3f38" stroke={INK} strokeWidth={1.2} />
      {/* lisplank ujung pelana: papan penutup tepi overstek kedua sisi miring */}
      {[-1, 1].map((sgn) => (
        <line
          key={`lg${sgn}`}
          x1={sgn < 0 ? sx(-ov) : sx(6 + ov)}
          y1={sy(rbTop - ov * pitch)}
          x2={sx(3)}
          y2={sy(yR)}
          stroke="#d8c9a8"
          strokeWidth={4}
        />
      ))}
      {[-1, 1].map((sgn) => (
        <rect
          key={`lp${sgn}`}
          x={sgn < 0 ? sx(-ov) : sx(6 + ov) - 4}
          y={sy(rbTop - ov * pitch + 0.22)}
          width={4}
          height={0.22 * S}
          fill="#d8c9a8"
          stroke={INK}
          strokeWidth={0.9}
        />
      ))}

      {/* ---------- dinding + ring balk + pelana ---------- */}
      <rect x={sx(0)} y={sy(t)} width={6 * S} height={t * S} fill="#f4f2ec" stroke={INK} strokeWidth={1.4} />
      <rect x={sx(0)} y={sy(rbTop)} width={6 * S} height={0.2 * S} fill="#98958c" stroke={INK} strokeWidth={1.2} />
      <polygon points={`${sx(0)},${sy(rbTop)} ${sx(6)},${sy(rbTop)} ${sx(3)},${sy(yR)}`} fill="#f4f2ec" stroke={INK} strokeWidth={1.4} />

      {/* ---------- bukaan pada dinding depan ---------- */}
      {depan &&
        [...depan.openings]
          .sort((a, b) => a.from - b.from)
          .map((o) => {
            const key = `${depan.id}@${o.from}`;
            if (o.kind === "pintu") {
              return <DoorElev key={key} x1={sx(o.from)} x2={sx(o.to)} yBot={sy(o.sill)} yTop={sy(o.top)} />;
            }
            if (o.kind === "jendela") {
              return <WindowElev key={key} x1={sx(o.from)} x2={sx(o.to)} yBot={sy(o.sill)} yTop={sy(o.top)} />;
            }
            return <VentElev key={key} x1={sx(o.from)} x2={sx(o.to)} yBot={sy(o.sill)} yTop={sy(o.top)} />;
          })}

      {/* ---------- muka tanah + arsir ---------- */}
      <line x1={sx(-ov) - 12} y1={sy(-0.2)} x2={sx(6 + ov) + 12} y2={sy(-0.2)} stroke={INK} strokeWidth={2.2} />
      <rect x={sx(-ov) - 12} y={sy(-0.2)} width={(6 + 2 * ov) * S + 24} height={0.2 * S} fill="url(#tampak-tanah)" />

      {/* ---------- level & dimensi tinggi (kanan) ---------- */}
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

      {/* ---------- dimensi lebar (bawah) ---------- */}
      <g>
        <HDim xFrom={sx(-ov)} xTo={sx(0)} y={sy(-0.2) + 48} label={fmtM(ov)} above={false} />
        <HDim xFrom={sx(0)} xTo={sx(6)} y={sy(-0.2) + 48} label="6,00" above={false} />
        <HDim xFrom={sx(6)} xTo={sx(6 + ov)} y={sy(-0.2) + 48} label={fmtM(ov)} above={false} />
        <g stroke={INK_FADED} strokeWidth={0.6}>
          <line x1={sx(-ov)} y1={sy(-0.2) + 4} x2={sx(-ov)} y2={sy(-0.2) + 52} />
          <line x1={sx(6 + ov)} y1={sy(-0.2) + 4} x2={sx(6 + ov)} y2={sy(-0.2) + 52} />
        </g>
      </g>

      {/* ---------- label material dengan garis penunjuk ---------- */}
      <LeaderLabel x={sx(0.5)} y={sy(planeY(1.2)) - 55} toX={sx(1.2)} toY={sy(planeY(1.2))} text="GENTENG BETON FLAT" />
      <LeaderLabel x={sx(4.35)} y={sy(yR) - 24} toX={sx(3.12)} toY={sy(yR + 0.08)} text="NOK / RIDGE CAP" />
      <LeaderLabel x={sx(0.3)} y={sy(1.9) - 26} toX={sx(0.8)} toY={sy(1.6)} text="DINDING BATA + PLESTER & CAT" anchor="end" />
      <LeaderLabel x={sx(3.7)} y={sy(2.6)} toX={sx(4.65)} toY={sy(1.9)} text="KUSEN KAYU + DAUN PINTU PANEL" />
      <LeaderLabel x={sx(5.15)} y={sy(2.95)} toX={sx(5.75)} toY={sy(2.62)} text="ROSTER LUBANG ANGIN" />
      <LeaderLabel x={sx(1.9)} y={sy(t + 0.1) + 34} toX={sx(0.5)} toY={sy(t + 0.1)} text="RING BALK 15/20" anchor="start" />
      <LeaderLabel x={sx(-0.45)} y={sy(rbTop - 0.35 * pitch) + 12} toX={sx(-0.52)} toY={sy(rbTop - 0.5 * pitch) + 8} text={`OVERSTEK ${fmtNum(ov * 100, 0)} cm`} anchor="end" />
      <LeaderLabel x={sx(1.6)} y={sy(-0.05)} toX={sx(2.4)} toY={sy(-0.2)} text="MUKA TANAH -0,20" anchor="end" />

      <TitleBlock x={VW - 258} y={VH - 24} w={240} judul="TAMPAK DEPAN" kode="A-02" />
      <text x={16} y={VH - 21} fontSize={8} fill={INK_FADED}>
        Proyeksi ortografis — bukaan & tinggi mengikuti model 3D (dinding depan lembar A-01)
      </text>
    </svg>
  );
}

/** Kusen + daun pintu panel 2 susun (koordinat piksel layar). */
export function DoorElev({ x1, x2, yBot, yTop }: { x1: number; x2: number; yBot: number; yTop: number }) {
  const w = x2 - x1;
  const h = yBot - yTop;
  const ku = 3;
  return (
    <g>
      <rect x={x1} y={yTop} width={w} height={h} fill={PAPER} stroke="#83552d" strokeWidth={ku} />
      <rect x={x1 + ku + 2} y={yTop + ku + 2} width={w - 2 * ku - 4} height={h - 2 * ku - 4} fill="#8a5f36" stroke="#6f4423" strokeWidth={1.2} />
      {[0.18, 0.54].map((f) => (
        <rect key={f} x={x1 + ku + 7} y={yTop + ku + 6 + f * h} width={w - 2 * ku - 14} height={h * 0.3} fill="none" stroke="#5f3d1e" strokeWidth={1.1} />
      ))}
      <circle cx={x2 - ku - 8} cy={yTop + h / 2} r={2.6} fill="#3d2a14" />
    </g>
  );
}

/** Kusen jendela + kaca + palang tengah + ambang bawah (koordinat piksel layar). */
export function WindowElev({ x1, x2, yBot, yTop }: { x1: number; x2: number; yBot: number; yTop: number }) {
  const w = x2 - x1;
  const h = yBot - yTop;
  const ku = 2.5;
  return (
    <g>
      <rect x={x1} y={yTop} width={w} height={h} fill="#d9e4ea" fillOpacity={0.6} stroke="#83552d" strokeWidth={ku} />
      <line x1={x1 + ku} y1={(yTop + yBot) / 2} x2={x2 - ku} y2={(yTop + yBot) / 2} stroke="#83552d" strokeWidth={1.4} />
      <line x1={(x1 + x2) / 2} y1={yTop + ku} x2={(x1 + x2) / 2} y2={yBot - ku} stroke="#83552d" strokeWidth={1.4} />
      <rect x={x1 - 5} y={yBot} width={w + 10} height={5} fill="#b9b4a8" stroke={INK_SOFT} strokeWidth={0.8} />
    </g>
  );
}

/** Roster lubang angin: bingkai + kisi vertikal (koordinat piksel layar). */
export function VentElev({ x1, x2, yBot, yTop }: { x1: number; x2: number; yBot: number; yTop: number }) {
  const w = x2 - x1;
  const h = yBot - yTop;
  return (
    <g>
      <rect x={x1} y={yTop} width={w} height={h} fill="#c9c3b6" stroke="#7d786d" strokeWidth={1.4} />
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={x1 + w * f} y1={yTop + 1.5} x2={x1 + w * f} y2={yBot - 1.5} stroke="#7d786d" strokeWidth={1.6} />
      ))}
    </g>
  );
}
