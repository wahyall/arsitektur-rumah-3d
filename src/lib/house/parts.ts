/**
 * Katalog BAGIAN BANGUNAN yang bisa diklik di viewport 3D.
 * Tiap bagian punya: info detail teknis (dihitung dari model), daftar item RAB
 * terkait (harga satuan bisa diedit pengguna), dan aturan visibilitas
 * (toggle show/hide per bagian: flag Outliner yang sudah ada, atau daftar
 * `hidden` khusus per bagian).
 *
 * Dipakai oleh: PartInfoPanel (panel detail di viewport), Outliner (klik baris
 * = pilih bagian), dan scene.ts (tag raycast `userData.pick`).
 */
import type { HouseModel } from "@/lib/house/engine";
import { fmtNum, KUDA_SPACING } from "@/lib/house/engine";
import type { ViewState } from "@/lib/house/scene";
import type { StudioView } from "@/lib/house/studio";

export type PartId =
  | "pondasi"
  | "sloof"
  | "kolom"
  | "ringbalk"
  | "dinding"
  | "pintu"
  | "jendela"
  | "vent"
  | "lantai"
  | "rangka"
  | "lisplank"
  | "genteng"
  | "plafon"
  | "plester"
  | "cat"
  | "pipaAirBersih"
  | "pipaAirKotor"
  | "septic"
  | "meterAir"
  | "kran"
  | "shower"
  | "kloset"
  | "drain"
  | "listrikLampu"
  | "listrikKontak"
  | "titikLampu"
  | "saklar"
  | "stopkontak"
  | "panelMcb";

/** Aturan visibilitas sebuah bagian. */
export type PartEye =
  | { kind: "flag"; key: "showDinding" | "showRangka" | "showRoof" } // pakai flag Outliner yang sudah ada
  | { kind: "hidden" }; // daftar `hidden` per-bagian (Scene memfilter saat membangun)

export interface PartInfo {
  id: PartId;
  label: string;
  group: string; // nama kelompok (struktur, dinding, atap, instalasi ...)
  ringkas: string; // satu kalimat deskripsi
  specs: string[]; // baris detail + kuantitas dari model 3D
  praktik?: string; // catatan praktik lapangan
  rowIds: string[]; // id baris RAB yang terkait (harga satuan bisa diedit)
  eye: PartEye;
  noteMissing?: string; // catatan bila baris RAB tidak aktif pada konfigurasi
}

export const PART_GROUPS = {
  bawah: "Struktur bawah",
  beton: "Struktur beton",
  dinding: "Dinding & bukaan",
  atap: "Atap & plafon",
  fin: "Finishing",
  air: "Instalasi air",
  listrik: "Instalasi listrik",
} as const;

const f1 = (v: number) => fmtNum(v, 1);
const f2 = (v: number) => fmtNum(v, 2);

