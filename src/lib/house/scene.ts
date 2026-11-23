/**
 * Scene 3D rumah (denah 6x6 m): instancing bata per dinding, mortar/nat, kusen,
 * pintu, jendela, pondasi batu kali, sloof, kolom praktis, ring balk, atap
 * pelana lengkap (kuda-kuda baja ringan, reng, genteng, lisplank, nok), label
 * ruangan, potongan (clipping) dan mode bongkar (explode).
 * Denah memakai (x, y) meter -> three: X = x, Z = y, Y = ketinggian.
 * Ridge atap memanjang sepanjang sumbu Z (dinding ujung pelana = depan/belakang).
 */
import * as THREE from "three";
import type { HouseModel, WallRT } from "@/lib/house/engine";
import { RB_H } from "@/lib/house/engine";

export interface ViewState {
  showRoof: boolean; // genteng + lisplang + nok
  showRangka: boolean; // kuda-kuda + reng (rangka baja ringan)
  showStruktur: boolean; // sloof + kolom praktis + ring balk
  showLabels: boolean;
  explode: number; // 0..1
  cutH: number; // ketinggian potongan (m); >= 1000 = tidak dipotong
}

type CameraPreset = "3d" | "depan" | "atas";

const GROUND_Y = -0.55;

export class HouseScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private houseRoot: THREE.Group = new THREE.Group();
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
  private matLantai = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.6 });
  private matAtap = new THREE.MeshStandardMaterial({ color: 0x555d63, roughness: 0.85 });
  private matBaja = new THREE.MeshStandardMaterial({ color: 0x9aa8b2, roughness: 0.45, metalness: 0.55 });
  private matGenteng = new THREE.MeshStandardMaterial({ color: 0x96524a, roughness: 0.75 });
  private matLisplank = new THREE.MeshStandardMaterial({ color: 0xd8c9a8, roughness: 0.8 });
  private matPlafon = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.95 });
  private matRidge = new THREE.MeshStandardMaterial({ color: 0x7c3f38, roughness: 0.8 });

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
      this.matPlinth, this.matBeton, this.matLantai, this.matAtap, this.matBaja,
      this.matGenteng, this.matLisplank, this.matPlafon, this.matRidge,
    ];
    for (const m of mats) m.clippingPlanes = [this.clipPlane];

    // pencahayaan
    const hemi = new THREE.HemisphereLight(0xf6f7f4, 0x8f9483, 0.85);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff4e0, 1.35);
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
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xb9c3ab, roughness: 1 });
    this.disposables.push(groundGeo, groundMat);
    const ground = new THREE.Mesh(groundGeo, groundMat);
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
    const plotMat = new THREE.MeshStandardMaterial({ color: 0x9db084, roughness: 1 });
    this.disposables.push(plotGeo, plotMat);
    const plot = new THREE.Mesh(plotGeo, plotMat);
    plot.rotation.x = -Math.PI / 2;
    plot.position.set(3, GROUND_Y + 0.005, 3);
    plot.receiveShadow = true;
    this.scene.add(plot);

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

    const isHebel = model.config.jenis === "hebel";
    this.matBrick.color.set(isHebel ? 0xeceae3 : 0xa3492f);

    const tL = model.config.tLuar / 1000;
    const tinggi = model.config.tinggi;

    // lantai interior (rabat + keramik) di Y=0
    const lantaiW = 6 - 2 * tL;
    this.addBox(this.houseRoot, 3, -0.05, 3, lantaiW, 0.1, lantaiW, this.matLantai, true);

    // dinding: pondasi batu kali + sloof + bata (instancing per dinding) + ring balk + kusen
    for (const w of model.walls) {
      this.buildWall(w, model, view.showStruktur);
    }

    // kolom praktis 15/15 di tiap simpul dinding
    if (view.showStruktur) {
      const kw = Math.max(0.15, tL + 0.015);
      for (const k of model.koloms) {
        this.addBox(this.kolomGroup, k.x, (tinggi + RB_H) / 2, k.y, kw, tinggi + RB_H, kw, this.matBeton);
      }
    }

    // atap + plafon
    this.buildRoof(model, view);

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
    this.roofGroup.visible = view.showRoof || view.showRangka;
    this.tilesGroup.visible = view.showRoof;
    this.trussGroup.visible = view.showRangka;
    this.kolomGroup.visible = view.showStruktur;
  }

  private buildWall(w: WallRT, model: HouseModel, showStruktur: boolean) {
    const group = new THREE.Group();
    group.userData.explodeDir = w.explodeDir;
    this.houseRoot.add(group);

    const len = w.hi - w.lo;
    const t = w.t;
    const mid = (w.lo + w.hi) / 2;
    const bw = Math.max(0.15, t + 0.01); // lebar sloof / ring balk (15 cm standar)

    // pondasi batu kali: 40 x 60 cm, dari -0,6 s/d -0,2 m
    const pt = t + 0.15;
    // sloof beton 15/20: dari -0,2 s/d 0 m
    // ring balk 15/20: dari tinggi s/d tinggi + 0,2 m (dasar dinding pelana)
    if (w.axis === "h") {
      this.addBox(group, mid, -0.4, w.c, len, 0.4, pt, this.matPlinth);
      if (showStruktur) {
        this.addBox(group, mid, -0.1, w.c, len, RB_H, bw, this.matBeton);
        this.addBox(group, mid, w.h + RB_H / 2, w.c, len, RB_H, bw, this.matBeton);
      }
    } else {
      this.addBox(group, w.c, -0.4, mid, pt, 0.4, len, this.matPlinth);
      if (showStruktur) {
        this.addBox(group, w.c, -0.1, mid, bw, RB_H, len, this.matBeton);
        this.addBox(group, w.c, w.h + RB_H / 2, mid, bw, RB_H, len, this.matBeton);
      }
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
    for (const s of segs) {
      if (s.hi - s.lo < 0.01 || s.z1 - s.z0 < 0.01) continue;
      if (w.axis === "h") this.addBox(group, (s.lo + s.hi) / 2, (s.z0 + s.z1) / 2, w.c, s.hi - s.lo, s.z1 - s.z0, t, this.matMortar);
      else this.addBox(group, w.c, (s.z0 + s.z1) / 2, (s.lo + s.hi) / 2, t, s.z1 - s.z0, s.hi - s.lo, this.matMortar);
    }

    // segitiga mortar di ujung atap pelana (dinding depan/belakang), di atas ring balk
    if (w.gable) {
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

    // bata instanced
    const bricks = model.bricks.filter((b) => b.wallId === w.id);
    if (bricks.length > 0) {
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

    // kusen, pintu & jendela
    for (const o of w.openings) {
      const wdt = o.to - o.from;
      const midO = (o.from + o.to) / 2;
      const ft = t + 0.02; // tebal kusen menonjol sedikit dari muka dinding
      if (w.axis === "h") {
        this.addBox(group, o.from + 0.03, (o.sill + o.top) / 2, w.c, 0.06, o.top - o.sill, ft, this.matKusen);
        this.addBox(group, o.to - 0.03, (o.sill + o.top) / 2, w.c, 0.06, o.top - o.sill, ft, this.matKusen);
        this.addBox(group, midO, o.top - 0.045, w.c, wdt, 0.09, ft, this.matKusen);
        if (o.sill > 0) this.addBox(group, midO, o.sill + 0.045, w.c, wdt, 0.09, ft, this.matKusen);
        if (o.kind === "pintu") {
          this.addBox(group, midO, (o.top - 0.02) / 2, w.c, wdt - 0.05, o.top - 0.06, 0.045, this.matPintu);
        } else {
          this.addBox(group, midO, (o.sill + o.top) / 2, w.c, wdt - 0.08, o.top - o.sill - 0.1, 0.012, this.matKaca, false);
          this.addBox(group, midO, (o.sill + o.top) / 2, w.c, wdt - 0.08, 0.05, ft - 0.02, this.matKusen);
        }
      } else {
        this.addBox(group, w.c, (o.sill + o.top) / 2, o.from + 0.03, ft, o.top - o.sill, 0.06, this.matKusen);
        this.addBox(group, w.c, (o.sill + o.top) / 2, o.to - 0.03, ft, o.top - o.sill, 0.06, this.matKusen);
        this.addBox(group, w.c, o.top - 0.045, midO, ft, 0.09, wdt, this.matKusen);
        if (o.sill > 0) this.addBox(group, w.c, o.sill + 0.045, midO, ft, 0.09, wdt, this.matKusen);
        if (o.kind === "pintu") {
          this.addBox(group, w.c, (o.top - 0.02) / 2, midO, 0.045, o.top - 0.06, wdt - 0.05, this.matPintu);
        } else {
          this.addBox(group, w.c, (o.sill + o.top) / 2, midO, 0.012, o.top - o.sill - 0.1, wdt - 0.08, this.matKaca, false);
          this.addBox(group, w.c, (o.sill + o.top) / 2, midO, ft - 0.02, 0.05, wdt - 0.08, this.matKusen);
        }
      }
    }
  }

  /**
   * Atap pelana dengan ridge memanjang sepanjang Z (di x = 3).
   * Bidang atap menurun ke dinding kiri (x = 0) dan kanan (x = 6);
   * dinding ujung pelana adalah dinding depan (z = 6) dan belakang (z = 0).
   * Kemiringan arah turun = ke bawah ke arah luar; PERBAIKAN versi lama:
   * kemiringan pernah terbalik (valley), sekarang puncak di ridge.
   */
  private buildRoof(model: HouseModel, view: ViewState) {
    const tL = model.config.tLuar / 1000;
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
    const cw = 6 - 2 * tL;
    this.addBox(this.roofGroup, 3, tinggi + 0.02, 3, cw, 0.03, cw, this.matPlafon);

    // ---------- rangka baja ringan (kuda-kuda + reng) ----------
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

    // ---------- genteng + lisplank + nok ----------
    if (view.showRoof) {
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

      // lisplank pada kedua ujung eaves (sisi kiri & kanan)
      for (const s of [-1, 1]) {
        const x = 3 + s * (3 + ov) - s * 0.02;
        this.addBox(this.tilesGroup, x, planeY(3 + ov) - 0.1, 3, 0.035, 0.2, zLen, this.matLisplank);
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
      this.matPlinth, this.matBeton, this.matLantai, this.matAtap, this.matBaja,
      this.matGenteng, this.matLisplank, this.matPlafon, this.matRidge,
    ]) m.dispose();
    this.renderer.dispose();
  }
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
