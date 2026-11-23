"use client";

import { useMemo, useState } from "react";
import {
  LAYOUT_PRESETS,
  DEFAULT_CONFIG,
  DEFAULT_CONFIG_MERAH,
  DEFAULT_PRICES,
  HEBEL_THICK,
  MERAH_THICK,
  buildModel,
  buildRab,
  fmtNum,
  fmtRp,
  type HouseConfig,
  type PriceBook,
} from "@/lib/house/engine";
import { SceneCanvas } from "@/components/house/SceneCanvas";
import { PlanView } from "@/components/house/PlanView";
import { RabPanel } from "@/components/house/RabPanel";
import { ArchitectureGuide } from "@/components/house/ArchitectureGuide";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { BrickWall, DraftingCompass, HardHat, Info, Layers, Ruler, Wallet } from "lucide-react";

export default function Home() {
  const [config, setConfig] = useState<HouseConfig>(DEFAULT_CONFIG);
  const [prices, setPrices] = useState<PriceBook>(DEFAULT_PRICES);
  const [upahPct, setUpahPct] = useState(25);
  const [view, setView] = useState({
    showRoof: true,
    showRangka: true,
    showStruktur: true,
    showLabels: false,
    explode: 0,
    cutH: 1000,
  });

  const model = useMemo(() => buildModel(config), [config]);
  const rab = useMemo(() => buildRab(model, prices, upahPct), [model, prices, upahPct]);

  const maxCut = model.roof.yRidge + 0.4;
  const cutHClamped = Math.min(view.cutH, maxCut);
  const cutActive = cutHClamped < maxCut - 0.001;

  const set = <K extends keyof HouseConfig>(key: K, val: HouseConfig[K]) => setConfig((c) => ({ ...c, [key]: val }));

  const gantiJenis = (jenis: "hebel" | "merah") => {
    if (jenis === "hebel") {
      setConfig((c) => ({ ...DEFAULT_CONFIG, preset: c.preset, tinggi: c.tinggi, atapDeg: c.atapDeg, overhang: c.overhang }));
    } else {
      setConfig((c) => ({ ...DEFAULT_CONFIG_MERAH, preset: c.preset, tinggi: c.tinggi, atapDeg: c.atapDeg, overhang: c.overhang }));
    }
  };

  const thickOptions = config.jenis === "hebel" ? HEBEL_THICK : MERAH_THICK;
  const natLabel =
    config.jenis === "hebel" ? "Tebal perekat hebel (nat)" : "Tebal nat / spesi pasangan";
  const natRange = config.jenis === "hebel" ? { min: 1, max: 6, step: 0.5 } : { min: 5, max: 20, step: 0.5 };

  return (
    <div className="min-h-screen bg-stone-100 pb-8">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-700 text-white">
            <HardHat className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-stone-900">Prototype 3D Rumah 6 x 6 m</h1>
            <p className="text-xs text-stone-500">
              Referensi teknis arsitektur Indonesia: susunan bata batu demi batu, struktur (pondasi-sloof-kolom-ring balk), atap pelana, dan RAB per divisi pekerjaan
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-4 px-4 py-4">
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          {/* ------------------------------------------------ kontrol -- */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-amber-700" aria-hidden /> Struktur & material
              </CardTitle>
              <CardDescription>Ubah parameter di bawah; model 3D dan seluruh perhitungan mengikuti.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="preset">Tata ruang</Label>
                <Select value={config.preset} onValueChange={(v) => set("preset", v)}>
                  <SelectTrigger id="preset" className="w-full">
                    <SelectValue placeholder="Pilih tata ruang" />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_PRESETS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-stone-500">{LAYOUT_PRESETS.find((p) => p.id === config.preset)?.desc}</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="jenis">Jenis bata</Label>
                <Select value={config.jenis} onValueChange={(v) => gantiJenis(v as "hebel" | "merah")}>
                  <SelectTrigger id="jenis" className="w-full">
                    <SelectValue placeholder="Pilih jenis bata" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hebel">Bata putih / hebel AAC 60 x 20 cm</SelectItem>
                    <SelectItem value="merah">Bata merah 20 x 10 x 5 cm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tLuar">Tebal dinding luar</Label>
                  <Select value={String(config.tLuar)} onValueChange={(v) => set("tLuar", Number(v))}>
                    <SelectTrigger id="tLuar" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {thickOptions.map((mm) => (
                        <SelectItem key={mm} value={String(mm)}>
                          {mm} mm
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tDalam">Tebal sekat dalam</Label>
                  <Select value={String(config.tDalam)} onValueChange={(v) => set("tDalam", Number(v))}>
                    <SelectTrigger id="tDalam" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {thickOptions.map((mm) => (
                        <SelectItem key={mm} value={String(mm)}>
                          {mm} mm
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="tinggi">Tinggi dinding</Label>
                  <span className="text-sm font-semibold tabular-nums text-stone-700">{fmtNum(config.tinggi, 2)} m</span>
                </div>
                <Slider id="tinggi" value={[config.tinggi]} min={2.6} max={3.4} step={0.05} onValueChange={(v) => set("tinggi", v[0])} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="nat">{natLabel}</Label>
                  <span className="text-sm font-semibold tabular-nums text-stone-700">{fmtNum(config.natMm, 1)} mm</span>
                </div>
                <Slider id="nat" value={[config.natMm]} min={natRange.min} max={natRange.max} step={natRange.step} onValueChange={(v) => set("natMm", v[0])} />
                <p className="text-xs text-stone-500">
                  {config.jenis === "hebel"
                    ? "Perekat hebel dipasang tipis 2-3 mm (kenyal cukup merata)."
                    : "Spesi bata merah lazim 1-1,5 cm; nat ikut memakan ruang dan menambah kebutuhan semen-pasir."}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="atapDeg">Kemiringan atap</Label>
                  <span className="text-sm font-semibold tabular-nums text-stone-700">{fmtNum(config.atapDeg, 1)}&deg;</span>
                </div>
                <Slider id="atapDeg" value={[config.atapDeg]} min={22.5} max={40} step={2.5} onValueChange={(v) => set("atapDeg", v[0])} />
                <p className="text-xs text-stone-500">
                  Genteng beton ideal 30-40&deg; (nok naik {fmtNum(model.roof.apexAdd, 2)} m dari puncak ring balk). Terlalu landai &lt; 27,5&deg; berisiko rembes.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="overhang">Overstek atap (overhang)</Label>
                  <span className="text-sm font-semibold tabular-nums text-stone-700">{fmtNum(config.overhang, 2)} m</span>
                </div>
                <Slider id="overhang" value={[config.overhang]} min={0} max={1.2} step={0.1} onValueChange={(v) => set("overhang", v[0])} />
                <p className="text-xs text-stone-500">Perlindungan dinding & plesteran dari guyuran hujan: lazim 60-100 cm.</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="waste">Faktor waste / susut</Label>
                  <span className="text-sm font-semibold tabular-nums text-stone-700">{config.wastePct}%</span>
                </div>
                <Slider id="waste" value={[config.wastePct]} min={0} max={15} step={1} onValueChange={(v) => set("wastePct", v[0])} />
              </div>

              <Separator />

              <div className="flex items-center justify-between gap-3 rounded-md border border-stone-200 p-3">
                <div>
                  <Label htmlFor="plesteran" className="text-sm font-medium text-stone-800">
                    Plesteran + aci 2 sisi
                  </Label>
                  <p className="text-xs text-stone-500">Masukkan ke RAB (umumnya wajib untuk bata merah)</p>
                </div>
                <Switch id="plesteran" checked={config.plesteran} onCheckedChange={(v) => set("plesteran", v)} />
              </div>
            </CardContent>
          </Card>

          {/* ------------------------------------------------- canvas -- */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <DraftingCompass className="h-4 w-4 text-amber-700" aria-hidden /> Tampilan 3D
              </CardTitle>
              <CardDescription>
                Setiap kotak = satu bata (instansi nyata sesuai ukuran). Dinding pelana naik di atas ring balk; kuda-kuda baja ringan menopang reng & genteng.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <SceneCanvas model={model} view={{ ...view, cutH: cutActive ? cutHClamped : 1000 }} />

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="flex items-center justify-between gap-3 rounded-md border border-stone-200 px-3 py-2">
                  <Label htmlFor="showRoof" className="min-w-0 flex-1 text-xs font-medium leading-snug text-stone-700">
                    Genteng
                  </Label>
                  <Switch id="showRoof" checked={view.showRoof} onCheckedChange={(v) => setView((s) => ({ ...s, showRoof: v }))} />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border border-stone-200 px-3 py-2">
                  <Label htmlFor="showRangka" className="min-w-0 flex-1 text-xs font-medium leading-snug text-stone-700">
                    Rangka atap
                  </Label>
                  <Switch id="showRangka" checked={view.showRangka} onCheckedChange={(v) => setView((s) => ({ ...s, showRangka: v }))} />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border border-stone-200 px-3 py-2">
                  <Label htmlFor="showStruktur" className="min-w-0 flex-1 text-xs font-medium leading-snug text-stone-700">
                    Sloof/kolom/ring balk
                  </Label>
                  <Switch id="showStruktur" checked={view.showStruktur} onCheckedChange={(v) => setView((s) => ({ ...s, showStruktur: v }))} />
                </div>
                <div className="rounded-md border border-stone-200 px-3.5 py-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-stone-700">Mode bongkar dinding</span>
                    <span className="tabular-nums text-stone-500">{Math.round(view.explode * 100)}%</span>
                  </div>
                  <Slider className="mt-2" value={[view.explode]} min={0} max={1} step={0.02} onValueChange={(v) => setView((s) => ({ ...s, explode: v[0] }))} />
                </div>
                <div className="rounded-md border border-stone-200 px-3.5 py-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-stone-700">Potongan horizontal</span>
                    <span className="tabular-nums text-stone-500">{cutActive ? `${fmtNum(cutHClamped, 2)} m` : "nonaktif"}</span>
                  </div>
                  <Slider className="mt-2" value={[cutHClamped]} min={0.3} max={maxCut} step={0.05} onValueChange={(v) => setView((s) => ({ ...s, cutH: v[0] }))} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ---------------------------------------------------- statistik -- */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatChip
            icon={<BrickWall className="h-4 w-4" aria-hidden />}
            title="Kebutuhan bata"
            value={`${fmtNum(model.count.totalBuy)} buah`}
            desc={`Terpasang di model ${fmtNum(model.count.totalPieces)} (luar ${fmtNum(model.count.buyOuter)} + sekat ${fmtNum(model.count.buyInner)}, termasuk potongan + waste ${config.wastePct}%)`}
          />
          {config.jenis === "hebel" ? (
            <StatChip
              icon={<Layers className="h-4 w-4" aria-hidden />}
              title="Perekat hebel"
              value={`${fmtNum(Math.ceil(model.mortar.perekatZak))} zak 40 kg`}
              desc={`${fmtNum(model.mortar.perekatKg)} kg (4 kg/m2 dinding, nat ${config.natMm} mm) | luas muka dinding ${fmtNum(model.areas.wallFace, 1)} m2`}
            />
          ) : (
            <StatChip
              icon={<Layers className="h-4 w-4" aria-hidden />}
              title="Adukan semen-pasir (1:5)"
              value={`${fmtNum(model.mortar.volM3, 2)} m3`}
              desc={`${fmtNum(Math.ceil(model.mortar.semenZak))} zak semen 50 kg + ${fmtNum(model.mortar.pasirM3, 1)} m3 pasir (nat ${config.natMm} mm, waste ${config.wastePct}%)`}
            />
          )}
          <StatChip
            icon={<Ruler className="h-4 w-4" aria-hidden />}
            title="Luas bersih"
            value={`${fmtNum(model.areas.netFloor, 2)} m2`}
            desc={`Dari tanah 36,00 m2; tebal dinding memakai ${fmtNum(model.areas.reduksiM2, 2)} m2 (${fmtNum(model.areas.reduksiPct, 1)}%)`}
          />
          <StatChip
            icon={<Wallet className="h-4 w-4" aria-hidden />}
            title="Estimasi total RAB"
            value={fmtRp(rab.total)}
            desc={`${fmtRp(rab.perM2Net)} per m2 luas bersih | ${model.openings.doors} pintu, ${model.openings.windows} jendela, ${model.koloms.length} kolom praktis, ${model.roof.kudaKuda} kuda-kuda`}
          />
        </div>

        {/* ------------------------------------------------- denah & RAB -- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Denah, luas bersih, anggaran & panduan</CardTitle>
            <CardDescription>
              Denah menampilkan ukuran bersih tiap ruangan setelah dikurangi tebal dinding; RAB mengikuti model 3D; panduan memuat ilmu & tahapan arsitektur Indonesia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="denah">
              <TabsList className="mb-4">
                <TabsTrigger value="denah">Denah & Luas Bersih</TabsTrigger>
                <TabsTrigger value="rab">Rencana Anggaran Biaya (RAB)</TabsTrigger>
                <TabsTrigger value="panduan">Panduan Arsitektur</TabsTrigger>
              </TabsList>
              <TabsContent value="denah">
                <PlanView model={model} />
              </TabsContent>
              <TabsContent value="rab">
                <RabPanel
                  rab={rab}
                  onPriceChange={(key, val) => setPrices((p) => ({ ...p, [key]: val }))}
                  onResetPrices={() => setPrices(DEFAULT_PRICES)}
                  onUpahChange={setUpahPct}
                />
              </TabsContent>
              <TabsContent value="panduan">
                <ArchitectureGuide model={model} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* ------------------------------------------------------ catatan -- */}
        <Card>
          <CardContent className="space-y-2 pt-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
              <Info className="h-4 w-4 text-amber-700" aria-hidden /> Catatan & dasar perhitungan
            </div>
            <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-stone-600">
              <li>
                Kuantitas bata, volume adukan, luas dinding, luas bersih, galian, pondasi, sloof, kolom praktis, ring balk, lisplank, dan atap dihitung langsung dari model 3D
                (dinding pelana ikut dihitung di atas ring balk); rabat, keramik, plafon, kusen, instalasi, dan finishing adalah estimasi yang bisa diubah harganya pada tabel RAB.
              </li>
              <li>
                Ukuran bata: hebel AAC 60 x 20 cm sesuai SNI 8640:2018 (tebal 7,5-20 cm); bata merah 20 x 10 x 5 cm pasangan 1/2 batu. Nat hebel 2-3 mm memakai perekat instan
                (4 kg/m2); nat bata merah memakai adukan semen:pasir 1:5 (sekitar 6,3 zak semen dan 1 m3 pasir per m3 adukan). Sebagai pembanding, praktik lapangan sering memakai
                8-10 zak semen per 1.000 bata — pemakaian nyata bisa lebih boros dari hitungan geometris; naikkan tebal nat atau waste untuk mensimulasikannya.
              </li>
              <li>
                Struktur mengikuti praktik rumah sederhana 1 lantai: pondasi batu kali strip 40 x 60 cm, sloof & ring balk beton 15/20, kolom praktis 15/15 di tiap simpul dinding
                (jarak maks 3 m), kuda-kuda baja ringan C75 jarak 1,2 m, reng 40 cm, genteng beton flat 10 pcs/m2, kemiringan atap ideal 30-40 derajat.
              </li>
              <li>
                Bata di sekitar kolom praktis tidak dipotong pada model (kolom ditempel menonjol); volume bata di dalam bidang kolom tertutup oleh waste. Harga satuan per November 2025
                (kisaran pasar daring): hebel 7,5 cm sekitar Rp7.500/buah dan 10 cm sekitar Rp9.000/buah; bata merah Rp700-950/buah; semen 50 kg Rp57.000-67.000/zak; pasir pasang
                sekitar Rp350.000/m3; perekat hebel 40 kg Rp69.000-75.000/zak; rangka baja ringan C75 + reng sekitar Rp135.000/m2; genteng beton flat sekitar Rp6.000/buah (10 buah/m2);
                beton bertulang sloof/kolom Rp1,9-2,1 juta/m3. Selalu cek harga toko material setempat sebelum membangun.
              </li>
              <li>
                Angka aplikasi ini untuk perencanaan awal (prototype), bukan gambar kerja tersertifikasi. Konsultasikan struktur (pondasi, sloof, kolom, ring balk) dengan arsitek/insinyur
                dan urus PBG (pengganti IMB) melalui OSS sesuai peraturan setempat sebelum eksekusi.
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>

      <footer className="mt-8 border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-stone-500">
          <span>Prototype 3D Rumah 6 x 6 m — referensi teknis & RAB dihitung langsung dari model.</span>
          <span>Acuan: SNI 8640:2018 &middot; SNI 03-2965:1992 &middot; PUIL 2011 &middot; AHSP 2022</span>
        </div>
      </footer>
    </div>
  );
}

function StatChip({ icon, title, value, desc }: { icon: React.ReactNode; title: string; value: string; desc: string }) {
  return (
    <Card className="bg-white">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-stone-500">
          <span className="text-amber-700">{icon}</span>
          {title}
        </div>
        <div className="mt-1 text-xl font-bold tabular-nums text-stone-900">{value}</div>
        <div className="mt-1 text-[11px] leading-relaxed text-stone-500">{desc}</div>
      </CardContent>
    </Card>
  );
}
