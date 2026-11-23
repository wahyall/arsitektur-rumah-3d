"use client";

import { useEffect, useState } from "react";
import { CONSTRUCTION_STAGES } from "@/lib/house/knowledge";
import type { StudioView } from "@/lib/house/studio";
import { cn } from "@/lib/utils";
import { ClipboardCheck, ListOrdered, Pause, Play, SkipBack, SkipForward } from "lucide-react";

interface Props {
  view: StudioView;
  onView: (patch: Partial<StudioView>) => void;
}

/** Timeline bawah ala editor 3D: scrubber tahapan konstruksi (pondasi -> cat). */
export function StageTimeline({ view, onView }: Props) {
  const [playing, setPlaying] = useState(false);
  const stage = Math.max(0, Math.round(view.stage));
  const stageSel = stage > 0 ? CONSTRUCTION_STAGES.find((s) => s.no === stage) ?? null : null;

  // auto-advance: jalankan tahapan seperti animasi timeline
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      const next = stage < 8 ? stage + 1 : 0;
      onView({ stage: next });
      if (next === 0) setPlaying(false);
    }, 2600);
    return () => clearTimeout(t);
  }, [playing, stage, onView]);

  const startPlay = () => {
    if (stage === 0) onView({ stage: 1 });
    setPlaying(true);
  };

  return (
    <div className="shrink-0 border-t bg-card px-2.5 py-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={playing ? () => setPlaying(false) : startPlay}
            className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-foreground transition hover:bg-primary/85"
            title={playing ? "Jeda simulasi tahapan" : "Jalankan simulasi tahapan (pondasi -> cat)"}
          >
            {playing ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={() => onView({ stage: Math.max(0, stage - 1) })}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
            title="Tahap sebelumnya"
          >
            <SkipBack className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => onView({ stage: stage >= 8 ? 0 : stage + 1 })}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-accent hover:text-foreground"
            title="Tahap berikutnya"
          >
            <SkipForward className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        <div className="flex min-w-0 items-center gap-1.5 text-[11px]">
          <ListOrdered className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span className="shrink-0 font-semibold text-foreground">Tahapan Pembangunan</span>
          <span className="truncate text-muted-foreground">
            {stageSel ? `tahap ${stageSel.no}/8 — ${stageSel.nama}` : "kondisi lengkap (rumah selesai)"}
          </span>
        </div>

        <div className="ml-auto hidden shrink-0 text-[10px] tabular-nums text-muted-foreground sm:block">
          {stageSel ? `durasi ${stageSel.durasi}` : "9 kondisi lapangan"}
        </div>
      </div>

      {/* strip tahapan (film-strip) */}
      <div className="mt-1.5 flex gap-1 overflow-x-auto pb-0.5" role="tablist" aria-label="Pilih tahapan konstruksi">
        <StageBlock active={stage === 0} onClick={() => onView({ stage: 0 })} label="Selesai" sub="semua" />
        {CONSTRUCTION_STAGES.map((st) => (
          <StageBlock
            key={st.no}
            active={stage === st.no}
            onClick={() => onView({ stage: st.no })}
            label={`${st.no}. ${st.nama}`}
            sub={st.durasi}
          />
        ))}
      </div>

      {/* detail tahap terpilih */}
      {stageSel ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t pt-1.5">
          <p className="min-w-0 flex-1 text-[10px] leading-snug text-muted-foreground">
            <span className="font-semibold text-foreground">Kondisi tahap {stageSel.no} — {stageSel.nama}</span> · {stageSel.deskripsi}
          </p>
          <span className="hidden items-center gap-1 md:flex">
            <ClipboardCheck className="h-3 w-3 text-emerald-400" aria-hidden />
            {stageSel.cek.map((c) => (
              <span key={c} className="rounded-sm bg-emerald-500/10 px-1.5 py-0.5 text-[9px] leading-4 text-emerald-300">
                {c}
              </span>
            ))}
          </span>
        </div>
      ) : (
        <p className="mt-1.5 border-t pt-1.5 text-[10px] leading-snug text-muted-foreground">
          Tekan tombol putar untuk menyimulasikan urutan lapangan: pondasi dulu, lanjut sloof & kolom, pembangunan dinding, dan seterusnya hingga cat &amp; finishing.
        </p>
      )}
    </div>
  );
}

function StageBlock({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex h-9 shrink-0 flex-col justify-center rounded-sm border px-2 text-left leading-none transition-colors",
        active
          ? "border-primary bg-primary/90 text-primary-foreground"
          : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/60 hover:text-foreground",
      )}
    >
      <span className="text-[10px] font-semibold">{label}</span>
      <span className={cn("mt-0.5 text-[9px]", active ? "text-primary-foreground/80" : "text-muted-foreground/70")}>{sub}</span>
    </button>
  );
}
