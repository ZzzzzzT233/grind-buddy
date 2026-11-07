import { describe, expect, it } from "vitest";
import { LEETCODE, LC_CATEGORIES } from "../data/neetcode150";
import { SYSTEM_DESIGN } from "../data/systemDesign";
import { drawItems, weightedPick } from "./draw";
import type { Level } from "./types";

describe("problem data", () => {
  it("has exactly 150 unique NeetCode problems in 18 topics", () => {
    expect(LEETCODE).toHaveLength(150);
    expect(new Set(LEETCODE.map((x) => x.id)).size).toBe(150);
    expect(LC_CATEGORIES).toHaveLength(18);
  });
  it("has unique system design ids", () => {
    expect(new Set(SYSTEM_DESIGN.map((x) => x.id)).size).toBe(SYSTEM_DESIGN.length);
  });
});

describe("weightedPick", () => {
  it("never returns mastered items", () => {
    const levels: Record<string, Level> = Object.fromEntries(LEETCODE.slice(0, 140).map((x) => [x.id, 4]));
    const out = weightedPick(LEETCODE, levels, 50);
    expect(out).toHaveLength(10);
    out.forEach((x) => expect(levels[x.id]).toBeUndefined());
  });
  it("prefers less-practiced items", () => {
    const pool = LEETCODE.slice(0, 2);
    const levels: Record<string, Level> = { [pool[0].id]: 3 }; // weight 1 vs 4
    let fresh = 0;
    for (let i = 0; i < 4000; i++) if (weightedPick(pool, levels, 1)[0].id === pool[1].id) fresh++;
    expect(fresh / 4000).toBeGreaterThan(0.72);
    expect(fresh / 4000).toBeLessThan(0.88);
  });
});

describe("drawItems", () => {
  it("draws from focus topics first and tops up from others", () => {
    const r = drawItems(LEETCODE, { mode: "focus", focus: ["Tries"] }, {}, 5);
    expect(r.ids).toHaveLength(5);
    expect(r.filledFromOthers).toBe(true);
    const tries = LEETCODE.filter((x) => x.category === "Tries").map((x) => x.id);
    tries.forEach((id) => expect(r.ids).toContain(id));
  });
});
