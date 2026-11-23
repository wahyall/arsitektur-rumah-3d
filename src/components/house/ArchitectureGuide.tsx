"use client";

import type { HouseModel } from "@/lib/house/engine";
import { fmtNum } from "@/lib/house/engine";
import {
  TAHAPAN_PEKERJAAN,
  DETAIL_ELEMEN,
  STANDAR_ACUAN,
  TIPS_PRAKTIS,
} from "@/lib/house/knowledge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CalendarClock, ClipboardCheck, Lightbulb, ShieldCheck, Wind } from "lucide-react";

export function ArchitectureGuide({ model }: { model: HouseModel }) {
  const vent = model.vent;

  return (
    <div className="space-y-4">
      {/* ------------------------------- analisis ventilasi & cahaya ------------------------------- */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wind className="h-4 w-4 text-amber-700" aria-hidden /> Analisis pencahayaan & penghawaan alami
          </CardTitle>
          <CardDescription>
            Luas total bukaan jendela dibanding luas lantai bersih — acuan SNI penghawaan alami (min. 5%) dan praktik ideal pencahayaan (10-20%).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="space-y-2 rounded-md border border-stone-200 p-3">
            <div className="text-xs text-stone-500">Total bukaan jendela</div>
            <div className="text-2xl font-bold tabular-nums text-stone-900">{fmtNum(vent.bukaanM2, 2)} m2</div>
            <div className="text-xs text-stone-500">
              {model.openings.windows} jendela &middot; {fmtNum(model.areas.netFloor, 1)} m2 lantai bersih
            </div>
            <div className="pt-1 text-sm font-semibold text-stone-800">{fmtNum(vent.pctLantai, 1)}% dari luas lantai</div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs text-stone-600">
                <span>Terhadap syarat minimal SNI penghawaan (5%)</span>
                <span className={vent.okSni ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                  {vent.okSni ? "Memenuhi" : "Belum memenuhi"}
                </span>
              </div>
              <Progress value={Math.min(100, (vent.pctLantai / 5) * 100)} className="h-2 [&>div]:bg-emerald-600" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-stone-600">
                <span>Terhadap praktik ideal pencahayaan alami (10%)</span>
                <span className={vent.okIdeal ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                  {vent.okIdeal ? "Ideal" : "Kurang dari ideal"}
                </span>
              </div>
              <Progress value={Math.min(100, (vent.pctLantai / 10) * 100)} className="h-2 [&>div]:bg-amber-600" />
            </div>
            <p className="text-xs leading-relaxed text-stone-500">
              {vent.okIdeal
                ? "Bukaan jendela rumah ini sudah berada di atas praktik ideal 10% luas lantai — ruangan cukup terang pada siang hari dan penghawaan alami bekerja tanpa kipas."
                : vent.okSni
                  ? "Bukaan memenuhi syarat minimal penghawaan, namun masih di bawah praktik ideal 10-20%: pertimbangkan memperlebar jendela atau menambah jendela di dinding yang belum berbukaan agar ruang terang."
                  : "Bukaan jendela masih di bawah syarat minimal 5% luas lantai: ruangan akan pengap dan gelap — perbesar atau tambahkan jendela sebelum konstruksi dimulai."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------- tahapan pekerjaan ------------------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-amber-700" aria-hidden /> Urutan pekerjaan membangun rumah 1 lantai
          </CardTitle>
          <CardDescription>
            Total sekitar 3-4 bulan untuk rumah 6 x 6 m dengan 4-5 tukang. Urutan struktur tidak boleh dibalik: pondasi &rarr; sloof &rarr; dinding + kolom &rarr; ring balk &rarr; atap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {TAHAPAN_PEKERJAAN.map((t) => (
              <li key={t.no} className="rounded-md border border-stone-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-700 text-xs font-bold text-white">
                    {t.no}
                  </span>
                  <span className="font-semibold text-stone-800">{t.nama}</span>
                  <Badge variant="outline" className="border-stone-300 bg-stone-50 px-1.5 text-[10px] font-medium text-stone-600">
                    {t.durasi}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-600">{t.detail}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <ClipboardCheck className="h-3.5 w-3.5 text-emerald-700" aria-hidden />
                  {t.cekMutu.map((c) => (
                    <span key={c} className="rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[10px] leading-4 text-emerald-800">
                      {c}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* ------------------------------- detail teknis ------------------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-amber-700" aria-hidden /> Detail teknis tiap elemen bangunan
          </CardTitle>
          <CardDescription>
            Spesifikasi lazim untuk rumah sederhana 1 lantai di Indonesia — dasar diskusi dengan tukang / kontraktor Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={["pondasi", "dinding", "atap"]}>
            {DETAIL_ELEMEN.map((e) => (
              <AccordionItem key={e.id} value={e.id}>
                <AccordionTrigger className="text-sm font-semibold text-stone-800 hover:no-underline">
                  {e.judul}
                </AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <p className="text-xs font-medium text-amber-800">{e.ringkas}</p>
                  <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-stone-600">
                    {e.poin.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* ------------------------------- standar & tips ------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-amber-700" aria-hidden /> Standar & regulasi acuan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {STANDAR_ACUAN.map((s) => (
              <div key={s.kode} className="rounded-md border border-stone-200 p-2.5">
                <div className="flex items-center gap-2">
                  <Badge className="bg-stone-800 text-white hover:bg-stone-800">{s.kode}</Badge>
                  <span className="text-xs font-semibold text-stone-800">{s.judul}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-stone-500">{s.keterangan}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-amber-700" aria-hidden /> Tips praktis sebelum membangun
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-xs leading-relaxed text-stone-600">
              {TIPS_PRAKTIS.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
