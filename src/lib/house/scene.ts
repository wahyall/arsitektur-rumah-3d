/**
 * Scene 3D rumah (denah 6x6 m): instancing bata per dinding, mortar/nat, kusen
 * berprofil, pintu, jendela, lubang angin permanen (roster), pondasi batu kali
 * ATAU cakar ayam (pelat + buis), sloof, kolom praktis, ring balk, plester + cat,
 * atap pelana lengkap (kuda-kuda baja ringan + web, reng, genteng, lisplank, nok),
 * label ruangan, potongan (clipping), mode bongkar (explode), dan SIMULASI
 * KONSTRUKSI BERTAHAP (stage 1..8: pondasi -> sloof -> dinding -> pelana ->
 * rangka atap -> genteng -> plester -> cat).
 * Denah memakai (x, y) meter -> three: X = x, Z = y, Y = ketinggian.
 * Ridge atap memanjang sepanjang sumbu Z (dinding ujung pelana = depan/belakang).
 */
import * as THREE from "three";
import type { HouseModel, WallRT, OpeningSpec, CakarAyamRT } from "@/lib/house/engine";
import { RB_H, CAKAR } from "@/lib/house/engine";

export interface ViewState {
  showRoof: boolean; // genteng + nok
  showRangka: boolean; // kuda-kuda + reng (rangka baja ringan)
  showStruktur: boolean; // sloof + kolom praktis + ring balk
  showLabels: boolean;
  showFinishing: boolean; // plester + cat di mode bebas (stage 0)
  explode: number; // 0..1
  cutH: number; // ketinggian potongan (m); >= 1000 = tidak dipotong
  stage: number; // 0 = kendali bebas (flag manual); 1..8 = tahapan konstruksi
  paintHex: string; // warna cat eksterior (hex)
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

type CameraPreset = "3d" | "depan" | "atas";

const GROUND_Y = -0.55;

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
  private labelGroup: THREE.Group = new THREE.Group();
  private clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000);
  private disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
  private ro: ResizeObserver;

  // orbit state
  private target = new THREE.Vector3(3, 1.2, 3);
  private sph = { radius: 13, theta: Math.PI * 0.15, phi: 1.02 };
  private pointers = new Map<number, { x: number; y: number }>();
  private panMode = false;
  private pinchDist = 0;
  private raf = 0;

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
  private matLantai = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.6 });
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
  private matGround = new THREE.MeshStandardMaterial({ color: 0xb9c3ab, roughness: 1, transparent: true, opacity: 1 });
  private matPlot = new THREE.MeshStandardMaterial({ color: 0x9db084, roughness: 1, transparent: true, opacity: 1 });

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.localClippingEnabled = true;
    this.renderer.setClearColor(0xe3e8e2);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);

    const mats = [
      this.matBrick, this.matMortar, this.matKusen, this.matPintu, this.matKaca,
      this.matPlinth, this.matBeton, this.matBuis, this.matLantai, this.matAtap, this.matBaja,
      this.matGenteng, this.matLisplank, this.matPlafon, this.matRidge,
      this.matPlester, this.matCatInt, this.matCatExt, this.matVent,
      this.matVentFrame, this.matPintuGelap,
    ];
    for (const m of mats) m.clippingPlanes = [this.clipPlane];

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

    const grid = new THREE.GridHelper(60, 60, 0xc3c9bd, 0xd0d5ca);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.55;
    grid.position.y = GROUND_Y + 0.002;
    this.scene.add(grid);

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
    this.scene.add(this.labelGroup);

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
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  private onDown = (e: PointerEvent) => {
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.panMode = e.button === 1 || e.button === 2 || e.shiftKey;
    if (this.pointers.size === 2) {
      const pts = [...this.pointers.values()];
      this.pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  };

  private onMove = (e: PointerEvent) => {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
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
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchDist = 0;
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
    } else if (p === "atas") {
      this.target.set(3, 0, 3);
      this.sph = { radius: 13.5, theta: Math.PI * 0.001, phi: 0.03 };
    } else {
      this.target.set(3, 1.4, 3);
      this.sph = { radius: 13, theta: Math.PI * 0.15, phi: 1.02 };
    }
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
    this.camera.position.copy(this.camPos());
    this.camera.lookAt(this.target);
    this.renderer.render(this.scene, this.camera);
  };

  private resize() {
    const el = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, el.clientWidth);
    const h = Math.max(1, el.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // --------------------------------------------------------------- update --

  update(model: HouseModel, view: ViewState) {
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
    this.matGround.transparent = semi;
    this.matGround.opacity = semi ? 0.45 : 1;
    if (this.plotMesh) this.plotMesh.visible = !semi;

    const tL = model.config.tLuar / 1000;
    const tinggi = model.config.tinggi;
    const cakar = model.config.pondasi === "cakarayam" && !!model.structure.cakar;

    // ----- tahapan konstruksi: 0 = kendali bebas, 1..8 = kondisi pembangunan
    const s = Math.max(0, Math.round(view.stage || 0));
    const manual = s === 0;
    const V: StageVis = {
      pondasi: manual ? true : s >= 1,
      sloof: manual ? view.showStruktur : s >= 2,
      kolom: manual ? view.showStruktur : s >= 2,
      dinding: manual ? true : s >= 3,
      pelana: manual ? true : s >= 4,
      ringbalk: manual ? view.showStruktur : s >= 4,
      kusen: manual ? true : s >= 3,
      lantai: manual ? true : s >= 8,
      rangka: manual ? view.showRangka : s >= 5,
      genteng: manual ? view.showRoof : s >= 6,
      plafon: manual ? view.showRoof || view.showRangka : s >= 6,
      plester: manual ? view.showFinishing : s >= 7,
      cat: manual ? view.showFinishing : s >= 8,
    };

    // lantai interior (rabat + keramik) di Y=0
    if (V.lantai) {
      const lantaiW = 6 - 2 * tL;
      this.addBox(this.houseRoot, 3, -0.05, 3, lantaiW, 0.1, lantaiW, this.matLantai, true);
    }

    // pondasi cakar ayam (pelat + buis, sekali untuk seluruh denah)
    if (cakar && V.pondasi && model.structure.cakar) {
      this.buildCakarAyam(model.structure.cakar);
    }

    // dinding: pondasi batu kali + sloof + bata (instancing per dinding) + ring balk + kusen
    for (const w of model.walls) {
      this.buildWall(w, model, V, cakar);
    }

    // kolom praktis 15/15 di tiap simpul dinding
    if (V.kolom) {
      const kw = Math.max(0.15, tL + 0.015);
      for (const k of model.koloms) {
        this.addBox(this.kolomGroup, k.x, (tinggi + RB_H) / 2, k.y, kw, tinggi + RB_H, kw, this.matBeton);
      }
    }

    // atap + plafon
    this.buildRoof(model, V);

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

    // mode bongkar: atap naik, dinding mengurai keluar
    this.roofGroup.position.y = view.explode * 2.6;
    for (const g of this.houseRoot.children) {
      if (g instanceof THREE.Group && g.userData.explodeDir) {
        const d = g.userData.explodeDir as [number, number];
        g.position.set(d[0] * view.explode * 1.4, 0, d[1] * view.explode * 1.4);
      }
    }
    this.roofGroup.visible = manual
      ? view.showRoof || view.showRangka
      : V.rangka || V.genteng || V.plafon;
    this.tilesGroup.visible = V.genteng;
    this.trussGroup.visible = V.rangka;
    this.kolomGroup.visible = V.kolom;
  }

  private buildWall(w: WallRT, model: HouseModel, V: StageVis, cakar: boolean) {
    const group = new THREE.Group();
    group.userData.explodeDir = w.explodeDir;
    this.houseRoot.add(group);

    const len = w.hi - w.lo;
    const t = w.t;
    const mid = (w.lo + w.hi) / 2;
    const bw = Math.max(0.15, t + 0.01); // lebar sloof / ring balk (15 cm standar)

    // pondasi batu kali: 40 x 60 cm, dari -0,6 s/d -0,2 m (digantikan cakar ayam bila aktif)
    // sloof beton 15/20: dari -0,2 s/d 0 m | ring balk: dari tinggi s/d tinggi + 0,2 m
    if (!cakar && V.pondasi) {
      const pt = t + 0.15;
      if (w.axis === "h") this.addBox(group, mid, -0.4, w.c, len, 0.4, pt, this.matPlinth);
      else this.addBox(group, w.c, -0.4, mid, pt, 0.4, len, this.matPlinth);
    }
    if (V.sloof) {
      if (w.axis === "h") this.addBox(group, mid, -0.1, w.c, len, RB_H, bw, this.matBeton);
      else this.addBox(group, w.c, -0.1, mid, bw, RB_H, len, this.matBeton);
    }
    if (V.ringbalk) {
      if (w.axis === "h") this.addBox(group, mid, w.h + RB_H / 2, w.c, len, RB_H, bw, this.matBeton);
      else this.addBox(group, w.c, w.h + RB_H / 2, mid, bw, RB_H, len, this.matBeton);
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

    // mortar/nat terlihat di sela bata — tertutup begitu plester dipasang
    if (V.dinding && !V.plester) {
      for (const s of segs) {
        if (s.hi - s.lo < 0.01 || s.z1 - s.z0 < 0.01) continue;
        if (w.axis === "h") this.addBox(group, (s.lo + s.hi) / 2, (s.z0 + s.z1) / 2, w.c, s.hi - s.lo, s.z1 - s.z0, t, this.matMortar);
        else this.addBox(group, w.c, (s.z0 + s.z1) / 2, (s.lo + s.hi) / 2, t, s.z1 - s.z0, s.hi - s.lo, this.matMortar);
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
      group.add(mesh);
      this.disposables.push(geo);
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
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const col = new THREE.Color();
      const base = new THREE.Color(model.config.jenis === "hebel" ? 0xeceae3 : 0xa3492f);
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
      });
      group.add(im);
      this.disposables.push(geo);
    }

    // plesteran + acian / cat: lapisan tipis pada kedua muka dinding (termasuk pelana)
    if (V.plester) {
      const pp = 0.013; // tebal plester tiap muka
      const extSide = w.outer ? (w.c < 3 ? -1 : 1) : 0; // muka luar (searah keluar denah)
      for (const side of [-1, 1]) {
        const isExt = w.outer && side === extSide;
        const mat = V.cat ? (isExt ? this.matCatExt : this.matCatInt) : this.matPlester;
        for (const s of segs) {
          if (s.hi - s.lo < 0.01 || s.z1 - s.z0 < 0.01) continue;
          if (w.axis === "h")
            this.addBox(group, (s.lo + s.hi) / 2, (s.z0 + s.z1) / 2, w.c + side * (t / 2 + pp / 2), s.hi - s.lo, s.z1 - s.z0, pp, mat);
          else
            this.addBox(group, w.c + side * (t / 2 + pp / 2), (s.z0 + s.z1) / 2, (s.lo + s.hi) / 2, pp, s.z1 - s.z0, s.hi - s.lo, mat);
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
          group.add(mesh);
          this.disposables.push(geo);
        }
      }
    }

    // kusen berprofil, pintu, jendela & lubang angin
    if (V.kusen) {
      for (const o of w.openings) this.buildKusen(group, w, o);
    }
  }

  /**
   * Kusen berprofil (tiang + ambang + lis dalam membentuk alur), daun pintu
   * panel 2 susun + handle, jendela kaca + palang aluminium, dan lubang angin
   * permanen (roster beton dengan kisi).
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

    // helper: kotak pada bidang bukaan (x = sepanjang dinding, y = elevasi)
    const put = (x: number, y: number, sx: number, sy: number, sz: number, mat: THREE.Material, receive = true) => {
      if (w.axis === "h") this.addBox(group, x, y, w.c, sx, sy, sz, mat, receive);
      else this.addBox(group, w.c, y, x, sz, sy, sx, mat, receive);
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
      // daun pintu panel + lis 2 susun + handle kedua muka
      const dw = wdt - 2 * jw - 0.015;
      const dh = hgt - 2 * jw - 0.02;
      const dy = o.sill + jw + dh / 2 + 0.008;
      put(midO, dy, dw, dh, 0.045, this.matPintu);
      put(midO, dy + dh * 0.18, dw * 0.6, dh * 0.3, 0.052, this.matPintuGelap);
      put(midO, dy - dh * 0.22, dw * 0.6, dh * 0.42, 0.052, this.matPintuGelap);
      put(midO + dw / 2 - 0.09, o.sill + 1.02, 0.03, 0.14, ft + 0.014, this.matBaja);
    } else {
      // jendela: kaca + palang tengah + batang daun (profil aluminium)
      const gw = wdt - 2 * jw - 0.03;
      const gh = hgt - 2 * jw - 0.03;
      put(midO, cy, gw, gh, 0.012, this.matKaca, false);
      put(midO, cy, gw, 0.035, 0.03, this.matBaja);
      const nLeaf = Math.max(2, Math.round(gw / 0.55));
      for (let li = 1; li < nLeaf; li++) {
        const lx = o.from + jw + (gw * li) / nLeaf;
        put(lx, cy, 0.03, gh, 0.035, this.matBaja);
      }
    }
  }

  /** Pondasi cakar ayam (sistem Sedyatmo): pelat beton 6x6 m + buis beton vertikal. */
  private buildCakarAyam(c: CakarAyamRT) {
    // pelat bertulang: puncak pelat tepat di bawah sloof (-0,2 m), buram agar solid terbaca
    this.addBox(this.houseRoot, 3, -0.2 - CAKAR.slabT / 2, 3, 6, CAKAR.slabT, 6, this.matBeton, true);
    // buis beton menancap ke tanah di tiap titik kolom + grid tengah;
    // ujung atas buis dibuat rata muka pelat agar pola grid cakar terbaca dari atas
    const L = CAKAR.buisL + CAKAR.slabT;
    for (const p of c.buisPts) {
      const geo = new THREE.CylinderGeometry(CAKAR.buisDia / 2, CAKAR.buisDia / 2, L, 18);
      const m = new THREE.Mesh(geo, this.matBuis);
      m.position.set(p.x, -0.2 + 0.02 - L / 2, p.y); // ujung atas sedikit menonjol 2 cm di muka pelat
      m.receiveShadow = true;
      this.houseRoot.add(m);
      this.disposables.push(geo);
    }
  }

  /**
   * Atap pelana dengan ridge memanjang sepanjang Z (di x = 3).
   * Bidang atap menurun ke dinding kiri (x = 0) dan kanan (x = 6);
   * dinding ujung pelana adalah dinding depan (z = 6) dan belakang (z = 0).
   * Tahapan: rangka atap (kuda-kuda + web + reng + lisplank) -> genteng + nok.
   */
  private buildRoof(model: HouseModel, V: StageVis) {
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

    // plafon mengikuti area bersih
    if (V.plafon) {
      const cw = 6 - 2 * (model.config.tLuar / 1000);
      this.addBox(this.roofGroup, 3, tinggi + 0.02, 3, cw, 0.03, cw, this.matPlafon);
    }

    // ---------- rangka baja ringan (kuda-kuda + web pengaku + reng + lisplank) ----------
    if (V.rangka) {
      // kuda-kuda: rangka C75 pada jarak 1,2 m, tapak di atas ring balk
      const kuda = model.roof.kudaKuda;
      for (let i = 0; i < kuda; i++) {
        const z = 0.3 + i * ((6 - 0.6) / (kuda - 1));
        // ikatan bawah (bottom chord) sepanjang dinding kiri-kanan
        this.addBox(this.trussGroup, 3, rBase + 0.05, z, 5.6, 0.075, 0.06, this.matBaja);
        // dua kasau (top chord) naik ke ridge
        const dx = 2.75;
        const dy = apex - 0.12;
        const L = Math.hypot(dx, dy);
        const angR = Math.atan2(dy, dx);
        const cyR = (rBase + 0.09 + yRidge - 0.03) / 2;
        // kiri: ujung +X (ridge) harus NAIK -> rotasi positif
        this.addTiltedBox(this.trussGroup, 3 - dx / 2, cyR, z, L, 0.075, 0.06, angR, this.matBaja);
        // kanan: ujung -X (ridge) naik -> rotasi negatif
        this.addTiltedBox(this.trussGroup, 3 + dx / 2, cyR, z, L, 0.075, 0.06, -angR, this.matBaja);
        // tiang tengah (king post)
        if (apex > 0.5) {
          this.addBox(this.trussGroup, 3, rBase + 0.09 + (apex - 0.14) / 2, z, 0.05, apex - 0.14, 0.05, this.matBaja);
        }
        // web diagonal pengaku: bottom chord -> kasau -> tiang tengah
        const kasaY = planeY(0.85) + 0.03;
        const postMid = rBase + 0.09 + (apex - 0.14) * 0.55;
        for (const sgn of [-1, 1]) {
          this.addStrut(this.trussGroup, 3 + sgn * 1.5, rBase + 0.087, 3 + sgn * 0.85, kasaY, z, this.matBaja);
          this.addStrut(this.trussGroup, 3 + sgn * 0.85, kasaY, 3, postMid, z, this.matBaja);
        }
      }

      // reng: melintang sepanjang Z di atas kasau, jarak ~40 cm sepanjang bidang
      for (const s of [-1, 1]) {
        for (let hx = 0.35; hx <= 3 + ov - 0.05; hx += 0.4) {
          this.addTiltedBox(
            this.trussGroup,
            3 + s * hx,
            planeY(hx) + 0.075,
            3,
            0.05,
            0.05,
            zLen,
            s > 0 ? -ang : ang,
            this.matBaja,
          );
        }
      }

      // lisplank pada kedua ujung eaves (terpasang di rangka sebelum genteng)
      for (const s of [-1, 1]) {
        const x = 3 + s * (3 + ov) - s * 0.02;
        this.addBox(this.trussGroup, x, planeY(3 + ov) - 0.1, 3, 0.035, 0.2, zLen, this.matLisplank);
      }
    }

    // ---------- genteng + nok ----------
    if (V.genteng) {
      // genteng beton flat: baris sepanjang Z, tumpukan tiap ~40 cm sepanjang bidang
      const dxTile = 0.4 * Math.cos(ang);
      const tileL = dxTile * 1.04;
      const nRows = Math.max(2, Math.ceil((3 + ov) / dxTile));
      const zCount = Math.max(2, Math.ceil(zLen / 0.26));
      for (const s of [-1, 1]) {
        const geo = new THREE.BoxGeometry(tileL, 0.02, 0.24);
        const im = new THREE.InstancedMesh(geo, this.matGenteng, nRows * zCount);
        im.castShadow = true;
        im.receiveShadow = true;
        const m4 = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const axis = new THREE.Vector3(0, 0, 1);
        const col = new THREE.Color();
        const base = new THREE.Color(0x96524a);
        let idx = 0;
        for (let i = 0; i < nRows; i++) {
          const hx = (i + 0.5) * dxTile;
          for (let jj = 0; jj < zCount; jj++) {
            const z = -ov + (jj + 0.5) * (zLen / zCount);
            q.setFromAxisAngle(axis, s > 0 ? -ang : ang);
            m4.compose(
              new THREE.Vector3(3 + s * hx, planeY(hx) + 0.09, z),
              q,
              new THREE.Vector3(1, 1, 1),
            );
            im.setMatrixAt(idx, m4);
            const r = mulberry32(idx * 2654435761 + (s > 0 ? 7 : 13))();
            col.copy(base).offsetHSL(0.004 * (r - 0.5), 0.06 * (r - 0.5), 0.07 * (r - 0.5));
            im.setColorAt(idx, col);
            idx++;
          }
        }
        this.tilesGroup.add(im);
        this.disposables.push(geo);
      }

      // nok (ridge cap) menutup pertemuan dua bidang genteng
      const g = new THREE.BoxGeometry(0.3, 0.06, zLen + 0.04);
      const nok = new THREE.Mesh(g, this.matRidge);
      nok.castShadow = true;
      nok.position.set(3, yRidge + 0.11, 3);
      this.tilesGroup.add(nok);
      this.disposables.push(g);
    }
  }

  // --------------------------------------------------------------- util --

  private addBox(parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sy: number, sz: number, mat: THREE.Material, receive = true) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = receive;
    parent.add(m);
    this.disposables.push(g);
    return m;
  }

  /** Kotak miring di sumbu Z: rotasi positif menaikkan ujung +X, negatif menurunkan. */
  private addTiltedBox(parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sy: number, sz: number, rotZ: number, mat: THREE.Material) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const m = new THREE.Mesh(g, mat);
    m.position.set(x, y, z);
    m.rotation.z = rotZ;
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    this.disposables.push(g);
    return m;
  }

  /** Batang lurus antara dua titik pada bidang X-Y (web pengaku kuda-kuda). */
  private addStrut(parent: THREE.Object3D, x1: number, y1: number, x2: number, y2: number, z: number, mat: THREE.Material) {
    const L = Math.hypot(x2 - x1, y2 - y1);
    this.addTiltedBox(parent, (x1 + x2) / 2, (y1 + y2) / 2, z, L, 0.05, 0.04, Math.atan2(y2 - y1, x2 - x1), mat);
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
    this.disposables.push(tex);
    const sm = new THREE.SpriteMaterial({ map: tex, depthTest: true, transparent: true });
    this.disposables.push(sm);
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
    for (const d of this.disposables) d.dispose();
    for (const m of [
      this.matBrick, this.matMortar, this.matKusen, this.matPintu, this.matKaca,
      this.matPlinth, this.matBeton, this.matBuis, this.matLantai, this.matAtap, this.matBaja,
      this.matGenteng, this.matLisplank, this.matPlafon, this.matRidge,
      this.matPlester, this.matCatInt, this.matCatExt, this.matVent,
      this.matVentFrame, this.matPintuGelap, this.matGround, this.matPlot,
    ]) m.dispose();
    this.renderer.dispose();
  }
}

function s2(v: number | undefined): number {
  return Math.max(0, Math.round(v || 0));
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
