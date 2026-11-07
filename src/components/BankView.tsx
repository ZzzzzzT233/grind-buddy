import { useState } from "react";
import { LC_CATEGORIES } from "../data/neetcode150";
import { SD_CATEGORIES } from "../data/systemDesign";
import type { Kind, TeamData } from "../lib/types";
import { ITEMS, levelOf, type TeamApi } from "../store/useTeam";
import { colorOf, LVTXT, nameOf, Pips, sortedMembers, Track } from "./common";

type LvFilter = "all" | "0" | "prog" | "4";

export function BankView({ d, me, api, kind }: { d: TeamData; me: string; api: TeamApi; kind: Kind }) {
  const [lvf, setLvf] = useState<LvFilter>("all");
  const [df, setDf] = useState<"all" | "E" | "M" | "H">("all");
  const cats = kind === "lc" ? LC_CATEGORIES : SD_CATEGORIES;
  const members = sortedMembers(d);
  const others = members.filter((m) => m.userId !== me);
  const okLv = (lv: number) => lvf === "all" || (lvf === "0" && lv === 0) || (lvf === "prog" && lv > 0 && lv < 4) || (lvf === "4" && lv === 4);

  return (
    <>
      <div className="panel">
        <div className="filters">
          <label className="row">
            <span className="label">我的状态</span>
            <select value={lvf} onChange={(e) => setLvf(e.target.value as LvFilter)}>
              <option value="all">全部</option>
              <option value="0">还没做</option>
              <option value="prog">做过但没掌握</option>
              <option value="4">完全掌握</option>
            </select>
          </label>
          {kind === "lc" && (
            <label className="row">
              <span className="label">难度</span>
              <select value={df} onChange={(e) => setDf(e.target.value as typeof df)}>
                <option value="all">全部</option>
                <option value="E">Easy</option>
                <option value="M">Medium</option>
                <option value="H">Hard</option>
              </select>
            </label>
          )}
        </div>
        {kind === "lc" && (
          <div className="jump">
            {cats.map((c, i) => (
              <button key={c} className="chip" onClick={() => document.getElementById(`cat-${kind}-${i}`)?.scrollIntoView({ behavior: "smooth" })}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
      {cats.map((c, ci) => {
        const all = ITEMS[kind].filter((x) => x.category === c);
        const rows = all.filter((x) => (kind !== "lc" || df === "all" || x.difficulty === df) && okLv(levelOf(d, me, kind, x.id)));
        return (
          <div key={c} className="panel cat" id={`cat-${kind}-${ci}`}>
            <div className="cat-h">
              <h3>{c}</h3>
              <div className="cat-prog">
                {members.map((m) => {
                  const ms = all.filter((x) => levelOf(d, m.userId, kind, x.id) === 4).length;
                  const t = all.filter((x) => levelOf(d, m.userId, kind, x.id) > 0).length;
                  return (
                    <span key={m.userId} style={{ ["--c" as string]: colorOf(d, m.userId) }}>
                      <span className="dot" />
                      {nameOf(d, m.userId)} 掌握 <b className="mono">{ms}</b>/{all.length} · 做过 <span className="mono">{t}</span>
                    </span>
                  );
                })}
              </div>
            </div>
            {!rows.length && <div className="pr note">没有符合筛选的题</div>}
            {rows.map((x) => {
              const lv = levelOf(d, me, kind, x.id);
              return (
                <div key={x.id} className={`pr ${lv === 4 ? "mastered-row" : ""}`}>
                  <div className="t">
                    {x.difficulty && <span className={`dl d-${x.difficulty}`}>{x.difficulty}</span>}
                    {x.url ? (
                      <a href={x.url} target="_blank" rel="noopener noreferrer">
                        {x.title}
                      </a>
                    ) : (
                      <span>
                        {x.title} <span className="muted">{x.subtitle}</span>
                      </span>
                    )}
                  </div>
                  <div className="right">
                    {others.map((m) => {
                      const ol = levelOf(d, m.userId, kind, x.id);
                      return (
                        <span key={m.userId} className="other" title={`${nameOf(d, m.userId)}：${LVTXT[ol]}`}>
                          <span className="dot" style={{ ["--c" as string]: colorOf(d, m.userId) }} />
                          <Pips lv={ol} color={colorOf(d, m.userId)} />
                        </span>
                      );
                    })}
                    <Track d={d} me={me} kind={kind} id={x.id} api={api} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
