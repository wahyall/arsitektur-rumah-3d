/**
 * Basis pengetahuan arsitektur rumah sederhana Indonesia.
 * Sumber praktik: standar SNI 8640:2018 (bata ringan), SNI 03-2965-1992
 * (pencahayaan alami), PUIL 2011 (instalasi listrik), AHSP 2022 Kementerian PUPR
 * (analisa harga satuan), serta praktik lapangan konstruksi rumah 1 lantai.
 */

export interface TahapanPekerjaan {
  no: number;
  nama: string;
  durasi: string;
  detail: string;
  cekMutu: string[];
}

export const TAHAPAN_PEKERJAAN: TahapanPekerjaan[] = [
  {
    no: 1,
    nama: "Persiapan & pengukuran",
    durasi: "1 minggu",
    detail:
      "Pembersihan lahan, pengukuran & pemasangan bouwplank (profil kayu + patok as), penentuan level lantai 15-25 cm di atas muka tanah agar bebas genangan, surat izin (PBG melalui OSS) bila diperlukan.",
    cekMutu: [
      "Diagonal bouwplank sama (6 x 6 m -> diagonal 8,485 m)",
      "As bangunan sesuai gambar & tidak melewati batas tetangga",
      "Level patok konsisten (pakai selang air / waterpass)",
    ],
  },
  {
    no: 2,
    nama: "Pondasi & galian",
    durasi: "1-2 minggu",
    detail:
      "Galian tanah sedalam 60 cm selebar 60 cm di jalur dinding (60-80 cm bila tanah gembur), urugan pasir/pasir batu 10 cm dipadatkan, lalu pasang pondasi batu kali strip 40 x 60 cm dengan campuran 1:5 (semen : pasir). Untuk tanah lunak/berair pertimbangkan footplate (bakar 80x80) di bawah kolom, atau pondasi cakar ayam (pelat beton + buis beton) yang galiannya jauh lebih sedikit.",
    cekMutu: [
      "Kedalaman galian seragam, dasar padat (tanah urug dibuang)",
      "Batu kali dipasang bertumpuk dan terikat adukan, tidak ada rongga besar",
      "Puncak pondasi rata tepat di bawah dudukan sloof (level -0,20 dari lantai ±0,00)",
    ],
  },
  {
    no: 3,
    nama: "Sloof & kolom praktis",
    durasi: "1 minggu",
    detail:
      "Cor sloof beton bertulang 15/20 cm di atas pondasi mengelilingi denah, dengan tulangan utama 6D10 dan begel 8 mm jarak 15 cm, beton K-225. Kolom praktis 15/15 cm (4D10, begel 6 mm jarak 200 mm) dipasang di tiap simpul dinding dan maksimal setiap 3 m.",
    cekMutu: [
      "Besi bersih & bekarat sebelum dicor, selimut beton 2,5-3 cm",
      "Sloof lurus & level (toleransi 5 mm), tinggi sloof di atas pondasi sesuai",
      "Posisi kolom sesuai titik simpul dinding pada denah",
    ],
  },
  {
    no: 4,
    nama: "Dinding & pasangan bata",
    durasi: "2-3 minggu",
    detail:
      "Pasangan bata mulai di atas sloof dengan acuan benang. Bata ringan (hebel) dipasang perekat instan nat 2-3 mm; bata merah dengan spesi 1:5 nat 1-1,5 cm. Ikatan berselang (setengah batu) minimal 10 cm. Sisipkan besi pengikat dinding ke kolom setiap 4-5 lapis dan pasang angkur kusen.",
    cekMutu: [
      "Kerataan vertikal dicek waterpass setiap naik 1 m",
      "Sambungan bata tidak sejajar di lapisan berturutan",
      "Bukaan pintu/jendela sesuai ukuran kusen (toleransi 5 mm)",
    ],
  },
  {
    no: 5,
    nama: "Ring balk & dinding pelana",
    durasi: "1 minggu",
    detail:
      "Cor ring balk 15/20 cm di puncak seluruh dinding untuk mengikat atap. Pada dinding ujung, pasangan naik membentuk segitiga pelana (dinding keong) mengikuti kemiringan atap. Pasang angkur/baut tanam untuk rangka atap.",
    cekMutu: [
      "Ring balk menyambungi semua kolom, begel rapat di simpul",
      "Tinggi pelana seragam di kedua ujung (cek dengan garis benang)",
      "Baut tanam rangka atap terpasang sebelum cor",
    ],
  },
  {
    no: 6,
    nama: "Rangka atap, penutup & talang",
    durasi: "1-2 minggu",
    detail:
      "Pasang kuda-kuda baja ringan C75 dengan jarak 1,0-1,2 m, reng jarak 40-45 cm (genteng beton flat), lisplank, lalu genteng (kemiringan ideal 30-40 derajat; minimum 22,5 derajat untuk genteng beton). Talang PVC di kedua eaves dengan pipa turun ke saluran.",
    cekMutu: [
      "Ridge/nok lurus, overstek (overhang) 60-100 cm melindungi dinding",
      "Genteng dipegang paku/sekrup reng, tidak ada yang bergoyang",
      "Talang arah air benar, sambungan kedap",
    ],
  },
  {
    no: 7,
    nama: "Instalasi listrik & air (rough-in)",
    durasi: "1 minggu",
    detail:
      "Penarikan instalasi di dinding & plafon sebelum plester: pipa conduit, titik lampu/stop kontak, MCB + grounding sesuai PUIL; instalasi air bersih & pipa limbah ke septic (jarak sumur min 10 m). Titik KM dapur sesuai denah sanitasi.",
    cekMutu: [
      "Uji tekanan pipa air sebelum ditutup plester",
      "Sambungan listrik dalam kotak sambung, kabel sesuai PUIL",
      "Jarak saluran kotoran > 10 m dari sumur / air bersih",
    ],
  },
  {
    no: 8,
    nama: "Plesteran, acian & plafon",
    durasi: "2 minggu",
    detail:
      "Plesteran 2 sisi campuran 1:5 tebal 10-15 mm dengan acian halus untuk siap cat. Plafon gypsum 9 mm dengan rangka hollow galvalum 4x4 cm, turun 10-30 cm di bawah rangka atap; venting plafon untuk mengurangi panas radiasi atap.",
    cekMutu: [
      "Muka plester rata 2 m ayun tidak bolong > 5 mm",
      "Sudut pertemuan dinding rapat, tidak retak rambut lebar",
      "Plafon flat, sambungan gypsum di tengah rangka",
    ],
  },
  {
    no: 9,
    nama: "Lantai rabat & keramik",
    durasi: "1-2 minggu",
    detail:
      "Urugan & pemadatan di bawah lantai, rabat beton 7,5-10 cm dengan anyam besi, screeding level, lalu pemasangan keramik 40x40/60x60. Lantai KM/WC keramik rough/anti slip dengan kemiringan 1-2% ke floor drain.",
    cekMutu: [
      "Rabat dipadatkan, tidak bonjol/turun setelah kering",
      "Keramik tapped tidak kosong (suara beda menandakan bonjol)",
      "Kemiringan lantai KM mengalir ke floor drain, tidak menggenang",
    ],
  },
  {
    no: 10,
    nama: "Finishing & serah terima",
    durasi: "1-2 minggu",
    detail:
      "Pemutihan (primer + 2 lapis cat), pemasangan daun pintu & kunci, kaca jendela, lampu & armatur, pembersihan sisa material, uji coba seluruh instalasi, dan daftar berita acara serah terima.",
    cekMutu: [
      "Cat rata, tidak ada tetes/sagging, warna seragam",
      "Semua pintu/jendela bukan-buka lancar, kunci bekerja",
      "Listrik & air diuji penuh sebelum serah terima",
    ],
  },
];

