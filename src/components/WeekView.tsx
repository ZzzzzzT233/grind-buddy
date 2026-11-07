import { useState } from "react";
import { LC_CATEGORIES } from "../data/neetcode150";
import { currentWeek, shiftWeek, weekdayIndex, weekEnd, weekLabel } from "../lib/dates";
import type { Kind, Plan, TeamData } from "../lib/types";
import { ITEMS, passesOf, weekStatus, type TeamApi } from "../store/useTeam";
import { colorOf, nameOf, sortedMembers, Track } from "./common";

const DAYS = ["一", "二", "三", "四", "五", "六", "日"];

export function WeekView({ d, me, api }: { d: TeamData; me: string; api: TeamApi }) {
  const wk = currentWeek();
  const prev = shiftWeek(wk, -1);
  const members = sortedMembers(d);
  const eligible = (uid: string, w: string) => (members.find((m) => m.userId === uid)?.joinedAt ?? 0) < weekEnd(w);

  let banner = null;
  if (d.plans[prev]) {
    const ms = members.filter((m) => eligible(m.userId, prev));
    const losers = ms.filter((m) => !weekStatus(d, m.userId, prev)!.done);
    banner = losers.length ? (
      <div className="banner">
        <span className="stamp">未完成</span>
        <div className="txt">
          <b>
            上周（{weekLabel(prev)}）{losers.map((m) => nameOf(d, m.userId)).join("、")} 没完成计划
          </b>
          <div className="muted">
            {losers
              .map((m) => {
                const s = weekStatus(d, m.userId, prev)!;
                return `${nameOf(d, m.userId)}：LeetCode ${s.lc}/${s.lt}，SD ${s.sd}/${s.st}`;
              })
              .join("；")}
          </div>
        </div>
      </div>
    ) : ms.length ? (
      <div className="banner good">
        <span className="stamp ok">全员完成</span>
        <div className="txt">
          <b>上周（{weekLabel(prev)}）大家都完成了计划</b>
        </div>
      </div>
    ) : null;
  }

  return (
    <>
      {banner}
      <PlanCard d={d} api={api} wk={wk} />
      <div className="members">
        {members.map((m) => (
          <MemberCard key={m.userId} d={d} uid={m.userId} me={me} wk={wk} />
        ))}
      </div>
      <Queue d={d} me={me} api={api} wk={wk} />
    </>
  );
}

