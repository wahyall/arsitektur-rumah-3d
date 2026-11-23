"use client";

/**
 * Panel detail bagian bangunan (muncul saat bagian diklik di viewport 3D atau
 * baris Outliner dipilih): info teknis + kuantitas dari model, daftar item RAB
 * dengan INPUT HARGA SATUAN yang langsung mengubah total RAB, dan tombol
 * tampilkan/sembunyikan untuk bagian tersebut.
 */
import type { HouseModel, RabRow, RabSummary } from "@/lib/house/engine";
import { fmtNum, fmtRp } from "@/lib/house/engine";
import type { StudioView } from "@/lib/house/studio";
import { getPartInfo, partTogglePatch, partVisible, type PartId } from "@/lib/house/parts";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BrickWall,
  Cable,
  CircleDot,
  Droplets,
  Eye,
  EyeOff,
  Gauge,
  Hammer,
  Layers,
  Lightbulb,
  PaintBucket,
  PanelsTopLeft,
  Plug,
  Ruler,
  TreePine,
  DoorOpen,
  Wallet,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Props {
  partId: PartId;
  model: HouseModel;
  rab: RabSummary;
  view: StudioView;
  onView: (patch: Partial<StudioView>) => void;
  onPriceChange: (key: string, val: number) => void;
  onClose: () => void;
}

/** Ikon per id bagian (untuk header panel). */
const PART_ICONS: Partial<Record<PartId, LucideIcon>> = {
  pondasi: Layers,
  sloof: Layers,
  kolom: Layers,
  ringbalk: Layers,
  dinding: BrickWall,
  pintu: DoorOpen,
  jendela: DoorOpen,
  vent: CircleDot,
  lantai: PanelsTopLeft,
  rangka: TreePine,
  lisplank: TreePine,
  genteng: TreePine,
  plafon: PanelsTopLeft,
  plester: PaintBucket,
  cat: PaintBucket,
  pipaAirBersih: Droplets,
  pipaAirKotor: Droplets,
  septic: Droplets,
  meterAir: Gauge,
  kran: Droplets,
  shower: Droplets,
  kloset: Droplets,
  drain: Droplets,
  listrikLampu: Zap,
  listrikKontak: Zap,
  titikLampu: Lightbulb,
  saklar: Plug,
  stopkontak: Plug,
  panelMcb: Plug,
};