/** Katalog lengkap; `model` dipakai untuk menghitung kuantitas nyata. */
export function getPartInfo(id: PartId, model: HouseModel): PartInfo | null {
  const cfg = model.config;
  const cakar = cfg.pondasi === "cakarayam" && model.structure.cakar;

  switch (id) {
    case "pondasi":
      return {
        id,
        label: cakar ? "Pondasi cakar ayam" : "Pondasi batu kali strip",
        group: PART_GROUPS.bawah,
        ringkas: cakar
          ? "Sistem Sedyatmo: pelat beton bertulang 6 x 6 m ditopang buis beton vertikal menancap ke tanah."
          : "Strip batu kali 40 x 60 cm sepanjang jalur dinding — paling ekonomis untuk tanah keras.",
        specs: cakar
          ? [
              `Pelat beton bertulang (wiremesh D8): ${f2(model.structure.cakar!.slabM3)} m3, tebal 10 cm`,
              `Buis beton Ø40 cm x 80 cm: ${model.structure.cakar!.buisCount} titik (${f2(model.structure.cakar!.buisM3)} m3)`,
              `Galian total: ${f1(model.structure.cakar!.galianM3)} m3 — jauh lebih sedikit dari batu kali`,
              `Lantai kerja pasir 5 cm: ${f1(model.structure.cakar!.uruganM3)} m3`,
              "Puncak pelat di -0,20 m tepat di bawah dudukan sloof",
            ]
          : [
              `Panjang jalur pondasi: ${f1(model.wallLenTotal)} m (seluruh dinding luar + sekat)`,
              `Volume batu kali campuran 1:5: ${f1(model.structure.pondasiM3)} m3`,
              `Galian 60 x 60 cm sedalam 60 cm: ${f1(model.structure.galianM3)} m3`,
              `Urugan pasir bawah pondasi 10 cm: ${f1(model.structure.uruganPasirM3)} m3`,
              "Puncak pondasi rata di -0,20 m (level dudukan sloof 15/20)",
            ],
        praktik: "Tanah lunak/berair: cakar ayam atau footplate beton di titik kolom lebih aman dari batu kali.",
        rowIds: cakar ? ["galian", "urugan", "cakarBeton"] : ["galian", "uruganPasir", "pondasi"],
        eye: { kind: "hidden" },
      };

    case "sloof":
      return {
        id,
        label: "Sloof beton 15/20",
        group: PART_GROUPS.beton,
        ringkas: "Balak pondasi bertulang yang duduk di atas pondasi & memikul seluruh dinding.",
        specs: [
          `Volume beton K-225: ${f2(model.structure.sloofM3)} m3 sepanjang ${f1(model.wallLenTotal)} m`,
          "Tulangan utama 6D10, begel Ø8 jarak 15 cm, selimut beton 25-30 mm",
          "Level atas sloof -0,20 m dari lantai ±0,00 (pemutus naiknya air tanah)",
          "Cor sekaligus mengelilingi denah sebelum pasangan bata dimulai",
        ],
        praktik: "Sloof lurus & level (toleransi 5 mm) — cek dengan waterpass sebelum pasangan bata.",
        rowIds: ["sloof"],
        eye: { kind: "hidden" },
      };

    case "kolom":
      return {
        id,
        label: "Kolom praktis 15/15",
        group: PART_GROUPS.beton,
        ringkas: `Tulang penguat dinding di tiap simpul — ${model.koloms.length} titik pada denah ini.`,
        specs: [
          `Jumlah kolom: ${model.koloms.length} titik (tiap pertemuan dinding, jarak maks 3 m)`,
          `Volume beton: ${f2(model.structure.kolomM3)} m3 (4D10, begel Ø6-200)`,
          `Tinggi kolom: ${f1(cfg.tinggi + 0.2)} m sampai puncak ring balk`,
          "Besi kolom diangkur ke sloof (dibengkokkan masuk sebelum cor)",
        ],
        rowIds: ["kolom"],
        eye: { kind: "hidden" },
      };

    case "ringbalk":
      return {
        id,
        label: "Ring balk 15/20",
        group: PART_GROUPS.beton,
        ringkas: "Balk pengikat di puncak seluruh dinding; menjadi dudukan rangka atap.",
        specs: [
          `Volume beton: ${f2(model.structure.ringbalkM3)} m3 sepanjang ${f1(model.wallLenTotal)} m`,
          `Ketinggian puncak ring balk: +${f1(cfg.tinggi)} m; tulangan 4D10, begel Ø6-150/200`,
          "Baut tanam untuk rangka baja ringan dipasang sebelum cor",
          "Pada dinding ujung, pasangan naik membentuk segitiga pelana di atas ring balk",
        ],
        rowIds: ["ringbalk"],
        eye: { kind: "hidden" },
      };

    case "dinding":
      return cfg.jenis === "hebel"
        ? {
            id,
            label: "Pasangan dinding bata ringan (hebel)",
            group: PART_GROUPS.dinding,
            ringkas: `Bata AAC 60 x 20 cm, tebal luar ${cfg.tLuar} mm / sekat ${cfg.tDalam} mm, nat perekat ${cfg.natMm} mm.`,
            specs: [
              `Bata terpasang di model: ${fmtNum(model.count.totalPieces)} buah (luar ${fmtNum(model.count.buyOuter)} + sekat ${fmtNum(model.count.buyInner)} sudah termasuk waste ${cfg.wastePct}%)`,
              `Luas muka dinding: ${f1(model.areas.wallFace)} m2 (termasuk dinding pelana, net bukaan)`,
              `Perekat instan: ${fmtNum(Math.ceil(model.mortar.perekatZak))} zak @40 kg (±4 kg/m2)`,
              `Dinding memakai ${f2(model.areas.reduksiM2)} m2 dari petak 36 m2 (luas bersih ${f2(model.areas.netFloor)} m2)`,
              "SNI 8640:2018 — ikatan berselang min. 10 cm, angkur ke kolom tiap 4-5 lapis",
            ],
            praktik: "Hebel lebih cepat berdiri & lurus; pondasi lebih ringan dibanding bata merah.",
            rowIds: ["bataLuar", "bataDalam", "perekat"],
            eye: { kind: "flag", key: "showDinding" },
          }
        : {
            id,
            label: "Pasangan dinding bata merah",
            group: PART_GROUPS.dinding,
            ringkas: `Bata merah 20x10x5 cm pasangan ½ batu, nat spesi 1:5 setebal ${cfg.natMm} mm.`,
            specs: [
              `Bata terpasang di model: ${fmtNum(model.count.totalPieces)} buah (luar ${fmtNum(model.count.buyOuter)} + sekat ${fmtNum(model.count.buyInner)} termasuk waste ${cfg.wastePct}%)`,
              `Volume adukan 1:5 (nat ${cfg.natMm} mm): ${f2(model.mortar.volM3)} m3`,
              `Kebutuhan semen: ${fmtNum(Math.ceil(model.mortar.semenZak))} zak @50 kg + pasir ${f1(model.mortar.pasirM3)} m3`,
              `Dinding memakai ${f2(model.areas.reduksiM2)} m2 dari petak 36 m2 (luas bersih ${f2(model.areas.netFloor)} m2)`,
            ],
            praktik: "Praktik borongan lapangan sering memesan 8-10 zak semen per 1000 bata sebagai cadangan loss.",
            rowIds: ["bataLuar", "bataDalam", "semen", "pasir"],
            eye: { kind: "flag", key: "showDinding" },
          };

    case "pintu":
      return {
        id,
        label: "Kusen & daun pintu",
        group: PART_GROUPS.dinding,
        ringkas: `${model.openings.doors} unit pintu — kusen kayu berprofil + daun panel 2 susun + kunci handle.`,
        specs: [
          `Jumlah pintu: ${model.openings.doors} unit (utama 90x210 cm, kamar & KM 90x210)`,
          "Kusen kayu kamper/merbau ditanam bersama pasangan dinding, angkur tiap 60 cm",
          "Daun panel 2 susun, engsel 3 buah + handle kedua muka",
          `Sisi KM sebaiknya daun PVC/aluminium tahan air`,
        ],
        rowIds: ["pintu"],
        eye: { kind: "hidden" },
      };

    case "jendela":
      return {
        id,
        label: "Kusen & kaca jendela",
        group: PART_GROUPS.dinding,
        ringkas: `${model.openings.windows} unit jendela berkaca 5 mm dengan palang pembagi aluminium.`,
        specs: [
          `Jumlah jendela: ${model.openings.windows} unit`,
          `Luas bukaan kaca: ${f2(model.openings.windowAreaM2)} m2 = ${f1(model.vent.pctLantai)}% dari luas lantai bersih`,
          `Pencahayaan alami: ${model.vent.okSni ? "memenuhi" : "BELUM memenuhi"} SNI 03-2965 (minimal 5% luas lantai)`,
          "Ambang bawah (sill) miring keluar agar air hujan tidak meresap",
        ],
        praktik: "Ideal 10-20% luas lantai agar ruang terang siang hari tanpa lampu.",
        rowIds: ["jendela"],
        eye: { kind: "hidden" },
      };

    case "vent":
      return {
        id,
        label: "Lubang angin permanen (roster)",
        group: PART_GROUPS.dinding,
        ringkas: `${model.openings.vents} roster beton permanen — penghawaan pasif 24 jam tanpa listrik.`,
        specs: [
          `Jumlah roster: ${model.openings.vents} buah (dinding + dinding pelana untuk ventilasi rongga atap)`,
          "Letak dekat puncak dinding (±60 cm di bawah ring balk) — udara panas naik keluar",
          "Roster dinding pelana membuang udara panas rongga atap, menjaga genteng tidak rembes",
          "Roster beton 20x20 cm, beri kasa nyamuk bila perlu",
        ],
        rowIds: ["lubangAngin"],
        eye: { kind: "hidden" },
      };

    case "lantai": {
      const fl = model.floor;
      const perM2 = 1 / (fl.tileM * fl.tileM);
      const roomLines = fl.rooms
        .filter((r) => r.x1 - r.x0 > 0.06 && r.z1 - r.z0 > 0.06)
        .map((r) => `${r.name}: ${r.nx} x ${r.nz} = ${fmtNum(r.pcs)} keping${r.basah ? " (anti-slip abu)" : ""}`);
      return {
        id,
        label: `Lantai rabat + keramik ${fl.tileCm}x${fl.tileCm}`,
        group: PART_GROUPS.fin,
        ringkas: `Rabat beton 10 cm di atas luas bersih lantai, finishing keramik ${fl.tileCm}x${fl.tileCm} cm dengan nat ±3 mm.`,
        specs: [
          `Luas lantai bersih: ${f2(model.areas.netFloor)} m2`,
          `Keramik ${fl.tileCm}x${fl.tileCm} cm: ${fmtNum(fl.totalPcs)} keping terpasang di model (grid per ruangan, keping potong di tepi dihitung utuh)`,
          `Kepadatan: ±${f1(perM2)} keping/m2 — ukuran bisa diganti di panel Properti`,
          ...roomLines.map((s) => `· ${s}`),
          "Rabat beton 7,5-10 cm dengan anyam besi, urugan dipadatkan tiap 20-25 cm; adhesive 5 mm di bawah keping",
          "Nat praktik ±3 mm — di model digambar 8 mm agar pola grid terbaca di layar",
          "KM/WC keramik bertekstur anti-slip dengan kemiringan 1-2% ke floor drain",
          "Plinton (skirting) 10 cm melindungi pertemuan dinding-lantai",
        ],
        praktik: `Pemasangan nyata: mulai dari pusat ruangan agar potongan simetris di kedua tepi. ${
          fl.tileCm === 30
            ? "30x30 cocok untuk ruang kecil (KM, dapur) — garis sambung lebih rapat."
            : "40x40 membuat ruang terasa lebih luas — sambungan lebih sedikit."
        }`,
        rowIds: ["rabat", "keramik"],
        eye: { kind: "hidden" },
      };
    }

    case "rangka":
      return {
        id,
        label: "Rangka atap baja ringan",
        group: PART_GROUPS.atap,
        ringkas: `Kuda-kuda C75 + reng — ${model.roof.kudaKuda} rangka dengan jarak maks ${f1(KUDA_SPACING)} m.`,
        specs: [
          `Jumlah kuda-kuda: ${model.roof.kudaKuda} rangka, jarak antar rangka maks ${f1(KUDA_SPACING)} m`,
          `Luas bidang atap: ${f1(model.roof.areaM2)} m2 (termasuk overstek ${f1(model.roof.overhang)} m)`,
          "Profil C75 (0,75 mm) + web pengaku diagonal, reng jarak 40-45 cm",
          `Kemiringan atap ${fmtNum(model.roof.deg)}° — ideal genteng beton 30-40°`,
          "Rangka diangkur baut tanam ke ring balk, tumpuan kasau minimal 7,5 cm",
        ],
        rowIds: ["rangkaAtap"],
        eye: { kind: "flag", key: "showRangka" },
      };

    case "lisplank":
      return {
        id,
        label: "Lisplank",
        group: PART_GROUPS.atap,
        ringkas: "Papan penutup ujung rangka di eaves dan kedua ujung pelana.",
        specs: [
          `Panjang total: ${f1(model.structure.lisplankM)} m (kedua sisi eaves + kedua ujung pelana)`,
          "Terpasang pada rangka sebelum genteng; menutup overstek agar rapi dari bawah",
          "Kayu merbau/almangi 20 x 2 cm atau bahan PVC, finishing mengikuti fasad",
          "Ikat kait ke ujung reng & kasau — tidak boleh ada celah di garis atap",
        ],
        rowIds: ["lisplank"],
        eye: { kind: "hidden" },
      };

    case "genteng":
      return {
        id,
        label: "Genteng beton + nok",
        group: PART_GROUPS.atap,
        ringkas: `Genteng beton flat ±10 pcs/m2 — ${fmtNum(model.roof.gentengPcs)} pcs pada bidang ${f1(model.roof.areaM2)} m2.`,
        specs: [
          `Luas bidang atap: ${f1(model.roof.areaM2)} m2 → ${fmtNum(model.roof.gentengPcs)} pcs genteng`,
          `Kemiringan ${fmtNum(model.roof.deg)}°, minimum aman genteng beton ±27,5°`,
          `Nok (ridge cap) di ketinggian +${f2(model.roof.yRidge)} m menutup pertemuan dua bidang`,
          `Overstek ${f1(model.roof.overhang)} m melindungi dinding dari guyuran hujan`,
          "Genteng dipegang paku/sekrup reng — tidak boleh bergoyang",
        ],
        rowIds: ["genteng"],
        eye: { kind: "flag", key: "showRoof" },
      };

    case "plafon":
      return {
        id,
        label: "Plafon gypsum",
        group: PART_GROUPS.atap,
        ringkas: "Gypsum 9 mm + rangka hollow galvalum 4x4, turun 10-30 cm di bawah ring balk.",
        specs: [
          `Luas plafon: ${f1(model.areas.netFloor)} m2 (mengikuti luas bersih lantai)`,
          "Rangka hollow galvalum 4x4 jarak balok 1,2 m; furring 60 cm",
          "Ruang basah memakai gypsum MO / fiber semen tahan lembap",
          "Beri ventilasi rongga atap agar panas radiasi berkurang",
        ],
        rowIds: ["plafon"],
        eye: { kind: "hidden" },
      };

    case "plester":
      return {
        id,
        label: "Plesteran & acian",
        group: PART_GROUPS.fin,
        ringkas: "Plester 1:5 tebal 10-15 mm + acian halus pada kedua muka dinding.",
        specs: [
          `Luas plester 2 sisi: ${f1(model.areas.plasterArea)} m2 (termasuk dinding pelana)`,
          "Campuran 1:5 (semen:pasir), acian siap cat",
          "Bata ringan cukup plester tipis 3-5 mm dengan mortar instan",
          `Aktif/nonaktif plesteran diatur dari panel Properti (saat ini: ${cfg.plesteran ? "aktif" : "nonaktif"} di RAB)`,
        ],
        rowIds: ["plesteran"],
        eye: { kind: "hidden" },
        noteMissing: "Item plesteran belum masuk RAB — aktifkan “Plesteran & acian” di panel Properti.",
      };

    case "cat":
      return {
        id,
        label: "Cat dinding",
        group: PART_GROUPS.fin,
        ringkas: "Primer/sealer 1 lapis + 2 lapis cat akhir di atas luas acian.",
        specs: [
          `Luas cat: ${f1(model.areas.plasterArea)} m2 (2 sisi dinding)`,
          "Warna eksterior bisa diganti di panel Properti > tab Tampilan",
          "Ruang basah memakai cat khusus tahan jamur",
        ],
        rowIds: ["cat"],
        eye: { kind: "hidden" },
      };

    // ---------------------------------------------------------- instalasi air --
    case "pipaAirBersih":
      return {
        id,
        label: "Jalur pipa air bersih",
        group: PART_GROUPS.air,
        ringkas: `PVC AW 1/2\" biru — ${fmtNum(Math.ceil(model.mep.airBersihM))} m dari meteran ke dapur & KM.`,
        specs: [
          `Panjang jalur (dari model 3D): ${f2(model.mep.airBersihM)} m`,
          "Jalur di bawah rabat (dalam urugan pasir) & naik di dalam dinding ke titik air",
          `Titik air: ${model.mep.kran} kran dapur, ${model.mep.shower} shower, ${model.mep.kloset} kloset`,
          "Sambungan lem PVC; uji tekanan sebelum ditutup plester",
        ],
        praktik: "Sambungan pipa tanam minimal 30 cm dari jalur kontak listrik.",
        rowIds: ["pipaAirBersih", "fittingAir"],
        eye: { kind: "hidden" },
      };

    case "pipaAirKotor":
      return {
        id,
        label: "Jalur pipa limbah 3\"",
        group: PART_GROUPS.air,
        ringkas: `PVC D-3\" — ${fmtNum(Math.ceil(model.mep.airKotorM))} m dari kloset/sink/shower ke septic.`,
        specs: [
          `Panjang jalur: ${f2(model.mep.airKotorM)} m`,
          "Kemiringan 1-2% ke arah septic — dipasang di bawah lantai",
          `Titik limbah: kloset, sink dapur, shower, ${model.mep.drain} floor drain`,
          "Pipa bersih & limbah dipisahkan warna (biru / hijau) di overlay sinar-X",
        ],
        rowIds: ["pipaAirKotor"],
        eye: { kind: "hidden" },
      };

    case "septic":
      return {
        id,
        label: "Septic tank + sumur resapan",
        group: PART_GROUPS.air,
        ringkas: "Septic tank beton 1,2 x 1,6 m + sumur resapan Ø1,1 m di belakang rumah.",
        specs: [
          `Posisi: ${fmtNum(Math.abs(model.mep.septic.z), 1)} m di belakang rumah (lihat overlay sinar-X)`,
          "Sumur resapan di sambungan akhir menyerap air olahan ke tanah",
          "Jarak minimal 10 m dari sumur air bersih (kesehatan lingkungan)",
          "Kendaraan sedot harus bisa mencapai titiknya di masa depan",
        ],
        rowIds: ["septicResapan"],
        eye: { kind: "hidden" },
      };

    case "meterAir":
      return {
        id,
        label: "Meter air + stop kran",
        group: PART_GROUPS.air,
        ringkas: "Titik masuk air bersih dari jaringan PDAM/sumur di sisi belakang rumah.",
        specs: [
          "Meteran + stop kran dipasang di kotak meter dekat pagar belakang (level -0,35 m)",
          "Dari meteran, pipa ½\" masuk ke bawah lantai menuju dapur & KM",
          "Stop kran memudahkan perbaikan tanpa mematikan seluruh jaringan",
        ],
        rowIds: ["pipaAirBersih", "fittingAir"],
        eye: { kind: "hidden" },
      };

    case "kran":
      return {
        id,
        label: "Kran air",
        group: PART_GROUPS.air,
        ringkas: `${model.mep.kran} titik kran pengambilan air (dapur).`,
        specs: [
          `Jumlah: ${model.mep.kran} kran (tinggi pasang ±105 cm di atas lantai)`,
          "Kran dapur + sambungan fleksibel ke bak cuci",
          "Jalur air bersih ½ inci naik di dalam dinding dari bawah lantai ke titik kran",
          "Beri stop kran (sudut) agar perbaikan tanpa mematikan seluruh jaringan",
        ],
        rowIds: ["kranAir"],
        eye: { kind: "hidden" },
      };

    case "shower":
      return {
        id,
        label: "Shower set",
        group: PART_GROUPS.air,
        ringkas: `${model.mep.shower} set shower dengan kran campur panas-dingin.`,
        specs: [
          `Jumlah: ${model.mep.shower} set (kepala shower di ketinggian ±2,05 m)`,
          "Kran campur + batang shower di dinding KM",
          "Pemasangan finishing: setelah plesteran & keramik selesai",
          "Jalur air bersih dari bawah lantai naik di dalam dinding ke shower",
        ],
        rowIds: ["showerSet"],
        eye: { kind: "hidden" },
      };

    case "kloset":
      return {
        id,
        label: "Kloset duduk",
        group: PART_GROUPS.air,
        ringkas: `${model.mep.kloset} unit kloset duduk lengkap dengan angkur & sambungan limbah.`,
        specs: [
          `Jumlah: ${model.mep.kloset} unit (sambungan ke pipa limbah 3")`,
          "Angkur baut tanam ke lantai; sambungan kloset ke jalur utama limbah",
          "Air bersih ke tangki lewat kran sudut ½ inci",
          "Jarak kloset ke dinding samping minimal 20 cm agar nyaman dipakai",
        ],
        rowIds: ["klosetDuduk"],
        eye: { kind: "hidden" },
      };

    case "drain":
      return {
        id,
        label: "Floor drain",
        group: PART_GROUPS.air,
        ringkas: `${model.mep.drain} saringan lantai KM — lantai dimiringkan ke titik ini.`,
        specs: [
          `Jumlah: ${model.mep.drain} bh (tipe lantai, di titik terendah KM)`,
          "Kemiringan lantai KM 1-2% menuju floor drain agar tidak menggenang",
          "Tutup stainless tipe lantai + trap penahan bau agar tidak bau balik",
          "Jalur limbah 3 inci di bawah lantai menuju pipa utama ke septic",
        ],
        rowIds: ["floorDrain"],
        eye: { kind: "hidden" },
      };

    // -------------------------------------------------------- instalasi listrik --
    case "listrikLampu":
      return {
        id,
        label: "Sirkuit lampu (conduit kuning)",
        group: PART_GROUPS.listrik,
        ringkas: `Conduit Ø20 + kabel NYM 2x1,5 mm² — ${fmtNum(Math.ceil(model.mep.kabelLampuM))} m dari panel ke titik lampu.`,
        specs: [
          `Panjang sirkuit lampu (dari model 3D): ${f2(model.mep.kabelLampuM)} m`,
          `Conduit PVC Ø20 mm seluruh jalur listrik: ${f2(model.mep.conduitM)} m (dipakai bersama sirkuit stop kontak)`,
          "Jalur di rongga plafon (tinggi +12 cm) lalu turun di dalam dinding ke saklar",
          "PUIL 2011: sirkuit lampu dipisahkan dari sirkuit stop kontak",
          `Titik lampu & saklar terhubung satu sirkuit — ${model.mep.titikLampu} lampu, ${model.mep.saklar} saklar`,
        ],
        rowIds: ["conduit", "kabelNym15"],
        eye: { kind: "hidden" },
      };

    case "listrikKontak":
      return {
        id,
        label: "Sirkuit stop kontak (conduit merah)",
        group: PART_GROUPS.listrik,
        ringkas: `Conduit Ø20 + kabel NYM 2x2,5 mm² — ${fmtNum(Math.ceil(model.mep.kabelKontakM))} m dari panel ke titik stop kontak.`,
        specs: [
          `Panjang sirkuit stop kontak: ${f2(model.mep.kabelKontakM)} m`,
          "Kabel 2,5 mm² untuk beban lebih besar (PUIL)",
          `Jumlah stop kontak: ${model.mep.stopkontak} titik (min. 2 per ruang + teras)`,
          "Jalur ditandai merah pada overlay sinar-X agar terbedakan dari sirkuit lampu (kuning)",
        ],
        rowIds: ["conduit", "kabelNym25"],
        eye: { kind: "hidden" },
      };

    case "titikLampu":
      return {
        id,
        label: "Titik lampu",
        group: PART_GROUPS.listrik,
        ringkas: `${model.mep.titikLampu} titik lampu (termasuk teras & belakang) dengan inbow box + armatur.`,
        specs: [
          `Jumlah: ${model.mep.titikLampu} titik — dalam rumah + teras + belakang`,
          "Inbow box tertanam + piring + armatur kecil",
          "Posisi di plafon mengikuti denah pencahayaan tiap ruang",
        ],
        rowIds: ["titikLampu"],
        eye: { kind: "hidden" },
      };

    case "saklar":
      return {
        id,
        label: "Saklar",
        group: PART_GROUPS.listrik,
        ringkas: `${model.mep.saklar} saklar tunggal/ganda — tinggi pasang standar 140 cm.`,
        specs: [
          `Jumlah: ${model.mep.saklar} bh (tinggi 140 cm, jangkauan di samping pintu)`,
          "Inbow box tertanam di dinding; grup saklar dekat pintu masuk ruang",
          "Saklar tunggal/ganda sesuai jumlah titik lampu yang dikendalikan",
          "Sirkuitnya terhubung ke kabel NYM 2x1,5 mm² dari panel",
        ],
        rowIds: ["saklarInbow"],
        eye: { kind: "hidden" },
      };

    case "stopkontak":
      return {
        id,
        label: "Stop kontak",
        group: PART_GROUPS.listrik,
        ringkas: `${model.mep.stopkontak} stop kontak — tinggi pasang standar 30 cm.`,
        specs: [
          `Jumlah: ${model.mep.stopkontak} bh (tinggi 30 cm dari lantai)`,
          "KM/WC memakai unit kedap sesuai PUIL",
          "Min. 2 titik per ruang + 1 di teras untuk kebutuhan masa depan",
        ],
        rowIds: ["stopkontakInbow"],
        eye: { kind: "hidden" },
      };

    case "panelMcb":
      return {
        id,
        label: "Panel MCB + meteran listrik",
        group: PART_GROUPS.listrik,
        ringkas: "Box MCB 4 grup + meteran listrik di dinding depan, lengkap grounding.",
        specs: [
          "Posisi: dinding depan dekat pintu utama (tinggi ±150 cm)",
          "MCB utama 10 A + pembagi grup (lampu / stop kontak) — PUIL 2011",
          "Grounding: batang tembaga 1,5 m + kabel BC ke panel",
          "Feeder PLN ke meteran ditarik di dinding luar sebelum plester",
        ],
        rowIds: ["panelMcb", "grounding"],
        eye: { kind: "hidden" },
      };

    default:
      return null;
  }
}

