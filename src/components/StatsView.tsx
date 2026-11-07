import { useState } from "react";
import { LC_CATEGORIES, LEETCODE } from "../data/neetcode150";
import { SYSTEM_DESIGN } from "../data/systemDesign";
import { cheer, computeStats, MILESTONES } from "../lib/stats";
import type { TeamData } from "../lib/types";
import { levelOf, passesOf } from "../store/useTeam";
import { colorOf, Dot, nameOf, sortedMembers } from "./common";

export function StatsView({ d, me }: { d: TeamData; me: string }) {
  const members = sortedMembers(d);
  const [who, setWho] = useState(me);
  const id = members.some((m) => m.userId === who) ? who : members[0]?.userId;
  if (!id) return <div className="panel empty">还没有人加入。</div>;

  const s = computeStats(d.progress[id], passesOf(d, id));
  const R = 88;
  const C = 2 * Math.PI * R;
  const next = MILESTONES.find((m) => m[0] > s.mastered);
  const base = [...MILESTONES].reverse().find((m) => m[0] <= s.mastered)?.[0] ?? 0;
  const all = members.map((m) => computeStats(d.progress[m.userId], passesOf(d, m.userId)));

  return (
    <>
      {members.length > 1 && (
        <div className="who-pick">
          {members.map((m) => (
            <button key={m.userId} className="chip" aria-pressed={m.userId === id} onClick={() => setWho(m.userId)}>
              <Dot color={colorOf(d, m.userId)} />
              {nameOf(d, m.userId)}
              {m.userId === me && "（你）"}
            </button>
          ))}
        </div>
      )}

      <section className="hero">
        <div className="who-line">
          <Dot color={colorOf(d, id)} />
          {nameOf(d, id)} 的战绩
        </div>
        <div className="cheer">{cheer(s)}</div>
        <div className="hero-main">
          <div className="ring">
            <svg viewBox="0 0 200 200">
              <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="16" />
              <circle cx="100" cy="100" r={R} fill="none" stroke="var(--gold)" strokeWidth="16" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - s.mastered / 150)} />
            </svg>
            <div className="c">
              <b>{s.mastered}</b>
              <span>完全掌握 / 150</span>
            </div>
          </div>
          <div className="bignums">
            <Big v={s.touched} unit="/150" k="做过的题" />
            <Big v={s.passes} unit="次" k="累计刷题次数" />
            <Big v={s.streak} unit="天" k="连续打卡" />
            <Big v={s.thisWeek} unit="次" k={`本周 · 上周 ${s.lastWeek} 次`} />
          </div>
        </div>
        {next ? (
          <div className="next">
            <div className="row between">
              <span>
                下一个里程碑：<b style={{ color: "var(--hero-ink)" }}>{next[1]}</b>（{next[2]}）
              </span>
              <span className="mono">还差 {next[0] - s.mastered} 题</span>
            </div>
            <div className="bar">
              <i style={{ width: `${((s.mastered - base) / (next[0] - base)) * 100}%` }} />
            </div>
          </div>
        ) : (
          <div className="next">
            <b>全部里程碑达成！</b>
          </div>
        )}
      </section>

      <div className="panel">
        <div className="label">里程碑</div>
        <div className="badges">
          {MILESTONES.map(([n, title]) => {
            const on = s.mastered >= n;
            return (
              <div key={n} className={`badge ${on ? "on" : ""}`}>
                <div className="medal">{n}</div>
                <div className="n">{title}</div>
                <div className="s">{on ? "已解锁" : `还差 ${n - s.mastered} 题`}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <div className="row between">
          <div className="label">专题地图 · 掌握进度</div>
          <span className="note">金色 = 整个专题全部掌握</span>
        </div>
        <div className="cmap">
          {LC_CATEGORIES.map((c) => {
            const items = LEETCODE.filter((x) => x.category === c);
            const m = items.filter((x) => levelOf(d, id, "lc", x.id) === 4).length;
            const t = items.filter((x) => levelOf(d, id, "lc", x.id) > 0).length;
            return (
              <div key={c} className={`tile ${m === items.length ? "full" : ""}`}>
                <span className="fill" style={{ height: `${(m / items.length) * 100}%` }} />
                <span className="nm">{c}</span>
                <span className="ct">
                  <b>{m}</b>/{items.length} 掌握 · {t} 做过
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel">
        <div className="label">难度分布</div>
        <div className="diffs">
          {(["E", "M", "H"] as const).map((k) => {
            const v = s.byDifficulty[k];
            const label = { E: "Easy", M: "Medium", H: "Hard" }[k];
            return (
              <div key={k} className="meter" style={{ ["--c" as string]: `var(--${k === "E" ? "easy" : k === "M" ? "med" : "hard"})` }}>
                <div className="nums">
                  <span className={`d-${k}`} style={{ fontWeight: 700 }}>{label}</span>
                  <span className="mono">
                    <b>{v.mastered}</b> / {v.all} 掌握
                  </span>
                </div>
                <div className="bar">
                  <i style={{ width: `${(v.mastered / v.all) * 100}%` }} />
                </div>
                <div className="note">做过 {v.touched} 题</div>
              </div>
            );
          })}
          <div className="meter" style={{ ["--c" as string]: "var(--accent)" }}>
            <div className="nums">
              <span style={{ fontWeight: 700 }}>System Design</span>
              <span className="mono">
                <b>{s.sdMastered}</b> / {SYSTEM_DESIGN.length} 掌握
              </span>
            </div>
            <div className="bar">
              <i style={{ width: `${(s.sdMastered / SYSTEM_DESIGN.length) * 100}%` }} />
            </div>
            <div className="note">
              看过 {s.sdTouched} 个 · {s.sdPasses} 次
            </div>
          </div>
        </div>
      </div>

      {members.length > 1 && (
        <div className="panel">
          <div className="label">搭子合计</div>
          <div className="plan-grid">
            <Sum label="一起刷了" v={all.reduce((a, b) => a + b.passes + b.sdPasses, 0)} unit="次" />
            <Sum label="一共掌握" v={all.reduce((a, b) => a + b.mastered, 0)} unit="题" />
            <Sum label="打卡天数" v={all.reduce((a, b) => a + b.activeDays, 0)} unit="人·天" />
          </div>
        </div>
      )}
    </>
  );
}

function Big({ v, unit, k }: { v: number; unit: string; k: string }) {
  return (
    <div className="bn">
      <div className="v">
        {v}
        <small>{unit}</small>
      </div>
      <div className="k">{k}</div>
    </div>
  );
}
function Sum({ label, v, unit }: { label: string; v: number; unit: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="big mono">
        {v}
        <small>{unit}</small>
      </div>
    </div>
  );
}
