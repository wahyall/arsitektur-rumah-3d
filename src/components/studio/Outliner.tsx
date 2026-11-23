"use client";

import type { HouseModel } from "@/lib/house/engine";
import { fmtNum } from "@/lib/house/engine";
import type { StudioView } from "@/lib/house/studio";
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
  PaintBucket,
  PanelsTopLeft,
  Ruler,
  TreePine,
} from "lucide-react";

interface Props {
  view: StudioView;
  onView: (patch: Partial<StudioView>) => void;
  model: HouseModel;
}

type Row = {
  id: string;
  label: string;
  icon?: React.ElementType;
  eyeKey?: keyof StudioView;
  note?: string;
  indent: number;
};

export function Outliner({ view, onView, model }: Props) {
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
    },
    { id: "struktur", label: "Struktur beton (sloof, kolom, ring balk)", icon: Layers, eyeKey: "showStruktur", note: `${model.koloms.length} kolom`, indent: 1 },
    { id: "dinding", label: "Pasangan dinding bata", icon: PanelsTopLeft, eyeKey: "showDinding", note: `${fmtNum(model.count.totalPieces)} bata`, indent: 1 },
    {
      id: "bukaan",
      label: "Kusen, pintu, jendela & roster",
      note: `${model.openings.doors}P ${model.openings.windows}J ${model.openings.vents}LA`,
      indent: 1,
    },
    { id: "atap", label: "Atap", icon: TreePine, indent: 1 },
    { id: "rangka", label: "Rangka baja ringan", eyeKey: "showRangka", note: `${model.roof.kudaKuda} kuda-kuda`, indent: 2 },
    { id: "genteng", label: "Genteng & nok", eyeKey: "showRoof", note: `${fmtNum(model.roof.gentengPcs)} pcs`, indent: 2 },
    { id: "plafon", label: "Plafon gypsum", indent: 2 },
    { id: "fin", label: "Finishing", icon: PaintBucket, indent: 1 },
    { id: "plester", label: "Plesteran & acian", eyeKey: "showFinishing", note: `${fmtNum(model.areas.plasterArea, 1)} m2`, indent: 2 },
    { id: "cat", label: "Cat eksterior", eyeKey: "showFinishing", note: "primer + 2 lapis", indent: 2 },
    { id: "inst", label: "Instalasi air & listrik", icon: Cable, indent: 1 },
    {
      id: "instAir",
      label: "Jalur pipa air bersih & limbah",
      eyeKey: "showAir",
      note: `${fmtNum(Math.ceil(model.mep.airBersihM + model.mep.airKotorM))} m pipa + septic`,
      indent: 2,
    },
    {
      id: "instListrik",
      label: "Jalur listrik (conduit + kabel)",
      eyeKey: "showListrik",
      note: `${fmtNum(Math.ceil(model.mep.conduitM))} m · ${fmtNum(model.mep.titikLampu + model.mep.saklar + model.mep.stopkontak)} titik`,
      indent: 2,
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
          const eyeOn = eyeKey ? Boolean(view[eyeKey]) : false;
          return (
            <div
              key={r.id}
              className={cn(
                "group flex h-7 items-center gap-1 rounded-sm px-1 text-[12px] text-foreground/90 hover:bg-accent/60",
                r.indent === 1 && "pl-3",
                r.indent === 2 && "pl-6",
              )}
            >
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" aria-hidden />
              {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />}
              <span className="min-w-0 truncate">{r.label}</span>
              {r.note && <span className="ml-auto hidden shrink-0 text-[10px] tabular-nums text-muted-foreground group-hover:inline">{r.note}</span>}
              {eyeKey && (
                <button
                  type="button"
                  disabled={locked && eyeKey !== "ground"}
                  onClick={() => onView({ [eyeKey]: !view[eyeKey] } as Partial<StudioView>)}
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
          Klik ikon mata untuk menampilkan / menyembunyikan lapisan bangunan.
        </div>
      )}
    </div>
  );
}