export function PartInfoPanel({ partId, model, rab, view, onView, onPriceChange, onClose }: Props) {
  const info = getPartInfo(partId, model);
  if (!info) return null;

  const rows: RabRow[] = info.rowIds
    .map((rid) => rab.rows.find((r) => r.id === rid))
    .filter((r): r is RabRow => !!r);
  const partSubtotal = rows.reduce((s, r) => s + r.subtotal, 0);
  const upahShare = Math.round((partSubtotal * rab.upahPct) / 100);
  const partTotal = partSubtotal + upahShare;
  const pctOfRab = rab.materialTotal > 0 ? (partSubtotal / rab.materialTotal) * 100 : 0;

  const visible = partVisible(partId, view);
  const locked = view.stage > 0;
  const Icon = PART_ICONS[partId] ?? Hammer;

  return (
    <div
      role="dialog"
      aria-label={`Detail bagian: ${info.label}`}
      className="pointer-events-auto absolute bottom-2 right-2 z-20 flex max-h-[82%] w-[336px] max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-md border border-white/10 bg-[#1b1d20]/95 shadow-2xl backdrop-blur-md"
    >
      {/* header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#26282b] px-2.5 py-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-primary/20 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold leading-tight text-stone-100">{info.label}</div>
          <div className="text-[10px] uppercase tracking-wide text-stone-400">{info.group}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Tutup panel (Esc)"
          aria-label="Tutup panel"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-stone-400 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      {/* body */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        <p className="text-[11px] leading-relaxed text-stone-300">{info.ringkas}</p>

        {/* spesifikasi & kuantitas */}
        <ul className="mt-2 space-y-1">
          {info.specs.map((s, i) => (
            <li key={i} className="flex gap-1.5 text-[11px] leading-snug text-stone-300">
              <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-primary/70" aria-hidden />
              <span className="min-w-0 flex-1">{s}</span>
            </li>
          ))}
        </ul>

        {info.praktik && (
          <div className="mt-2 flex gap-1.5 rounded-sm border border-amber-400/20 bg-amber-400/10 px-2 py-1.5 text-[10px] leading-snug text-amber-200/90">
            <Wrench className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" aria-hidden />
            <span className="min-w-0 flex-1">{info.praktik}</span>
          </div>
        )}

        {/* biaya RAB bagian ini */}
        <div className="mt-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
            <Wallet className="h-3 w-3 text-primary" aria-hidden /> Biaya bagian ini (RAB)
          </div>

          {rows.length === 0 ? (
            <p className="mt-1.5 rounded-sm border border-border bg-muted/30 px-2 py-1.5 text-[10px] leading-snug text-muted-foreground">
              {info.noteMissing ?? "Tidak ada item RAB terkait pada konfigurasi ini."}
            </p>
          ) : (
            <div className="mt-1.5 space-y-1.5">
              {rows.map((r) => (
                <div key={r.id + r.priceKey} className="rounded-sm border border-white/10 bg-black/25 p-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-medium text-stone-200">{r.uraian}</div>
                      <div className="mt-0.5 text-[10px] text-stone-400">
                        <span className="tabular-nums">{fmtNum(r.qty, r.qty % 1 === 0 ? 0 : 2)}</span>{" "}
                        <span>{r.unit}</span>
                        {r.exact && <span className="ml-1 text-emerald-400/70">· dari model 3D</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-[11px] font-semibold tabular-nums text-stone-100">
                      {fmtRp(r.subtotal)}
                    </div>
                  </div>
                  <label className="mt-1.5 flex items-center gap-1.5">
                    <span className="shrink-0 text-[10px] text-stone-400">Harga satuan (Rp)</span>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      className="h-6 flex-1 border-white/10 bg-black/30 text-right text-[11px] tabular-nums"
                      value={r.harga}
                      aria-label={`Harga satuan ${r.uraian}`}
                      onChange={(e) => onPriceChange(r.priceKey, Math.max(0, Number(e.target.value) || 0))}
                    />
                  </label>
                </div>
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <div className="mt-2 space-y-0.5 rounded-sm border border-primary/25 bg-primary/10 px-2 py-1.5 text-[11px]">
              <div className="flex justify-between text-stone-300">
                <span>Subtotal material</span>
                <span className="font-semibold tabular-nums">{fmtRp(partSubtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>+ upah {rab.upahPct}%</span>
                <span className="tabular-nums">{fmtRp(upahShare)}</span>
              </div>
              <div className="flex justify-between border-t border-primary/20 pt-1 font-bold text-stone-100">
                <span>Estimasi bagian ini</span>
                <span className="tabular-nums">{fmtRp(partTotal)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-stone-500">
                <span>porsi dari total RAB</span>
                <span className="tabular-nums">{fmtNum(pctOfRab, 1)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* footer: show/hide bagian ini */}
      <div className="shrink-0 border-t border-white/10 bg-[#26282b] p-2">
        <button
          type="button"
          disabled={locked}
          onClick={() => onView(partTogglePatch(partId, view))}
          title={locked ? "Visibilitas dikendalikan mode tahapan konstruksi" : visible ? "Sembunyikan bagian ini dari viewport" : "Tampilkan kembali bagian ini"}
          className={cn(
            "flex h-8 w-full items-center justify-center gap-1.5 rounded-sm border text-[11px] font-semibold transition",
            locked
              ? "cursor-not-allowed border-white/5 text-stone-600"
              : visible
                ? "border-white/15 bg-white/5 text-stone-200 hover:border-primary/50 hover:bg-primary/20 hover:text-primary"
                : "border-primary/40 bg-primary/15 text-primary hover:bg-primary/30",
          )}
        >
          {visible ? <Eye className="h-3.5 w-3.5" aria-hidden /> : <EyeOff className="h-3.5 w-3.5" aria-hidden />}
          {locked
            ? "Terkunci mode tahapan"
            : visible
              ? "Sembunyikan bagian ini"
              : "Tampilkan kembali bagian ini"}
        </button>
        <div className="mt-1 flex items-center justify-between text-[9.5px] text-stone-500">
          <span className="inline-flex items-center gap-1">
            <Ruler className="h-3 w-3" aria-hidden /> Klik bagian lain di model untuk berganti
          </span>
          <span>Esc = tutup</span>
        </div>
      </div>
    </div>
  );
}
