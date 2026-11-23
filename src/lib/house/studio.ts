/**
 * Tipe & default untuk shell studio (editor ala Blender/Unity):
 * ViewState 3D + preferensi editor (grid, tanah, wireframe, dimensi, proyeksi).
 */
import type { ViewState } from "@/lib/house/scene";

export interface StudioView extends ViewState {
  grid: boolean; // grid lantai studio
  ground: boolean; // bidang tanah
  wireframe: boolean; // mode shading wireframe
  dims: boolean; // anotasi dimensi 3D
  ortho: boolean; // proyeksi ortografis
  hidden: string[]; // id bagian yang disembunyikan per-bagian (lihat parts.ts)
}

export const DEFAULT_VIEW: StudioView = {
  showRoof: true,
  showRangka: true,
  showStruktur: true,
  showDinding: true,
  showLabels: false,
  showFinishing: false,
  showAir: true, // jalur pipa air bersih & limbah (overlay sinar-X)
  showListrik: true, // jalur listrik conduit + titik lampu/saklar/stop kontak
  explode: 0,
  cutH: 1000,
  stage: 0,
  paintHex: "#f2ecdf",
  grid: true,
  ground: true,
  wireframe: false,
  dims: false,
  ortho: false,
  hidden: [],
};

export const PAINTS: { hex: string; name: string }[] = [
  { hex: "#f2ecdf", name: "Ivory (krem terang)" },
  { hex: "#ccd8c2", name: "Sage (hijau sage)" },
  { hex: "#d8b294", name: "Terracotta" },
  { hex: "#bdd2e2", name: "Biru langit pucat" },
];
