"use client";

import type { HouseModel, RabSummary } from "@/lib/house/engine";
import { fmtNum, fmtRp } from "@/lib/house/engine";
import type { Workspace } from "@/components/studio/TopBar";
import { MousePointer2 } from "lucide-react";

interface Props {
  workspace: Workspace;
  model: HouseModel;
  rab: RabSummary;
}

const HINTS: Record<Workspace, string> = {
  model: "Geser: putar orbit \u00b7 roda / cubit: zoom \u00b7 Shift + geser: geser pandangan \u00b7 kubus kanan-atas: pandangan cepat",
  drawing: "Lembar gambar mengikuti model 3D & parameter panel properti \u2014 skala 1 : 100 pada layar",
  rab: "Harga satuan dapat diubah langsung pada tabel \u2014 kuantitas dihitung ulang otomatis dari model 3D",
  guide: "Rujukan praktik rumah sederhana Indonesia \u00b7 standar SNI \u00b7 PUIL \u00b7 AHSP",
};

/** Status bar bawah ala Blender: petunjuk interaksi kiri + statistik model kanan. */
export function StatusBar({ workspace, model, rab }: Props) {
  const mortar =
    model.config.jenis === "hebel"
      ? `perekat ${fmtNum(Math.ceil(model.mortar.perekatZak))} zak`
      : `adukan ${fmtNum(model.mortar.volM3, 2)} m3`;

  return (
    <footer className="flex h-7 shrink-0 items-center gap-2 border-t bg-[#1b1d20] px-3 text-[10px] text-muted-foreground">
      <div className="flex min-w-0 items-center gap-1.5">
        <MousePointer2 className="h-3 w-3 shrink-0 text-muted-foreground/70" aria-hidden />
        <span className="truncate">{HINTS[workspace]}</span>
      </div>
      <div className="ml-auto hidden shrink-0 items-center gap-3 tabular-nums lg:flex">
        <span>bata <b className="text-foreground/90">{fmtNum(model.count.totalBuy)}</b> bh</span>
        <span>{mortar}</span>
        <span>luas bersih <b className="text-foreground/90">{fmtNum(model.areas.netFloor, 1)}</b> m2</span>
        <span>
          RAB <b className="text-primary">{fmtRp(rab.total)}</b>
        </span>
      </div>
    </footer>
  );
}