export interface DetailElemen {
  id: string;
  judul: string;
  ringkas: string;
  poin: string[];
}

export const DETAIL_ELEMEN: DetailElemen[] = [
  {
    id: "pondasi",
    judul: "Pondasi",
    ringkas: "Pondasi batu kali strip 40 x 60 cm untuk rumah 1 lantai di tanah keras; atau cakar ayam untuk tanah lunak.",
    poin: [
      "Rumah 1 lantai dinding bata ringan: pondasi batu kali strip 40-60 cm lebar, kedalaman 60-80 cm.",
      "Galian dibawah muka tanah keras; tambah urugan pasir 10 cm sebagai lantai kerja.",
      "Campuran pondasi 1 zak semen : 5 pasir (1:5), batu belah/batu kali diaduk penuh.",
      "Alternatif pondasi cakar ayam (sistem Sedyatmo, penemu insinyur Indonesia): pelat beton bertulang 6x6 m tebal 7,5-10 cm + buis beton vertikal Ø40 cm menancap 60-100 cm pada jarak 2,5-3 m. Galian jauh lebih sedikit dan menang di tanah lunak/berair, namun betonnya lebih mahal dari batu kali.",
      "Tanah lunak/daerah berair: gunakan footplate beton bertulang di titik kolom (mis. 80x80 cm) atau pondasi Sumuran bila tidak memakai cakar ayam.",
      "Puncak pondasi rata tepat di bawah sloof (level -0,20 dari lantai ±0,00; sloof 15/20 duduk di atasnya).",
    ],
  },
  {
    id: "sloof",
    judul: "Sloof (balok pondasi)",
    ringkas: "Beton bertulang 15/20 cm yang duduk di atas pondasi & memikul seluruh dinding.",
    poin: [
      "Ukuran standar rumah sederhana: 15 x 20 cm, tulangan utama 6D10 (atau 4D10 untuk beban ringan), begel 8 mm jarak 15 cm.",
      "Beton K-225 (campuran 1:2:3 atau ready mix), selimut besi 25-30 mm.",
      "Sloof mengelilingi denah dan menyambung ke seluruh kolom praktis.",
      "Fungsi: meratakan beban dinding ke pondasi & menjaga dinding dari naiknya air tanah (capillary break).",
      "Cor sloof sekaligus sebelum pasangan bata dimulai; level sloof = level lantai dikurangi tebal rabat.",
    ],
  },
  {
    id: "kolom",
    judul: "Kolom praktis & kolom utama",
    ringkas: "Kolom 15/15 di tiap simpul dinding & maksimal tiap 3 m; menjadi tulang penguat dinding.",
    poin: [
      "Kolom praktis 15 x 15 cm, 4 besi D10, begel 6 mm jarak 200 mm.",
      "Letak: setiap pertemuan dinding, sudut bangunan, kedua sisi bukaan besar, dan jarak antar kolom maks 3 m.",
      "Kolom utama (mis. 20x20 atau 25x25) diperlukan bila rumah 2 lantai atau bentang lebar.",
      "Besi kolom diangkur ke sloof (dibengkokkan masuk sloof sebelum cor).",
      "Cor kolom bertahap (per lantai dinding) dengan begisting tegak & dipadatkan dengan vibrator kayu.",
    ],
  },
  {
    id: "dinding",
    judul: "Dinding bata ringan / bata merah",
    ringkas: "Bata ringan AAC 60x20 cm nat perekat 2-3 mm; lebih cepat, lurus, dan hemat semen.",
    poin: [
      "Bata ringan sesuai SNI 8640:2018, ukuran 600 x 200 mm, tebal 75-200 mm (dinding luar 100-150 mm, sekat 75-100 mm).",
      "Perekat hebel (mortar instan): nat 2-3 mm, konsumsi sekitar 4 kg per m2 dinding (zak 40 kg).",
      "Bata merah 20x10x5 cm: pasangan 1/2 batu, spesi 1:5 nat 1-1,5 cm; AHSP PUPR memakai ±70 bata per m2. Konsumsi adukan dihitung aplikasi ini dari volume nat sebenarnya (±7-10 kg semen/m2); praktik borongan lapangan sering memesan 8-10 zak per 1000 bata sebagai cadangan loss.",
      "Sambungan antar bata minimal 10 cm (setengah panjang) dan tidak segaris antar lapisan.",
      "Dinding tinggi > 3 m atau panjang > 6 m: perlu kolom intermediate agar tidak melentur.",
      "Angkur besi dinding-kolom setiap 4-5 lapis mencegah retak pada pertemuan material beda.",
    ],
  },
  {
    id: "ringbalk",
    judul: "Ring balk & dinding pelana",
    ringkas: "Balk pengikat 15/20 di puncak dinding; menjadi dudukan rangka atap.",
    poin: [
      "Ring balk 15 x 20 cm, tulangan 4D10 + begel 6-8 mm jarak 150-200 mm.",
      "Diletakkan di puncak seluruh dinding (luar & sekat), menyatu dengan kolom praktis.",
      "Pada rumah beratap pelana, dinding ujung naik membentuk segitiga pelana di atas ring balk.",
      "Baut tanam untuk rangka baja ringan dipasang sebelum cor ring balk (atau dinabur belakangan).",
      "Ketinggian dinding ke ring balk 3,0 m umum untuk rumah sederhana (2,8-3,2 m).",
    ],
  },
  {
    id: "atap",
    judul: "Atap pelana: rangka, genteng, overstek",
    ringkas: "Kemiringan 30-40 derajat, kuda-kuda C75 jarak 1,2 m, overstek 60-100 cm.",
    poin: [
      "Kemiringan atap genteng beton: ideal 30-40 derajat (minimum aman sekitar 27,5-30 derajat; terlalu landai menyebabkan rembes).",
      "Kuda-kuda baja ringan profil C75 (0,75 mm) jarak antar rangka 1,0-1,2 m.",
      "Reng baja ringan C30 / kayu 4x6 jarak 40-45 cm untuk genteng beton flat; genteng tanah liat reng lebih rapat.",
      "Genteng beton flat kebutuhan sekitar 10 pcs per m2 bidang atap.",
      "Overstek (overhang) 60-100 cm di eaves dan 40-60 cm di sisi pelana: melindungi dinding & plester dari guyuran.",
      "Talang PVC/ seng minimal di dua sisi eaves + pipa turun; nok ditutup ridge cap agar tidak bocor.",
      "Rangka diangkur baut tanam ke ring balk, tumpuan kasau minimal 7,5 cm dudukan.",
    ],
  },
  {
    id: "plafon",
    judul: "Plafon & ventilasi atap",
    ringkas: "Gypsum 9 mm + rangka hollow galvalum; beri ventilasi rongga atap.",
    poin: [
      "Rangka hollow galvalum 4 x 4 cm (jarak balok 1,2 m), furring 3x4 atau C-rail 60 cm.",
      "Board gypsum 9 mm (ruang kering) / gypsum MO (green board) untuk KM-WC lembap.",
      "Tinggi plafon turun 10-30 cm dari ring balk, beri lubang ventilasi ujung/ pipa turun udara panas.",
      "Pilihan hemat: plafon fiber semen (gelombang halus) untuk KM/WC lebih tahan air.",
    ],
  },
  {
    id: "lantai",
    judul: "Lantai: rabat & finishing",
    ringkas: "Rabat beton 10 cm + keramik; KM/WC miring 1-2% ke floor drain.",
    poin: [
      "Urugan di bawah lantai dipadatkan tiap 20-25 cm, bukan tanah liat expansif.",
      "Rabat beton 7,5-10 cm dengan anyam besi/wiremesh 6-8 mm untuk lantai interior.",
      "Screeding level sebelum keramik; keramik 40x40 cukup untuk rumah sederhana, 60x60 tampilan lebih luas.",
      "Lantai KM/WC: keramik permukaan bertekstur (anti slip) dengan kemiringan 1-2% ke floor drain.",
      "Plinton (skirting) 10 cm melindungi pertemuan dinding-lantai dari kelembapan sapuan air.",
    ],
  },
  {
    id: "bukaan",
    judul: "Pintu, jendela & pencahayaan alami",
    ringkas: "Pintu 90x210 cm; luas jendela ideal 10-20% dari luas lantai ruangan.",
    poin: [
      "Pintu kamar 80-90 cm lebar, tinggi 200-210 cm; pintu KM 70-80 cm.",
      "Kusen kayu 6x15 cm pasangan (ditanam bersama dinding) atau kusen aluminium profil untuk jendela.",
      "Jendela minimal menghadap arah timur/barat atau sisi yang dapat angin; hindari hanya menghadap satu arah.",
      "Luas bukaan jendela: SNI penghawaan alami minimal 5% luas lantai; praktik ideal 10-20% agar ruang terang siang hari (SNI 03-2965 tentang pencahayaan alami).",
      "Jendela KM/WC beri ventilasi atas / kaca nako permanen untuk pertukaran udara.",
    ],
  },
  {
    id: "kusen",
    judul: "Kusen pintu & jendela",
    ringkas: "Kusen kayu berprofil (tiang + ambang + lis) atau aluminium; ditanam bersama pasangan dinding.",
    poin: [
      "Kusen kayu kamper/merbau 5-6 cm tebal, lebar mengikuti tebal dinding; pasang waterpass saat dinding naik dan siapkan angkur setiap 60 cm.",
      "Pintu kamar 80-90 x 200-210 cm; pintu KM 70-80 cm; jendela berkaca 5 mm dengan palang pembagi.",
      "Kusen aluminium profil: hemat, tidak lapuk, cocok untuk jendela & area basah; kusen kayu lebih hangat untuk pintu utama.",
      "Ambang bawah jendela (sill) miring 5-10 derajat ke luar agar air hujan tidak meresap ke dinding.",
      "Daun pintu panel 2 susun dipasang dengan engsel 3 buah + handle; sisi KM sebaiknya daun PVC/aluminium tahan air.",
    ],
  },
  {
    id: "lubangangin",
    judul: "Lubang angin permanen (roster)",
    ringkas: "Roster beton/kisi permanen di dinding & dinding pelana: penghawaan pasif 24 jam tanpa listrik.",
    poin: [
      "Letak efektif dekat puncak dinding (sekitar 60 cm di bawah ring balk) karena udara panas naik dan keluar lewat lubang atas.",
      "Dinding pelana (segitiga atap) wajib diberi ventilasi rongga atap — roster atau kisi kayu — untuk membuang udara panas di bawah atap dan menjaga genteng tidak rembes.",
      "Roster beton 20x20 cm sekitar Rp10-50 ribu/buah tergantung motif; lubang lebar 40-60 cm memakai 2-3 roster berjejer.",
      "Berikan roster di KM/WC dan dapur agar uap & bau mengalir keluar tanpa membuka jendela; tambahkan kasa nyamuk bila perlu.",
      "Jumlah lubang angin permanen pada model ini dihitung otomatis dari denah dan masuk RAB (divisi pekerjaan dinding).",
    ],
  },
  {
    id: "plestercat",
    judul: "Plesteran, acian & cat dinding",
    ringkas: "Plester 1:5 tebal 10-15 mm + acian halus, lalu cat primer + 2 lapis akhir.",
    poin: [
      "Plesteran dinding 2 sisi campuran 1:5 (semen : pasir) tebal rata 10-15 mm; bata ringan cukup plester tipis 3-5 mm dengan mortar instan.",
      "Acian halus (cement finish) membuat muka dinding siap cat dan menutup nat bata dengan rata.",
      "Sistem cat: 1 lapis primer/sealer (menutup pori & menyamakan dasar) + 2 lapis cat akhir; ruang basah memakai cat khusus tahan jamur.",
      "Warna terang memantulkan cahaya dan membuat ruang terasa lebih luas; model ini menyediakan pilihan warna cat eksterior.",
      "Luas plester & cat dihitung dari model 3D (2 sisi dinding termasuk dinding pelana) — cek tahapan 7-8 untuk melihat prosesnya.",
    ],
  },
  {
    id: "sanitasi",
    judul: "Air bersih, limbah & listrik",
    ringkas: "Instalasi tertanam sebelum plester; listrik sesuai PUIL.",
    poin: [
      "Air bersih: pipa PPR/PVC 1/2-3/4 inch; sambungan tanam minimal 30 cm dari kontak listrik.",
      "Limbah: pipa PVC 3-4 inch dengan kemiringan 1-2%; septic tank + resapan (jarak min 10 m dari sumur).",
      "Listrik sesuai PUIL: MCB utama 10-16 A, kabel 1,5 mm2 lampu / 2,5 mm2 stop kontak, grounding ke batang tembaga.",
      "Banyak titik stop kontak diantisipasi sejak conduit (min 2 titik per ruang + luar).",
      "Semua pipa & kabel dites sebelum ditutup plester (uji tekanan air, uji isolasi/Continuity).",
    ],
  },
];

