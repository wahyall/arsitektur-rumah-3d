"use client";

import type { HouseModel } from "@/lib/house/engine";
import { fmtNum } from "@/lib/house/engine";
import {
  S,
  INK,
  INK_SOFT,
  INK_FADED,
  DIM,
  PAPER,
  fmtM,
  HDim,
  VDim,
  GridBubble,
  HatchDefs,
  TitleBlock,
  NorthArrow,
  ScaleBar,
  TagBox,
  openingSchedule,
} from "@/components/drafting/sheetUtils";

/**
 * Lembar A-01 — DENAH LANTAI 1 (skala 1:100 layar).
 * Konvensi gambar arsitektur: rantai ukuran dua baris, as grid (1-2-3 / A-B-C),
 * potongan A-A, tag bukaan (P/J/LA), Pondasi batu kali / cakar ayam, kop gambar.
 */
export function DenahSheet({ model }: { model: HouseModel }) {
  const ML = 120;
  const MT = 115;
  const MR = 85;
  const MB = 132;
  const VW = ML + 6 * S + MR; // 805
  const VH = MT + 6 * S + MB; // 847
  const px = (v: number) => ML + v * S;
  const py = (v: number) => MT + v * S;
  const tL = model.config.tLuar / 1000;
  const cakar = model.config.pondasi === "cakarayam" && model.structure.cakar;
  const { tags } = openingSchedule(model);

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} className="h-auto w-full" role="img" aria-label="Lembar gambar denah lantai 1 rumah 6 x 6 meter">
      <HatchDefs id="denah" />
      <rect x={0} y={0} width={VW} height={VH} fill={PAPER} />
      <rect x={10} y={10} width={VW - 20} height={VH - 20} fill="none" stroke={INK} strokeWidth={1.8} />
      <rect x={15} y={15} width={VW - 30} height={VH - 30} fill="none" stroke={INK} strokeWidth={0.6} />

      {/* ---------- as grid: bubble di kedua sisi + garis as menarus denah ---------- */}
      {[0, 3, 6].map((gx) => (
        <GridBubble key={`t${gx}`} cx={px(gx)} cy={45} r={10} label={String(gx / 3 + 1)} lineX2={px(gx)} lineY2={py(6) + 58} vertical={true} />
      ))}
      {[0, 3, 6].map((gx) => (
        <GridBubble key={`b${gx}`} cx={px(gx)} cy={py(6) + 58} r={10} label={String(gx / 3 + 1)} lineX2={px(gx)} lineY2={45} vertical={true} />
      ))}
      {[0, 3, 6].map((gy) => (
        <GridBubble key={`l${gy}`} cx={45} cy={py(gy)} r={10} label={String.fromCharCode(65 + gy / 3)} lineX2={VW - 45} lineY2={py(gy)} vertical={false} />
      ))}
      {[0, 3, 6].map((gy) => (
        <GridBubble key={`r${gy}`} cx={VW - 45} cy={py(gy)} r={10} label={String.fromCharCode(65 + gy / 3)} lineX2={45} lineY2={py(gy)} vertical={false} />
      ))}

      {/* ---------- rantai ukuran atas & kiri (2 baris: parsial + keseluruhan) ---------- */}
      <g>
        <HDim xFrom={px(0)} xTo={px(3)} y={99} label="3,00" />
        <HDim xFrom={px(3)} xTo={px(6)} y={99} label="3,00" />
        <HDim xFrom={px(0)} xTo={px(6)} y={76} label="6,00" />
        <VDim yFrom={py(0)} yTo={py(1.5)} x={99} label="1,50" />
        <VDim yFrom={py(1.5)} yTo={py(3)} x={99} label="1,50" />
        <VDim yFrom={py(3)} yTo={py(6)} x={99} label="3,00" />
        <VDim yFrom={py(0)} yTo={py(6)} x={76} label="6,00" />
        <g stroke={DIM} strokeWidth={0.7}>
          <line x1={px(0)} y1={99} x2={px(0)} y2={py(0) - 2} />
          <line x1={px(3)} y1={99} x2={px(3)} y2={py(0) - 2} />
          <line x1={px(6)} y1={99} x2={px(6)} y2={py(0) - 2} />
          <line x1={99} y1={py(0)} x2={px(0) - 2} y2={py(0)} />
          <line x1={99} y1={py(1.5)} x2={px(0) - 2} y2={py(1.5)} />
          <line x1={99} y1={py(3)} x2={px(0) - 2} y2={py(3)} />
          <line x1={99} y1={py(6)} x2={px(0) - 2} y2={py(6)} />
        </g>
      </g>

      {/* ---------- pondasi (garis putus-putus di bawah seluruh jalur dinding) ---------- */}
      {cakar ? (
        <g fill="none" stroke={INK_SOFT} strokeWidth={1} strokeDasharray="7 4">
          <rect x={px(0)} y={py(0)} width={6 * S} height={6 * S} />
          {model.structure.cakar!.buisPts.map((b, i) => (
            <circle key={i} cx={px(b.x)} cy={py(b.y)} r={0.2 * S} />
          ))}
          <text x={px(0.1)} y={py(6) + 26} fontSize={8.5} fill={INK_SOFT} stroke="none" strokeDasharray="none">
            PONDASI CAKAR AYAM: PELAT BETON 6 x 6 m (t 10 cm) + BUIS Ø40 SEBANYAK {model.structure.cakar!.buisCount} TITIK
          </text>
        </g>
      ) : (
        model.walls.map((w) => {
          const rect =
            w.axis === "h"
              ? { x: px(w.lo), y: py(w.c - 0.2), w: (w.hi - w.lo) * S, h: 0.4 * S }
              : { x: px(w.c - 0.2), y: py(w.lo), w: 0.4 * S, h: (w.hi - w.lo) * S };
          return <rect key={`pond-${w.id}`} x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill="none" stroke={INK_SOFT} strokeWidth={1} strokeDasharray="7 4" />;
        })
      )}
      {!cakar && (
        <text x={px(0.1)} y={py(6) + 26} fontSize={8.5} fill={INK_SOFT}>
          PONDASI BATU KALI STRIP 40 x 60 cm (GARIS PUTUS-PUTUS) DI BAWAH SELURUH JALUR DINDING
        </text>
      )}
      <text x={px(3)} y={py(6) + 92} textAnchor="middle" fontSize={8.5} fontWeight={600} fill={INK_SOFT}>
        POTONGAN A-A &mdash; LIHAT LEMBAR A-04
      </text>

      {/* ---------- dinding (poche hitam) ---------- */}
      {model.walls.map((w) => {
        const rect =
          w.axis === "h"
            ? { x: px(w.lo), y: py(w.c - w.t / 2), w: (w.hi - w.lo) * S, h: w.t * S }
            : { x: px(w.c - w.t / 2), y: py(w.lo), w: w.t * S, h: (w.hi - w.lo) * S };
        return <rect key={w.id} x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill={w.outer ? INK : "#57534b"} />;
      })}

      {/* kolom praktis di simpul dinding */}
      {model.koloms.map((k, i) => (
        <rect key={i} x={px(k.x) - 7.5} y={py(k.y) - 7.5} width={15} height={15} fill={INK} stroke={PAPER} strokeWidth={0.7} />
      ))}

      {/* ---------- bukaan: pintu, jendela, roster + tag ---------- */}
      {model.walls.flatMap((w) =>
        [...w.openings]
          .sort((a, b) => a.from - b.from)
          .map((o) => {
            const key = `${w.id}@${o.from}`;
            const tag = tags.get(key)?.tag ?? "";
            const kusen = 0.07;
            const fr = 0.03;
            const mid = (o.from + o.to) / 2;
            const outH = w.axis === "h" ? (w.c < 3 ? -1 : 1) : 0;
            const outV = w.axis === "v" ? (w.c < 3 ? -1 : 1) : 0;
            const tagPos =
              w.axis === "h"
                ? { x: px(mid), y: py(w.c) + outH * (w.t / 2 * S + 14) }
                : { x: px(w.c) + outV * (w.t / 2 * S + 14), y: py(mid) };
            const tagInner =
              w.axis === "h"
                ? { x: px(mid), y: py(w.c) + (w.c < 3 ? 1 : -1) * (w.t / 2 * S + 15) }
                : { x: px(w.c) + (w.c < 3 ? 1 : -1) * (w.t / 2 * S + 15), y: py(mid) };

            if (o.kind === "vent") {
              return (
                <g key={key}>
                  {w.axis === "h" ? (
                    <VentPlan x1={px(o.from)} y1={py(w.c - w.t / 2)} x2={px(o.to)} y2={py(w.c + w.t / 2)} />
                  ) : (
                    <VentPlan x1={px(w.c - w.t / 2)} y1={py(o.from)} x2={px(w.c + w.t / 2)} y2={py(o.to)} />
                  )}
                  <TagBox x={w.outer ? tagPos.x : tagInner.x} y={w.outer ? tagPos.y : tagInner.y} tag={tag} />
                </g>
              );
            }

            if (o.kind === "jendela") {
              return (
                <g key={key}>
                  {w.axis === "h" ? (
                    <>
                      <rect x={px(o.from)} y={py(w.c - w.t / 2)} width={(o.to - o.from) * S} height={w.t * S} fill={PAPER} />
                      <rect x={px(o.from + kusen)} y={py(w.c - w.t / 2) + 3} width={(o.to - o.from - 2 * kusen) * S} height={w.t * S - 6} fill="#dfe4e0" stroke="#7d837f" strokeWidth={0.8} />
                      <line x1={px(o.from + kusen)} y1={py(w.c)} x2={px(o.to - kusen)} y2={py(w.c)} stroke="#7d837f" strokeWidth={0.8} />
                    </>
                  ) : (
                    <>
                      <rect x={px(w.c - w.t / 2)} y={py(o.from)} width={w.t * S} height={(o.to - o.from) * S} fill={PAPER} />
                      <rect x={px(w.c - w.t / 2) + 3} y={py(o.from + kusen)} width={w.t * S - 6} height={(o.to - o.from - 2 * kusen) * S} fill="#dfe4e0" stroke="#7d837f" strokeWidth={0.8} />
                      <line x1={px(w.c)} y1={py(o.from + kusen)} x2={px(w.c)} y2={py(o.to - kusen)} stroke="#7d837f" strokeWidth={0.8} />
                    </>
                  )}
                  <TagBox x={w.outer ? tagPos.x : tagInner.x} y={w.outer ? tagPos.y : tagInner.y} tag={tag} />
                </g>
              );
            }

            // pintu: bukaan putih + daun pintu + busur ayun (arah ayun ke ruangan yang dilayani)
            const dy = o.swing ?? (w.axis === "h" ? (w.c < 3 ? 1 : -1) : 0);
            const dx = o.swing ?? (w.axis === "v" ? (w.c < 3 ? 1 : -1) : 0);
            const r = (o.to - o.from) * S;
            if (w.axis === "h") {
              const hx = px(o.from);
              const hy = py(w.c);
              const sweep = dy > 0 ? 0 : 1;
              return (
                <g key={key}>
                  <rect x={px(o.from)} y={py(w.c - w.t / 2)} width={r} height={w.t * S} fill={PAPER} />
                  <path d={`M ${hx} ${hy} L ${hx} ${hy + dy * r} A ${r} ${r} 0 0 ${sweep} ${hx + r} ${hy}`} fill="none" stroke={INK_FADED} strokeWidth={1} strokeDasharray="4 3" />
                  <line x1={hx} y1={hy} x2={hx} y2={hy + dy * r} stroke="#7c5230" strokeWidth={3} />
                  <TagBox x={w.outer ? tagPos.x : tagInner.x} y={w.outer ? tagPos.y : tagInner.y} tag={tag} />
                </g>
              );
            }
            const hx = px(w.c);
            const hy = py(o.from);
            const sweep = dx < 0 ? 1 : 0;
            return (
              <g key={key}>
                <rect x={px(w.c - w.t / 2)} y={py(o.from)} width={w.t * S} height={r} fill={PAPER} />
                <path d={`M ${hx} ${hy} L ${hx + dx * r} ${hy} A ${r} ${r} 0 0 ${sweep} ${hx} ${hy + r}`} fill="none" stroke={INK_FADED} strokeWidth={1} strokeDasharray="4 3" />
                <line x1={hx} y1={hy} x2={hx + dx * r} y2={hy} stroke="#7c5230" strokeWidth={3} />
                <TagBox x={w.outer ? tagPos.x : tagInner.x} y={w.outer ? tagPos.y : tagInner.y} tag={tag} />
              </g>
            );
          }),
      )}

      {/* ---------- label ruangan ---------- */}
      {model.areas.rooms.map((r) => (
        <text key={r.id} x={px(r.cx)} y={py(r.cy) - 6} textAnchor="middle" fill={INK} fontSize={12} fontWeight={600}>
          {r.name}
          <tspan x={px(r.cx)} dy={15} fontSize={10} fontWeight={400} fill={INK_SOFT}>
            {fmtNum(r.w, 2)} x {fmtNum(r.d, 2)} m
          </tspan>
          <tspan x={px(r.cx)} dy={14} fontSize={10} fontWeight={600} fill={DIM}>
            {fmtNum(r.area, 1)} m2
          </tspan>
        </text>
      ))}

      {/* ---------- penanda potongan A-A ---------- */}
      <g stroke={INK} strokeWidth={2}>
        <line x1={px(0) - 16} y1={py(2.5)} x2={px(6) + 16} y2={py(2.5)} strokeDasharray="12 4 3 4" strokeWidth={1.2} />
        <line x1={px(0) - 16} y1={py(2.5) - 6} x2={px(0) - 16} y2={py(2.5) + 6} strokeWidth={3} />
        <line x1={px(6) + 16} y1={py(2.5) - 6} x2={px(6) + 16} y2={py(2.5) + 6} strokeWidth={3} />
      </g>
      {[px(0) - 16, px(6) + 16].map((ax, i) => (
        <g key={i}>
          <path d={`M ${ax} ${py(2.5)} l 6 10 l -12 0 Z`} fill={INK} stroke="none" />
          <circle cx={ax} cy={py(2.5) - 20} r={9} fill={PAPER} stroke={INK} strokeWidth={1.2} />
          <text x={ax} y={py(2.5) - 16.5} textAnchor="middle" fontSize={10} fontWeight={700} fill={INK}>
            A
          </text>
        </g>
      ))}

      {/* ---------- ukuran dalam (bersih) ---------- */}
      <g>
        <HDim xFrom={px(tL)} xTo={px(6 - tL)} y={py(6) + 40} label={`${fmtM(6 - 2 * tL)} (bersih)`} above={false} />
      </g>

      <NorthArrow x={VW - 52} y={60} />
      <ScaleBar x={px(0)} y={VH - 58} />
      <TitleBlock x={VW - 258} y={VH - 24} w={240} judul="DENAH LANTAI 1" kode="A-01" />

      <text x={16} y={VH - 21} fontSize={8} fill={INK_SOFT}>
        Dinding luar {model.config.tLuar} mm / sekat {model.config.tDalam} mm — kotak kecil = kolom praktis 15/15 di simpul dinding
      </text>
    </svg>
  );
}