/** Aturan mata (show/hide) sebuah bagian — statis, tidak bergantung model. */
export function partEye(id: PartId): PartEye {
  if (id === "dinding") return { kind: "flag", key: "showDinding" };
  if (id === "rangka") return { kind: "flag", key: "showRangka" };
  if (id === "genteng") return { kind: "flag", key: "showRoof" };
  return { kind: "hidden" };
}

/** Apakah bagian sedang terlihat (untuk ikon mata di panel detail & outliner). */
export function partVisible(id: PartId, view: ViewState): boolean {
  const eye = partEye(id);
  if (eye.kind === "flag") return Boolean(view[eye.key]);
  return !(view.hidden ?? []).includes(id);
}

/** Patch view untuk toggle show/hide sebuah bagian. */
export function partTogglePatch(id: PartId, view: StudioView): Partial<StudioView> {
  const eye = partEye(id);
  if (eye.kind === "flag") return { [eye.key]: !view[eye.key] } as Partial<StudioView>;
  const has = view.hidden.includes(id);
  return { hidden: has ? view.hidden.filter((h) => h !== id) : [...view.hidden, id] };
}

/** Label singkat untuk tooltip hover / outliner. */
export function partLabel(id: PartId, model: HouseModel): string {
  const info = getPartInfo(id, model);
  return info?.label ?? id;
}