export interface StandarAcuan {
  kode: string;
  judul: string;
  keterangan: string;
}

export const STANDAR_ACUAN: StandarAcuan[] = [
  {
    kode: "SNI 8640:2018",
    judul: "Spesifikasi bata ringan (AAC) untuk pasangan dinding",
    keterangan: "Ukuran 600 x 200 mm, toleransi & mutu bata ringan yang dipakai aplikasi ini.",
  },
  {
    kode: "SNI 03-2965:1992",
    judul: "Tata cara perancangan sistem pencahayaan alami",
    keterangan: "Dasar perbandingan luas bukaan cahaya terhadap luas lantai ruangan.",
  },
  {
    kode: "PUIL 2011 (SNI 0225)",
    judul: "Persyaratan umum instalasi listrik",
    keterangan: "Kapasitas MCB, ukuran kabel, titik lampu/stop kontak, dan grounding.",
  },
  {
    kode: "AHSP 2022",
    judul: "Analisa Harga Satuan Pekerjaan (Kementerian PUPR)",
    keterangan: "Acuan harga satuan pekerjaan pondasi, sloof, kolom, plesteran, dan atap pada RAB aplikasi ini.",
  },
  {
    kode: "PBI & PBG 2021",
    judul: "Persyaratan bangunan gedung / izin PBG via OSS",
    keterangan: "Ketentuan batas (KDB), jarak tepi bangunan ke tetangga, dan proses pengajuan PBG.",
  },
];

