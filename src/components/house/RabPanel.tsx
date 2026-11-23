"use client";

import type { RabSummary } from "@/lib/house/engine";
import { fmtNum, fmtRp } from "@/lib/house/engine";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { RotateCcw, Wallet } from "lucide-react";

interface Props {
  rab: RabSummary;
  onPriceChange: (key: string, val: number) => void;
  onResetPrices: () => void;
  onUpahChange: (pct: number) => void;
}

export function RabPanel({ rab, onPriceChange, onResetPrices, onUpahChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-3xl text-sm text-stone-600">
          RAB disusun per divisi pekerjaan (format standar Indonesia). Semua harga satuan bisa langsung diubah pada kolom{" "}
          <span className="font-medium">Harga satuan</span> — kuantitas bata, adukan, struktur, dan atap dihitung ulang
          otomatis dari model 3D.
        </p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onResetPrices}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset harga awal
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-stone-200">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-stone-100 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2 font-medium">Uraian pekerjaan / material</th>
              <th className="px-3 py-2 font-medium">Qty</th>
              <th className="px-3 py-2 font-medium">Harga satuan (Rp)</th>
              <th className="px-3 py-2 text-right font-medium">Jumlah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rab.divisions.map((d) => (
              <DivisionBlock key={d.id} divisi={d} onPriceChange={onPriceChange} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-800">
            <Wallet className="h-4 w-4 text-amber-700" aria-hidden /> Upah tukang (borongan)
          </div>
          <Slider value={[rab.upahPct]} min={0} max={50} step={1} onValueChange={(v) => onUpahChange(v[0])} />
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-stone-500">{rab.upahPct}% dari material</span>
            <span className="font-semibold tabular-nums text-stone-800">{fmtRp(rab.upah)}</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            Borongan pasang di Indonesia umumnya 20-30% dari nilai material, tergantung daerah dan tingkat kesulitan.
          </p>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50/60 p-4">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal material</span>
              <span className="tabular-nums font-medium">{fmtRp(rab.materialTotal)}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Upah tukang</span>
              <span className="tabular-nums font-medium">{fmtRp(rab.upah)}</span>
            </div>
            <Separator className="my-2 bg-amber-200" />
            <div className="flex justify-between text-base font-bold text-stone-900">
              <span>Total estimasi RAB</span>
              <span className="tabular-nums">{fmtRp(rab.total)}</span>
            </div>
            <div className="flex justify-between text-xs text-stone-500">
              <span>Per m2 tanah (36 m2)</span>
              <span className="tabular-nums">{fmtRp(rab.perM2Gross)}</span>
            </div>
            <div className="flex justify-between text-xs text-stone-500">
              <span>Per m2 luas bersih</span>
              <span className="tabular-nums">{fmtRp(rab.perM2Net)}</span>
            </div>
            <p className="pt-1 text-[11px] leading-relaxed text-stone-500">
              Patokan umum biaya bangun rumah sederhana 2025: Rp2,0-3,5 juta per m2. Simpan cadangan 5-10% dari total untuk kenaikan harga.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DivisionBlock({
  divisi,
  onPriceChange,
}: {
  divisi: RabSummary["divisions"][number];
  onPriceChange: (key: string, val: number) => void;
}) {
  return (
    <>
      <tr className="bg-stone-200/70">
        <td colSpan={4} className="px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-5 min-w-5 items-center justify-center rounded-sm bg-stone-700 px-1 text-[10px] font-bold text-white">
                {divisi.kode}
              </span>
              <span className="text-xs font-bold uppercase tracking-wide text-stone-700">{divisi.nama}</span>
            </div>
            <span className="text-xs font-semibold tabular-nums text-stone-600">Subtotal: {fmtRp(divisi.subtotal)}</span>
          </div>
        </td>
      </tr>
      {divisi.rows.map((r) => (
        <tr key={r.id + r.priceKey} className="bg-white align-top">
          <td className="px-3 py-2.5">
            <div className="font-medium text-stone-800">{r.uraian}</div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xs text-stone-500">{r.spek}</span>
              {r.exact ? (
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 px-1.5 text-[10px] font-medium text-emerald-700">
                  dari model 3D
                </Badge>
              ) : (
                <Badge variant="outline" className="border-stone-200 bg-stone-50 px-1.5 text-[10px] font-medium text-stone-500">
                  estimasi
                </Badge>
              )}
            </div>
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap text-stone-600">
            {fmtNum(r.qty, r.qty % 1 === 0 ? 0 : 2)} <span className="text-xs text-stone-400">{r.unit}</span>
          </td>
          <td className="px-3 py-1.5">
            <Input
              type="number"
              min={0}
              step={100}
              className="h-8 w-36 text-right tabular-nums"
              value={r.harga}
              aria-label={`Harga satuan ${r.uraian}`}
              onChange={(e) => onPriceChange(r.priceKey, Math.max(0, Number(e.target.value)))}
            />
          </td>
          <td className="px-3 py-2.5 text-right font-medium tabular-nums text-stone-800">{fmtRp(r.subtotal)}</td>
        </tr>
      ))}
    </>
  );
}
