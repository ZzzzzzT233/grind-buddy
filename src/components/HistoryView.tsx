import { currentWeek, weekEnd, weekLabel } from "../lib/dates";
import type { TeamData } from "../lib/types";
import { weekStatus } from "../store/useTeam";
import { colorOf, Dot, nameOf, sortedMembers } from "./common";

export function HistoryView({ d }: { d: TeamData }) {
  const wk = currentWeek();
  const weeks = Object.keys(d.plans).sort().reverse();
  const members = sortedMembers(d);
  if (!weeks.length) return <div className="panel empty">还没有任何周计划。制定第一份计划后，这里会记录每周谁完成了、谁没完成。</div>;
  return (
    <div className="panel">
      <h2 style={{ fontSize: 17 }}>每周记录</h2>
      <div className="tbl">
        <table className="hist">
          <thead>
            <tr>
              <th>周</th>
              <th>目标</th>
              {members.map((m) => (
                <th key={m.userId}>
                  <span className="row" style={{ gap: 6 }}>
                    <Dot color={colorOf(d, m.userId)} />
                    {nameOf(d, m.userId)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((k) => {
              const p = d.plans[k];
              const cur = k === wk;
              return (
                <tr key={k}>
                  <td className="mono">
                    {weekLabel(k)} {cur && <span className="chip">本周</span>}
                  </td>
                  <td className="mono">
                    LC {p.lcTarget} · SD {p.sdTarget}
                  </td>
                  {members.map((m) => {
                    if (m.joinedAt >= weekEnd(k)) return <td key={m.userId} className="muted">—</td>;
                    const s = weekStatus(d, m.userId, k)!;
                    return (
                      <td key={m.userId}>
                        <div className="row" style={{ gap: 10 }}>
                          <span className="mono">
                            {s.lc}/{s.lt} · {s.sd}/{s.st}
                          </span>
                          {s.done ? <span className="stamp sm ok">完成</span> : cur ? <span className="note">进行中</span> : <span className="stamp sm">未完成</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