export const TIPS_PRAKTIS: string[] = [
  "Belanja material bertahap: pondasi & struktur dulu, dinding, lalu atap — agar uang tidak terikat di tempat yang salah.",
  "Simpan 5-10% anggaran sebagai cadangan (contingency) untuk kenaikan harga & pekerjaan tak terduga.",
  "Bata ringan lebih mahal per buah dari bata merah, tapi dinding lebih cepat berdiri, lurus tanpa plester tebal, dan beban struktur lebih ringan (pondasi bisa lebih ekonomis).",
  "Pekerjaan atap sebaiknya selesai sebelum musim hujan, agar plesteran & lantai tidak terendam.",
  "Air bersih & saluran limbah dipikirkan sejak awal: posisi KM, jalur pipa, dan septic menentukan denah & kedalaman galian.",
  "Cek ulang semua ukuran di lapangan dengan denah aplikasi ini (bouwplank) sebelum galian; kesalahan 10 cm di pondasi sulit diperbaiki.",
  "Pilih pondasi sesuai tanah: batu kali untuk tanah keras (paling ekonomis), cakar ayam bila tanah lunak/berair atau lahan sempit galian.",
  "Gunakan fitur Tahapan Pembangunan di panel 3D untuk memahami urutan kerja sebelum bicara dengan tukang/kontraktor.",
];

