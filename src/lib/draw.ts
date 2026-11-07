import type { Item, Level, Plan } from "./types";

/** Draw weight per level: less practice → more likely. Mastered never appears. */
export const WEIGHT: Record<Level, number> = { 0: 4, 1: 3, 2: 2, 3: 1, 4: 0 };

/** Weighted sampling without replacement. */
export function weightedPick(
  pool: Item[],
  levels: Record<string, Level>,
  n: number,
  rand: () => number = Math.random,
): Item[] {
  const arr = pool.map((x) => ({ x, w: WEIGHT[levels[x.id] ?? 0] })).filter((o) => o.w > 0);
  const out: Item[] = [];
  while (out.length < n && arr.length) {
    const total = arr.reduce((s, o) => s + o.w, 0);
    let r = rand() * total;
    let i = 0;
    for (; i < arr.length; i++) {
      r -= arr[i].w;
      if (r <= 0) break;
    }
    i = Math.min(i, arr.length - 1);
    out.push(arr[i].x);
    arr.splice(i, 1);
  }
  return out;
}

export interface DrawResult {
  ids: string[];
  /** true when the focus topics ran out and other topics filled the gap */
  filledFromOthers: boolean;
  /** true when fewer than requested could be drawn at all */
  short: boolean;
}

/**
 * Draw `n` items, preferring the plan's focus topics (LeetCode only),
 * then topping up from everything else.
 */
export function drawItems(
  all: Item[],
  plan: Pick<Plan, "mode" | "focus">,
  levels: Record<string, Level>,
  n: number,
  exclude: Set<string> = new Set(),
  useFocus = true,
  rand: () => number = Math.random,
): DrawResult {
  const ex = new Set(exclude);
  const focused =
    useFocus && plan.mode === "focus" && plan.focus.length
      ? all.filter((x) => plan.focus.includes(x.category))
      : all;
  const first = weightedPick(focused.filter((x) => !ex.has(x.id)), levels, n, rand);
  first.forEach((x) => ex.add(x.id));
  let more: Item[] = [];
  if (first.length < n) more = weightedPick(all.filter((x) => !ex.has(x.id)), levels, n - first.length, rand);
  const ids = [...first, ...more].map((x) => x.id);
  return { ids, filledFromOthers: more.length > 0, short: ids.length < n };
}
