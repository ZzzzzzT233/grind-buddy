import { useCallback, useEffect, useRef, useState } from "react";
import { LEETCODE } from "../data/neetcode150";
import { SYSTEM_DESIGN } from "../data/systemDesign";
import { currentWeek, weekOf } from "../lib/dates";
import { drawItems } from "../lib/draw";
import type { Item, Kind, Level, Pass, Plan, TeamData } from "../lib/types";
import { backend } from "./index";
import { newId } from "./backend";

export const ITEMS: Record<Kind, Item[]> = { lc: LEETCODE, sd: SYSTEM_DESIGN };

export function levelOf(d: TeamData, userId: string, kind: Kind, id: string): Level {
  return d.progress[userId]?.[kind]?.[id] ?? 0;
}
export function passesOf(d: TeamData, userId: string, week?: string, kind?: Kind): Pass[] {
  return d.passes.filter(
    (p) => p.userId === userId && (!week || weekOf(p.createdAt) === week) && (!kind || p.kind === kind),
  );
}
export function weekStatus(d: TeamData, userId: string, week: string) {
  const plan = d.plans[week];
  if (!plan) return null;
  const lc = passesOf(d, userId, week, "lc").length;
  const sd = passesOf(d, userId, week, "sd").length;
  return { lc, sd, lt: plan.lcTarget, st: plan.sdTarget, done: lc >= plan.lcTarget && sd >= plan.sdTarget };
}

const clone = <T,>(x: T): T => structuredClone(x);

export function useTeam(teamId: string, userId: string, toast: (m: string) => void) {
  const [data, setData] = useState<TeamData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef<TeamData | null>(null);
  dataRef.current = data;

  const reload = useCallback(async () => {
    try {
      setData(await backend.load(teamId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [teamId]);

  useEffect(() => {
    void reload();
    return backend.subscribe(teamId, () => void reload());
  }, [teamId, reload]);

  /** Apply a change locally right away, then persist; reload on failure. */
  const mutate = useCallback(
    async (local: (d: TeamData) => void, remote: () => Promise<unknown>) => {
      const cur = dataRef.current;
      if (cur) {
        const next = clone(cur);
        local(next);
        setData(next);
      }
      try {
        await remote();
      } catch (e) {
        toast("保存失败：" + (e instanceof Error ? e.message : String(e)));
        void reload();
      }
    },
    [reload, toast],
  );

  const setProgress = (d: TeamData, kind: Kind, id: string, lv: Level) => {
    const p = (d.progress[userId] ??= { lc: {}, sd: {} });
    if (lv === 0) delete p[kind][id];
    else p[kind][id] = lv;
  };

  /** "+1 次" (to = undefined) or "完全掌握" (to = 4). Always logs one pass. */
  const logPass = useCallback(
    (kind: Kind, id: string, to?: Level) => {
      const d = dataRef.current;
      if (!d) return;
      const from = levelOf(d, userId, kind, id);
      const target: Level = to ?? (from >= 4 ? 4 : (Math.min(from + 1, 3) as Level));
      const pass: Pass = { id: newId(), userId, kind, problemId: id, fromLevel: from, createdAt: Date.now() };
      void mutate(
        (n) => {
          n.passes.push(pass);
          setProgress(n, kind, id, Math.max(from, target) as Level);
        },
        async () => {
          await backend.addPass(teamId, pass);
          if (target > from) await backend.setLevel(teamId, kind, id, target);
        },
      );
      if (target === 4 && from < 4) toast("完全掌握！以后不会再抽到它");
    },
    [mutate, teamId, userId, toast],
  );

  const undo = useCallback(
    (kind: Kind, id: string) => {
      const d = dataRef.current;
      if (!d) return;
      const mine = passesOf(d, userId, currentWeek(), kind).filter((p) => p.problemId === id);
      const last = mine[mine.length - 1];
      if (last) {
        void mutate(
          (n) => {
            n.passes = n.passes.filter((p) => p.id !== last.id);
            setProgress(n, kind, id, last.fromLevel);
          },
          async () => {
            await backend.deletePass(teamId, last.id);
            await backend.setLevel(teamId, kind, id, last.fromLevel);
          },
        );
        return;
      }
      const cur = levelOf(d, userId, kind, id);
      if (!cur) return;
      const nv = (cur === 4 ? 3 : cur - 1) as Level;
      void mutate(
        (n) => setProgress(n, kind, id, nv),
        () => backend.setLevel(teamId, kind, id, nv),
      );
    },
    [mutate, teamId, userId],
  );

  const savePlan = useCallback(
    (plan: Plan) =>
      mutate(
        (n) => (n.plans[plan.weekStart] = plan),
        () => backend.setPlan(teamId, plan),
      ),
    [mutate, teamId],
  );

  const setQueue = (week: string, kind: Kind, ids: string[]) =>
    mutate(
      (n) => (((n.queues[userId] ??= {})[week] ??= {})[kind] = ids),
      () => backend.setQueue(teamId, week, kind, ids),
    );

  const isDone = (d: TeamData, kind: Kind, id: string, week: string) =>
    passesOf(d, userId, week, kind).some((p) => p.problemId === id);

  const draw = useCallback(
    (kind: Kind, keepDone: boolean) => {
      const d = dataRef.current;
      const week = currentWeek();
      const plan = d?.plans[week];
      if (!d || !plan) return;
      const n = kind === "lc" ? plan.lcTarget : plan.sdTarget;
      const cur = d.queues[userId]?.[week]?.[kind] ?? [];
      const keep = keepDone ? cur.filter((id) => isDone(d, kind, id, week)) : [];
      const r = drawItems(ITEMS[kind], plan, d.progress[userId]?.[kind] ?? {}, Math.max(0, n - keep.length), new Set(keep), kind === "lc");
      if (r.filledFromOthers) toast("重点专题里能抽的题不够，已从其他专题补齐");
      if (r.short) toast("能抽的都抽完了，剩下的你都掌握了");
      void setQueue(week, kind, [...keep, ...r.ids]);
    },
    [userId, teamId, toast],
  );

  const swap = useCallback(
    (kind: Kind, id: string) => {
      const d = dataRef.current;
      const week = currentWeek();
      const plan = d?.plans[week];
      if (!d || !plan) return;
      const cur = d.queues[userId]?.[week]?.[kind] ?? [];
      const r = drawItems(ITEMS[kind], plan, d.progress[userId]?.[kind] ?? {}, 1, new Set(cur), kind === "lc");
      if (!r.ids.length) return toast("没有别的题可以换了");
      void setQueue(week, kind, cur.map((x) => (x === id ? r.ids[0] : x)));
    },
    [userId, teamId, toast],
  );

  const setNick = useCallback(
    (nick: string) =>
      mutate(
        (n) => n.members.forEach((m) => m.userId === userId && (m.nick = nick)),
        () => backend.setNick(teamId, nick),
      ),
    [mutate, teamId, userId],
  );

  return { data, error, reload, logPass, undo, savePlan, draw, swap, setNick };
}

export type TeamApi = ReturnType<typeof useTeam>;
