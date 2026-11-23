"use client";

import { useEffect, useRef } from "react";
import type { HouseModel } from "@/lib/house/engine";
import { HouseScene, type ViewState } from "@/lib/house/scene";
import { Button } from "@/components/ui/button";
import { BrickWall, Camera, Home, Mountain } from "lucide-react";
import { fmtNum } from "@/lib/house/engine";

interface Props {
  model: HouseModel;
  view: ViewState;
}

export function SceneCanvas({ model, view }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<HouseScene | null>(null);

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

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-md sm:h-[520px] lg:h-[560px]">
      <canvas ref={canvasRef} className="h-full w-full cursor-grab active:cursor-grabbing" aria-label="Tampilan 3D rumah dengan susunan bata" />

      <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1">
        <div className="pointer-events-auto flex items-center gap-1 rounded-md bg-white/85 px-2 py-1 text-[11px] font-medium text-stone-700 shadow-sm backdrop-blur">
          <BrickWall className="h-3.5 w-3.5 text-amber-700" aria-hidden />
          Bata terpasang di model: {fmtNum(model.count.totalPieces)} buah
        </div>
        <div className="pointer-events-auto rounded-md bg-white/85 px-2 py-1 text-[10px] text-stone-500 shadow-sm backdrop-blur">
          Geser = putar | Roda/cubit = zoom | Shift+geser = geser pandangan
        </div>
      </div>

      <div className="absolute right-2 top-2 flex gap-1">
        <Button size="sm" variant="secondary" className="h-8 gap-1 bg-white/85 px-2 text-xs backdrop-blur" onClick={() => sceneRef.current?.setCameraPreset("3d")}>
          <Mountain className="h-3.5 w-3.5" aria-hidden /> 3/4
        </Button>
        <Button size="sm" variant="secondary" className="h-8 gap-1 bg-white/85 px-2 text-xs backdrop-blur" onClick={() => sceneRef.current?.setCameraPreset("depan")}>
          <Home className="h-3.5 w-3.5" aria-hidden /> Depan
        </Button>
        <Button size="sm" variant="secondary" className="h-8 gap-1 bg-white/85 px-2 text-xs backdrop-blur" onClick={() => sceneRef.current?.setCameraPreset("atas")}>
          <Camera className="h-3.5 w-3.5" aria-hidden /> Atas
        </Button>
      </div>

      <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-white/85 px-2 py-1 text-[10px] leading-relaxed text-stone-600 shadow-sm backdrop-blur">
        <span className="mr-2 inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: model.config.jenis === "hebel" ? "#eceae3" : "#a3492f", border: "1px solid #b5b0a6" }} />
          {model.config.jenis === "hebel" ? "Bata putih (hebel)" : "Bata merah"}
        </span>
        <span className="mr-2 inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#9d9d96]" />
          Nat / perekat {model.config.natMm} mm
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-[#83552d]" />
          Kusen & pintu
        </span>
      </div>
    </div>
  );
}
