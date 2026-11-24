/**
 * Scene 3D rumah (denah 6x6 m): instancing bata per dinding, mortar/nat, kusen
 * berprofil, pintu, jendela, lubang angin permanen (roster), pondasi batu kali
 * ATAU cakar ayam (pelat + buis), sloof, kolom praktis, ring balk, plester + cat,
 * atap pelana lengkap (kuda-kuda baja ringan + web, reng, genteng, lisplank, nok),
 * label ruangan, potongan (clipping), EXPLODED VIEW GRANULAR — bongkar batu demi
 * batu, pintu demi pintu, besi demi besi lewat registry per-komponen — dan
 * SIMULASI KONSTRUKSI BERTAHAP (stage 1..8: pondasi -> sloof -> dinding -> pelana ->
 * rangka atap -> genteng -> plester -> cat).
 * INSTALASI AIR & LISTRIK (MEP): pipa air bersih PVC 1/2" (biru), limbah 3"
 * (hijau-teal), conduit + kabel listrik (kuning sirkuit lampu / merah sirkuit
 * stop kontak), titik lampu/saklar/stop kontak/panel MCB/meteran air, septic
 * tank + sumur resapan — digambar sebagai OVERLAY SINAR-X (depthTest dimatikan)
 * sehingga jalur yang tertanam di dinding, bawah lantai & bawah tanah tetap
 * terbaca, seperti denah instalasi pada bangunan existing.
 * Denah memakai (x, y) meter -> three: X = x, Z = y, Y = ketinggian.
 * Ridge atap memanjang sepanjang sumbu Z (dinding ujung pelana = depan/belakang).
 */
import * as THREE from "three";
import type { HouseModel, WallRT, OpeningSpec, CakarAyamRT } from "@/lib/house/engine";
import { RB_H, CAKAR, PONDASI_W, PONDASI_D } from "@/lib/house/engine";

/**
 * EXPLODED VIEW granular: registry per-komponen.
 * Setiap komponen (mesh tunggal atau instanced) menyimpan posisi basis + vektor
 * offset penuh pada k = 1. Arah offset dihitung dari posisi asal komponen
 * relatif susunan bangunan (normal dinding keluar, radial dari pusat denah,
 * angkat per lapisan) sehingga hubungan spasial umum antar komponen tetap
 * terbaca saat seluruh bangunan mengurai menjadi potongan-potongan kecil.
 */
interface ExplodePiece {
  obj: THREE.Object3D;
  base: THREE.Vector3; // posisi terpasang
  off: THREE.Vector3; // offset penuh saat explode = 1
}

/** InstancedMesh (bata / genteng / keramik): offset per instance. */
interface ExplodeInstanced {
  im: THREE.InstancedMesh;
  n: number;
  pos: Float32Array;
  off: Float32Array;
  quat: Float32Array;
  scl: Float32Array;
}

export interface ViewState {
  showRoof: boolean; // genteng + nok
  showRangka: boolean; // kuda-kuda + reng (rangka baja ringan)
  showStruktur: boolean; // sloof + kolom praktis + ring balk
  showDinding: boolean; // pasangan bata + plester terlihat (mode bebas)
  showLabels: boolean;
  showFinishing: boolean; // plester + cat di mode bebas (stage 0)
  showAir: boolean; // jalur pipa air bersih & limbah (overlay sinar-X)
  showListrik: boolean; // jalur listrik: conduit + titik lampu/saklar/stop kontak
  explode: number; // 0..1 — tingkat exploded view granular (bata demi bata)
  cutH: number; // ketinggian potongan (m); >= 1000 = tidak dipotong
  stage: number; // 0 = kendali bebas (flag manual); 1..8 = tahapan konstruksi
  paintHex: string; // warna cat eksterior (hex)
  hidden?: string[]; // id bagian yang disembunyikan pengguna (parts.ts)
}

/** Flag visibilitas tiap lapisan bangunan (diturunkan dari stage / flag manual). */
interface StageVis {
  pondasi: boolean;
  sloof: boolean;
  kolom: boolean;
  dinding: boolean;
  pelana: boolean;
  ringbalk: boolean;
  kusen: boolean;
  lantai: boolean;
  rangka: boolean;
  genteng: boolean;
  plafon: boolean;
  plester: boolean;
  cat: boolean;
}

type CameraPreset = "3d" | "depan" | "belakang" | "samping" | "atas";

/** Muka tanah situs: 20 cm di bawah level lantai ±0,00 (praktik 15-25 cm agar bebas genangan). */
const GROUND_Y = -0.2;
/** Kedalaman top pondasi di bawah lantai = dudukan sloof 15/20 (dasar galian di -0,8 m). */
const PONDASI_TOP = -0.2;
/** Id bagian (parts.ts) untuk tiap jenis titik MEP (klik & visibilitas). */
const MEP_POINT_PART: Record<string, string> = {
  lampu: "titikLampu",
  saklar: "saklar",
  stopkontak: "stopkontak",
  panel: "panelMcb",
  meter_air: "meterAir",
  kran: "kran",
  shower: "shower",
  kloset: "kloset",
  drain: "drain",
};


