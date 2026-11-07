import type { Kind, Level, Member, TeamData } from "../lib/types";
import { levelOf, type TeamApi } from "../store/useTeam";

export const LVTXT = ["还没做", "做了 1 次", "做了 2 次", "做了 3 次", "完全掌握"] as const;
const PCOL = ["--p0", "--p1", "--p2", "--p3"];

export function sortedMembers(d: TeamData): Member[] {
  return [...d.members].sort((a, b) => a.joinedAt - b.joinedAt);
}
export function colorOf(d: TeamData, userId: string): string {
  const i = Math.max(0, sortedMembers(d).findIndex((m) => m.userId === userId));
  return `var(${PCOL[i % PCOL.length]})`;
}
export function nameOf(d: TeamData, userId: string): string {
  return d.members.find((m) => m.userId === userId)?.nick || "队友";
}

export function Dot({ color }: { color: string }) {
  return <span className="dot" style={{ ["--c" as string]: color }} />;
}

export function Pips({ lv, color }: { lv: Level; color?: string }) {
  return (
    <span className="pips" style={color ? { ["--c" as string]: color } : undefined} aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <i key={i} className={lv >= i ? "on" : ""} />
      ))}
      <b className={lv === 4 ? "on" : ""}>★</b>
    </span>
  );
}

/** Per-problem tracker: pips + "+1 次" / "完全掌握" / undo. */
export function Track({ d, me, kind, id, api }: { d: TeamData; me: string; kind: Kind; id: string; api: TeamApi }) {
  const lv = levelOf(d, me, kind, id);
  return (
    <div className="track">
      <Pips lv={lv} />
      <span className={`lvtxt l${lv}`}>{LVTXT[lv]}</span>
      {lv < 4 ? (
        <>
          <button className="btn small primary" title="做完一遍" onClick={() => api.logPass(kind, id)}>
            +1 次
          </button>
          <button className="btn small gold" title="已经十分熟练" onClick={() => api.logPass(kind, id, 4)}>
            完全掌握
          </button>
        </>
      ) : (
        <button className="btn small" title="又复习了一遍" onClick={() => api.logPass(kind, id)}>
          复习 +1
        </button>
      )}
      {lv > 0 && (
        <button className="btn small ghost" title="撤销上一次" aria-label="撤销上一次" onClick={() => api.undo(kind, id)}>
          ↶
        </button>
      )}
    </div>
  );
}
