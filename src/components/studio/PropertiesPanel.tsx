"use client";

import { useState } from "react";
import type { HouseConfig, HouseModel } from "@/lib/house/engine";
import { HEBEL_THICK, MERAH_THICK, LAYOUT_PRESETS, fmtNum } from "@/lib/house/engine";
import type { StudioView } from "@/lib/house/studio";
import { PAINTS } from "@/lib/house/studio";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { SlidersHorizontal, PaintBucket } from "lucide-react";

interface Props {
  config: HouseConfig;
  onConfig: (patch: Partial<HouseConfig>) => void;
  onGantiJenis: (jenis: "hebel" | "merah") => void;
  view: StudioView;
  onView: (patch: Partial<StudioView>) => void;
  model: HouseModel;
}

export function PropertiesPanel({ config, onConfig, onGantiJenis, view, onView, model }: Props) {
  const [tab, setTab] = useState<"proyek" | "tampilan">("proyek");
  const thickOptions = config.jenis === "hebel" ? HEBEL_THICK : MERAH_THICK;
  const natLabel = config.jenis === "hebel" ? "Tebal perekat hebel (nat)" : "Tebal nat / spesi pasangan";
  const natRange = config.jenis === "hebel" ? { min: 1, max: 6, step: 0.5 } : { min: 5, max: 20, step: 0.5 };
  const maxCut = model.roof.yRidge + 0.4;
  const cutActive = view.cutH < maxCut - 0.001;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex h-8 shrink-0 items-center gap-1 border-b bg-[#26282b] px-2">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Properti</span>
        <TabBtn active={tab === "proyek"} onClick={() => setTab("proyek")}>
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden /> Proyek
        </TabBtn>
        <TabBtn active={tab === "tampilan"} onClick={() => setTab("tampilan")}>
          <PaintBucket className="h-3.5 w-3.5" aria-hidden /> Tampilan
        </TabBtn>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {tab === "proyek" ? (
          <div className="space-y-3.5">
            <Field label="Tata ruang" hint={LAYOUT_PRESETS.find((p) => p.id === config.preset)?.desc}>
              <Select value={config.preset} onValueChange={(v) => onConfig({ preset: v })}>
                <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LAYOUT_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Jenis bata">
              <Select value={config.jenis} onValueChange={(v) => onGantiJenis(v as "hebel" | "merah")}>
                <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hebel" className="text-xs">Bata putih / hebel AAC 60 x 20 cm</SelectItem>
                  <SelectItem value="merah" className="text-xs">Bata merah 20 x 10 x 5 cm</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Jenis pondasi"
              hint={
                config.pondasi === "cakarayam"
                  ? "Sistem Sedyatmo: pelat beton 6x6 m + buis beton menancap — hemat galian, unggul di tanah lunak."
                  : "Paling ekonomis untuk tanah keras; galian 60 x 60 cm sepanjang jalur dinding."
              }
            >
              <Select value={config.pondasi} onValueChange={(v) => onConfig({ pondasi: v as HouseConfig["pondasi"] })}>
                <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="batukali" className="text-xs">Batu kali strip 40 x 60 cm</SelectItem>
                  <SelectItem value="cakarayam" className="text-xs">Cakar ayam (pelat + buis beton)</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Ukuran keramik lantai"
              hint={`Grid keping di model 3D & jumlah keping RAB ikut berubah — ${fmtNum(model.floor.totalPcs)} keping ${config.keramikCm}x${config.keramikCm} cm (±${fmtNum(1 / (model.floor.tileM * model.floor.tileM), 1)} keping/m2). KM memakai keramik anti-slip.`}
            >
              <Select
                value={String(config.keramikCm)}
                onValueChange={(v) => onConfig({ keramikCm: Number(v) as HouseConfig["keramikCm"] })}
              >
                <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30" className="text-xs">30 x 30 cm — garis sambung rapat</SelectItem>
                  <SelectItem value="40" className="text-xs">40 x 40 cm — ruang terasa lebih luas</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Tebal dinding luar">
                <Select value={String(config.tLuar)} onValueChange={(v) => onConfig({ tLuar: Number(v) })}>
                  <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {thickOptions.map((mm) => (
                      <SelectItem key={mm} value={String(mm)} className="text-xs">{mm} mm</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tebal sekat dalam">
                <Select value={String(config.tDalam)} onValueChange={(v) => onConfig({ tDalam: Number(v) })}>
                  <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {thickOptions.map((mm) => (
                      <SelectItem key={mm} value={String(mm)} className="text-xs">{mm} mm</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <SliderField
              id="tinggi"
              label="Tinggi dinding"
              value={`${fmtNum(config.tinggi, 2)} m`}
              min={2.6}
              max={3.4}
              step={0.05}
              val={config.tinggi}
              onChange={(v) => onConfig({ tinggi: v })}
            />
            <SliderField
              id="nat"
              label={natLabel}
              value={`${fmtNum(config.natMm, 1)} mm`}
              min={natRange.min}
              max={natRange.max}
              step={natRange.step}
              val={config.natMm}
              onChange={(v) => onConfig({ natMm: v })}
              hint={config.jenis === "hebel" ? "Perekat hebel dipasang tipis 2-3 mm." : "Spesi bata merah lazim 1-1,5 cm."}
            />
            <SliderField
              id="atapDeg"
              label="Kemiringan atap"
              value={`${fmtNum(config.atapDeg, 1)}°`}
              min={22.5}
              max={40}
              step={2.5}
              val={config.atapDeg}
              onChange={(v) => onConfig({ atapDeg: v })}
              hint={`Genteng beton ideal 30-40° (nok +${fmtNum(model.roof.apexAdd, 2)} m).`}
            />
            <SliderField
              id="overhang"
              label="Overstek atap"
              value={`${fmtNum(config.overhang, 2)} m`}
              min={0}
              max={1.2}
              step={0.1}
              val={config.overhang}
              onChange={(v) => onConfig({ overhang: v })}
              hint="Melindungi dinding dari guyuran hujan: lazim 60-100 cm."
            />
            <SliderField
              id="waste"
              label="Faktor waste / susut"
              value={`${config.wastePct}%`}
              min={0}
              max={15}
              step={1}
              val={config.wastePct}
              onChange={(v) => onConfig({ wastePct: v })}
            />

            <SwitchRow
              id="plesteran"
              label="Plesteran + aci 2 sisi"
              hint="Masukkan ke RAB (umumnya wajib untuk bata merah)"
              checked={config.plesteran}
              onChecked={(v) => onConfig({ plesteran: v })}
            />
          </div>
        ) : (
          <div className="space-y-3.5">
            <Group title="Mode bongkar (explode)">
              <SliderField
                id="explode"
                label="Bongkar dinding"
                value={`${Math.round(view.explode * 100)}%`}
                min={0}
                max={1}
                step={0.02}
                val={view.explode}
                onChange={(v) => onView({ explode: v })}
              />
            </Group>

            <Group title="Potongan horizontal">
              <SliderField
                id="cut"
                label="Tinggi potong"
                value={cutActive ? `${fmtNum(view.cutH, 2)} m` : "nonaktif"}
                min={0.3}
                max={maxCut}
                step={0.05}
                val={Math.min(view.cutH, maxCut)}
                onChange={(v) => onView({ cutH: v })}
                hint="Geser ke kanan penuh untuk mematikan potongan."
              />
            </Group>

            <Group title="Warna cat eksterior">
              <div className="flex flex-wrap gap-1.5">
                {PAINTS.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    title={p.name}
                    aria-label={`Warna cat ${p.name}`}
                    onClick={() => onView({ paintHex: p.hex })}
                    className={cn(
                      "h-7 w-7 rounded-full border border-white/25 shadow-sm transition",
                      view.paintHex === p.hex ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "hover:scale-110",
                    )}
                    style={{ background: p.hex }}
                  />
                ))}
              </div>
              <SwitchRow
                id="showFinishing"
                label="Tampilkan plester + cat"
                hint="Terlihat penuh pada tahap 7-8"
                checked={view.showFinishing}
                onChecked={(v) => onView({ showFinishing: v })}
              />
            </Group>

            <Group title="Lingkungan & anotasi">
              <SwitchRow id="grid" label="Grid lantai studio" checked={view.grid} onChecked={(v) => onView({ grid: v })} />
              <SwitchRow id="ground" label="Bidang tanah & petak" checked={view.ground} onChecked={(v) => onView({ ground: v })} />
              <SwitchRow id="dims" label="Dimensi ukuran 3D" checked={view.dims} onChecked={(v) => onView({ dims: v })} />
              <SwitchRow id="labels" label="Label ruangan" checked={view.showLabels} onChecked={(v) => onView({ showLabels: v })} />
            </Group>

            <Group title="Proyeksi & shading">
              <SwitchRow id="ortho" label="Proyeksi ortografis" hint="Pandangan datar ala gambar teknik" checked={view.ortho} onChecked={(v) => onView({ ortho: v })} />
              <SwitchRow id="wireframe" label="Wireframe" hint="Lihat kerangka tiap bata & elemen" checked={view.wireframe} onChecked={(v) => onView({ wireframe: v })} />
            </Group>

            <Group title="Instalasi air & listrik (sinar-X)">
              <SwitchRow
                id="showAir"
                label="Jalur pipa air bersih & limbah"
                hint={`Pipa PVC 1/2" biru + 3" hijau — ${fmtNum(Math.ceil(model.mep.airBersihM + model.mep.airKotorM))} m + septic & resapan`}
                checked={view.showAir}
                onChecked={(v) => onView({ showAir: v })}
              />
              <SwitchRow
                id="showListrik"
                label="Jalur listrik (conduit & kabel)"
                hint={`${fmtNum(Math.ceil(model.mep.conduitM))} m conduit · NYM 1,5 mm² ${fmtNum(Math.ceil(model.mep.kabelLampuM))} m · 2,5 mm² ${fmtNum(Math.ceil(model.mep.kabelKontakM))} m`}
                checked={view.showListrik}
                onChecked={(v) => onView({ showListrik: v })}
              />
              <p className="rounded-sm border bg-muted/40 px-2.5 py-2 text-[10px] leading-relaxed text-muted-foreground">
                Titik instalasi: {fmtNum(model.mep.titikLampu)} lampu · {fmtNum(model.mep.saklar)} saklar · {fmtNum(model.mep.stopkontak)} stop kontak · 1 panel MCB · 1 meteran air · {fmtNum(model.mep.kloset)} kloset · {fmtNum(model.mep.shower)} shower · {fmtNum(model.mep.kran)} kran · {fmtNum(model.mep.drain)} floor drain. Jalur digambar menembus dinding/lantai (instalasi tersembunyi) — pada mode tahapan terlihat di tahap 5-6 (rough-in sebelum plester).
              </p>
            </Group>

            <Group title="Lapisan bangunan">
              <SwitchRow id="showDinding" label="Pasangan dinding bata" checked={view.showDinding} onChecked={(v) => onView({ showDinding: v })} />
              <SwitchRow id="showStruktur" label="Sloof, kolom & ring balk" checked={view.showStruktur} onChecked={(v) => onView({ showStruktur: v })} />
              <SwitchRow id="showRangka" label="Rangka atap baja ringan" checked={view.showRangka} onChecked={(v) => onView({ showRangka: v })} />
              <SwitchRow id="showRoof" label="Genteng & nok" checked={view.showRoof} onChecked={(v) => onView({ showRoof: v })} />
            </Group>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-6 items-center gap-1 rounded-sm px-2 text-[11px] font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[10px] leading-snug text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

function SliderField({
  id,
  label,
  value,
  hint,
  min,
  max,
  step,
  val,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  val: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id} className="text-[11px] font-medium text-muted-foreground">{label}</Label>
        <span className="text-[11px] font-semibold tabular-nums text-foreground">{value}</span>
      </div>
      <Slider id={id} value={[val]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} />
      {hint && <p className="text-[10px] leading-snug text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

function SwitchRow({
  id,
  label,
  hint,
  checked,
  onChecked,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onChecked: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-sm border px-2.5 py-2">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-[11px] font-medium leading-tight text-foreground/90">{label}</Label>
        {hint && <p className="text-[10px] leading-snug text-muted-foreground/80">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChecked} />
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}
