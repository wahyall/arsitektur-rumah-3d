"use client";

import { useEffect, useRef, useState } from "react";
import type { HouseModel } from "@/lib/house/engine";
import { fmtNum } from "@/lib/house/engine";
import { HouseScene } from "@/lib/house/scene";
import { CONSTRUCTION_STAGES } from "@/lib/house/knowledge";
import type { StudioView } from "@/lib/house/studio";
import { cn } from "@/lib/utils";
import {
  BrickWall,
  Camera,
  Grid3x3,
  Home,
  Mountain,
  PanelRight,
  Ruler,
  Tag,
  Globe,
  RotateCcw,
  View,
} from "lucide-react";

interface Props {
  model: HouseModel;
  view: StudioView;
  onView: (patch: Partial<StudioView>) => void;
  onToggleDock: () => void;
}

type Preset = "3d" | "depan" | "belakang" | "samping" | "atas";

export function Viewport({ model, view, onView, onToggleDock }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<HouseScene | null>(null);
  const [preset, setPreset] = useState<Preset>("3d");

  const stage = Math.max(0, Math.round(view.stage));
  const stageInfo = stage > 0 ? CONSTRUCTION_STAGES[stage - 1] : null;
  const isHebel = model.config.jenis === "hebel";
  const plesterOn = view.showFinishing || stage >= 7;
  const catOn = view.showFinishing || stage >= 8;

  useEffect(() => {
    if (!canvasRef.current) return;
    const sc = new HouseScene(canvasRef.current);
    sceneRef.current = sc;
    sc.setCameraPreset("3d");
    return () => {
      sc.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.update(model, view);
  }, [model, view]);

  useEffect(() => {
    sceneRef.current?.setProjection(view.ortho);
  }, [view.ortho]);

  useEffect(() => {
    sceneRef.current?.setEnvironment({ grid: view.grid, ground: view.ground });
  }, [view.grid, view.ground]);

  useEffect(() => {
    sceneRef.current?.setWireframe(view.wireframe);
  }, [view.wireframe]);

  useEffect(() => {
    sceneRef.current?.setDims(view.dims);
  }, [view.dims]);

  const goto = (p: Preset) => {
    sceneRef.current?.setCameraPreset(p);
    setPreset(p);
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {/* ---------- header viewport (ala Blender): pandangan, proyeksi, shading, overlay ---------- */}
      <div className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b bg-[#26282b] px-2">
        <div className="flex items-center gap-0.5" role="group" aria-label="Pandangan kamera">
          <ViewBtn active={preset === "3d"} onClick={() => goto("3d")} title="Perspektif 3/4">
            <Mountain className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden md:inline">3/4</span>
          </ViewBtn>
          <ViewBtn active={preset === "depan"} onClick={() => goto("depan")} title="Tampak depan (pelana)">
            <Home className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden md:inline">Depan</span>
          </ViewBtn>
          <ViewBtn active={preset === "belakang"} onClick={() => goto("belakang")} title="Tampak belakang" className="hidden md:flex">
            <span>Belakang</span>
          </ViewBtn>
          <ViewBtn active={preset === "samping"} onClick={() => goto("samping")} title="Tampak samping (kanan)">
            <span className="hidden md:inline">Samping</span>
            <span className="md:hidden">S</span>
          </ViewBtn>
          <ViewBtn active={preset === "atas"} onClick={() => goto("atas")} title="Denah dari atas">
            <Camera className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden md:inline">Atas</span>
          </ViewBtn>
          <ViewBtn onClick={() => goto("3d")} title="Reset kamera">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          </ViewBtn>
        </div>

        <div className="mx-1 h-5 w-px bg-border" />

        <div className="flex items-center gap-0.5" role="group" aria-label="Proyeksi">
          <ToggleBtn active={!view.ortho} onClick={() => onView({ ortho: false })} title="Proyeksi perspektif">
            Persp
          </ToggleBtn>
          <ToggleBtn active={view.ortho} onClick={() => onView({ ortho: true })} title="Proyeksi ortografis (gambar teknik)">
            Orto
          </ToggleBtn>
        </div>

        <div className="mx-1 h-5 w-px bg-border" />

        <div className="flex items-center gap-0.5" role="group" aria-label="Mode shading">
          <ToggleBtn active={!view.wireframe} onClick={() => onView({ wireframe: false })} title="Shading solid">
            Solid
          </ToggleBtn>
          <ToggleBtn active={view.wireframe} onClick={() => onView({ wireframe: true })} title="Wireframe">
            Wire
          </ToggleBtn>
        </div>

        <div className="mx-1 hidden h-5 w-px bg-border sm:block" />

        <div className="hidden items-center gap-0.5 sm:flex" role="group" aria-label="Overlay">
          <IconToggleBtn active={view.dims} onClick={() => onView({ dims: !view.dims })} title="Anotasi dimensi 3D">
            <Ruler className="h-3.5 w-3.5" aria-hidden />
          </IconToggleBtn>
          <IconToggleBtn active={view.showLabels} onClick={() => onView({ showLabels: !view.showLabels })} title="Label ruangan">
            <Tag className="h-3.5 w-3.5" aria-hidden />
          </IconToggleBtn>
          <IconToggleBtn active={view.grid} onClick={() => onView({ grid: !view.grid })} title="Grid lantai studio">
            <Grid3x3 className="h-3.5 w-3.5" aria-hidden />
          </IconToggleBtn>
          <IconToggleBtn active={view.ground} onClick={() => onView({ ground: !view.ground })} title="Bidang tanah">
            <Globe className="h-3.5 w-3.5" aria-hidden />
          </IconToggleBtn>
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <span className="mr-1 hidden items-center gap-1 text-[10px] text-muted-foreground xl:flex">
            <View className="h-3 w-3" aria-hidden />
            {view.ortho ? "Ortografis" : "Perspektif"} &middot; {model.config.pondasi === "cakarayam" ? "cakar ayam" : "batu kali"}
          </span>
          <IconToggleBtn active={false} onClick={onToggleDock} title="Panel kanan (outliner & properti)">
            <PanelRight className="h-3.5 w-3.5" aria-hidden />
          </IconToggleBtn>
        </div>
      </div>

      {/* ---------- kanvas 3D ---------- */}
      <div className="relative min-h-0 flex-1">
        <canvas ref={canvasRef} className="viewport-canvas h-full w-full cursor-grab active:cursor-grabbing" aria-label="Viewport 3D rumah dengan susunan bata, struktur, dan atap" />

        {/* info kiri-atas */}
        <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1">
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-sm border border-white/10 bg-black/45 px-2 py-1 text-[11px] font-medium text-stone-200 shadow backdrop-blur-sm">
            <BrickWall className="h-3.5 w-3.5 text-primary" aria-hidden />
            Bata terpasang: <b className="tabular-nums">{fmtNum(model.count.totalPieces)}</b> buah
          </div>
          {stageInfo && (
            <div className="pointer-events-auto rounded-sm border border-primary/40 bg-primary/90 px-2 py-1 text-[11px] font-semibold text-primary-foreground shadow backdrop-blur-sm">
              Tahap {stageInfo.no}: {stageInfo.nama} ({stageInfo.durasi})
            </div>
          )}
          <div className="pointer-events-auto hidden rounded-sm border border-white/10 bg-black/35 px-2 py-0.5 text-[10px] text-stone-400 backdrop-blur-sm sm:block">
            Geser = putar &middot; roda/cubit = zoom &middot; Shift+geser = geser
          </div>
        </div>

        {/* gizmo navigasi kanan-atas (kubus pandangan) */}
        <div className="absolute right-2 top-2 flex flex-col items-center gap-1">
          <div className="rounded-sm border border-white/10 bg-black/40 p-1 shadow backdrop-blur-sm" role="group" aria-label="Navigasi pandangan">
            <svg width="62" height="62" viewBox="0 0 62 62">
              <title>Ubah pandangan kamera</title>
              <g className="cursor-pointer" onClick={() => goto("atas")}>
                <title>Pandangan atas</title>
                <polygon points="31,7 52,17.5 31,28 10,17.5" className="fill-stone-500/50 stroke-stone-300/60 transition hover:fill-primary/70 hover:stroke-primary" strokeWidth="1" />
                <text x="31" y="21" textAnchor="middle" fontSize="6.5" className="fill-stone-200 pointer-events-none">ATAS</text>
              </g>
              <g className="cursor-pointer" onClick={() => goto("depan")}>
                <title>Pandangan depan</title>
                <polygon points="10,17.5 31,28 31,53 10,42.5" className="fill-stone-600/60 stroke-stone-300/60 transition hover:fill-primary/70 hover:stroke-primary" strokeWidth="1" />
                <text x="20.5" y="39" textAnchor="middle" fontSize="6.5" className="fill-stone-200 pointer-events-none">DEPAN</text>
              </g>
              <g className="cursor-pointer" onClick={() => goto("samping")}>
                <title>Pandangan samping</title>
                <polygon points="52,17.5 52,42.5 31,53 31,28" className="fill-stone-700/70 stroke-stone-300/60 transition hover:fill-primary/70 hover:stroke-primary" strokeWidth="1" />
                <text x="41.5" y="39" textAnchor="middle" fontSize="6.5" className="fill-stone-200 pointer-events-none">SAMP</text>
              </g>
            </svg>
          </div>
          <button
            type="button"
            onClick={() => goto("3d")}
            className="rounded-sm border border-white/10 bg-black/40 px-1.5 py-0.5 text-[10px] text-stone-300 backdrop-blur-sm transition hover:border-primary/60 hover:text-primary"
            title="Kembali ke perspektif 3/4"
          >
            3/4
          </button>
        </div>

        {/* legenda material kiri-bawah */}
        <div className="pointer-events-none absolute bottom-2 left-2 hidden max-w-[92%] flex-wrap gap-x-3 gap-y-1 rounded-sm border border-white/10 bg-black/40 px-2 py-1 text-[10px] leading-relaxed text-stone-300 backdrop-blur-sm md:flex">
          <LegendItem hex={isHebel ? "#eceae3" : "#a3492f"} label={isHebel ? "Bata putih (hebel)" : "Bata merah"} />
          <LegendItem hex="#9d9d96" label={`Nat / perekat ${fmtNum(model.config.natMm, 1)} mm`} />
          <LegendItem hex="#8f9089" label="Beton (sloof, kolom, ring balk)" />
          <LegendItem hex="#9aa8b2" label="Rangka baja ringan" />
          <LegendItem hex="#96524a" label="Genteng beton" />
          <LegendItem hex="#83552d" label="Kusen & pintu" />
          <LegendItem hex="#c9c3b6" label="Roster lubang angin" />
          {plesterOn && <LegendItem hex="#9b978d" label="Plester + acian" />}
          {catOn && <LegendItem hex={view.paintHex} label="Cat eksterior" border />}
        </div>

        {/* status potongan kanan-bawah */}
        {view.cutH < 999 && (
          <div className="pointer-events-none absolute bottom-2 right-2 rounded-sm border border-primary/40 bg-primary/15 px-2 py-1 text-[10px] font-medium text-primary backdrop-blur-sm">
            Potongan horizontal {fmtNum(view.cutH, 2)} m
          </div>
        )}
      </div>
    </section>
  );
}

function LegendItem({ hex, label, border }: { hex: string; label: string; border?: boolean }) {
  return (
    <span className="mr-1 inline-flex items-center gap-1">
      <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: hex, border: border ? "1px solid #b5b0a6" : undefined }} />
      {label}
    </span>
  );
}

function ViewBtn({
  active,
  onClick,
  title,
  className,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-7 items-center gap-1 rounded-sm px-2 text-[11px] font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-stone-300 hover:bg-white/10 hover:text-white",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ToggleBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "flex h-7 items-center rounded-sm px-2 text-[11px] font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-stone-300 hover:bg-white/10 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function IconToggleBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-sm transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-stone-300 hover:bg-white/10 hover:text-white",
      )}
    >
      {children}
    </button>
  );
}