function PlanCard({ d, api, wk }: { d: TeamData; api: TeamApi; wk: string }) {
  const plan = d.plans[wk];
  const [edit, setEdit] = useState<Plan | null>(null);
  const [err, alertBox] = useState<string | null>(null);
  const lastKey = Object.keys(d.plans).filter((k) => k < wk).sort().pop();
  const open = (src?: Plan) =>
    setEdit({ weekStart: wk, lcTarget: src?.lcTarget ?? 15, sdTarget: src?.sdTarget ?? 2, mode: src?.mode ?? "focus", focus: [...(src?.focus ?? [])] });
  const save = () => {
    if (!edit) return;
    if (edit.mode === "focus" && !edit.focus.length) return alertBox("按专题模式至少选一个专题，或者切到全部随机");
    const clean: Plan = {
      ...edit,
      lcTarget: Math.max(0, Math.min(150, Math.round(edit.lcTarget) || 0)),
      sdTarget: Math.max(0, Math.min(29, Math.round(edit.sdTarget) || 0)),
      focus: edit.mode === "focus" ? edit.focus : [],
    };
    void api.savePlan(clean);
    setEdit(null);
  };
  return (
    <div className="panel">
      <div className="row between">
        <div className="label">本周计划 · 两人共用</div>
        {plan && !edit && (
          <button className="btn small" onClick={() => open(plan)}>
            编辑计划
          </button>
        )}
      </div>
      {plan && !edit && (
        <div className="plan-grid">
          <div>
            <div className="label">LeetCode</div>
            <div className="big mono">
              {plan.lcTarget}
              <small>题/周</small>
            </div>
          </div>
          <div>
            <div className="label">System Design</div>
            <div className="big mono">
              {plan.sdTarget}
              <small>个/周</small>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className="label">抽题方式</div>
            <div className="row" style={{ marginTop: 6 }}>
              {plan.mode === "focus" ? plan.focus.map((c) => <span key={c} className="chip">{c}</span>) : <span className="chip">全部 150 题随机</span>}
            </div>
          </div>
        </div>
      )}
      {!plan && !edit && (
        <div className="empty" style={{ padding: 8 }}>
          本周还没有计划。定一个每周的题量，然后各自抽题。
          <div className="row">
            <button className="btn primary" onClick={() => open(lastKey ? d.plans[lastKey] : undefined)}>
              制定本周计划
            </button>
            {lastKey && (
              <button className="btn" onClick={() => open(d.plans[lastKey])}>
                沿用上周
              </button>
            )}
          </div>
        </div>
      )}
      {edit && (
        <div className="editor">
          <div className="row" style={{ gap: 24 }}>
            <label className="field">
              <span className="label">LeetCode 每周题数</span>
              <input className="num mono" type="number" min={0} max={150} value={edit.lcTarget} onChange={(e) => setEdit({ ...edit, lcTarget: +e.target.value })} />
            </label>
            <label className="field">
              <span className="label">System Design 每周个数</span>
              <input className="num mono" type="number" min={0} max={29} value={edit.sdTarget} onChange={(e) => setEdit({ ...edit, sdTarget: +e.target.value })} />
            </label>
            <div className="field">
              <span className="label">LeetCode 抽题方式</span>
              <div className="seg">
                <button aria-pressed={edit.mode === "focus"} onClick={() => setEdit({ ...edit, mode: "focus" })}>
                  按专题
                </button>
                <button aria-pressed={edit.mode === "random"} onClick={() => setEdit({ ...edit, mode: "random" })}>
                  全部随机
                </button>
              </div>
            </div>
          </div>
          {edit.mode === "focus" && (
            <div className="field">
              <span className="label">本周重点专题（可多选）</span>
              <div className="row">
                {LC_CATEGORIES.map((c) => {
                  const on = edit.focus.includes(c);
                  return (
                    <button key={c} className="chip" aria-pressed={on} onClick={() => setEdit({ ...edit, focus: on ? edit.focus.filter((x) => x !== c) : [...edit.focus, c] })}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="note">刷得越少的题被抽中的概率越大（还没做 4 : 做了1次 3 : 2次 2 : 3次 1），完全掌握的不会被抽到。</div>
          {err && <div className="note" style={{ color: "var(--bad)" }}>{err}</div>}
          <div className="row">
            <button className="btn primary" onClick={save}>
              保存计划
            </button>
            <button className="btn ghost" onClick={() => setEdit(null)}>
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MemberCard({ d, uid, me, wk }: { d: TeamData; uid: string; me: string; wk: string }) {
  const s = weekStatus(d, uid, wk);
  const today = weekdayIndex(new Date());
  const per = [0, 0, 0, 0, 0, 0, 0];
  passesOf(d, uid, wk).forEach((p) => per[weekdayIndex(new Date(p.createdAt))]++);
  const mx = Math.max(1, ...per);
  const mastered = Object.values(d.progress[uid]?.lc ?? {}).filter((l) => l === 4).length;
  let sub = "本周还没有计划";
  if (s) {
    if (s.done) sub = "本周目标达成";
    else {
      const parts: string[] = [];
      if (s.lc < s.lt) parts.push(`LeetCode 还差 ${s.lt - s.lc}`);
      if (s.sd < s.st) parts.push(`SD 还差 ${s.st - s.sd}`);
      sub = `${parts.join(" · ")} · 还剩 ${7 - today} 天`;
    }
  }
  const meter = (label: string, v: number, t: number) => (
    <div className="meter">
      <div className="nums">
        <span>{label}</span>
        <span className="mono">
          <b>{v}</b> / {t}
        </span>
      </div>
      <div className="bar">
        <i style={{ width: `${t ? Math.min(100, (v / t) * 100) : 0}%` }} />
      </div>
    </div>
  );
  return (
    <div className={`panel member ${s ? (s.done ? "done" : "notdone") : ""}`} style={{ ["--c" as string]: colorOf(d, uid) }}>
      {s && <span className={`stamp ${s.done ? "ok" : ""}`}>{s.done ? "已完成" : "未完成"}</span>}
      <div className="who">
        <span className="dot" />
        {nameOf(d, uid)}
        {uid === me && <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>（你）</span>}
      </div>
      <div className="note" style={{ minHeight: "1.5em", paddingRight: 120 }}>
        {sub}
      </div>
      {s && meter("LeetCode", s.lc, s.lt)}
      {s && meter("System Design", s.sd, s.st)}
      <div className="days">
        {per.map((n, i) => (
          <div key={i} className={i === today ? "today" : ""}>
            <span className="mono">{n || ""}</span>
            <span className={`col ${n ? "" : "zero"}`} style={{ height: n ? Math.max(8, (n / mx) * 36) : 2 }} />
            {DAYS[i]}
          </div>
        ))}
      </div>
      <div className="note">
        NeetCode 150 完全掌握 <span className="mono">{mastered}</span> / 150
      </div>
    </div>
  );
}

function Queue({ d, me, api, wk }: { d: TeamData; me: string; api: TeamApi; wk: string }) {
  const plan = d.plans[wk];
  return (
    <div className="panel">
      <div className="row between">
        <h2 style={{ fontSize: 17 }}>我的本周题单</h2>
        <span className="note">按计划从题库抽出，做完一遍就点「+1 次」</span>
      </div>
      {!plan && <div className="empty">先定好本周计划，再来抽题。</div>}
      {plan &&
        (["lc", "sd"] as Kind[]).map((kind) => {
          const n = kind === "lc" ? plan.lcTarget : plan.sdTarget;
          if (!n) return null;
          const list = d.queues[me]?.[wk]?.[kind] ?? [];
          const done = new Set(passesOf(d, me, wk, kind).map((p) => p.problemId));
          return (
            <div key={kind}>
              <div className="row between" style={{ marginTop: 6 }}>
                <div className="label">
                  {kind === "lc" ? "LeetCode" : "System Design"} · <span className="mono">{list.filter((x) => done.has(x)).length}/{list.length}</span>
                </div>
                {list.length > 0 && (
                  <div className="row">
                    <button className="btn small" onClick={() => api.draw(kind, true)}>
                      {list.length < n ? `补齐到 ${n} 题` : "重新抽未完成的"}
                    </button>
                  </div>
                )}
              </div>
              {!list.length ? (
                <div className="empty" style={{ padding: 10 }}>
                  <button className="btn primary" onClick={() => api.draw(kind, false)}>
                    抽 {n} {kind === "lc" ? "道题" : "个主题"}
                  </button>
                </div>
              ) : (
                <div className="q">
                  {list.map((id) => {
                    const x = ITEMS[kind].find((i) => i.id === id);
                    if (!x) return null;
                    const isDone = done.has(id);
                    return (
                      <div key={id} className={`qi ${isDone ? "done" : ""}`}>
                        <span className="check">{isDone ? "✓" : ""}</span>
                        <div style={{ minWidth: 0 }}>
                          <div className="t">
                            {x.url ? (
                              <a href={x.url} target="_blank" rel="noopener noreferrer">
                                {x.title}
                              </a>
                            ) : (
                              <>
                                {x.title} <span className="muted" style={{ fontWeight: 400 }}>{x.subtitle}</span>
                              </>
                            )}
                          </div>
                          <div className="meta">
                            <span>{x.category}</span>
                            {x.difficulty && <span className={`d-${x.difficulty}`}>{{ E: "Easy", M: "Medium", H: "Hard" }[x.difficulty]}</span>}
                            {!isDone && (
                              <button className="btn small ghost" onClick={() => api.swap(kind, id)}>
                                换一题
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="acts">
                          <Track d={d} me={me} kind={kind} id={id} api={api} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
