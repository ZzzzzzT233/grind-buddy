import { LEETCODE } from "../data/neetcode150";
import { SYSTEM_DESIGN } from "../data/systemDesign";
import { currentWeek, dayKey, shiftWeek, weekOf } from "./dates";
import type { Difficulty, Pass, ProgressMap } from "./types";

export interface Stats {
  touched: number;
  mastered: number;
  passes: number;
  sdPasses: number;
  sdTouched: number;
  sdMastered: number;
  streak: number;
  activeDays: number;
  thisWeek: number;
  lastWeek: number;
  byDifficulty: Record<Difficulty, { all: number; mastered: number; touched: number }>;
}

export function computeStats(progress: ProgressMap | undefined, passes: Pass[], now = new Date()): Stats {
  const lc = progress?.lc ?? {};
  const sd = progress?.sd ?? {};
  const days = new Set(passes.map((p) => dayKey(new Date(p.createdAt))));
  let streak = 0;
  const d = new Date(now);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  const wk = currentWeek(now);
  const prev = shiftWeek(wk, -1);
  const by = (diff: Difficulty) => {
    const all = LEETCODE.filter((x) => x.difficulty === diff);
    return {
      all: all.length,
      mastered: all.filter((x) => lc[x.id] === 4).length,
      touched: all.filter((x) => (lc[x.id] ?? 0) > 0).length,
    };
  };
  return {
    touched: LEETCODE.filter((x) => (lc[x.id] ?? 0) > 0).length,
    mastered: LEETCODE.filter((x) => lc[x.id] === 4).length,
    passes: passes.filter((p) => p.kind === "lc").length,
    sdPasses: passes.filter((p) => p.kind === "sd").length,
    sdTouched: SYSTEM_DESIGN.filter((x) => (sd[x.id] ?? 0) > 0).length,
    sdMastered: SYSTEM_DESIGN.filter((x) => sd[x.id] === 4).length,
    streak,
    activeDays: days.size,
    thisWeek: passes.filter((p) => weekOf(p.createdAt) === wk).length,
    lastWeek: passes.filter((p) => weekOf(p.createdAt) === prev).length,
    byDifficulty: { E: by("E"), M: by("M"), H: by("H") },
  };
}

export const MILESTONES: [number, string, string][] = [
  [1, "第一题", "迈出第一步"],
  [10, "渐入佳境", "掌握 10 题"],
  [25, "小有所成", "掌握 25 题"],
  [50, "三分之一", "掌握 50 题"],
  [75, "半程", "掌握 75 题"],
  [100, "百题斩", "掌握 100 题"],
  [125, "最后冲刺", "掌握 125 题"],
  [150, "通关", "NeetCode 150 全部掌握"],
];

export function cheer(s: Stats): string {
  if (!s.touched) return "第一道题永远最难。现在就去做一道吧！";
  if (s.mastered >= 150) return "NeetCode 150 全部掌握！面试官该紧张了。";
  if (s.streak >= 7) return `连续 ${s.streak} 天没断！这就是拿 offer 的节奏。`;
  if (s.mastered >= 100) return `已经掌握 ${s.mastered} 题，只剩 ${150 - s.mastered} 题就通关了！`;
  if (s.mastered >= 75) return "过半了！剩下的路比走过的短。";
  if (s.streak >= 3) return `连续 ${s.streak} 天在刷题，状态正好，继续！`;
  if (s.thisWeek > s.lastWeek && s.lastWeek > 0) return `这周已经比上周多刷了 ${s.thisWeek - s.lastWeek} 次，越来越强了。`;
  if (s.mastered >= 25) return `${s.mastered} 道题已经稳稳拿下。每一题都算数。`;
  return `已经做过 ${s.touched} 道题、刷了 ${s.passes} 次。坚持下去，量变会变成质变。`;
}