function VentPlan({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const horizontal = Math.abs(x2 - x1) > Math.abs(y2 - y1);
  const fr = 0.03 * S;
  if (horizontal) {
    const w = x2 - x1;
    return (
      <g>
        <rect x={x1} y={y1} width={w} height={y2 - y1} fill="#e9e5db" />
        <rect x={x1 + fr} y={y1 + 2} width={w - 2 * fr} height={y2 - y1 - 4} fill="#c9c3b6" />
        {[0.22, 0.5, 0.78].map((f) => (
          <line key={f} x1={x1 + fr + (w - 2 * fr) * f} y1={y1 + 2} x2={x1 + fr + (w - 2 * fr) * f} y2={y2 - 2} stroke="#8f8a80" strokeWidth={1} />
        ))}
      </g>
    );
  }
  const h = y2 - y1;
  return (
    <g>
      <rect x={x1} y={y1} width={x2 - x1} height={h} fill="#e9e5db" />
      <rect x={x1 + 2} y={y1 + fr} width={x2 - x1 - 4} height={h - 2 * fr} fill="#c9c3b6" />
      {[0.22, 0.5, 0.78].map((f) => (
        <line key={f} x1={x1 + 2} y1={y1 + fr + (h - 2 * fr) * f} x2={x2 - 2} y2={y1 + fr + (h - 2 * fr) * f} stroke="#8f8a80" strokeWidth={1} />
      ))}
    </g>
  );
}
