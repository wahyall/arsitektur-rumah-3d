"use client";

import type { HouseModel } from "@/lib/house/engine";
import { fmtNum } from "@/lib/house/engine";
import type { StudioView } from "@/lib/house/studio";
import type { PartId } from "@/lib/house/parts";
import { partTogglePatch, partVisible } from "@/lib/house/parts";
import { cn } from "@/lib/utils";
import {
  Cable,
  ChevronRight,
  Eye,
  EyeOff,
  Home,
  Landmark,
  Layers,
  ListTree,
  Mountain,
  MousePointerClick,
  PaintBucket,
  PanelsTopLeft,
  Ruler,
  TreePine,
} from "lucide-react";

interface Props {
  view: StudioView;
  onView: (patch: Partial<StudioView>) => void;
  model: HouseModel;
  selected: string | null;
  onSelect: (part: string | null) => void;
}

type Row = {
  id: string;
  label: string;
  icon?: React.ElementType;
  eyeKey?: keyof StudioView;
  note?: string;
  indent: number;
  part?: PartId; // bagian (parts.ts) yang dipilih saat baris diklik
};

export function Outliner({ view, onView, model, selected, onSelect }: Props) {
  const stage = Math.max(0, Math.round(view.stage));
  const locked = stage > 0;
  const cakar = model.config.pondasi === "cakarayam" && model.structure.cakar;

  const rows: Row[] = [
    { id: "root", label: "Rumah 6 x 6 m", icon: Home, indent: 0 },
    { id: "site", label: "Tanah & petak situs", icon: Mountain, eyeKey: "ground", note: "36 m2", indent: 1 },
    {
      id: "pondasi",
      label: cakar ? "Pondasi cakar ayam" : "Pondasi batu kali strip",
      icon: Landmark,
      note: cakar ? `${model.structure.cakar?.buisCount} buis` : "40 x 60 cm",
      indent: 1,
      part: "pondasi",
    },
    { id: "struktur", label: "Struktur beton (sloof, kolom, ring balk)", icon: Layers, eyeKey: "showStruktur", note: `${model.koloms.length} kolom`, indent: 1, part: "sloof" },
    { id: "dinding", label: "Pasangan dinding bata", icon: PanelsTopLeft, eyeKey: "showDinding", note: `${fmtNum(model.count.totalPieces)} bata`, indent: 1, part: "dinding" },
    {
      id: "bukaan",
      label: "Kusen & bukaan (pintu, jendela, roster)",
      note: `${model.openings.doors}P ${model.openings.windows}J ${model.openings.vents}LA`,
      indent: 1,
    },
    { id: "pintu", label: "Pintu & kusen kayu", note: `${model.openings.doors} unit`, indent: 2, part: "pintu" },
    { id: "jendela", label: "Jendela berkaca", note: `${model.openings.windows} unit`, indent: 2, part: "jendela" },
    { id: "vent", label: "Lubang angin roster", note: `${model.openings.vents} bh`, indent: 2, part: "vent" },
    { id: "atap", label: "Atap", icon: TreePine, indent: 1 },
    { id: "rangka", label: "Rangka baja ringan", eyeKey: "showRangka", note: `${model.roof.kudaKuda} kuda-kuda`, indent: 2, part: "rangka" },
    { id: "genteng", label: "Genteng & nok", eyeKey: "showRoof", note: `${fmtNum(model.roof.gentengPcs)} pcs`, indent: 2, part: "genteng" },
    { id: "plafon", label: "Plafon gypsum", note: `${fmtNum(model.areas.netFloor, 1)} m2`, indent: 2, part: "plafon" },
    { id: "fin", label: "Finishing", icon: PaintBucket, indent: 1 },
    {
      id: "lantai",
      label: `Lantai rabat + keramik ${model.floor.tileCm}x${model.floor.tileCm}`,
      note: `${fmtNum(model.floor.totalPcs)} keping`,
      indent: 2,
      part: "lantai",
    },
    { id: "plester", label: "Plesteran & acian", eyeKey: "showFinishing", note: `${fmtNum(model.areas.plasterArea, 1)} m2`, indent: 2, part: "plester" },
    { id: "cat", label: "Cat eksterior", eyeKey: "showFinishing", note: "primer + 2 lapis", indent: 2, part: "cat" },
    { id: "inst", label: "Instalasi air & listrik", icon: Cable, indent: 1 },
    {
      id: "instAir",
      label: "Jalur pipa air bersih & limbah",
      eyeKey: "showAir",
      note: `${fmtNum(Math.ceil(model.mep.airBersihM + model.mep.airKotorM))} m pipa + septic`,
      indent: 2,
      part: "pipaAirBersih",
    },
    {
      id: "instListrik",
      label: "Jalur listrik (conduit + kabel)",
      eyeKey: "showListrik",
      note: `${fmtNum(Math.ceil(model.mep.conduitM))} m · ${fmtNum(model.mep.titikLampu + model.mep.saklar + model.mep.stopkontak)} titik`,
      indent: 2,
      part: "listrikLampu",
    },
    { id: "anot", label: "Anotasi gambar", icon: Ruler, indent: 1 },
    { id: "label", label: "Label ruangan", eyeKey: "showLabels", indent: 2 },
    { id: "dims", label: "Dimensi ukuran", eyeKey: "dims", indent: 2 },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col border-b">
      <div className="flex h-8 shrink-0 items-center gap-1.5 border-b bg-[#26282b] px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <ListTree className="h-3.5 w-3.5 text-primary" aria-hidden /> Outliner
      </div>
      <div className="min-h-0 overflow-y-auto p-1">
        {rows.map((r) => {
          const Icon = r.icon;
          const eyeKey = r.eyeKey;
          // ikon mata: baris ber-eyeKey memakai flag global; baris ber-part memakai
          // show/hide per-bagian (parts.ts) — plafon, pintu, jendela, roster, lantai, dll.
          const eyeOn = eyeKey
            ? Boolean(view[eyeKey])
            : r.part
              ? partVisible(r.part, view)
              : false;
          const rowSelected = !!r.part && selected === r.part;
          return (
            <div
              key={r.id}
              role={r.part ? "button" : undefined}
              tabIndex={r.part ? 0 : undefined}
              aria-pressed={r.part ? rowSelected : undefined}
              onClick={() => {
                if (!r.part) return;
                onSelect(rowSelected ? null : r.part);
              }}
              onKeyDown={(e) => {
                if (r.part && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelect(rowSelected ? null : r.part);
                }
              }}
              title={r.part ? "Klik untuk melihat detail & harga bagian ini di model 3D" : undefined}
              className={cn(
                "group flex h-7 items-center gap-1 rounded-sm px-1 text-[12px] text-foreground/90",
                r.part ? "cursor-pointer hover:bg-accent/60" : "hover:bg-accent/40",
                rowSelected && "bg-primary/25 font-medium text-primary",
                r.indent === 1 && "pl-3",
                r.indent === 2 && "pl-6",
              )}
            >
              <ChevronRight className={cn("h-3 w-3 shrink-0", rowSelected ? "text-primary" : "text-muted-foreground/50")} aria-hidden />
              {Icon && <Icon className={cn("h-3.5 w-3.5 shrink-0", rowSelected ? "text-primary" : "text-muted-foreground")} aria-hidden />}
              <span className="min-w-0 truncate">{r.label}</span>
              {r.note && <span className="ml-auto hidden shrink-0 text-[10px] tabular-nums text-muted-foreground group-hover:inline">{r.note}</span>}
              {eyeKey && (
                <button
                  type="button"
                  disabled={locked && eyeKey !== "ground"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onView({ [eyeKey]: !view[eyeKey] } as Partial<StudioView>);
                  }}
                  title={locked ? "Dikendalikan mode tahapan" : eyeOn ? "Sembunyikan" : "Tampilkan"}
                  className={cn(
                    "ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-sm transition-colors",
                    locked && eyeKey !== "ground"
                      ? "cursor-not-allowed text-muted-foreground/30"
                      : eyeOn
                        ? "text-primary hover:bg-primary/20"
                        : "text-muted-foreground/60 hover:text-foreground",
                  )}
                >
                  {eyeOn || locked ? <Eye className="h-3.5 w-3.5" aria-hidden /> : <EyeOff className="h-3.5 w-3.5" aria-hidden />}
                </button>
              )}
              {!eyeKey && r.part && (
                <button
                  type="button"
                  disabled={locked}
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(partTogglePatch(r.part as PartId, view));
                  }}
                  title={locked ? "Dikendalikan mode tahapan" : eyeOn ? `Sembunyikan ${r.label}` : `Tampilkan ${r.label}`}
                  aria-label={eyeOn ? `Sembunyikan ${r.label}` : `Tampilkan ${r.label}`}
                  aria-pressed={!eyeOn}
                  className={cn(
                    "ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-sm transition-colors",
                    locked
                      ? "cursor-not-allowed text-muted-foreground/30"
                      : eyeOn
                        ? "text-primary hover:bg-primary/20"
                        : "text-muted-foreground/60 hover:text-foreground",
                  )}
                >
                  {eyeOn || locked ? <Eye className="h-3.5 w-3.5" aria-hidden /> : <EyeOff className="h-3.5 w-3.5" aria-hidden />}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {locked ? (
        <div className="flex items-center gap-2 border-t bg-primary/10 px-2.5 py-1.5 text-[10px] leading-snug text-primary">
          <span className="min-w-0 flex-1">Visibilitas elemen dikendalikan tahapan konstruksi (tahap {stage}).</span>
          <button
            type="button"
            onClick={() => onView({ stage: 0 })}
            className="shrink-0 rounded-sm border border-primary/50 bg-primary/20 px-1.5 py-0.5 font-semibold hover:bg-primary/40"
          >
            Selesai
          </button>
        </div>
      ) : (
        <div className="border-t px-2.5 py-1 text-[10px] leading-snug text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MousePointerClick className="h-3 w-3 shrink-0 text-primary" aria-hidden />
            <span>Klik baris = pilih bagian (detail &amp; harga di viewport) &middot; ikon mata = tampil/sembunyi</span>
          </span>
        </div>
      )}
    </div>
  );
}
