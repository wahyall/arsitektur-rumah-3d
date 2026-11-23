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