export class HouseScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private houseRoot: THREE.Group = new THREE.Group();
  private plotMesh: THREE.Mesh | null = null;
  private kolomGroup: THREE.Group = new THREE.Group();
  private roofGroup: THREE.Group = new THREE.Group();
  private tilesGroup: THREE.Group = new THREE.Group();
  private trussGroup: THREE.Group = new THREE.Group();
  private lisplankGroup: THREE.Group = new THREE.Group();
  private labelGroup: THREE.Group = new THREE.Group();
  private clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000);
  private disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
  /** Sumber daya per-frame model (dibersihkan tiap update agar tidak membebani memori GPU). */
  private dyn: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
  /** Sumber daya anotasi dimensi (dibersihkan tiap rebuildDims). */
  private dimsDyn: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
  private ro: ResizeObserver;

  // --- studio editor (tema gelap ala Blender): proyeksi, lingkungan, dimensi ---
  private cameraOrtho: THREE.OrthographicCamera = new THREE.OrthographicCamera(-6, 6, 6, -6, 0.1, 300);
  private useOrtho = false;
  private gridHelper!: THREE.GridHelper;
  private groundMesh!: THREE.Mesh;
  private dimsGroup: THREE.Group = new THREE.Group();
  private dimsOn = false;
  private lastModel: HouseModel | null = null;
  private lastView: ViewState | null = null;
  // --- exploded view granular: registry per-komponen + animasi easing per-frame
  private explodePieces: ExplodePiece[] = [];
  private explodeInstanced: ExplodeInstanced[] = [];
  private explodeK = 0; // nilai animasi berjalan (0..1)
  private explodeTarget = 0; // target dari view.explode
  private groundSemi = false; // tanah diberi transparansi (tahap pondasi / explode)
  private mepFade: [THREE.MeshStandardMaterial, number][] = [];
  private envVisible = { grid: true, ground: true, plot: true };
  private buildingMats: THREE.MeshStandardMaterial[] = [];
  private matDim: THREE.LineBasicMaterial = new THREE.LineBasicMaterial({
    color: 0xdadfe4,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  });

  // orbit state
  private target = new THREE.Vector3(3, 1.2, 3);
  private sph = { radius: 13, theta: Math.PI * 0.15, phi: 1.02 };
  private pointers = new Map<number, { x: number; y: number }>();
  private panMode = false;
  private pinchDist = 0;
  private raf = 0;

  // --- interaksi pilih-bagian (klik raycast): tag mesh -> id bagian (parts.ts),
  // tooltip hover, dan highlight seleksi via klon material emissive ---
  private raycaster = new THREE.Raycaster();
  private pickables: THREE.Object3D[] = [];
  private pickHandlers: {
    onPick?: (part: string | null) => void;
    onHover?: (part: string | null, x: number, y: number) => void;
  } = {};
  private selectedPart: string | null = null;
  private hiMats = new Map<THREE.Material, THREE.Material>(); // material asli -> klon highlight
  private hiObjs: { obj: THREE.Mesh; mat: THREE.Material }[] = [];
  private lastHover: string | null = null;
  private hoverThrottle = 0;
  private downPos: { x: number; y: number; t: number; button: number } | null = null;

  private matBrick = new THREE.MeshStandardMaterial({ color: 0xeceae3, roughness: 0.92, metalness: 0 });
  private matMortar = new THREE.MeshStandardMaterial({ color: 0x9d9d96, roughness: 0.95 });
  private matKusen = new THREE.MeshStandardMaterial({ color: 0x83552d, roughness: 0.7 });
  private matPintu = new THREE.MeshStandardMaterial({ color: 0x6f4423, roughness: 0.65 });
  private matKaca = new THREE.MeshStandardMaterial({
    color: 0xd9e4ea,
    transparent: true,
    opacity: 0.32,
    roughness: 0.15,
    depthWrite: false,
  });
  private matPlinth = new THREE.MeshStandardMaterial({ color: 0xb4b1a8, roughness: 0.9 });
  private matBeton = new THREE.MeshStandardMaterial({ color: 0x8f9089, roughness: 0.82 });
  private matBuis = new THREE.MeshStandardMaterial({ color: 0x6f716a, roughness: 0.82 });
  // lantai: rabat beton buram (warna nat gelap) + keramik mengilap (krem) /
  // anti-slip abu untuk ruang basah
  private matRabat = new THREE.MeshStandardMaterial({ color: 0x6f6c66, roughness: 0.95 });
  private matKeramik = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.35, metalness: 0.02 });
  private matKeramikBasah = new THREE.MeshStandardMaterial({ color: 0x8e939a, roughness: 0.85 });
  private matAtap = new THREE.MeshStandardMaterial({ color: 0x555d63, roughness: 0.85 });
  private matBaja = new THREE.MeshStandardMaterial({ color: 0x9aa8b2, roughness: 0.45, metalness: 0.55 });
  private matGenteng = new THREE.MeshStandardMaterial({ color: 0x96524a, roughness: 0.75 });
  private matLisplank = new THREE.MeshStandardMaterial({ color: 0xd8c9a8, roughness: 0.8 });
  private matPlafon = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.95 });
  private matRidge = new THREE.MeshStandardMaterial({ color: 0x7c3f38, roughness: 0.8 });
  private matPlester = new THREE.MeshStandardMaterial({ color: 0x9b978d, roughness: 0.95 });
  private matCatInt = new THREE.MeshStandardMaterial({ color: 0xf7f4ee, roughness: 0.55 });
  private matCatExt = new THREE.MeshStandardMaterial({ color: 0xf2ecdf, roughness: 0.5 });
  private matVent = new THREE.MeshStandardMaterial({ color: 0x393933, roughness: 0.9 });
  private matVentFrame = new THREE.MeshStandardMaterial({ color: 0xc9c3b6, roughness: 0.9 });
  private matPintuGelap = new THREE.MeshStandardMaterial({ color: 0x5b3a1c, roughness: 0.6 });
  private matGround = new THREE.MeshStandardMaterial({ color: 0x5a634e, roughness: 1, transparent: true, opacity: 1 });
  private matPlot = new THREE.MeshStandardMaterial({ color: 0x77855d, roughness: 1, transparent: true, opacity: 1 });

  // --- MEP (instalasi air & listrik): overlay sinar-X, depthTest dimatikan agar
  // pipa tertanam di dinding/lantai/tanah tetap terbaca (tidak terpotong clipping) ---
  private mepGroup: THREE.Group = new THREE.Group();
  private matPipeBersih = new THREE.MeshStandardMaterial({ color: 0x4c9ee8, roughness: 0.4, transparent: true, opacity: 0.92, depthTest: false });
  private matPipeKotor = new THREE.MeshStandardMaterial({ color: 0x4f9d8d, roughness: 0.4, transparent: true, opacity: 0.92, depthTest: false });
  private matKabelLampu = new THREE.MeshStandardMaterial({ color: 0xf2c14e, roughness: 0.45, transparent: true, opacity: 0.92, depthTest: false });
  private matKabelKontak = new THREE.MeshStandardMaterial({ color: 0xe05b4d, roughness: 0.45, transparent: true, opacity: 0.92, depthTest: false });
  private matMepLampu = new THREE.MeshStandardMaterial({ color: 0xf7d774, emissive: 0x7a5c12, emissiveIntensity: 0.55, roughness: 0.5, transparent: true, opacity: 0.95, depthTest: false });
  private matMepPlate = new THREE.MeshStandardMaterial({ color: 0xf0ead9, roughness: 0.6, transparent: true, opacity: 0.95, depthTest: false });
  private matMepPanel = new THREE.MeshStandardMaterial({ color: 0xd6dade, roughness: 0.5, transparent: true, opacity: 0.95, depthTest: false });
  private matMepAir = new THREE.MeshStandardMaterial({ color: 0x4c9ee8, roughness: 0.45, transparent: true, opacity: 0.95, depthTest: false });
  private matMepKloset = new THREE.MeshStandardMaterial({ color: 0xf5f5f2, roughness: 0.35, transparent: true, opacity: 0.95, depthTest: false });
  private matMepDrain = new THREE.MeshStandardMaterial({ color: 0x9aa8b2, roughness: 0.5, transparent: true, opacity: 0.95, depthTest: false });
  private matSeptic = new THREE.MeshStandardMaterial({ color: 0x9aa8b2, roughness: 0.7, transparent: true, opacity: 0.55, depthTest: false });
  private matResapan = new THREE.MeshStandardMaterial({ color: 0x8a7f6a, roughness: 0.9, transparent: true, opacity: 0.55, depthTest: false });

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.localClippingEnabled = true;
    this.renderer.setClearColor(0x232629);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);

    const mats = [
      this.matBrick, this.matMortar, this.matKusen, this.matPintu, this.matKaca,
      this.matPlinth, this.matBeton, this.matBuis, this.matRabat, this.matKeramik,
      this.matKeramikBasah, this.matAtap, this.matBaja,
      this.matGenteng, this.matLisplank, this.matPlafon, this.matRidge,
      this.matPlester, this.matCatInt, this.matCatExt, this.matVent,
      this.matVentFrame, this.matPintuGelap,
    ];
    this.buildingMats = mats;
    for (const m of mats) m.clippingPlanes = [this.clipPlane];
    // material overlay MEP yang di-fade saat exploded view agar struktur yang
    // mengurai tetap terbaca (nilai opacity dasar disimpan per material)
    this.mepFade = [
      [this.matPipeBersih, 0.92],
      [this.matPipeKotor, 0.92],
      [this.matKabelLampu, 0.92],
      [this.matKabelKontak, 0.92],
      [this.matMepLampu, 0.95],
      [this.matMepPlate, 0.95],
      [this.matMepPanel, 0.95],
      [this.matMepAir, 0.95],
      [this.matMepKloset, 0.95],
      [this.matMepDrain, 0.95],
    ];

    // pencahayaan (dikalibrasi agar warna cat tidak terpotong putih)
    const hemi = new THREE.HemisphereLight(0xf6f7f4, 0x8f9483, 0.75);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff4e0, 1.1);
    dir.position.set(10, 15, 9);
    dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048);
    const sc = dir.shadow.camera as THREE.OrthographicCamera;
    sc.left = -10;
    sc.right = 14;
    sc.top = 14;
    sc.bottom = -8;
    sc.near = 1;
    sc.far = 50;
    dir.shadow.bias = -0.0004;
    this.scene.add(dir);

    // tanah + petak 6x6
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    this.disposables.push(groundGeo);
    const ground = new THREE.Mesh(groundGeo, this.matGround);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = GROUND_Y;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.groundMesh = ground;

    const grid = new THREE.GridHelper(60, 60, 0x3f4347, 0x333739);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.4;
    grid.position.y = GROUND_Y + 0.002;
    this.scene.add(grid);
    this.gridHelper = grid;

    const plotGeo = new THREE.PlaneGeometry(6, 6);
    this.disposables.push(plotGeo);
    const plot = new THREE.Mesh(plotGeo, this.matPlot);
    plot.rotation.x = -Math.PI / 2;
    plot.position.set(3, GROUND_Y + 0.005, 3);
    plot.receiveShadow = true;
    this.scene.add(plot);
    this.plotMesh = plot;

    const outlineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, GROUND_Y + 0.01, 0),
      new THREE.Vector3(6, GROUND_Y + 0.01, 0),
      new THREE.Vector3(6, GROUND_Y + 0.01, 6),
      new THREE.Vector3(0, GROUND_Y + 0.01, 6),
      new THREE.Vector3(0, GROUND_Y + 0.01, 0),
    ]);
    const outlineMat = new THREE.LineBasicMaterial({ color: 0x3f4a3a });
    this.disposables.push(outlineGeo, outlineMat);
    this.scene.add(new THREE.Line(outlineGeo, outlineMat));

    this.scene.add(this.houseRoot);
    this.houseRoot.add(this.kolomGroup);
    this.scene.add(this.roofGroup);
    this.roofGroup.add(this.tilesGroup);
    this.roofGroup.add(this.trussGroup);
    this.roofGroup.add(this.lisplankGroup);
    this.scene.add(this.labelGroup);
    this.scene.add(this.dimsGroup);
    this.scene.add(this.mepGroup);

    this.initOrbit();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement ?? canvas);
    this.resize();
    this.loop();
  }

  // ------------------------------------------------------------- controls --

  private initOrbit() {
    this.canvas.style.touchAction = "none";
    this.canvas.addEventListener("pointerdown", this.onDown);
    this.canvas.addEventListener("pointermove", this.onMove);
    this.canvas.addEventListener("pointerup", this.onUp);
    this.canvas.addEventListener("pointercancel", this.onUp);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.canvas.addEventListener("pointerleave", this.onLeave);
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  private onDown = (e: PointerEvent) => {
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.panMode = e.button === 1 || e.button === 2 || e.shiftKey;
    this.downPos = { x: e.clientX, y: e.clientY, t: performance.now(), button: e.button };
    if (this.pointers.size === 2) {
      const pts = [...this.pointers.values()];
      this.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  };

  private onMove = (e: PointerEvent) => {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) {
      // gerakan kursor tanpa tombol tertekan: cek bagian di bawah kursor (tooltip)
      this.hoverAt(e);
      return;
    }
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pointers.size === 2) {
      const pts = [...this.pointers.values()];
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (this.pinchDist > 0) this.sph.radius = THREE.MathUtils.clamp(this.sph.radius * (this.pinchDist / d), 3, 45);
      this.pinchDist = d;
      return;
    }
    if (this.panMode) this.pan(dx, dy);
    else {
      this.sph.theta -= dx * 0.0055;
      this.sph.phi = THREE.MathUtils.clamp(this.sph.phi - dy * 0.0045, 0.06, Math.PI * 0.495);
    }
  };

  private onUp = (e: PointerEvent) => {
    const dp = this.downPos;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchDist = 0;
    this.downPos = null;
    // klik tunggal tanpa seret/pan = pilih bagian bangunan (raycast);
    // klik pada ruang kosong = batalkan seleksi
    if (dp && dp.button === 0 && e.button === 0 && !this.panMode) {
      const dist = Math.hypot(e.clientX - dp.x, e.clientY - dp.y);
      if (dist < 6 && performance.now() - dp.t < 600) this.pickAt(e.clientX, e.clientY);
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.sph.radius = THREE.MathUtils.clamp(this.sph.radius * (1 + e.deltaY * 0.0011), 3, 45);
  };

  private pan(dx: number, dy: number) {
    const fwd = new THREE.Vector3().subVectors(this.target, this.camPos()).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), fwd).normalize();
    const k = this.sph.radius * 0.0012;
    this.target.addScaledVector(right, -dx * k);
    this.target.addScaledVector(fwd, -dy * k);
    this.target.x = THREE.MathUtils.clamp(this.target.x, -6, 12);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -6, 12);
    this.target.y = 1.2;
  }

  setCameraPreset(p: CameraPreset) {
    if (p === "depan") {
      this.target.set(3, 2.0, 3);
      this.sph = { radius: 12.5, theta: 0, phi: 1.3 };
    } else if (p === "belakang") {
      this.target.set(3, 2.0, 3);
      this.sph = { radius: 12.5, theta: Math.PI, phi: 1.3 };
    } else if (p === "samping") {
      this.target.set(3, 2.0, 3);
      this.sph = { radius: 12.5, theta: Math.PI / 2, phi: 1.3 };
    } else if (p === "atas") {
      this.target.set(3, 0, 3);
      this.sph = { radius: 13.5, theta: Math.PI * 0.001, phi: 0.03 };
    } else {
      this.target.set(3, 1.4, 3);
      this.sph = { radius: 13, theta: Math.PI * 0.15, phi: 1.02 };
    }
  }

  /** Proyeksi ortografis (gambar teknik) atau perspektif (eksplorasi bebas). */
  setProjection(ortho: boolean) {
    this.useOrtho = ortho;
    this.syncOrtho();
  }

  /** Toggle lingkungan studio: grid lantai, bidang tanah, petak 6x6. */
  setEnvironment(opts: Partial<{ grid: boolean; ground: boolean; plot: boolean }>) {
    Object.assign(this.envVisible, opts);
    this.gridHelper.visible = this.envVisible.grid;
    this.groundMesh.visible = this.envVisible.ground;
    if (this.plotMesh) this.plotMesh.visible = this.envVisible.plot;
  }

  /** Mode shading: solid (standar) atau wireframe arsitektur. */
  setWireframe(on: boolean) {
    for (const m of this.buildingMats) m.wireframe = on;
    for (const m of this.hiMats.values()) (m as THREE.MeshStandardMaterial).wireframe = on; // klon highlight ikut mode
  }

  /** Anotasi dimensi 3D (lebar-kedalaman-tinggi + level lantai/dinding/nok). */
  setDims(on: boolean) {
    this.dimsOn = on;
    this.rebuildDims();
  }

  // --------------------------------------------- interaksi pilih bagian (pick) --

  /** Daftarkan callback dari React: pilih bagian (klik) & tooltip hover. */
  setPickHandlers(
    h: {
      onPick?: (part: string | null) => void;
      onHover?: (part: string | null, x: number, y: number) => void;
    },
  ) {
    this.pickHandlers = h;
  }

  /** Set bagian terpilih (highlight emissive di 3D); null = tanpa seleksi. */
  setSelection(part: string | null) {
    if (this.selectedPart === part) return;
    this.selectedPart = part;
    this.restoreHighlight();
    this.applyHighlight();
  }

  private restoreHighlight() {
    for (const h of this.hiObjs) h.obj.material = h.mat;
    this.hiObjs.length = 0;
  }

  /** Highlight seluruh mesh milik bagian terpilih (klon material + emissive). */
  private applyHighlight() {
    const part = this.selectedPart;
    if (!part) return;
    for (const root of this.pickables) {
      if (root.userData.pick !== part) continue;
      root.traverse((c) => {
        const mesh = c as THREE.Mesh;
        if (!mesh.isMesh || !mesh.material) return;
        const orig = mesh.material as THREE.Material;
        let hi = this.hiMats.get(orig);
        if (!hi) {
          hi = orig.clone();
          const std = hi as THREE.MeshStandardMaterial;
          if (std.isMeshStandardMaterial) {
            std.emissive = new THREE.Color(0xd97a2b);
            std.emissiveIntensity = 0.45;
          }
          hi.clippingPlanes = [this.clipPlane];
          (hi as THREE.MeshStandardMaterial).wireframe = (orig as THREE.MeshStandardMaterial).wireframe;
          this.hiMats.set(orig, hi);
        }
        this.hiObjs.push({ obj: mesh, mat: orig });
        mesh.material = hi;
      });
    }
  }

  /** Raycast dari koordinat layar; id bagian via walk-up ke objek/grup bertag. */
  private raycastPart(cx: number, cy: number): string | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return null;
    const ndc = new THREE.Vector2(
      ((cx - rect.left) / rect.width) * 2 - 1,
      -((cy - rect.top) / rect.height) * 2 + 1,
    );
    const cam: THREE.Camera = this.useOrtho ? this.cameraOrtho : this.camera;
    this.raycaster.setFromCamera(ndc, cam);
    const hits = this.raycaster.intersectObjects(this.pickables, true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o) {
        if (o.userData?.pick) return o.userData.pick as string;
        o = o.parent;
      }
    }
    return null;
  }

  /** Klik kanvas: pilih bagian & umpankan id-nya ke React. */
  private pickAt(cx: number, cy: number) {
    const part = this.raycastPart(cx, cy);
    if (part !== this.selectedPart) this.setSelection(part);
    this.pickHandlers.onPick?.(part);
  }

  /** Hover tanpa tekan: tooltip nama bagian + kursor pointer (dithrottle 70 ms). */
  private hoverAt(e: PointerEvent) {
    const now = performance.now();
    if (now - this.hoverThrottle < 70) return;
    this.hoverThrottle = now;
    const part = this.raycastPart(e.clientX, e.clientY);
    this.canvas.style.cursor = part ? "pointer" : "";
    if (part !== this.lastHover) {
      this.lastHover = part;
      const rect = this.canvas.getBoundingClientRect();
      this.pickHandlers.onHover?.(part, e.clientX - rect.left, e.clientY - rect.top);
    }
  }

  private onLeave = () => {
    this.lastHover = null;
    this.pickHandlers.onHover?.(null, 0, 0);
    this.canvas.style.cursor = "";
  };

  /** Tandai objek (mesh / grup) sebagai bagian yang bisa diklik (raycast). */
  private tag(obj: THREE.Object3D, part: string) {
    obj.userData.pick = part;
    this.pickables.push(obj);
    return obj;
  }

  private camPos(): THREE.Vector3 {
    const { radius, theta, phi } = this.sph;
    return new THREE.Vector3(
      this.target.x + radius * Math.sin(phi) * Math.sin(theta),
      this.target.y + radius * Math.cos(phi),
      this.target.z + radius * Math.sin(phi) * Math.cos(theta),
    );
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    // easing exploded view: menuju target tiap frame sehingga slider & tombol
    // terasa halus (bata ribuan instance digeser matriksnya, bukan dibangun ulang)
    if (Math.abs(this.explodeTarget - this.explodeK) > 0.0008) {
      this.explodeK += (this.explodeTarget - this.explodeK) * 0.16;
      if (Math.abs(this.explodeTarget - this.explodeK) <= 0.0008) this.explodeK = this.explodeTarget;
      this.applyExplode(this.explodeK);
    }
    const cam: THREE.PerspectiveCamera | THREE.OrthographicCamera = this.useOrtho ? this.cameraOrtho : this.camera;
    cam.position.copy(this.camPos());
    cam.lookAt(this.target);
    if (this.useOrtho) this.syncOrtho();
    this.renderer.render(this.scene, cam);
  };

  private syncOrtho() {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, el.clientWidth);
    const h = Math.max(1, el.clientHeight);
    const halfH = this.sph.radius * Math.tan((this.camera.fov * Math.PI) / 360);
    const halfW = halfH * (w / h);
    const o = this.cameraOrtho;
    o.left = -halfW;
    o.right = halfW;
    o.top = halfH;
    o.bottom = -halfH;
    o.updateProjectionMatrix();
  }

  private resize() {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, el.clientWidth);
    const h = Math.max(1, el.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.syncOrtho();
  }

  // --------------------------------------------------------------- update --

  update(model: HouseModel, view: ViewState) {
    // fast-path exploded view: hanya nilai explode yang berubah -> mesh TIDAK
    // dibangun ulang (bata ribuan instance tetap di GPU); easing per-frame yang
    // menggeser matriks tiap komponen menuju target baru
    if (
      model === this.lastModel &&
      this.lastView &&
      view.explode !== this.lastView.explode &&
      viewEqualExceptExplode(view, this.lastView)
    ) {
      this.lastView = view;
      this.explodeTarget = view.explode;
      return;
    }
    this.lastModel = model;
    // bebaskan sumber daya model sebelumnya (geometri/tekstur per-frame) sebelum membangun ulang
    for (const d of this.dyn) d.dispose();
    this.dyn.length = 0;
    // bersihkan rumah lama (grup persisten dilepas, lalu dipasang kembali)
    this.clearGroup(this.houseRoot);
    this.houseRoot.add(this.kolomGroup);
    this.clearGroup(this.kolomGroup);
    this.clearGroup(this.roofGroup);
    this.roofGroup.add(this.tilesGroup);
    this.roofGroup.add(this.trussGroup);
    this.clearGroup(this.tilesGroup);
    this.clearGroup(this.trussGroup);
    this.clearGroup(this.labelGroup);
    this.clearGroup(this.mepGroup);
    this.roofGroup.add(this.lisplankGroup);
    this.clearGroup(this.lisplankGroup);
    // mesh dibangun ulang: daftar objek yang bisa diklik & highlight di-reset,
    // lalu dipasang ulang pada akhir update(); registry exploded view juga
    // dibangun ulang bersama mesh (tiap komponen mendaftarkan offset sendiri)
    this.pickables.length = 0;
    this.hiObjs.length = 0;
    this.explodePieces.length = 0;
    this.explodeInstanced.length = 0;

    // potongan
    this.clipPlane.constant = view.cutH;
    // warna cat eksterior mengikuti pilihan pengguna
    this.matCatExt.color.set(view.paintHex || "#f2ecdf");
    // pada tahap pondasi/sloof, tanah dibuat tembus pandang agar profil pondasi
    // (batu kali / buis cakar ayam) di bawah muka tanah ikut terlihat
    const semi = s2(view.stage) === 1 || s2(view.stage) === 2;

    const isHebel = model.config.jenis === "hebel";
    this.matBrick.color.set(isHebel ? 0xeceae3 : 0xa3492f);
    // tahap pondasi/sloof: tanah dibuat tembus pandang & petak 6x6 disembunyikan
    // agar profil pondasi (batu kali / buis cakar ayam) di bawah muka tanah terbaca
    // (saat exploded view, applyExplode() juga menambah transparansi tanah)
    this.groundSemi = semi;
    if (this.plotMesh) this.plotMesh.visible = this.envVisible.plot && !semi;
    this.groundMesh.visible = this.envVisible.ground;
    this.gridHelper.visible = this.envVisible.grid;

    const tL = model.config.tLuar / 1000;
    const tinggi = model.config.tinggi;
    const cakar = model.config.pondasi === "cakarayam" && !!model.structure.cakar;

    // ----- tahapan konstruksi: 0 = kendali bebas, 1..8 = kondisi pembangunan
    const s = Math.max(0, Math.round(view.stage || 0));
    const manual = s === 0;
    // bagian yang disembunyikan per-bagian oleh pengguna (panel detail bagian).
    // Hanya berlaku di mode bebas — mode tahapan mengunci visibilitas sesuai progres.
    const hiddenList = manual ? view.hidden ?? [] : [];
    const hid = (p: string) => hiddenList.includes(p);
    const V: StageVis = {
      pondasi: (manual ? true : s >= 1) && !hid("pondasi"),
      sloof: (manual ? view.showStruktur : s >= 2) && !hid("sloof"),
      kolom: (manual ? view.showStruktur : s >= 2) && !hid("kolom"),
      dinding: (manual ? view.showDinding : s >= 3) && !hid("dinding"),
      pelana: (manual ? view.showDinding : s >= 4) && !hid("dinding"),
      ringbalk: (manual ? view.showStruktur : s >= 4) && !hid("ringbalk"),
      kusen: (manual ? view.showDinding || view.showStruktur : s >= 3) && !hid("kusen"),
      lantai: (manual ? true : s >= 8) && !hid("lantai"),
      rangka: (manual ? view.showRangka : s >= 5) && !hid("rangka"),
      genteng: (manual ? view.showRoof : s >= 6) && !hid("genteng"),
      plafon: (manual ? view.showRoof || view.showRangka : s >= 6) && !hid("plafon"),
      plester: (manual ? view.showFinishing : s >= 7) && !hid("plester"),
      cat: (manual ? view.showFinishing : s >= 8) && !hid("cat"),
    };

    // lantai interior: rabat beton 10 cm + KERAMIK KEPING DEMI KEPING per ruangan
    // (grid mengikuti ukuran pilihan 30/40 cm, nat ±3 mm; ruang basah anti-slip).
    // Explode: rabat turun ke bawah (di atas pondasi, di bawah sloof)
    if (V.lantai) {
      const lantaiW = 6 - 2 * tL;
      const rabat = this.addBox(this.houseRoot, 3, -0.05, 3, lantaiW, 0.1, lantaiW, this.matRabat, true, "lantai");
      this.registerExplode(rabat, 0, -0.42, 0);
      this.buildKeramik(model);
    }

    // pondasi cakar ayam (pelat + buis, sekali untuk seluruh denah)
    if (cakar && V.pondasi && model.structure.cakar) {
      this.buildCakarAyam(model.structure.cakar);
    }

    // dinding: pondasi batu kali + sloof + bata (instancing per dinding) + ring balk + kusen
    for (const w of model.walls) {
      this.buildWall(w, model, V, cakar, hid);
    }

    // kolom praktis 15/15 di tiap simpul dinding; explode: tiap kolom meluncur
    // radial menjauhi pusat denah (tiang demi tiang, sedikit terangkat)
    if (V.kolom) {
      const kw = Math.max(0.15, tL + 0.015);
      for (const k of model.koloms) {
        const m = this.addBox(this.kolomGroup, k.x, (tinggi + RB_H) / 2, k.y, kw, tinggi + RB_H, kw, this.matBeton);
        const dx = k.x - 3;
        const dz = k.y - 3;
        const rad = Math.hypot(dx, dz);
        if (rad > 0.05) this.registerExplode(m, (dx / rad) * 1.95, 0.25, (dz / rad) * 1.95);
        else this.registerExplode(m, 0, 0.4, 0);
      }
    }

    // atap + plafon
    this.buildRoof(model, V, hid);

    // ----- instalasi air & listrik (overlay sinar-X).
    // Mode bebas: mengikuti flag Outliner/viewport. Mode tahapan: jalur rough-in
    // terlihat pada tahap 5-6 (dinding sudah berdiri, sebelum plesteran menutup
    // jalur tertanam) — urutan praktik: instalasi ditarik paralel dengan pekerjaan atap.
    const mepAirOn = manual ? view.showAir : s === 5 || s === 6;
    const mepListrikOn = manual ? view.showListrik : s === 5 || s === 6;
    this.buildMep(model, mepAirOn, mepListrikOn, hid);

    // label ruangan
    if (view.showLabels) {
      for (const room of model.areas.rooms) {
        if (room.area <= 0.5) continue;
        const sp = this.makeTextSprite(room.name, `${room.w.toFixed(2)} x ${room.d.toFixed(2)} m | ${room.area.toFixed(1)} m2`);
        sp.position.set(room.cx, 1.55, room.cy);
        this.labelGroup.add(sp);
      }
    }
    this.labelGroup.visible = view.showLabels;

    // exploded view granular: seluruh komponen sudah mendaftarkan offset
    // masing-masing selama build di atas. Terapkan nilai animasi SEKARANG
    // (bukan view.explode) supaya mesh hasil rebuild tidak melompat posisi;
    // easing per-frame kemudian menuju target secara halus.
    this.explodeTarget = view.explode;
    this.applyExplode(this.explodeK);
    this.roofGroup.visible = manual
      ? view.showRoof || view.showRangka
      : V.rangka || V.genteng || V.plafon;
    this.tilesGroup.visible = V.genteng;
    this.trussGroup.visible = V.rangka;
    this.lisplankGroup.visible = V.rangka && !hid("lisplank");
    this.kolomGroup.visible = V.kolom;

    // grup persisten di-tag sebagai bagian (raycast klik & highlight seleksi)
    this.tag(this.trussGroup, "rangka");
    this.tag(this.tilesGroup, "genteng");
    this.tag(this.kolomGroup, "kolom");

    // anotasi dimensi 3D mengikuti model terakhir
    this.rebuildDims();

    // pasang ulang highlight bagian terpilih pada mesh yang baru dibangun
    this.applyHighlight();
    this.lastView = view;
  }

  private buildWall(w: WallRT, model: HouseModel, V: StageVis, cakar: boolean, hid: (p: string) => boolean) {
    const group = new THREE.Group();
    this.houseRoot.add(group);

    // arah "keluar" dinding (menjauhi pusat denah) + arah lateral sepanjang
    // dinding — dasar offset exploded view bagi tiap komponen di dinding ini
    const [nx, nz] = w.outDir;
    const [lx, lz] = w.axis === "h" ? [1, 0] : [0, 1];

    const len = w.hi - w.lo;
    const t = w.t;
    const mid = (w.lo + w.hi) / 2;
    const bw = Math.max(0.15, t + 0.01); // lebar sloof / ring balk (15 cm standar)

    // pondasi batu kali: strip 40 x 60 cm dari -0,2 s/d -0,8 m, disusun batu demi batu
    // (segmen dengan tinggi/lebar bervariasi agar terbaca sebagai batu kali, bukan beton)
    if (!cakar && V.pondasi) {
      const rng = mulberry32(Math.round((w.lo + w.c) * 977));
      let a = w.lo;
      while (a < w.hi - 0.05) {
        const segLen = Math.min(0.3 + rng() * 0.28, w.hi - a);
        const segW = PONDASI_W * (0.86 + rng() * 0.14);
        const segH = PONDASI_D * (0.82 + rng() * 0.18);
        const cy = PONDASI_TOP - segH / 2 + (rng() - 0.5) * 0.03;
        if (w.axis === "h") {
          const m = this.addBox(group, a + segLen / 2, cy, w.c + (rng() - 0.5) * 0.02, segLen, segH, segW, this.matPlinth, true, "pondasi");
          // batu pondasi diangkat KELUAR dari tanah (melayang di udara, di luar
          // awan bata) + menyebar sepanjang jalur — batu demi batu terbaca jelas
          const js = (rng() - 0.5) * 0.8;
          this.registerExplode(m, nx * 2.3 + lx * js, 0.45, nz * 2.3 + lz * js);
        } else {
          const m = this.addBox(group, w.c + (rng() - 0.5) * 0.02, cy, a + segLen / 2, segW, segH, segLen, this.matPlinth, true, "pondasi");
          const js = (rng() - 0.5) * 0.8;
          this.registerExplode(m, nx * 2.3 + lx * js, 0.45, nz * 2.3 + lz * js);
        }
        a += segLen;
      }
    }
    if (V.sloof) {
      let m: THREE.Mesh;
      if (w.axis === "h") m = this.addBox(group, mid, PONDASI_TOP + RB_H / 2, w.c, len, RB_H, bw, this.matBeton, true, "sloof");
      else m = this.addBox(group, w.c, PONDASI_TOP + RB_H / 2, mid, bw, RB_H, len, this.matBeton, true, "sloof");
      // tumpukan explode menjaga urutan konstruksi: pondasi melayang di luar,
      // sloof tetap dekat tanah (di bawah susunan bata yang mengurai)
      this.registerExplode(m, nx * 0.55, -0.1, nz * 0.55);
    }
    if (V.ringbalk) {
      let m: THREE.Mesh;
      if (w.axis === "h") m = this.addBox(group, mid, w.h + RB_H / 2, w.c, len, RB_H, bw, this.matBeton, true, "ringbalk");
      else m = this.addBox(group, w.c, w.h + RB_H / 2, mid, bw, RB_H, len, this.matBeton, true, "ringbalk");
      // ring balk terangkat di atas susunan bata teratas yang mengurai
      this.registerExplode(m, nx * 0.32, 0.42, nz * 0.32);
    }

    // mortar/nat slab: kotak-kotak menghindari bukaan (hanya sampai tinggi dinding datar)
    const segs: { lo: number; hi: number; z0: number; z1: number }[] = [];
    const ops = [...w.openings].sort((a, b) => a.from - b.from);
    let cursor = w.lo;
    for (const o of ops) {
      const clo = Math.max(o.from, w.lo);
      const chi = Math.min(o.to, w.hi);
      if (clo > cursor) segs.push({ lo: cursor, hi: clo, z0: 0, z1: w.h });
      if (o.sill > 0) segs.push({ lo: clo, hi: chi, z0: 0, z1: o.sill });
      if (o.top < w.h) segs.push({ lo: clo, hi: chi, z0: o.top, z1: w.h });
      cursor = Math.max(cursor, chi);
    }
    if (cursor < w.hi) segs.push({ lo: cursor, hi: w.hi, z0: 0, z1: w.h });

    // mortar/nat terlihat di sela bata — tertutup begitu plester dipasang;
    // saat explode, slab nat meluncur keluar SEDIKIT LEBIH LAMBAT dari bata
    // sehingga bata terlihat "lepas" dari tempat perekatnya
    if (V.dinding && !V.plester) {
      for (const s of segs) {
        if (s.hi - s.lo < 0.01 || s.z1 - s.z0 < 0.01) continue;
        let m: THREE.Mesh;
        if (w.axis === "h") m = this.addBox(group, (s.lo + s.hi) / 2, (s.z0 + s.z1) / 2, w.c, s.hi - s.lo, s.z1 - s.z0, t, this.matMortar, true, "dinding");
        else m = this.addBox(group, w.c, (s.z0 + s.z1) / 2, (s.lo + s.hi) / 2, t, s.z1 - s.z0, s.hi - s.lo, this.matMortar, true, "dinding");
        this.registerExplode(m, nx * 0.9, 0.04, nz * 0.9);
      }
    }

    // segitiga mortar di ujung atap pelana (dinding depan/belakang), di atas ring balk
    if (w.gable && V.pelana && !V.plester) {
      const baseZ = w.gable.baseZ;
      const shape = new THREE.Shape();
      shape.moveTo(w.lo, baseZ);
      shape.lineTo(w.hi, baseZ);
      shape.lineTo(w.gable.apexAt, baseZ + w.gable.apexAdd);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
      const mesh = new THREE.Mesh(geo, this.matMortar);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(0, 0, w.c - t / 2);
      this.tag(mesh, "dinding");
      group.add(mesh);
      this.registerExplode(mesh, nx * 0.88, 0.36, nz * 0.88);
      this.dyn.push(geo);
    }

    // bata instanced (band dinding & pelana mengikuti tahapan; tertutup saat plester)
    const tinggiW = model.config.tinggi;
    const bricks = model.bricks.filter(
      (b) => b.wallId === w.id && (b.z < tinggiW + 0.05 ? V.dinding : V.pelana),
    );
    if (!V.plester && bricks.length > 0) {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const im = new THREE.InstancedMesh(geo, this.matBrick, bricks.length);
      im.castShadow = true;
      im.receiveShadow = true;
      this.tag(im, "dinding");
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const col = new THREE.Color();
      const base = new THREE.Color(model.config.jenis === "hebel" ? 0xeceae3 : 0xa3492f);
      // offset exploded view PER BATA: dinding mengurai menjadi bata individual —
      // keluar dari muka dinding (makin tinggi kursinya makin jauh, seperti
      // tangga), MENYEBAR sepanjang arah dinding (accordion: bata di ujung
      // menjauhi bata di tengah sehingga tiap bata terpisah dari tetangganya),
      // + naik sedikit + jitter batu demi batu
      const topZ = w.gable ? w.gable.baseZ + w.gable.apexAdd : w.h;
      const offs = new Float32Array(bricks.length * 3);
      const halfLen = Math.max(0.5, (w.hi - w.lo) / 2);
      bricks.forEach((b, i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.rotY);
        m4.compose(
          new THREE.Vector3(b.x, b.z + b.hgt / 2, b.y),
          q,
          new THREE.Vector3(b.len, b.hgt, t + 0.008),
        );
        im.setMatrixAt(i, m4);
        // variasi warna batu demi batu (deterministik)
        const r = mulberry32(i * 7919 + w.lo * 100)();
        col.copy(base).offsetHSL(0, model.config.jenis === "hebel" ? 0 : 0.01 * (r - 0.5), (r - 0.5) * (model.config.jenis === "hebel" ? 0.05 : 0.08));
        im.setColorAt(i, col);
        // jitter posisi bata memakai rng terpisah (stabil antar rebuild)
        const rg = mulberry32(i * 104729 + Math.round(w.c * 577) * 31);
        const zFrac = Math.min(1, b.z / Math.max(0.1, topZ));
        const mag = 1.08 + 0.62 * zFrac + (rg() - 0.5) * 0.18;
        const oy = 0.34 * zFrac + (rg() - 0.5) * 0.08;
        // accordion lateral: posisi bata sepanjang dinding relatif titik tengah
        // (bata ujung menjauh paling jauh -> celah antar bata dalam satu lajur)
        const along = w.axis === "h" ? b.x : b.y;
        const latFrac = Math.max(-1, Math.min(1, (along - (w.lo + w.hi) / 2) / halfLen));
        const ol = latFrac * 0.85 + (rg() - 0.5) * 0.3;
        offs[i * 3] = nx * mag + lx * ol;
        offs[i * 3 + 1] = oy;
        offs[i * 3 + 2] = nz * mag + lz * ol;
      });
      this.registerExplodeInstanced(im, offs);
      group.add(im);
      this.dyn.push(geo);
    }

    // plesteran + acian / cat: lapisan tipis pada kedua muka dinding (termasuk pelana);
    // saat explode tiap panel plester "mengelupas" menjauhi muka dindingnya
    if (V.plester) {
      const pp = 0.013; // tebal plester tiap muka
      const extSide = w.outer ? (w.c < 3 ? -1 : 1) : 0; // muka luar (searah keluar denah)
      for (const side of [-1, 1]) {
        const isExt = w.outer && side === extSide;
        const mat = V.cat ? (isExt ? this.matCatExt : this.matCatInt) : this.matPlester;
        for (const s of segs) {
          if (s.hi - s.lo < 0.01 || s.z1 - s.z0 < 0.01) continue;
          let m: THREE.Mesh;
          if (w.axis === "h")
            m = this.addBox(group, (s.lo + s.hi) / 2, (s.z0 + s.z1) / 2, w.c + side * (t / 2 + pp / 2), s.hi - s.lo, s.z1 - s.z0, pp, mat, true, "plester");
          else
            m = this.addBox(group, w.c + side * (t / 2 + pp / 2), (s.z0 + s.z1) / 2, (s.lo + s.hi) / 2, pp, s.z1 - s.z0, s.hi - s.lo, mat, true, "plester");
          // panel pada muka "side" lepas ke arah muka itu (side * arah normal)
          this.registerExplode(m, side * nx * 1.62, 0.07, side * nz * 1.62);
        }
        if (w.gable && V.pelana) {
          const baseZ = w.gable.baseZ;
          const shape = new THREE.Shape();
          shape.moveTo(w.lo, baseZ);
          shape.lineTo(w.hi, baseZ);
          shape.lineTo(w.gable.apexAt, baseZ + w.gable.apexAdd);
          shape.closePath();
          const geo = new THREE.ExtrudeGeometry(shape, { depth: pp, bevelEnabled: false });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.position.set(0, 0, w.c + side * w.t / 2 + (side > 0 ? 0 : -pp));
          this.tag(mesh, "plester");
          group.add(mesh);
          this.registerExplode(mesh, side * nx * 1.62, 0.42, side * nz * 1.62);
          this.dyn.push(geo);
        }
      }
    }

    // kusen berprofil, pintu, jendela & lubang angin
    if (V.kusen) {
      for (const o of w.openings) {
        if (hid(o.kind)) continue; // pintu / jendela / roster bisa disembunyikan per jenis
        this.buildKusen(group, w, o);
      }
    }
  }

  /**
   * Kusen berprofil (tiang + ambang + lis dalam membentuk alur), daun pintu
   * panel 2 susun + handle, jendela kaca + palang aluminium, dan lubang angin
   * permanen (roster beton dengan kisi).
   *
   * EXPLODED VIEW "pintu demi pintu": seluruh komponen satu bukaan dibungkus
   * grup `kit` yang melayang keluar dari dinding sebagai unit tersendiri; di
   * dalam kit, daun pintu (grup `leaf`) dan kaca jendela (grup `glass`)
   * mendapat offset ekstra sehingga terpisah dari kusennya.
   */
  private buildKusen(group: THREE.Group, w: WallRT, o: OpeningSpec) {
    const t = w.t;
    const wdt = o.to - o.from;
    const midO = (o.from + o.to) / 2;
    const ft = t + 0.03; // lebar kusen menonjol sedikit dari muka dinding
    const jw = 0.06; // lebar tiang & ambang kusen
    const lw = 0.024; // lebar lis profil dalam
    const ld = ft * 0.5; // tebal lis profil
    const hgt = o.top - o.sill;
    const cy = (o.sill + o.top) / 2;
    const [nx, nz] = w.outDir;

    // kit bukaan: kusen + isian bergerak sebagai SATU unit terpisah dari dinding
    // (offset normal lebih besar dari bata sehingga jelas terlepas dari dinding)
    const kit = new THREE.Group();
    group.add(kit);
    this.registerExplode(kit, nx * 2.0, 0.24, nz * 2.0);

    // helper: kotak pada bidang bukaan (x = sepanjang dinding, y = elevasi);
    // tiap mesh kusen di-tag sebagai bagian sesuai jenis bukaannya (pintu/jendela/vent)
    const put = (
      x: number,
      y: number,
      sx: number,
      sy: number,
      sz: number,
      mat: THREE.Material,
      receive = true,
      parent: THREE.Object3D = kit,
    ) => {
      if (w.axis === "h") this.addBox(parent, x, y, w.c, sx, sy, sz, mat, receive, o.kind);
      else this.addBox(parent, w.c, y, x, sz, sy, sx, mat, receive, o.kind);
    };

    if (o.kind === "vent") {
      // lubang angin permanen: rongga gelap + bingkai & kisi roster beton
      const fr = 0.045;
      put(midO, cy, wdt, hgt, t + 0.012, this.matVent);
      put(midO, o.top - fr / 2, wdt, fr, t + 0.03, this.matVentFrame);
      put(midO, o.sill + fr / 2, wdt, fr, t + 0.03, this.matVentFrame);
      put(o.from + fr / 2, cy, fr, hgt - 2 * fr, t + 0.03, this.matVentFrame);
      put(o.to - fr / 2, cy, fr, hgt - 2 * fr, t + 0.03, this.matVentFrame);
      const inner = wdt - 2 * fr;
      const n = Math.max(4, Math.round(inner / 0.07));
      for (let i = 0; i < n; i++) {
        const x = o.from + fr + (inner * (i + 0.5)) / n;
        put(x, cy, 0.026, hgt - 2 * fr, t + 0.04, this.matVentFrame);
      }
      return;
    }

    // kotak utama kusen: tiang kiri-kanan, ambang atas, ambang bawah (jendela)
    put(o.from + jw / 2, cy, jw, hgt, ft, this.matKusen);
    put(o.to - jw / 2, cy, jw, hgt, ft, this.matKusen);
    put(midO, o.top - jw / 2, wdt, jw, ft, this.matKusen);
    if (o.sill > 0) put(midO, o.sill + jw / 2, wdt, jw, ft, this.matKusen);
    // lis profil dalam (rebate) menonjol ke bukaan — kesan kusen berprofil
    const ih = hgt - 2 * jw - 0.02;
    put(o.from + jw + lw / 2, cy, lw, ih, ld, this.matKusen);
    put(o.to - jw - lw / 2, cy, lw, ih, ld, this.matKusen);
    put(midO, o.top - jw - lw / 2, wdt - 2 * jw, lw, ld, this.matKusen);
    if (o.sill > 0) put(midO, o.sill + jw + lw / 2, wdt - 2 * jw, lw, ld, this.matKusen);

    if (o.kind === "pintu") {
      // daun pintu = sub-kit: panel 2 susun + handle lepas lebih jauh dari kusen
      const leaf = new THREE.Group();
      kit.add(leaf);
      this.registerExplode(leaf, nx * 0.55, 0.22, nz * 0.55);
      const dw = wdt - 2 * jw - 0.015;
      const dh = hgt - 2 * jw - 0.02;
      const dy = o.sill + jw + dh / 2 + 0.008;
      put(midO, dy, dw, dh, 0.045, this.matPintu, true, leaf);
      put(midO, dy + dh * 0.18, dw * 0.6, dh * 0.3, 0.052, this.matPintuGelap, true, leaf);
      put(midO, dy - dh * 0.22, dw * 0.6, dh * 0.42, 0.052, this.matPintuGelap, true, leaf);
      put(midO + dw / 2 - 0.09, o.sill + 1.02, 0.03, 0.14, ft + 0.014, this.matBaja, true, leaf);
    } else {
      // kaca jendela = sub-kit: kaca + palang daun aluminium terpisah dari kusen
      const glass = new THREE.Group();
      kit.add(glass);
      this.registerExplode(glass, nx * 0.34, 0.12, nz * 0.34);
      const gw = wdt - 2 * jw - 0.03;
      const gh = hgt - 2 * jw - 0.03;
      put(midO, cy, gw, gh, 0.012, this.matKaca, false, glass);
      put(midO, cy, gw, 0.035, 0.03, this.matBaja, true, glass);
      const nLeaf = Math.max(2, Math.round(gw / 0.55));
      for (let li = 1; li < nLeaf; li++) {
        const lx = o.from + jw + (gw * li) / nLeaf;
        put(lx, cy, 0.03, gh, 0.035, this.matBaja, true, glass);
      }
    }
  }

  /**
   * Lantai keramik: grid keping per ruangan dari model (ukuran 30/40 cm sesuai
   * pilihan). Keping penuh dipasang dari satu sisi, sisa tepi menjadi keping
   * potong. Nat praktik ±3 mm, digambar 8 mm agar grid terbaca di layar
   * (warna nat = rabat gelap di bawah keping). Ruang basah (KM/WC) memakai
   * keramik abu bertekstur (anti-slip).
   */
  private buildKeramik(model: HouseModel) {
    const f = model.floor;
    // Nat digambar 8 mm (praktik ±3 mm) agar garis sambung keping terbaca di
    // layar — warna nat = rabat gelap di bawah keping.
    const nat = 0.008; // lebar nat visual (m)
    const tileT = 0.008; // tebal keping keramik (m)
    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.dyn.push(geo);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    for (const room of f.rooms) {
      const w = room.x1 - room.x0;
      const d = room.z1 - room.z0;
      if (w <= 0.06 || d <= 0.06) continue; // ruang terlalu sempit untuk grid
      const count = room.nx * room.nz;
      const im = new THREE.InstancedMesh(geo, room.basah ? this.matKeramikBasah : this.matKeramik, count);
      // lantai tidak menerima bayangan dinding agar pola grid keramik terbaca
      // jelas dari atas (model pembelajaran, bukan render mood)
      im.castShadow = false;
      im.receiveShadow = false;
      this.tag(im, "lantai");
      const base = new THREE.Color(room.basah ? 0x8e939a : 0xd8d2c4);
      // offset per keping: lantai "membuka" radial dari pusat denah + naik
      // sedikit — keping makin tepi makin jauh sehingga grid tetap terbaca
      const offs = new Float32Array(count * 3);
      let idx = 0;
      for (let i = 0; i < room.nx; i++) {
        const cw = Math.min(f.tileM, w - i * f.tileM); // keping terakhir = potongan tepi
        if (cw <= 0.012) continue;
        const cx = room.x0 + i * f.tileM + cw / 2;
        for (let j = 0; j < room.nz; j++) {
          const cd = Math.min(f.tileM, d - j * f.tileM);
          if (cd <= 0.012) continue;
          const cz = room.z0 + j * f.tileM + cd / 2;
          m4.compose(
            new THREE.Vector3(cx, tileT / 2, cz),
            q,
            new THREE.Vector3(Math.max(cw - nat, 0.015), tileT, Math.max(cd - nat, 0.015)),
          );
          im.setMatrixAt(idx, m4);
          // variasi tint keping demi keping (deterministik) agar pola grid terbaca
          const r = mulberry32(idx * 104729 + Math.round(room.x0 * 577))();
          col.copy(base).offsetHSL(0, 0, (r - 0.5) * 0.09);
          im.setColorAt(idx, col);
          const dx = cx - 3;
          const dz = cz - 3;
          const rad = Math.hypot(dx, dz);
          const mag = rad > 0.05 ? 0.75 + 0.95 * (rad / 3) : 0;
          offs[idx * 3] = rad > 0.05 ? (dx / rad) * mag : 0;
          offs[idx * 3 + 1] = 0.22 + (r - 0.5) * 0.05;
          offs[idx * 3 + 2] = rad > 0.05 ? (dz / rad) * mag : 0;
          idx++;
        }
      }
      im.count = idx; // hanya keping nyata yang terpasang
      this.registerExplodeInstanced(im, offs);
      this.houseRoot.add(im);
    }
  }

  /** Pondasi cakar ayam (sistem Sedyatmo): pelat beton 6x6 m + buis beton vertikal. */
  private buildCakarAyam(c: CakarAyamRT) {
    // pelat bertulang: puncak pelat tepat di bawah sloof (-0,2 m), buram agar solid terbaca;
    // saat explode pelat turun sebagai unit tersendiri di bawah susunan sloof
    const slab = this.addBox(this.houseRoot, 3, PONDASI_TOP - CAKAR.slabT / 2, 3, 6, CAKAR.slabT, 6, this.matBeton, true, "pondasi");
    this.registerExplode(slab, 0, -0.95, 0);
    // buis beton menancap ke tanah di tiap titik kolom + grid tengah;
    // ujung atas buis dibuat rata muka pelat agar pola grid cakar terbaca dari atas.
    // Explode: tiap buis terlepas individual — radial dari pusat + turun
    const L = CAKAR.buisL + CAKAR.slabT;
    for (const p of c.buisPts) {
      const geo = new THREE.CylinderGeometry(CAKAR.buisDia / 2, CAKAR.buisDia / 2, L, 18);
      const m = new THREE.Mesh(geo, this.matBuis);
      m.position.set(p.x, PONDASI_TOP + 0.02 - L / 2, p.y); // ujung atas sedikit menonjol 2 cm di muka pelat
      m.receiveShadow = true;
      this.tag(m, "pondasi");
      const dx = p.x - 3;
      const dz = p.y - 3;
      const rad = Math.hypot(dx, dz) || 1;
      this.registerExplode(m, (dx / rad) * 0.9, -0.62, (dz / rad) * 0.9);
      this.houseRoot.add(m);
      this.dyn.push(geo);
    }
  }

  /**
   * Atap pelana dengan ridge memanjang sepanjang Z (di x = 3).
   * Bidang atap menurun ke dinding kiri (x = 0) dan kanan (x = 6);
   * dinding ujung pelana adalah dinding depan (z = 6) dan belakang (z = 0).
   * Tahapan: rangka atap (kuda-kuda + web + reng + lisplank) -> genteng + nok.
   */
  private buildRoof(model: HouseModel, V: StageVis, hid: (p: string) => boolean) {
    const tinggi = model.config.tinggi;
    const apex = model.roof.apexAdd;
    const pitch = model.roof.pitch; // tan(kemiringan)
    const ov = model.roof.overhang;
    const rBase = tinggi + RB_H; // puncak ring balk = dasar dinding pelana / eaves
    const yRidge = model.roof.yRidge; // rBase + apex
    const ang = Math.atan(pitch);
    const zLen = 6 + 2 * ov;

    // tinggi bidang atap pada jarak horizontal hx dari ridge
    const planeY = (hx: number) => yRidge - hx * pitch;

    // plafon mengikuti area bersih; explode: melayang di antara ring balk dan
    // ikatan bawah rangka yang terangkat (lapisan plafon "terbuka")
    if (V.plafon) {
      const cw = 6 - 2 * (model.config.tLuar / 1000);
      const pl = this.addBox(this.roofGroup, 3, tinggi + 0.02, 3, cw, 0.03, cw, this.matPlafon, true, "plafon");
      this.registerExplode(pl, 0, 0.75, 0);
    }

    // ---------- rangka baja ringan (kuda-kuda + web pengaku + reng + lisplank) ----------
    if (V.rangka) {
      // kuda-kuda: rangka C75 pada jarak maks 1,2 m, tapak di atas ring balk.
      // EXPLODED VIEW "besi demi besi": tiap kuda-kuda adalah kit yang naik +
      // menyebar sepanjang arah nok (kz), dan SETIAP BATANG baja di dalamnya
      // (ikatan bawah, kasau kiri/kanan, tiang tengah, web pengaku) mendapat
      // offset ekstra sendiri sehingga rangka terurai batang demi batang.
      const kuda = model.roof.kudaKuda;
      for (let i = 0; i < kuda; i++) {
        const z = 0.3 + i * ((6 - 0.6) / (kuda - 1));
        const kz = (z - 3) * 0.42; // menyebar menjauhi pusat sepanjang nok
        const ky = 0.95; // angkat kit kuda-kuda
        // ikatan bawah (bottom chord) sepanjang dinding kiri-kanan
        const bc = this.addBox(this.trussGroup, 3, rBase + 0.05, z, 5.6, 0.075, 0.06, this.matBaja);
        this.registerExplode(bc, 0, ky + 0.02, kz);
        // dua kasau (top chord) naik ke ridge; ujung bawah menerus hingga tepi
        // overstek sehingga reng & lisplank di ujung atap tetap bertumpu
        const dx = 3 + ov - 0.06;
        const dy = apex + ov * pitch - 0.12;
        const L = Math.hypot(dx, dy);
        const angR = Math.atan2(dy, dx);
        const cyR = (rBase + 0.09 - ov * pitch + yRidge - 0.03) / 2;
        // kiri: ujung +X (ridge) harus NAIK -> rotasi positif
        const kiri = this.addTiltedBox(this.trussGroup, 3 - dx / 2, cyR, z, L, 0.075, 0.06, angR, this.matBaja);
        this.registerExplode(kiri, -0.55, ky + 0.5, kz);
        // kanan: ujung -X (ridge) naik -> rotasi negatif
        const kanan = this.addTiltedBox(this.trussGroup, 3 + dx / 2, cyR, z, L, 0.075, 0.06, -angR, this.matBaja);
        this.registerExplode(kanan, 0.55, ky + 0.5, kz);
        // tiang tengah (king post)
        if (apex > 0.5) {
          const kp = this.addBox(this.trussGroup, 3, rBase + 0.09 + (apex - 0.14) / 2, z, 0.05, apex - 0.14, 0.05, this.matBaja);
          this.registerExplode(kp, 0, ky + 1.1, kz);
        }
        // web diagonal pengaku: bottom chord -> kasau -> tiang tengah
        const kasaY = planeY(0.85) + 0.03;
        const postMid = rBase + 0.09 + (apex - 0.14) * 0.55;
        for (const sgn of [-1, 1]) {
          const w1 = this.addStrut(this.trussGroup, 3 + sgn * 1.5, rBase + 0.087, 3 + sgn * 0.85, kasaY, z, this.matBaja);
          this.registerExplode(w1, sgn * 0.95, ky + 0.55, kz);
          const w2 = this.addStrut(this.trussGroup, 3 + sgn * 0.85, kasaY, 3, postMid, z, this.matBaja);
          this.registerExplode(w2, sgn * 0.38, ky + 0.95, kz);
        }
      }

      // reng: melintang sepanjang Z di atas kasau, jarak ~40 cm sepanjang bidang
      // (top reng 1 cm di bawah muka genteng agar tidak z-fighting).
      // Explode: tiap batang reng lepas tegak lurus bidang atap; makin ke tepi
      // makin jauh sehingga baris reng "mengipas" keluar
      const Lslope = Math.sqrt(1 + pitch * pitch);
      for (const s of [-1, 1]) {
        for (let hx = 0.35; hx <= 3 + ov - 0.05; hx += 0.4) {
          const m = this.addTiltedBox(
            this.trussGroup,
            3 + s * hx,
            planeY(hx) + 0.065,
            3,
            0.05,
            0.05,
            zLen,
            s > 0 ? -ang : ang,
            this.matBaja,
          );
          const hxFrac = hx / (3 + ov);
          const mag = 0.62 + 0.5 * hxFrac;
          this.registerExplode(m, (s * pitch * mag) / Lslope, mag / Lslope, 0);
        }
      }

      // lisplank pada kedua ujung eaves (terpasang di rangka sebelum genteng)
      // (grup terpisah agar bisa disembunyikan / dipilih sebagai bagian sendiri)
      if (!hid("lisplank")) {
        for (const s of [-1, 1]) {
          const x = 3 + s * (3 + ov) - s * 0.02;
          const m = this.addBox(this.lisplankGroup, x, planeY(3 + ov) - 0.1, 3, 0.035, 0.2, zLen, this.matLisplank, true, "lisplank");
          // papan wajah eaves terlepas keluar dari ujung atap
          this.registerExplode(m, s * 0.95, 0.5, 0);
        }

        // lisplank ujung pelana (menutup overstek pada kedua ujung segitiga atap)
        const slopeLen = Math.hypot(3 + ov, apex + ov * pitch);
        const yMidSlope = (yRidge + rBase - ov * pitch) / 2;
        for (const s of [-1, 1]) {
          for (const zz of [-ov + 0.017, 6 + ov - 0.017]) {
            const m = this.addTiltedBox(this.lisplankGroup, 3 + s * (3 + ov) / 2, yMidSlope, zz, slopeLen, 0.2, 0.034, s > 0 ? -ang : ang, this.matLisplank, "lisplank");
            this.registerExplode(m, 0, 0.52, (zz < 3 ? -1 : 1) * 0.95);
          }
        }
      }
    }

    // ---------- genteng + nok ----------
    if (V.genteng) {
      // genteng beton flat: pemasangan rapat (tile eksak baris demi baris sepanjang
      // bidang sehingga tidak ada celah memperlihatkan reng maupun z-fighting)
      const dxTile = 0.4 * Math.cos(ang);
      const nRows = Math.max(2, Math.ceil((3 + ov) / dxTile));
      const rowSpacing = (3 + ov) / nRows; // panjang genteng = jarak baris (eksak)
      const zCount = Math.max(2, Math.ceil(zLen / 0.25));
      const zSpacing = zLen / zCount; // lebar genteng = jarak lajur (eksak)
      // normal bidang atap (dipakai arah lepasnya keping genteng saat explode)
      const Ls = Math.sqrt(1 + pitch * pitch);
      for (const s of [-1, 1]) {
        const geo = new THREE.BoxGeometry(rowSpacing, 0.02, zSpacing);
        const im = new THREE.InstancedMesh(geo, this.matGenteng, nRows * zCount);
        im.castShadow = true;
        im.receiveShadow = true;
        const m4 = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const axis = new THREE.Vector3(0, 0, 1);
        const col = new THREE.Color();
        const base = new THREE.Color(0x96524a);
        // offset per keping: lepas tegak lurus bidang; baris makin ke tepi
        // (menghitung dari nok) makin jauh — atap "terkupas" dari overstek
        const offs = new Float32Array(nRows * zCount * 3);
        let idx = 0;
        for (let i = 0; i < nRows; i++) {
          const hx = (i + 0.5) * rowSpacing;
          const rowFrac = (i + 0.5) / nRows;
          for (let jj = 0; jj < zCount; jj++) {
            const z = -ov + (jj + 0.5) * zSpacing;
            q.setFromAxisAngle(axis, s > 0 ? -ang : ang);
            m4.compose(
              new THREE.Vector3(3 + s * hx, planeY(hx) + 0.09, z),
              q,
              new THREE.Vector3(1, 1, 1),
            );
            im.setMatrixAt(idx, m4);
            const r = mulberry32(idx * 2654435761 + (s > 0 ? 7 : 13))();
            col.copy(base).offsetHSL(0.003 * (r - 0.5), 0.025 * (r - 0.5), 0.03 * (r - 0.5));
            im.setColorAt(idx, col);
            const mag = 1.05 + 0.6 * rowFrac + (r - 0.5) * 0.16;
            offs[idx * 3] = (s * pitch * mag) / Ls;
            offs[idx * 3 + 1] = mag / Ls;
            offs[idx * 3 + 2] = 0;
            idx++;
          }
        }
        this.registerExplodeInstanced(im, offs);
        this.tilesGroup.add(im);
        this.dyn.push(geo);
      }

      // nok (ridge cap) menutup pertemuan dua bidang genteng; explode: puncak
      // tertinggi dari seluruh susunan (di atas semua keping yang mengurai)
      const g = new THREE.BoxGeometry(0.4, 0.09, zLen + 0.06);
      const nok = new THREE.Mesh(g, this.matRidge);
      nok.castShadow = true;
      nok.position.set(3, yRidge + 0.11, 3);
      this.registerExplode(nok, 0, 1.95, 0);
      this.tilesGroup.add(nok);
      this.dyn.push(g);
    }
  }

  // ------------------------------------------------------- instalasi MEP --

  /**
   * Instalasi air & listrik (MEP) sebagai overlay sinar-X:
   * - air bersih PVC AW 1/2" biru (Ø visual = Ø asli 21 mm)
   * - limbah PVC 3" hijau-teal (Ø 89 mm)
   * - conduit Ø20 mm kuning (sirkuit lampu, NYM 2x1,5) / merah (stop kontak, 2x2,5)
   * - titik: lampu (bola kuning emissive), saklar & stop kontak (piring krem),
   *   panel MCB, meteran air, kran, shower, kloset, floor drain
   * - septic tank + sumur resapan di belakang rumah (bawah tanah, tembus pandang)
   */
  private buildMep(model: HouseModel, air: boolean, listrik: boolean, hid: (p: string) => boolean) {
    if (!air && !listrik) return;
    const m = model.mep;

    // Ø visual pipa (meter): 1/2" = 0,021 m; 3" = 0,045 m; conduit 20 mm = 0,015 m
    const R_BERSIH = 0.021;
    const R_KOTOR = 0.045;
    const R_CONDUIT = 0.015;

    // sambungan siku diberi bola agar pertemuan pipa rapat (bukan celah flat-cap)
    const joint = (p: { x: number; y: number; z: number }, r: number, mat: THREE.Material, pick?: string) =>
      this.addMepSphere(p.x, p.y, p.z, r, mat, pick);

    // id bagian (parts.ts) untuk tiap jalur — dipakai untuk tag klik & visibilitas
    const routePart = (r: { jenis: string; sirkuit: "lampu" | "kontak" | null }) =>
      r.jenis === "air_bersih"
        ? "pipaAirBersih"
        : r.jenis === "air_kotor"
          ? "pipaAirKotor"
          : r.sirkuit === "kontak"
            ? "listrikKontak"
            : "listrikLampu";

    for (const r of m.routes) {
      const isAir = r.jenis !== "listrik";
      if (isAir && !air) continue;
      if (!isAir && !listrik) continue;
      const part = routePart(r);
      if (hid(part)) continue;
      const mat =
        r.jenis === "air_bersih"
          ? this.matPipeBersih
          : r.jenis === "air_kotor"
            ? this.matPipeKotor
            : r.sirkuit === "kontak"
              ? this.matKabelKontak
              : this.matKabelLampu;
      const rad = r.jenis === "air_bersih" ? R_BERSIH : r.jenis === "air_kotor" ? R_KOTOR : R_CONDUIT;
      for (let i = 1; i < r.pts.length; i++) {
        this.addPipe(r.pts[i - 1], r.pts[i], rad, mat, part);
      }
      for (let i = 1; i < r.pts.length - 1; i++) joint(r.pts[i], rad, mat, part);
    }

    // orientasi piring saklar/stop kontak: tipis mengikuti dinding terdekat
    const thinZ = (p: { x: number; z: number }) => {
      let best: "h" | "v" = "h";
      let bd = Infinity;
      for (const w of model.walls) {
        const d = w.axis === "h" ? Math.abs(p.z - w.c) : Math.abs(p.x - w.c);
        if (d < bd) {
          bd = d;
          best = w.axis;
        }
      }
      return best === "h";
    };

    for (const p of m.points) {
      const isAirPt = p.kind === "meter_air" || p.kind === "kran" || p.kind === "shower" || p.kind === "kloset" || p.kind === "drain";
      if (isAirPt && !air) continue;
      if (!isAirPt && !listrik) continue;
      if (hid(MEP_POINT_PART[p.kind] ?? p.kind)) continue; // titik bisa disembunyikan per bagian
      switch (p.kind) {
        case "lampu":
          this.addMepSphere(p.x, p.y, p.z, 0.06, this.matMepLampu, "titikLampu");
          break;
        case "saklar":
          if (thinZ(p)) this.addMepBox(p.x, p.y, p.z, 0.09, 0.12, 0.028, this.matMepPlate, "saklar");
          else this.addMepBox(p.x, p.y, p.z, 0.028, 0.12, 0.09, this.matMepPlate, "saklar");
          break;
        case "stopkontak":
          if (thinZ(p)) this.addMepBox(p.x, p.y, p.z, 0.09, 0.09, 0.028, this.matMepPlate, "stopkontak");
          else this.addMepBox(p.x, p.y, p.z, 0.028, 0.09, 0.09, this.matMepPlate, "stopkontak");
          break;
        case "panel": {
          this.addMepBox(p.x, p.y, p.z, 0.26, 0.34, 0.09, this.matMepPanel, "panelMcb");
          const l = this.makeMepLabel("Panel MCB + meteran", "#f2c14e");
          l.position.set(p.x, p.y + 0.3, p.z);
          this.mepGroup.add(l);
          break;
        }
        case "meter_air": {
          this.addMepBox(p.x, p.y, p.z, 0.18, 0.18, 0.1, this.matMepAir, "meterAir");
          const l = this.makeMepLabel("Meter air + stop kran", "#4c9ee8");
          l.position.set(p.x, 0.35, p.z);
          this.mepGroup.add(l);
          break;
        }
        case "kran":
          this.addMepBox(p.x, p.y, p.z, 0.05, 0.16, 0.05, this.matMepAir, "kran");
          break;
        case "shower": {
          // lengan shower mendatar + muka pancuran di ketinggian 2,05 m
          this.addMepBox(p.x, p.y, p.z, 0.22, 0.045, 0.045, this.matMepAir, "shower");
          const g = new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16);
          const head = new THREE.Mesh(g, this.matMepAir);
          head.position.set(p.x, p.y - 0.03, p.z);
          head.renderOrder = 830;
          this.tag(head, "shower");
          this.mepGroup.add(head);
          this.dyn.push(g);
          break;
        }
        case "kloset": {
          // kloset duduk sederhana: mangkuk + tangki menghadap dinding belakang
          this.addMepBox(p.x, 0.19, p.z + 0.08, 0.36, 0.38, 0.5, this.matMepKloset, "kloset");
          this.addMepBox(p.x, 0.25, p.z - 0.2, 0.36, 0.5, 0.16, this.matMepKloset, "kloset");
          break;
        }
        case "drain":
          this.addMepCyl(p.x, p.y, p.z, 0.05, 0.014, this.matMepDrain, "drain");
          break;
      }
    }

    if (air && !hid("septic")) {
      // septic tank (kotak beton 1,2 x 1,6 m) + sumur resapan (Ø1,1 m) di belakang
      const s = m.septic;
      this.addMepBox(s.x, -0.8, s.z, 1.2, 0.9, 1.6, this.matSeptic, "septic");
      const ls = this.makeMepLabel("Septic tank", "#4f9d8d");
      ls.position.set(s.x, 0.1, s.z);
      this.mepGroup.add(ls);
      const r = m.resapan;
      const g = new THREE.CylinderGeometry(0.55, 0.55, 0.8, 24);
      const rp = new THREE.Mesh(g, this.matResapan);
      rp.position.set(r.x, -0.75, r.z);
      rp.renderOrder = 830;
      this.tag(rp, "septic");
      this.mepGroup.add(rp);
      this.dyn.push(g);
      const lr = this.makeMepLabel("Sumur resapan", "#8a7f6a");
      lr.position.set(r.x, 0.1, r.z);
      this.mepGroup.add(lr);
    }
  }

  /** Segmen pipa silinder antara dua titik jalur (overlay sinar-X). */
  private addPipe(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, radius: number, mat: THREE.Material, pick?: string) {
    const va = new THREE.Vector3(a.x, a.y, a.z);
    const vb = new THREE.Vector3(b.x, b.y, b.z);
    const dir = new THREE.Vector3().subVectors(vb, va);
    const len = dir.length();
    if (len < 0.015) return;
    const geo = new THREE.CylinderGeometry(radius, radius, len, 10);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(va).lerp(vb, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.renderOrder = 820;
    if (pick) this.tag(mesh, pick);
    this.mepGroup.add(mesh);
    this.dyn.push(geo);
  }

  private addMepBox(x: number, y: number, z: number, sx: number, sy: number, sz: number, mat: THREE.Material, pick?: string) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(x, y, z);
    mesh.renderOrder = 830;
    if (pick) this.tag(mesh, pick);
    this.mepGroup.add(mesh);
    this.dyn.push(g);
    return mesh;
  }

  private addMepSphere(x: number, y: number, z: number, r: number, mat: THREE.Material, pick?: string) {
    const g = new THREE.SphereGeometry(r, 14, 10);
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(x, y, z);
    mesh.renderOrder = 830;
    if (pick) this.tag(mesh, pick);
    this.mepGroup.add(mesh);
    this.dyn.push(g);
    return mesh;
  }

  private addMepCyl(x: number, y: number, z: number, r: number, h: number, mat: THREE.Material, pick?: string) {
    const g = new THREE.CylinderGeometry(r, r, h, 16);
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(x, y, z);
    mesh.renderOrder = 830;
    if (pick) this.tag(mesh, pick);
    this.mepGroup.add(mesh);
    this.dyn.push(g);
    return mesh;
  }

  /** Label kecil ala chip studio untuk titik MEP penting (selalu terlihat). */
  private makeMepLabel(text: string, accent: string): THREE.Sprite {
    const cv = document.createElement("canvas");
    cv.width = 320;
    cv.height = 76;
    const ctx = cv.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "rgba(20, 22, 25, 0.92)";
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(4, 4, 312, 68, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#eef1f4";
      ctx.textAlign = "center";
      ctx.font = "600 34px 'Segoe UI', 'Noto Sans', sans-serif";
      ctx.fillText(text, 160, 48);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    this.dyn.push(tex);
    const sm = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    this.dyn.push(sm);
    const sp = new THREE.Sprite(sm);
    sp.scale.set(0.9, 0.21, 1);
    sp.renderOrder = 1200;
    return sp;
  }

  // ---------------------------------------------------------- dimensi 3D --

  private rebuildDims() {
    for (const d of this.dimsDyn) d.dispose();
    this.dimsDyn.length = 0;
    this.clearGroup(this.dimsGroup);
    const m = this.lastModel;
    if (!this.dimsOn || !m) return;
    const f2 = (v: number) => v.toFixed(2).replace(".", ",");
    const t = m.config.tinggi;
    const rbTop = t + RB_H;
    const yR = m.roof.yRidge;
    const y = GROUND_Y + 0.03;

    // dimensi lebar & kedalaman di sisi depan-kanan (menghadap kamera 3/4 default)
    this.dimLine(new THREE.Vector3(0, y, 7.3), new THREE.Vector3(6, y, 7.3), "6,00 m");
    this.dimLine(new THREE.Vector3(7.3, y, 0), new THREE.Vector3(7.3, y, 6), "6,00 m");

    // dimensi tinggi total di sudut kanan-depan; label level zigzag agar tidak menumpuk
    const hx = 6.85;
    const hz = 6.85;
    this.dimLine(new THREE.Vector3(hx, 0, hz), new THREE.Vector3(hx, yR, hz), `${f2(yR)} m`);
    const levels: [number, string, number][] = [
      [0, "±0,00 lantai", 6.85],
      [t, `+${f2(t)} dinding`, 5.35],
      [rbTop, `+${f2(rbTop)} ring balk`, 6.85],
      [yR, `+${f2(yR)} nok`, 5.35],
    ];
    for (const [lv, txt, zOff] of levels) {
      this.dimTick(new THREE.Vector3(hx, lv, hz), new THREE.Vector3(1, 0, 0));
      const sp = this.makeDimSprite(txt);
      sp.position.set(hx + 0.62, lv, zOff);
      this.dimsGroup.add(sp);
    }
  }

  private dimLine(a: THREE.Vector3, b: THREE.Vector3, label: string) {
    const g = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(g, this.matDim);
    line.renderOrder = 999;
    this.dimsGroup.add(line);
    this.dimsDyn.push(g);
    const dir = new THREE.Vector3().subVectors(b, a).normalize();
    const perp = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0).cross(dir).normalize();
    this.dimTick(a, perp);
    this.dimTick(b, perp);
    const sp = this.makeDimSprite(label);
    sp.position.copy(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)).addScaledVector(perp, 0.3);
    this.dimsGroup.add(sp);
  }

  private dimTick(p: THREE.Vector3, perp: THREE.Vector3) {
    const g = new THREE.BufferGeometry().setFromPoints([
      p.clone().addScaledVector(perp, -0.09),
      p.clone().addScaledVector(perp, 0.09),
    ]);
    const line = new THREE.Line(g, this.matDim);
    line.renderOrder = 999;
    this.dimsGroup.add(line);
    this.dimsDyn.push(g);
  }

  private makeDimSprite(text: string): THREE.Sprite {
    const cv = document.createElement("canvas");
    cv.width = 360;
    cv.height = 96;
    const ctx = cv.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "rgba(24, 26, 29, 0.92)";
      ctx.strokeStyle = "rgba(232, 125, 62, 0.95)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(4, 4, 352, 88, 18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#e8ecef";
      ctx.textAlign = "center";
      ctx.font = "600 38px 'Segoe UI', 'Noto Sans', sans-serif";
      ctx.fillText(text, 180, 60);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    this.dimsDyn.push(tex);
    const sm = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
    this.dimsDyn.push(sm);
    const sp = new THREE.Sprite(sm);
    sp.scale.set(0.98, 0.26, 1);
    sp.renderOrder = 1000;
    return sp;
  }

  // ------------------------------------------------------ exploded view --

  /**
   * Terapkan tingkat bongkar k (0..1) ke seluruh registry komponen:
   * posisi = basis + offset x k. InstancedMesh (bata/genteng/keramik)
   * disusun ulang matriksnya per instance. Tanah dibuat tembus pandang agar
   * pondasi yang "dipanjatkan" ke bawah tetap terbaca; overlay MEP di-fade
   * agar struktur yang mengurai tampak jelas.
   */
  private applyExplode(k: number) {
    const e = THREE.MathUtils.clamp(k, 0, 1);
    for (const p of this.explodePieces) {
      p.obj.position.copy(p.base).addScaledVector(p.off, e);
    }
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    for (const im of this.explodeInstanced) {
      for (let i = 0; i < im.n; i++) {
        q.set(im.quat[i * 4], im.quat[i * 4 + 1], im.quat[i * 4 + 2], im.quat[i * 4 + 3]);
        v.set(
          im.pos[i * 3] + im.off[i * 3] * e,
          im.pos[i * 3 + 1] + im.off[i * 3 + 1] * e,
          im.pos[i * 3 + 2] + im.off[i * 3 + 2] * e,
        );
        s.set(im.scl[i * 3], im.scl[i * 3 + 1], im.scl[i * 3 + 2]);
        m4.compose(v, q, s);
        im.im.setMatrixAt(i, m4);
      }
      im.im.instanceMatrix.needsUpdate = true;
    }
    // tanah & petak 6x6 transparan saat komponen bawah tanah dipanjatkan keluar
    // (buis cakar ayam / jalur pipa bawah tanah tetap terbaca dari atas)
    const op = this.groundSemi ? 0.32 : THREE.MathUtils.lerp(1, 0.3, Math.min(1, e * 2.5));
    this.matGround.transparent = op < 0.999;
    this.matGround.opacity = op;
    const opPlot = this.groundSemi ? 0 : THREE.MathUtils.lerp(1, 0.18, Math.min(1, e * 2.5));
    this.matPlot.transparent = opPlot < 0.999;
    this.matPlot.opacity = opPlot;
    // overlay MEP (pipa/kabel/titik) di-fade perlahan agar fokus ke komponen
    for (const [mat, base] of this.mepFade) mat.opacity = base * (1 - 0.62 * e);
  }

  /** Daftarkan mesh/grup tunggal ke registry exploded view. */
  private registerExplode(obj: THREE.Object3D, ox: number, oy: number, oz: number) {
    this.explodePieces.push({ obj, base: obj.position.clone(), off: new THREE.Vector3(ox, oy, oz) });
  }

  /**
   * Daftarkan InstancedMesh (bata / genteng / keramik) + offset per instance
   * (offs.length = jumlah instance * 3). Posisi/rotasi/skala basis ditangkap
   * dari matriks instance saat pendaftaran.
   */
  private registerExplodeInstanced(im: THREE.InstancedMesh, off: Float32Array) {
    const n = im.count;
    const pos = new Float32Array(n * 3);
    const quat = new Float32Array(n * 4);
    const scl = new Float32Array(n * 3);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      im.getMatrixAt(i, m4);
      m4.decompose(v, q, s);
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
      quat[i * 4] = q.x;
      quat[i * 4 + 1] = q.y;
      quat[i * 4 + 2] = q.z;
      quat[i * 4 + 3] = q.w;
      scl[i * 3] = s.x;
      scl[i * 3 + 1] = s.y;
      scl[i * 3 + 2] = s.z;
    }
    this.explodeInstanced.push({ im, n, pos, off, quat, scl });
  }

  // --------------------------------------------------------------- util --

  private addBox(parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sy: number, sz: number, mat: THREE.Material, receive = true, pick?: string) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = receive;
    if (pick) this.tag(m, pick);
    parent.add(m);
    this.dyn.push(g);
    return m;
  }

  /** Kotak miring di sumbu Z: rotasi positif menaikkan ujung +X, negatif menurunkan. */
  private addTiltedBox(parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sy: number, sz: number, rotZ: number, mat: THREE.Material, pick?: string) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    m.rotation.z = rotZ;
    m.castShadow = true;
    m.receiveShadow = true;
    if (pick) this.tag(m, pick);
    parent.add(m);
    this.dyn.push(g);
    return m;
  }

  /** Batang lurus antara dua titik pada bidang X-Y (web pengaku kuda-kuda). */
  private addStrut(parent: THREE.Object3D, x1: number, y1: number, x2: number, y2: number, z: number, mat: THREE.Material): THREE.Mesh {
    const L = Math.hypot(x2 - x1, y2 - y1);
    return this.addTiltedBox(parent, (x1 + x2) / 2, (y1 + y2) / 2, z, L, 0.05, 0.04, Math.atan2(y2 - y1, x2 - x1), mat);
  }

  private makeTextSprite(line1: string, line2: string): THREE.Sprite {
    const cv = document.createElement("canvas");
    cv.width = 512;
    cv.height = 192;
    const ctx = cv.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "rgba(250, 250, 246, 0.88)";
      ctx.strokeStyle = "rgba(90, 98, 86, 0.9)";
      ctx.lineWidth = 4;
      const r = 24;
      ctx.beginPath();
      ctx.roundRect(6, 6, 500, 180, r);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2f3530";
      ctx.textAlign = "center";
      ctx.font = "bold 46px 'Segoe UI', 'Noto Sans', sans-serif";
      ctx.fillText(line1, 256, 84);
      ctx.fillStyle = "#54605a";
      ctx.font = "38px 'Segoe UI', 'Noto Sans', sans-serif";
      ctx.fillText(line2, 256, 142);
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    this.dyn.push(tex);
    const sm = new THREE.SpriteMaterial({ map: tex, depthTest: true, transparent: true });
    this.dyn.push(sm);
    const sp = new THREE.Sprite(sm);
    sp.scale.set(1.9, 0.71, 1);
    return sp;
  }

  private clearGroup(g: THREE.Group) {
    for (const child of [...g.children]) {
      g.remove(child);
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("pointercancel", this.onUp);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("pointerleave", this.onLeave);
    for (const d of this.disposables) d.dispose();
    for (const d of this.dyn) d.dispose();
    for (const d of this.dimsDyn) d.dispose();
    for (const m of this.hiMats.values()) m.dispose();
    for (const m of [
      this.matBrick, this.matMortar, this.matKusen, this.matPintu, this.matKaca,
      this.matPlinth, this.matBeton, this.matBuis, this.matRabat, this.matKeramik,
      this.matKeramikBasah, this.matAtap, this.matBaja,
      this.matGenteng, this.matLisplank, this.matPlafon, this.matRidge,
      this.matPlester, this.matCatInt, this.matCatExt, this.matVent,
      this.matVentFrame, this.matPintuGelap, this.matGround, this.matPlot, this.matDim,
      this.matPipeBersih, this.matPipeKotor, this.matKabelLampu, this.matKabelKontak,
      this.matMepLampu, this.matMepPlate, this.matMepPanel, this.matMepAir,
      this.matMepKloset, this.matMepDrain, this.matSeptic, this.matResapan,
    ]) m.dispose();
    this.renderer.dispose();
  }
}

function s2(v: number | undefined): number {
  return Math.max(0, Math.round(v || 0));
}

/** Bandingkan ViewState dengan mengabaikan nilai explode (untuk fast-path update). */
function viewEqualExceptExplode(a: ViewState, b: ViewState): boolean {
  const strip = (v: ViewState) => {
    const { explode: _e, ...rest } = v;
    return JSON.stringify({ ...rest, hidden: [...(v.hidden ?? [])] });
  };
  return strip(a) === strip(b);
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
