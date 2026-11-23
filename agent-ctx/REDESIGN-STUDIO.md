# Studio Rumah 6×6 m — UI/UX Redesign (Blender/Unity-style)

## Ringkasan
Aplikasi web rumah 6×6 m didesain ulang menjadi **studio editor ala Blender/Unity** agar bisa dibaca dan dipakai arsitek untuk memahami rancangan bangunan. Semua mesin perhitungan lama (`src/lib/house/engine.ts`, `knowledge.ts`) dipertahankan.

## Struktur UI (shell editor gelap)
- `src/app/page.tsx` — shell `h-dvh` (tanpa scroll halaman): TopBar → area kerja → StageTimeline → StatusBar.
- Ruang kerja (tab atas, ala workspace Blender):
  1. **Model 3D** — Viewport 3D + panel kanan (Outliner + Properties) + timeline tahapan.
  2. **Gambar Kerja** — lembar gambar teknik SVG: A-01 Denah, A-02 Tampak Depan, A-03 Tampak Samping, A-04 Potongan A-A + sidebar jadwal bukaan/ruangan + cara membaca.
  3. **Anggaran (RAB)** — RabPanel (tema gelap) + 4 kartu statistik.
  4. **Panduan** — ArchitectureGuide (tema gelap).

## Komponen studio (`src/components/studio/`)
- `TopBar.tsx` — logo, workspace tabs, chip statistik (RAB, luas bersih, bata).
- `Viewport.tsx` — header viewport ala Blender (preset kamera ¾/Depan/Belakang/Samping/Atas + reset; Persp/Orto; Solid/Wire; overlay Dimensi/Label/Grid/Tanah; toggle panel kanan), kanvas 3D, overlay info, **kubus navigasi** (klik muka ATAS/DEPAN/SAMPING), legenda material.
- `Outliner.tsx` — pohon elemen (Tanah, Pondasi, Struktur, Dinding, Kusen, Atap→Rangka/Genteng/Plafon, Finishing→Plester/Cat, Anotasi→Label/Dimensi) dengan **toggle mata**; terkunci saat mode tahapan.
- `PropertiesPanel.tsx` — 2 tab: **Proyek** (semua parameter rumah) & **Tampilan** (explode, potongan, warna cat, lingkungan, proyeksi, lapisan).
- `StageTimeline.tsx` — scrubber tahapan 0–8 dengan **play/pause auto-advance** (2,6 s), prev/next, strip blok, detail tahap + checklist mutu.
- `StatusBar.tsx` — petunjuk interaksi + statistik live.
- `DrawingWorkspace.tsx` — tab lembar + area kertas + sidebar jadwal.

## Lembar gambar (`src/components/drafting/`)
- `sheetUtils.tsx` — S=100 px/m, warna tinta, HDim/VDim (tick arsitektur), LevelMark, Balloon, LeaderLabel, HatchDefs (bata/beton/tanah), TitleBlock (kop), NorthArrow, ScaleBar, GridBubble, `openingSchedule()` (tag P/J/LA otomatis).
- `DenahSheet.tsx` — rantai ukuran 2 baris, as grid 1-3/A-C, kolom praktis, Pondasi batu kali (dashed) / cakar ayam (pelat+buis), tag bukaan, penanda potongan A-A, kop A-01.
- `TampakSheet.tsx` — elevasi depan (pelana): bidang atap+nok+lisplank, ring balk, bukaan (DoorElev/WindowElev/VentElev), dimensi tinggi berantai, level marks, leader label, kop A-02.
- `TampakSampingSheet.tsx` — elevasi samping (atap edge-on), bukaan dinding kanan + dinding kiri putus-putus, kop A-03.
- `PotonganSheet.tsx` — potongan A-A (y=2,5 m): dinding terpotong diarsir, sloof/RB/pondasi/rabat/plafon, kuda-kuda & reng (garis tipis), dinding depan + sekat w6 di belakang potongan, balon 1–10 + legenda 2 kolom, level marks, kop A-04.

