/**
 * Scene 3D rumah: instancing bata per dinding, mortar/nat, kusen, pintu,
 * jendela, pondasi, lantai, atap pelana, label ruangan, potongan (clipping)
 * dan mode bongkar (explode). Orbit kontrol custom (drag/zoom/pan).
 * Denah memakai (x, y) meter -> three: X = x, Z = y, Y = ketinggian.
 */
import * as THREE from "three";
import type { HouseModel, WallRT } from "@/lib/house/engine";

export interface ViewState {
  showRoof: boolean;
  showLabels: boolean;
  explode: number; // 0..1
  cutH: number; // ketinggian potongan (m); >= 10 = tidak dipotong
}

type CameraPreset = "3d" | "depan" | "atas";

const GROUND_Y = -0.25;

export class HouseScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private houseRoot: THREE.Group = new THREE.Group();
  private roofGroup: THREE.Group = new THREE.Group();
  private labelGroup: THREE.Group = new THREE.Group();
  private clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1000);
  private disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
  private ro: ResizeObserver;

  // orbit state
  private target = new THREE.Vector3(3, 1.2, 3);
  private sph = { radius: 12.5, theta: Math.PI * 0.15, phi: 1.02 };
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
  private matLantai = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.6 });
  private matAtap = new THREE.MeshStandardMaterial({ color: 0x555d63, roughness: 0.85 });
  private matPlafon = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.95 });
  private matRidge = new THREE.MeshStandardMaterial({ color: 0x464d52, roughness: 0.9 });

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

    const mats = [this.matBrick, this.matMortar, this.matKusen, this.matPintu, this.matKaca, this.matPlinth, this.matLantai, this.matAtap, this.matPlafon, this.matRidge];
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
    this.scene.add(this.roofGroup);
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
      this.target.set(3, 1.6, 3);
      this.sph = { radius: 11, theta: 0, phi: 1.35 };
    } else if (p === "atas") {
      this.target.set(3, 0, 3);
      this.sph = { radius: 13.5, theta: Math.PI * 0.001, phi: 0.03 };
    } else {
      this.target.set(3, 1.2, 3);
      this.sph = { radius: 12.5, theta: Math.PI * 0.15, phi: 1.02 };
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
    // bersihkan rumah lama
    this.clearGroup(this.houseRoot);
    this.clearGroup(this.roofGroup);
    this.clearGroup(this.labelGroup);

    // potongan
    this.clipPlane.constant = view.cutH;

    const isHebel = model.config.jenis === "hebel";
    this.matBrick.color.set(isHebel ? 0xeceae3 : 0xa3492f);

    const tL = model.config.tLuar / 1000;
    const tinggi = model.config.tinggi;
    const nat = model.config.natMm / 1000;

    // lantai interior (rabat + keramik) di Y=0
    const lantaiW = 6 - 2 * tL;
    this.addBox(this.houseRoot, 3, -0.05, 3, lantaiW, 0.1, lantaiW, this.matLantai, true);

    // dinding: pondasi strip + mortar slab + bata (instancing per dinding) + kusen
    for (const w of model.walls) {
      this.buildWall(w, model, nat);
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
    this.roofGroup.visible = view.showRoof;
  }

  private buildWall(w: WallRT, model: HouseModel, _nat: number) {
    const group = new THREE.Group();
    group.userData.explodeDir = w.explodeDir;
    this.houseRoot.add(group);

    const len = w.hi - w.lo;
    const t = w.t;
    const mid = (w.lo + w.hi) / 2;

    // pondasi strip (25 cm lebih lebar keluar dua sisi? keluar 6 cm tiap sisi)
    const pt = t + 0.12;
    if (w.axis === "h") {
      this.addBox(group, mid, GROUND_Y + 0.125, w.c, len, 0.25, pt, this.matPlinth);
      this.addBox(group, mid, -0.05, w.c, len, 0.1, t, this.matPlinth); // slop lantai di bawah dinding
    } else {
      this.addBox(group, w.c, GROUND_Y + 0.125, mid, pt, 0.25, len, this.matPlinth);
      this.addBox(group, w.c, -0.05, mid, t, 0.1, len, this.matPlinth);
    }

    // mortar/nat slab: kotak-kotak menghindari bukaan
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

    // segitiga mortar di ujung atap pelana (dinding depan/belakang)
    if (w.gable) {
      const shape = new THREE.Shape();
      shape.moveTo(w.lo, w.h);
      shape.lineTo(w.hi, w.h);
      shape.lineTo(w.gable.apexAt, w.h + w.gable.apexAdd);
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
        // tiang kiri kanan
        this.addBox(group, o.from + 0.03, (o.sill + o.top) / 2, w.c, 0.06, o.top - o.sill, ft, this.matKusen);
        this.addBox(group, o.to - 0.03, (o.sill + o.top) / 2, w.c, 0.06, o.top - o.sill, ft, this.matKusen);
        // palang atas & bawah
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

  private buildRoof(model: HouseModel, view: ViewState) {
    if (!view.showRoof) return;
    const tL = model.config.tLuar / 1000;
    const tinggi = model.config.tinggi;
    const apex = model.roof.apexAdd; // 1.5
    const pitch = apex / 3;
    const ov = model.roof.overhang;
    const yRidge = tinggi + apex;
    const zLen = 6 + 2 * ov;
    const slopeHalf = Math.hypot(3 + ov, apex + ov * pitch);
    const ang = Math.atan2(apex + ov * pitch, 3 + ov);
    const angDeg = (ang * 180) / Math.PI;

    // plafon mengikuti area bersih
    const cw = 6 - 2 * tL;
    this.addBox(this.roofGroup, 3, tinggi + 0.02, 3, cw, 0.03, cw, this.matPlafon);

    // dua bidang atap
    const mkSlope = (mirror: boolean) => {
      const g = new THREE.BoxGeometry(slopeHalf, 0.04, zLen);
      const mesh = new THREE.Mesh(g, this.matAtap);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const cx = mirror ? 3 + (3 + ov) / 2 : 3 - (3 + ov) / 2;
      const cy = (yRidge + (tinggi - ov * pitch)) / 2;
      mesh.position.set(cx, cy, 3);
      mesh.rotation.z = mirror ? angDeg * (Math.PI / 180) : -angDeg * (Math.PI / 180);
      this.roofGroup.add(mesh);
      this.disposables.push(g);
    };
    mkSlope(false);
    mkSlope(true);

    // nok
    const g = new THREE.BoxGeometry(0.16, 0.14, zLen + 0.06);
    const nok = new THREE.Mesh(g, this.matRidge);
    nok.castShadow = true;
    nok.position.set(3, yRidge + 0.05, 3);
    this.roofGroup.add(nok);
    this.disposables.push(g);
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
    for (const m of [this.matBrick, this.matMortar, this.matKusen, this.matPintu, this.matKaca, this.matPlinth, this.matLantai, this.matAtap, this.matPlafon, this.matRidge]) m.dispose();
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
