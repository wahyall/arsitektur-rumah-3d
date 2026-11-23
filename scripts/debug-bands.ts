import { buildModel, DEFAULT_CONFIG } from "../src/lib/house/engine";

const m = buildModel(DEFAULT_CONFIG);
console.log("tLuar=0.1 tDalam=0.075 tinggi=3");
for (const w of m.walls) {
  const band =
    w.axis === "h"
      ? `x ${w.lo}..${w.hi}, y ${w.c - w.t / 2}..${w.c + w.t / 2}`
      : `x ${w.c - w.t / 2}..${w.c + w.t / 2}, y ${w.lo}..${w.hi}`;
  console.log(`${w.id} (${w.axis}, ${w.outer ? "luar" : "dalam"}) t=${w.t}: ${band}`);
}
console.log("\nRuangan:");
for (const r of m.areas.rooms) {
  console.log(`${r.name}: w=${r.w} d=${r.d} area=${r.area}`);
}
