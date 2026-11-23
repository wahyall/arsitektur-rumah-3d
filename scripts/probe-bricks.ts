/** Probe: bandingkan hitungan bata per dinding vs luas muka per dinding. */
import { buildModel, DEFAULT_CONFIG, BRICK } from "../src/lib/house/engine";

const m = buildModel(DEFAULT_CONFIG);
const dims = BRICK[m.config.jenis];
const nat = m.config.natMm / 1000;
console.log(`wallFace total = ${m.areas.wallFace.toFixed(2)} m2; pieces = ${m.count.totalPieces.toFixed(1)}`);
console.log(`per m2 (nominal L*H) = ${(1 / (dims.L * dims.H)).toFixed(2)}; per m2 (cell dengan nat) = ${(1 / ((dims.L + nat) * (dims.H + nat))).toFixed(2)}`);
for (const w of m.walls) {
  const len = w.hi - w.lo;
  const gableArea = w.gable ? w.gable.apexAdd * len * 0.5 : 0;
  const openingArea = w.openings.reduce(
    (s, o) => s + Math.max(0, Math.min(o.to, w.hi) - Math.max(o.from, w.lo)) * Math.min(o.top, Math.max(w.h, 100)),
    0,
  );
  const face = w.h * len + gableArea - openingArea;
  const pieces = m.bricks.filter((b) => b.wallId === w.id).reduce((s, b) => s + (b.len / dims.L) * (b.hgt / dims.H), 0);
  console.log(
    `${w.id.padEnd(9)} len=${len.toFixed(2)} face=${face.toFixed(2)} m2 pieces=${pieces.toFixed(1)} rasio=${(pieces / Math.max(0.01, face)).toFixed(2)}/m2`,
  );
}