## Ekstensi scene 3D (`src/lib/house/scene.ts`)
- Viewport gelap (#232629), grid/tanah/petak toggle (`setEnvironment`), `setWireframe`, `setDims` (anotasi dimensi 3D lebar/tinggi/level dengan sprite chip oranye, label zigzag), **proyeksi ortografis** (`setProjection`, `syncOrtho` mengikuti radius orbit), preset kamera baru `belakang` & `samping`.
- `ViewState` + `showDinding` (sembunyikan pasangan bata via Outliner).

## Tema
`src/app/globals.css` — palet studio gelap ala Blender: background oklch(0.222…), card 0.255, primary oranye #e87d3e, radius 0.375rem, scrollbar tipis. RabPanel & ArchitectureGuide di-restyle ke token tema (tetap funsgi sama).

## Perilaku data
- State: `config` (HouseConfig), `prices`, `upahPct`, `view: StudioView` (ViewState + grid/ground/wireframe/dims/ortho). Model & RAB dihitung `useMemo` — semua lembar gambar mengikuti parameter secara live.
- Dihapus: `SceneCanvas.tsx`, `PlanView.tsx` (digantikan Viewport + DenahSheet).

## Instalasi Air & Listrik (MEP) — tambahan
- **Data**: `engine.ts` — `MepSpec` (points + routes polyline 3D, preset `MEP_2BR` & `MEP_STUDIO` terpasang di `LAYOUT_PRESETS[].mep`), `buildMepRT` menghitung panjang per jenis jalur → `model.mep`.
- **Scene 3D**: `scene.ts` — `buildMep()` menggambar pipa sebagai silinder per segmen dengan bola pada sambungan siku; **overlay sinar-X** (`depthTest: false`, tanpa clipping) sehingga jalur tertanam tetap terbaca. Warna: air bersih ½" biru `#4c9ee8`, limbah 3" teal `#4f9d8d`, kabel lampu kuning `#f2c14e` (NYM 2×1,5), stop kontak merah `#e05b4d` (2×2,5). Marker titik: lampu (bola emissive), saklar/stop kontak (piring krem, orientasi mengikuti dinding terdekat), panel MCB, meter air, kran, shower, kloset (mangkuk+tangki), floor drain; septic tank + resapan bawah tanah dengan label chip.
- **Tahapan**: mode tahapan menampilkan MEP otomatis di tahap 5-6 (rough-in paralel atap, sebelum plester menutup); mode bebas via flag `showAir`/`showListrik` (default ON).
- **UI**: viewport header tombol Air/Listrik + chip statistik + legenda; Outliner grup "Instalasi air & listrik"; PropertiesPanel tab Tampilan (toggle + ringkasan titik); DenahSheet overlay jalur (biru solid / hijau putus / kuning-merah putus + simbol titik + panah arah septic + legenda bawah).
- **RAB**: divisi VIII dipecah 16 baris granular dihitung dari `model.mep` (pipa m1, septic unit, sanitair bh, conduit m1, kabel per sirkuit m1, titik lampu/saklar/stop kontak bh, panel MCB, grounding) — harga satuan bisa diedit di RabPanel.

## Fitur interaktif klik-per-bagian (pick, detail, harga, show/hide) — tambahan
- **Katalog bagian `src/lib/house/parts.ts` (BARU)**: 29 bagian (pondasi, sloof, kolom, ringbalk, dinding, pintu/jendela/vent per jenis bukaan, lantai, rangka, lisplank, genteng, plafon, plester, cat, pipa air bersih/kotor, septic, meter air, kran, shower, kloset, drain, sirkuit listrik lampu/kontak, titik lampu, saklar, stop kontak, panel MCB). Tiap bagian: `getPartInfo(id, model)` → label, kelompok, ringkas, specs (kuantitas nyata dari model), praktik, `rowIds` (baris RAB terkait), eye. Helper: `partEye`, `partVisible`, `partTogglePatch`, `partLabel`.
- **Scene `scene.ts`**: semua mesh/grup di-tag `userData.pick` (addBox/addTiltedBox/addPipe/addMepBox/addMepSphere/addMepCyl punya param `pick`; grup persisten trussGroup='rangka', tilesGroup='genteng', kolomGroup='kolom', lisplankGroup='lisplank' [grup baru], kusen per jenis bukaan, MEP per rute/sirkuit & titik). Raycast klik (threshold 6px & <600ms agar orbit tak terganggu) + hover (throttle 70ms) via `setPickHandlers`; `setSelection` highlight emissive oranye (klon material, `hiMats`/`hiObjs`, dipasang ulang tiap `update()`); `hidden?: string[]` di ViewState memfilter bagian saat build (mode bebas saja; mode tahapan terkunci). MEP_POINT_PART dipindah ke ATAS file (Turbopack memisah scope bila di bawah kelas → ReferenceError).
- **UI**: `PartInfoPanel.tsx` (BARU) — kartu melayang kanan-bawah viewport: header ikon+label+klos, ringkas, specs, catatan praktik, daftar item RAB dengan INPUT harga satuan (`onPriceChange` → PriceBook → total RAB/panel/TopBar chip live), subtotal material + upah + total bagian + porsi %, tombol "Sembunyikan/Tampilkan kembali bagian ini" (terkunci di mode tahapan). Viewport: wiring handler, tooltip hover "klik utk detail", Esc menutup (kecuali fokus input), hint bar diperbarui. Outliner: baris bisa diklik (role=button, highlight primary) memilih bagian yang sama; footer note.
- **Verifikasi**: `scripts/verify-parts.ts` (katalog ↔ RAB semua konfigurasi), `scripts/ui-test.sh` + `ui-test2.sh` (browser: klik dinding→panel 840 bata, edit harga genteng 60rb→40rb → subtotal 3,6jt→2,4jt & total RAB 111.533.750→110.033.750 di TopBar+workspace RAB, hide/unhide genteng terlihat di screenshot, Esc & klik-kosong batal pilih). Screenshot: `shots4/01..08`.
