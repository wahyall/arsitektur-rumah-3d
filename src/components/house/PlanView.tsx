"use client";

import type { HouseModel } from "@/lib/house/engine";
import { fmtNum } from "@/lib/house/engine";
import { Progress } from "@/components/ui/progress";
import { Ruler } from "lucide-react";

const S = 100; // px per meter
const M = 60; // margin

function px(v: number) {
  return v * S + M;
}

export function PlanView({ model }: { model: HouseModel }) {
  const tL = model.config.tLuar / 1000;

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
      <div className="mx-auto overflow-x-auto">
        <svg viewBox={`0 0 ${6 * S + 2 * M} ${6 * S + 2 * M}`} className="h-auto w-full max-w-[560px]" role="img" aria-label="Denah rumah 6 x 6 meter">
          {/* bidang tanah */}
          <rect x={px(0)} y={px(0)} width={6 * S} height={6 * S} fill="#f2f1ea" stroke="#b9b5aa" strokeDasharray="6 4" strokeWidth={1.5} />

          {/* dinding: band penuh (luar & sekat) */}
          {model.walls.map((w) => {
            const rect =
              w.axis === "h"
                ? { x: px(w.lo), y: px(w.c - w.t / 2), w: (w.hi - w.lo) * S, h: w.t * S }
                : { x: px(w.c - w.t / 2), y: px(w.lo), w: w.t * S, h: (w.hi - w.lo) * S };
            return <rect key={w.id} x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill={w.outer ? "#4e4a44" : "#837d75"} />;
          })}

          {/* bukaan: pintu (daun + ayun) dan jendela (garis kaca) */}
          {model.walls.flatMap((w) =>
            w.openings.map((o, idx) => {
              const key = `${w.id}-${idx}`;
              const kusen = 0.07;
              if (o.kind === "jendela") {
                if (w.axis === "h") {
                  const y1 = px(w.c - w.t / 2);
                  const y2 = px(w.c + w.t / 2);
                  return (
                    <g key={key}>
                      <rect x={px(o.from)} y={y1} width={(o.to - o.from) * S} height={y2 - y1} fill="#f2f1ea" />
                      <rect x={px(o.from + kusen)} y={y1 + 3} width={(o.to - o.from - 2 * kusen) * S} height={y2 - y1 - 6} fill="#dfe4e0" stroke="#9aa3a0" strokeWidth={0.8} />
                      <line x1={px(o.from + kusen)} y1={(y1 + y2) / 2} x2={px(o.to - kusen)} y2={(y1 + y2) / 2} stroke="#9aa3a0" strokeWidth={0.8} />
                    </g>
                  );
                }
                const x1 = px(w.c - w.t / 2);
                const x2 = px(w.c + w.t / 2);
                return (
                  <g key={key}>
                    <rect x={x1} y={px(o.from)} width={x2 - x1} height={(o.to - o.from) * S} fill="#f2f1ea" />
                    <rect x={x1 + 3} y={px(o.from + kusen)} width={x2 - x1 - 6} height={(o.to - o.from - 2 * kusen) * S} fill="#dfe4e0" stroke="#9aa3a0" strokeWidth={0.8} />
                    <line x1={(x1 + x2) / 2} y1={px(o.from + kusen)} x2={(x1 + x2) / 2} y2={px(o.to - kusen)} stroke="#9aa3a0" strokeWidth={0.8} />
                  </g>
                );
              }
              // pintu: buka ke dalam ruangan (arah -x utk dinding vertikal, -y utk horizontal)
              if (w.axis === "h") {
                const hx = px(o.from);
                const hy = px(w.c);
                const r = (o.to - o.from) * S;
                const openY = hy + r;
                return (
                  <g key={key}>
                    <rect x={px(o.from)} y={px(w.c - w.t / 2)} width={r} height={w.t * S} fill="#f2f1ea" />
                    <path d={`M ${hx} ${hy} L ${hx} ${openY} A ${r} ${r} 0 0 0 ${hx + r} ${hy}`} fill="none" stroke="#a8a29a" strokeWidth={1} strokeDasharray="4 3" />
                    <line x1={hx} y1={hy} x2={hx} y2={openY} stroke="#7c5230" strokeWidth={3} />
                  </g>
                );
              }
              const hx = px(w.c);
              const hy = px(o.from);
              const r = (o.to - o.from) * S;
              const openX = hx - r;
              return (
                <g key={key}>
                  <rect x={px(w.c - w.t / 2)} y={px(o.from)} width={w.t * S} height={r} fill="#f2f1ea" />
                  <path d={`M ${hx} ${hy} L ${openX} ${hy} A ${r} ${r} 0 0 1 ${hx} ${hy + r}`} fill="none" stroke="#a8a29a" strokeWidth={1} strokeDasharray="4 3" />
                  <line x1={hx} y1={hy} x2={openX} y2={hy} stroke="#7c5230" strokeWidth={3} />
                </g>
              );
            }),
          )}

          {/* label ruangan: ukuran bersih setelah dikurangi dinding */}
          {model.areas.rooms.map((r) => (
            <text key={r.id} x={px(r.cx)} y={px(r.cy)} textAnchor="middle" fill="#3f3c38" fontSize={13} fontWeight={600}>
              {r.name}
              <tspan x={px(r.cx)} dy={17} fontSize={11} fontWeight={400} fill="#6b645c">
                {fmtNum(r.w, 2)} x {fmtNum(r.d, 2)} m (bersih)
              </tspan>
              <tspan x={px(r.cx)} dy={15} fontSize={11} fontWeight={500} fill="#8a5a2b">
                {fmtNum(r.area, 1)} m2
              </tspan>
            </text>
          ))}

          {/* dimensi luar */}
          <g stroke="#6b7280" strokeWidth={1} fill="#6b7280" fontSize={11}>
            <line x1={px(0)} y1={M / 2} x2={px(6)} y2={M / 2} />
            <line x1={px(0)} y1={M / 2 - 5} x2={px(0)} y2={M / 2 + 5} />
            <line x1={px(6)} y1={M / 2 - 5} x2={px(6)} y2={M / 2 + 5} />
            <text x={px(3)} y={M / 2 - 6} textAnchor="middle" stroke="none">
              6,00 m
            </text>
            <line x1={M / 2} y1={px(0)} x2={M / 2} y2={px(6)} />
            <line x1={M / 2 - 5} y1={px(0)} x2={M / 2 + 5} y2={px(0)} />
            <line x1={M / 2 - 5} y1={px(6)} x2={M / 2 + 5} y2={px(6)} />
            <text x={M / 2 - 8} y={px(3)} textAnchor="middle" transform={`rotate(-90 ${M / 2 - 8} ${px(3)})`} stroke="none">
              6,00 m
            </text>
          </g>

          {/* dimensi dalam (muka dinding luar) */}
          <g stroke="#b08968" strokeWidth={1} fill="#b08968" fontSize={10}>
            <line x1={px(tL)} y1={px(6) + 18} x2={px(6 - tL)} y2={px(6) + 18} strokeDasharray="3 3" />
            <text x={px(3)} y={px(6) + 30} textAnchor="middle" stroke="none">
              {fmtNum(6 - 2 * tL, 2)} m bersih arah ini
            </text>
          </g>
        </svg>
      </div>

      <div className="space-y-4">
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-800">
            <Ruler className="h-4 w-4 text-amber-700" aria-hidden /> Luas bersih vs luas tanah
          </div>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-xs text-stone-600">
                <span>Luas bersih (dapat dipakai)</span>
                <span className="font-semibold">{fmtNum(model.areas.netFloor, 2)} m2</span>
              </div>
              <Progress value={(model.areas.netFloor / 36) * 100} className="h-2 [&>div]:bg-amber-600" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-stone-600">
                <span>Terpakai oleh tebal dinding (luar + sekat)</span>
                <span className="font-semibold">{fmtNum(model.areas.reduksiM2, 2)} m2</span>
              </div>
              <Progress value={model.areas.reduksiPct} className="h-2 [&>div]:bg-stone-500" />
            </div>
            <p className="text-xs leading-relaxed text-stone-500">
              Tanah 6 x 6 m = 36,00 m2. Dengan dinding luar {fmtNum(model.config.tLuar)} mm dan sekat {fmtNum(model.config.tDalam)} mm, luas yang benar-benar bisa
              dipakai tinggal {fmtNum(model.areas.netFloor, 2)} m2 ({fmtNum(100 - model.areas.reduksiPct, 1)}% dari tanah). Ubah tebal dinding atau jenis bata di
              panel kiri untuk melihat pengaruhnya.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-md border border-stone-200">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-2 font-medium">Ruangan</th>
                <th className="px-3 py-2 font-medium">Ukuran bersih</th>
                <th className="px-3 py-2 text-right font-medium">Luas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {model.areas.rooms.map((r) => (
                <tr key={r.id} className="bg-white">
                  <td className="px-3 py-2 text-stone-700">{r.name}</td>
                  <td className="px-3 py-2 text-stone-500">
                    {fmtNum(r.w, 2)} x {fmtNum(r.d, 2)} m
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-stone-700">{fmtNum(r.area, 2)} m2</td>
                </tr>
              ))}
              <tr className="bg-stone-50">
                <td className="px-3 py-2 font-semibold text-stone-800" colSpan={2}>
                  Total luas bersih (neto)
                </td>
                <td className="px-3 py-2 text-right font-semibold text-stone-900">{fmtNum(model.areas.netFloor, 2)} m2</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
