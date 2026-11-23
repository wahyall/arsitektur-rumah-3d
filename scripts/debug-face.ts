/** Debug rinci: luas muka & bukaan per dinding dari engine. */
import { buildModel, DEFAULT_CONFIG } from "../src/lib/house/engine";

const m = buildModel(DEFAULT_CONFIG);
let tot = 0;
for (const w of m.walls) {
  const len = w.hi - w.lo;
  const gable = w.gable ? w.gable.apexAdd * len * 0.5 : 0;
  const ops = w.openings.map((o) => {
    const wArea = Math.max(0, Math.min(o.to, w.hi) - Math.max(o.from, w.lo)) * (o.top - o.sill);
    return `${o.kind}:${o.label.slice(0, 18)} ${wArea.toFixed(2)}m2 (sill ${o.sill.toFixed(2)}-top ${o.top.toFixed(2)}, w ${ (o.to - o.from).toFixed(2)})`;
  });
  const face = w.h * len + gable - w.openings.reduce((s, o) => s + Math.max(0, Math.min(o.to, w.hi) - Math.max(o.from, w.lo)) * (o.top - o.sill), 0);
  tot += face;
  console.log(`${w.id.padEnd(9)} h=${w.h} len=${len.toFixed(2)} gable=${gable.toFixed(2)} face=${face.toFixed(2)}\n           ops: ${ops.join(" | ")}`);
}
console.log(`TOTAL face = ${tot.toFixed(2)} vs engine wallFace = ${m.areas.wallFace.toFixed(2)}`);
