"use client";

import { useState } from "react";
import type { HouseModel } from "@/lib/house/engine";
import { fmtNum } from "@/lib/house/engine";
import { DenahSheet } from "@/components/drafting/DenahSheet";
import { TampakSheet } from "@/components/drafting/TampakSheet";
import { TampakSampingSheet } from "@/components/drafting/TampakSampingSheet";
import { PotonganSheet } from "@/components/drafting/PotonganSheet";
import { openingSchedule } from "@/components/drafting/sheetUtils";
import { cn } from "@/lib/utils";
import { BookOpenText, FileStack } from "lucide-react";

type SheetId = "denah" | "tampak" | "samping" | "potongan";

const SHEETS: { id: SheetId; label: string; kode: string; desc: string }[] = [
  { id: "denah", label: "Denah Lantai 1", kode: "A-01", desc: "Tata ruang, rantai ukuran dua baris, as grid, tag bukaan P/J/LA, penanda potongan A-A" },
  { id: "tampak", label: "Tampak Depan", kode: "A-02", desc: "Elevasi dinding pelana dengan dimensi tinggi dan label material" },
  { id: "samping", label: "Tampak Samping", kode: "A-03", desc: "Elevasi dinding persegi + bidang atap (edge-on), bukaan dinding kanan" },
  { id: "potongan", label: "Potongan A-A", kode: "A-04", desc: "Potongan melintang: struktur pondasi-sloof-dinding-ring balk-atap dengan balon detail" },
];

export function DrawingWorkspace({ model }: { model: HouseModel }) {
  const [sheet, setSheet] = useState<SheetId>("denah");
  const { rows } = openingSchedule(model);
  const aktif = SHEETS.find((s) => s.id === sheet)!;

  return (
    <div className="flex min-h-0 flex-1">
      {/* ---------- area lembar gambar ---------- */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b bg-[#26282b] px-2">
          <FileStack className="mr-1 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          {SHEETS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSheet(s.id)}
              className={cn(
                "flex h-7 shrink-0 items-center gap-1.5 rounded-sm px-2.5 text-[11px] font-medium transition-colors",
                sheet === s.id ? "bg-primary text-primary-foreground" : "text-stone-300 hover:bg-white/10 hover:text-white",
              )}
            >
              <span className="rounded-sm bg-black/25 px-1 py-px text-[9px] font-bold tabular-nums">{s.kode}</span>
              {s.label}
            </button>
          ))}
          <span className="ml-auto hidden shrink-0 pl-2 text-[10px] text-muted-foreground xl:block">{aktif.desc}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[#1e2124] p-4 sm:p-6">
          <div className="mx-auto max-w-[900px] shadow-2xl ring-1 ring-black/40">
            {sheet === "denah" && <DenahSheet model={model} />}
            {sheet === "tampak" && <TampakSheet model={model} />}
            {sheet === "samping" && <TampakSampingSheet model={model} />}
            {sheet === "potongan" && <PotonganSheet model={model} />}
          </div>
          <p className="mx-auto mt-3 max-w-[900px] text-center text-[10px] leading-relaxed text-muted-foreground">
            Skala layar 1 : 100 (100 piksel per meter). Seluruh geometri — dinding, bukaan, tinggi, atap, struktur — dihitung langsung dari model 3D
            dan parameter panel properti; ubah parameter lalu kembali ke lembar ini untuk melihat gambar ikut berubah.
          </p>
        </div>
      </div>

      {/* ---------- sidebar jadwal & cara membaca ---------- */}
      <aside className="hidden min-h-0 w-[320px] shrink-0 flex-col overflow-y-auto border-l bg-card/40 xl:flex">
        <div className="border-b px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <BookOpenText className="h-3.5 w-3.5 text-primary" aria-hidden /> Jadwal & cara membaca
          </div>
        </div>

        <div className="space-y-4 p-3">
          <section>
            <h3 className="mb-1.5 text-xs font-semibold text-foreground">Jadwal bukaan (P / J / LA)</h3>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-[10px]">
                <thead className="bg-muted text-left uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Tag</th>
                    <th className="px-2 py-1.5 font-medium">Jenis</th>
                    <th className="px-2 py-1.5 font-medium">Letak</th>
                    <th className="px-2 py-1.5 text-right font-medium">Lebar</th>
                    <th className="px-2 py-1.5 text-right font-medium">Tinggi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.tag} className="bg-card">
                      <td className="px-2 py-1 font-bold text-primary">{r.tag}</td>
                      <td className="px-2 py-1">{r.jenis}</td>
                      <td className="px-2 py-1 text-muted-foreground">{r.lokasi}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{fmtNum(r.lebar, 2)}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{fmtNum(r.tinggi, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="mb-1.5 text-xs font-semibold text-foreground">Jadwal ruangan</h3>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-[10px]">
                <thead className="bg-muted text-left uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Ruangan</th>
                    <th className="px-2 py-1.5 text-right font-medium">Bersih</th>
                    <th className="px-2 py-1.5 text-right font-medium">Luas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {model.areas.rooms.map((r) => (
                    <tr key={r.id} className="bg-card">
                      <td className="px-2 py-1">{r.name}</td>
                      <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                        {fmtNum(r.w, 2)} x {fmtNum(r.d, 2)}
                      </td>
                      <td className="px-2 py-1 text-right font-semibold tabular-nums">{fmtNum(r.area, 2)} m2</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/50">
                    <td className="px-2 py-1.5 font-semibold" colSpan={2}>
                      Total luas bersih (neto)
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold tabular-nums">{fmtNum(model.areas.netFloor, 2)} m2</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-1.5 rounded-md border bg-secondary/30 p-3">
            <h3 className="text-xs font-semibold text-foreground">Cara membaca gambar kerja ini</h3>
            <ul className="space-y-1 text-[10px] leading-relaxed text-muted-foreground">
              <li>
                <b className="text-foreground/90">Denah (A-01)</b> — dinding diarsir hitam (poche); kotak kecil = kolom praktis di simpul; garis putus-putus = batas
                pondasi di bawah dinding; P = pintu, J = jendela, LA = lubang angin (roster); angka bergaris = rantai ukuran (atas: parsial + total).
              </li>
              <li>
                <b className="text-foreground/90">Tampak (A-02/A-03)</b> — proyeksi ortografis; garis dimensi tinggi di kanan menunjukkan level lantai ±0,00,
                puncak dinding, ring balk, sampai nok atap; label bersambung = spesifikasi material pada bagian yang ditunjuk.
              </li>
              <li>
                <b className="text-foreground/90">Potongan (A-04)</b> — arsir = elemen terpotong pada bidang y = 2,50 m; garis tipis putus-putus = elemen di
                belakang bidang potong (dinding depan & sekat); balon bernomor merinci konstruksi setiap lapis (pondasi sampai overstek).
              </li>
              <li>
                Konvensi umum: satuan meter, koma desimal, skala 1:100 pada layar; cetak dengan browser (Ctrl+P) untuk lembar fisik — ukur ulang bar skala
                bila ukuran cetak diubah.
              </li>
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}