export interface ConstructionStage {
  no: number;
  nama: string;
  durasi: string;
  deskripsi: string; // apa yang tampak pada model 3D saat tahap ini dipilih
  cek: string[]; // cek mutu lapangan
}

/** Tahapan simulasi konstruksi pada model 3D (dipakai panel Tahapan Pembangunan). */
export const CONSTRUCTION_STAGES: ConstructionStage[] = [
  {
    no: 1,
    nama: "Pondasi",
    durasi: TAHAPAN_PEKERJAAN[1].durasi,
    deskripsi:
      "Kondisi awal: galian & pondasi terlihat di bawah permukaan tanah (batu kali strip, atau pelat + buis cakar ayam). Dinding, lantai & atap belum dibangun — perhatikan posisi buis/titik kolom.",
    cek: TAHAPAN_PEKERJAAN[1].cekMutu,
  },
  {
    no: 2,
    nama: "Sloof & kolom",
    durasi: TAHAPAN_PEKERJAAN[2].durasi,
    deskripsi:
      "Sloof beton 15/20 mengelilingi denah di atas pondasi dan kolom praktis 15/15 berdiri di tiap simpul dinding — tulang bangunan terpasang sebelum pasangan bata dimulai.",
    cek: TAHAPAN_PEKERJAAN[2].cekMutu,
  },
  {
    no: 3,
    nama: "Dinding & kusen",
    durasi: TAHAPAN_PEKERJAAN[3].durasi,
    deskripsi:
      "Pasangan bata naik di atas sloof batu demi batu, bersamaan pemasangan kusen pintu/jendela dan lubang angin permanen (roster) di dekat puncak dinding.",
    cek: TAHAPAN_PEKERJAAN[3].cekMutu,
  },
  {
    no: 4,
    nama: "Ring balk & pelana",
    durasi: TAHAPAN_PEKERJAAN[4].durasi,
    deskripsi:
      "Ring balk 15/20 dicor di puncak seluruh dinding; di kedua ujung, pasangan naik membentuk segitiga pelana mengikuti kemiringan atap, lengkap dengan roster ventilasi rongga atap.",
    cek: TAHAPAN_PEKERJAAN[4].cekMutu,
  },
  {
    no: 5,
    nama: "Rangka atap",
    durasi: TAHAPAN_PEKERJAAN[5].durasi,
    deskripsi:
      "Kuda-kuda baja ringan C75 lengkap dengan web pengaku, reng, dan lisplank dipasang di atas ring balk — sebelum penutup atap, struktur rangka terlihat penuh dari bawah.",
    cek: TAHAPAN_PEKERJAAN[5].cekMutu,
  },
  {
    no: 6,
    nama: "Genteng & plafon",
    durasi: TAHAPAN_PEKERJAAN[5].durasi,
    deskripsi:
      "Genteng beton flat dipasang di atas reng lengkap dengan nok di puncak, overstek melindungi dinding, plafon gypsum dipasang di bawah rangka, talang di kedua eaves.",
    cek: TAHAPAN_PEKERJAAN[5].cekMutu,
  },
  {
    no: 7,
    nama: "Plesteran & acian",
    durasi: TAHAPAN_PEKERJAAN[7].durasi,
    deskripsi:
      "Seluruh muka dinding (termasuk dinding pelana) ditutup plesteran 1:5 tebal 10-15 mm dan acian halus — susunan bata tidak lagi terlihat dari luar.",
    cek: TAHAPAN_PEKERJAAN[7].cekMutu,
  },
  {
    no: 8,
    nama: "Cat & finishing",
    durasi: TAHAPAN_PEKERJAAN[9].durasi,
    deskripsi:
      "Cat dinding (primer + 2 lapis) dengan warna pilihan Anda, lantai keramik selesai, pintu-jendela & roster terpasang penuh — rumah siap dihuni.",
    cek: TAHAPAN_PEKERJAAN[9].cekMutu,
  },
];
