"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_CONFIG,
  DEFAULT_CONFIG_MERAH,
  DEFAULT_PRICES,
  buildModel,
  buildRab,
  fmtNum,
  fmtRp,
  type HouseConfig,
  type PriceBook,
} from "@/lib/house/engine";
import { DEFAULT_VIEW, type StudioView } from "@/lib/house/studio";
import { TopBar, type Workspace } from "@/components/studio/TopBar";
import { Viewport } from "@/components/studio/Viewport";
import { Outliner } from "@/components/studio/Outliner";
import { PropertiesPanel } from "@/components/studio/PropertiesPanel";
import { StageTimeline } from "@/components/studio/StageTimeline";
import { StatusBar } from "@/components/studio/StatusBar";
import { DrawingWorkspace } from "@/components/studio/DrawingWorkspace";
import { RabPanel } from "@/components/house/RabPanel";
import { ArchitectureGuide } from "@/components/house/ArchitectureGuide";
import { BrickWall, Layers, Ruler, Wallet } from "lucide-react";

export default function Home() {
  const [workspace, setWorkspace] = useState<Workspace>("model");
  const [config, setConfig] = useState<HouseConfig>(DEFAULT_CONFIG);
  const [prices, setPrices] = useState<PriceBook>(DEFAULT_PRICES);
  const [upahPct, setUpahPct] = useState(25);
  const [view, setView] = useState<StudioView>(DEFAULT_VIEW);
  const [dockOpen, setDockOpen] = useState(true);

  const model = useMemo(() => buildModel(config), [config]);
  const rab = useMemo(() => buildRab(model, prices, upahPct), [model, prices, upahPct]);

  const patchConfig = (patch: Partial<HouseConfig>) => setConfig((c) => ({ ...c, ...patch }));
  const patchView = (patch: Partial<StudioView>) => setView((v) => ({ ...v, ...patch }));

  const gantiJenis = (jenis: "hebel" | "merah") => {
    if (jenis === "hebel") {
      setConfig((c) => ({ ...DEFAULT_CONFIG, preset: c.preset, tinggi: c.tinggi, pondasi: c.pondasi, atapDeg: c.atapDeg, overhang: c.overhang }));
    } else {
      setConfig((c) => ({ ...DEFAULT_CONFIG_MERAH, preset: c.preset, tinggi: c.tinggi, pondasi: c.pondasi, atapDeg: c.atapDeg, overhang: c.overhang }));
    }
  };

  // potongan horizontal: nilai >= maxCut berarti tidak dipotong
  const maxCut = model.roof.yRidge + 0.4;
  const cutHClamped = Math.min(view.cutH, maxCut);
  const cutActive = cutHClamped < maxCut - 0.001;
  const sceneView: StudioView = { ...view, cutH: cutActive ? cutHClamped : 1000 };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <TopBar workspace={workspace} onWorkspace={setWorkspace} model={model} rab={rab} />

      <div className="flex min-h-0 flex-1 flex-col">
        {workspace === "model" && (
          <>
            <div className="flex min-h-0 flex-1">
              <Viewport model={model} view={sceneView} onView={patchView} onToggleDock={() => setDockOpen((o) => !o)} />
              {dockOpen && (
                <aside className="hidden min-h-0 w-[300px] shrink-0 flex-col overflow-hidden border-l bg-card/40 md:flex xl:w-[320px]">
                  <div className="flex min-h-0 flex-[5] flex-col overflow-hidden">
                    <Outliner view={view} onView={patchView} model={model} />
                  </div>
                  <div className="flex min-h-0 flex-[7] flex-col overflow-hidden">
                    <PropertiesPanel config={config} onConfig={patchConfig} onGantiJenis={gantiJenis} view={view} onView={patchView} model={model} />
                  </div>
                </aside>
              )}
            </div>
            <StageTimeline view={view} onView={patchView} />
          </>
        )}

        {workspace === "drawing" && <DrawingWorkspace model={model} />}

        {workspace === "rab" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-6xl space-y-4 p-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatChip
                  icon={<BrickWall className="h-4 w-4 text-primary" aria-hidden />}
                  title="Kebutuhan bata"
                  value={`${fmtNum(model.count.totalBuy)} buah`}
                  desc={`Terpasang di model ${fmtNum(model.count.totalPieces)} (luar ${fmtNum(model.count.buyOuter)} + sekat ${fmtNum(model.count.buyInner)}, termasuk potongan + waste ${config.wastePct}%)`}
                />
                {config.jenis === "hebel" ? (
                  <StatChip
                    icon={<Layers className="h-4 w-4 text-primary" aria-hidden />}
                    title="Perekat hebel"
                    value={`${fmtNum(Math.ceil(model.mortar.perekatZak))} zak 40 kg`}
                    desc={`${fmtNum(model.mortar.perekatKg)} kg (4 kg/m2 dinding, nat ${config.natMm} mm) | luas muka dinding ${fmtNum(model.areas.wallFace, 1)} m2`}
                  />
                ) : (
                  <StatChip
                    icon={<Layers className="h-4 w-4 text-primary" aria-hidden />}
                    title="Adukan semen-pasir (1:5)"
                    value={`${fmtNum(model.mortar.volM3, 2)} m3`}
                    desc={`${fmtNum(Math.ceil(model.mortar.semenZak))} zak semen 50 kg + ${fmtNum(model.mortar.pasirM3, 1)} m3 pasir (nat ${config.natMm} mm, waste ${config.wastePct}%)`}
                  />
                )}
                <StatChip
                  icon={<Ruler className="h-4 w-4 text-primary" aria-hidden />}
                  title="Luas bersih"
                  value={`${fmtNum(model.areas.netFloor, 2)} m2`}
                  desc={`Dari tanah 36,00 m2; tebal dinding memakai ${fmtNum(model.areas.reduksiM2, 2)} m2 (${fmtNum(model.areas.reduksiPct, 1)}%)`}
                />
                <StatChip
                  icon={<Wallet className="h-4 w-4 text-primary" aria-hidden />}
                  title="Estimasi total RAB"
                  value={fmtRp(rab.total)}
                  desc={`${fmtRp(rab.perM2Net)} per m2 luas bersih | ${model.openings.doors} pintu, ${model.openings.windows} jendela, ${model.openings.vents} lubang angin, ${model.roof.kudaKuda} kuda-kuda`}
                />
              </div>
              <RabPanel
                rab={rab}
                onPriceChange={(key, val) => setPrices((p) => ({ ...p, [key]: val }))}
                onResetPrices={() => setPrices(DEFAULT_PRICES)}
                onUpahChange={setUpahPct}
              />
            </div>
          </div>
        )}

        {workspace === "guide" && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-6xl p-4">
              <ArchitectureGuide model={model} />
            </div>
          </div>
        )}
      </div>

      <StatusBar workspace={workspace} model={model} rab={rab} />
    </div>
  );
}

function StatChip({ icon, title, value, desc }: { icon: React.ReactNode; title: string; value: string; desc: string }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{desc}</div>
    </div>
  );
}
