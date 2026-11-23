"use client";

import type { HouseModel, RabSummary } from "@/lib/house/engine";
import { fmtNum, fmtRp } from "@/lib/house/engine";
import { BookOpen, Box, DraftingCompass, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export type Workspace = "model" | "drawing" | "rab" | "guide";

const TABS: { id: Workspace; label: string; icon: React.ElementType }[] = [
  { id: "model", label: "Model 3D", icon: Box },
  { id: "drawing", label: "Gambar Kerja", icon: DraftingCompass },
  { id: "rab", label: "Anggaran (RAB)", icon: Wallet },
  { id: "guide", label: "Panduan", icon: BookOpen },
];

interface Props {
  workspace: Workspace;
  onWorkspace: (w: Workspace) => void;
  model: HouseModel;
  rab: RabSummary;
}

export function TopBar({ workspace, onWorkspace, model, rab }: Props) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-[#1b1d20] px-3">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">
          <DraftingCompass className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 leading-none">
          <div className="text-[13px] font-bold tracking-tight text-foreground">Studio Rumah 6&times;6 m</div>
          <div className="mt-0.5 hidden text-[10px] text-muted-foreground sm:block">
            Prototype 3D &middot; gambar kerja &middot; RAB &mdash; acuan arsitektur Indonesia
          </div>
        </div>
      </div>

      <nav className="mx-1 flex min-w-0 flex-1 items-end gap-0.5 overflow-x-auto pl-2" aria-label="Ruang kerja">
        {TABS.map((t) => {
          const active = workspace === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onWorkspace(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-t-sm border-b-2 px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                active
                  ? "border-primary bg-background/60 text-primary"
                  : "border-transparent text-muted-foreground hover:bg-background/40 hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.id === "model" ? "3D" : t.id === "drawing" ? "Gambar" : t.id === "rab" ? "RAB" : "Buku"}</span>
            </button>
          );
        })}
      </nav>

      <div className="hidden items-center gap-1.5 lg:flex">
        <Chip label="RAB" value={fmtRp(rab.total)} />
        <Chip label="Luas bersih" value={`${fmtNum(model.areas.netFloor, 1)} m2`} />
        <Chip label="Bata" value={`${fmtNum(model.count.totalBuy)} bh`} />
      </div>
    </header>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border bg-card px-2 py-1 text-right leading-none">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-[11px] font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}
