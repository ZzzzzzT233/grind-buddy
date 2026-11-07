import { useCallback, useEffect, useRef, useState } from "react";
import { BankView } from "./components/BankView";
import { HistoryView } from "./components/HistoryView";
import { StatsView } from "./components/StatsView";
import { WeekView } from "./components/WeekView";
import { currentWeek, weekLabel } from "./lib/dates";
import type { Team } from "./lib/types";
import { backend } from "./store";
import type { Session } from "./store/backend";
import { useTeam } from "./store/useTeam";

const REPO = "https://github.com/ZzzzzzT233/grind-buddy";
const TEAM_KEY = "grind-buddy:team";

function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toast = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(t.current);
    t.current = setTimeout(() => setMsg(null), 3200);
  }, []);
  return { msg, toast };
}

export default function App() {
  const { msg, toast } = useToast();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [team, setTeam] = useState<Team | null | undefined>(undefined);

  useEffect(() => {
    void backend.getSession().then(setSession);
    return backend.onAuthChange(setSession);
  }, []);

  useEffect(() => {
    if (!session) {
      setTeam(session === null ? null : undefined);
      return;
    }
    void backend
      .myTeams()
      .then((ts) => {
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(TEAM_KEY);
        } catch {
          /* ignore */
        }
        setTeam(ts.find((t) => t.id === saved) ?? ts[0] ?? null);
      })
      .catch((e) => {
        toast(String(e?.message ?? e));
        setTeam(null);
      });
  }, [session, toast]);

  let body;
  if (session === undefined || (session && team === undefined)) body = <div className="panel empty">加载中…</div>;
  else if (!session) body = <SignIn toast={toast} />;
  else if (!team) body = <TeamSetup onReady={setTeam} toast={toast} />;
  else body = <Main team={team} session={session} toast={toast} />;

  return (
    <>
      {body}
      {msg && <div className="toast" role="status">{msg}</div>}
    </>
  );
}

function SignIn({ toast }: { toast: (m: string) => void }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async (create: boolean) => {
    if (!email.trim() || pw.length < 6) return toast("填好邮箱，密码至少 6 位");
    setBusy(true);
    try {
      await backend.signIn(email.trim(), pw, create);
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth">
      <h1>你一道我一道，明天拿下大结果！</h1>
      <p className="lead">和朋友一起准备技术面试：NeetCode 150 + System Design 周计划、按熟练度抽题、战绩追踪。</p>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          void go(false);
        }}
      >
        <label className="field">
          <span className="label">邮箱</span>
          <input className="text" id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label className="field">
          <span className="label">密码（至少 6 位）</span>
          <input className="text" id="password" type="password" autoComplete="current-password" required minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        <div className="row">
          <button className="btn primary" type="submit" disabled={busy}>
            登录
          </button>
          <button className="btn" type="button" disabled={busy} onClick={() => void go(true)}>
            第一次用？注册
          </button>
        </div>
      </form>
    </div>
  );
}

function TeamSetup({ onReady, toast }: { onReady: (t: Team) => void; toast: (m: string) => void }) {
  const [nick, setNick] = useState("");
  const [name, setName] = useState("我们的刷题小组");
  const [code, setCode] = useState("");
  const local = backend.mode === "local";
  const go = async (fn: () => Promise<Team>) => {
    if (!nick.trim()) return toast("先取个昵称");
    try {
      onReady(await fn());
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <div className="auth">
      <h1>你一道我一道，明天拿下大结果！</h1>
      {local && (
        <p className="note">
          <span className="demo-tag">本地演示模式</span> 数据只存在这个浏览器里。配置 Supabase 后可以和朋友实时同步，见 README。
        </p>
      )}
      <div className="panel">
        <label className="field">
          <span className="label">你的昵称</span>
          <input className="text" id="nick" maxLength={30} value={nick} onChange={(e) => setNick(e.target.value)} placeholder="比如 Tong" />
        </label>
      </div>
      <div className="panel">
        <div className="label">{local ? "开始" : "新建小组，把邀请码发给搭子"}</div>
        {!local && <input className="text" id="team-name" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />}
        <button className="btn primary" onClick={() => go(() => backend.createTeam(name.trim() || "刷题小组", nick.trim()))}>
          {local ? "开始使用" : "新建小组"}
        </button>
      </div>
      {!local && (
        <div className="panel">
          <div className="label">已经有邀请码</div>
          <div className="row">
            <input className="text mono" id="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="8 位邀请码" style={{ flex: 1 }} />
            <button className="btn" onClick={() => go(() => backend.joinTeam(code, nick.trim()))}>
              加入
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const TABS = [
  ["week", "本周"],
  ["stats", "战绩"],
  ["lc", "LeetCode 150"],
  ["sd", "System Design"],
  ["hist", "历史"],
  ["me", "设置"],
] as const;
type Tab = (typeof TABS)[number][0];

function Main({ team, session, toast }: { team: Team; session: Session; toast: (m: string) => void }) {
  const me = session.userId;
  const api = useTeam(team.id, me, toast);
  const [tab, setTab] = useState<Tab>("week");
  const d = api.data;
  useEffect(() => {
    try {
      localStorage.setItem(TEAM_KEY, team.id);
    } catch {
      /* ignore */
    }
  }, [team.id]);

  return (
    <div className="wrap">
      <div className="top">
        <div className="brand">
          <h1>你一道我一道，明天拿下大结果！</h1>
          <div className="wk">
            本周 <span className="mono">{weekLabel(currentWeek())}</span> · {team.name}
            {backend.mode === "local" && <> · <span className="demo-tag">本地演示</span></>}
          </div>
        </div>
        <div className="tabs" role="tablist">
          {TABS.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => (setTab(k), window.scrollTo({ top: 0 }))}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {api.error && (
        <div className="panel note">
          读取数据出错：{api.error} <button className="btn small" onClick={() => void api.reload()}>重试</button>
        </div>
      )}
      {!d ? (
        <div className="panel empty">正在加载你们的计划和进度…</div>
      ) : tab === "week" ? (
        <WeekView d={d} me={me} api={api} />
      ) : tab === "stats" ? (
        <StatsView d={d} me={me} />
      ) : tab === "lc" || tab === "sd" ? (
        <BankView d={d} me={me} api={api} kind={tab} />
      ) : tab === "hist" ? (
        <HistoryView d={d} />
      ) : (
        <Settings team={team} session={session} api={api} toast={toast} />
      )}
      <div className="foot">
        你一道我一道，明天拿下大结果！ · Grind Buddy 开源项目 · 题目来自 <a href="https://neetcode.io/practice" target="_blank" rel="noopener noreferrer">NeetCode 150</a>
      </div>
    </div>
  );
}

function Settings({ team, session, api, toast }: { team: Team; session: Session; api: ReturnType<typeof useTeam>; toast: (m: string) => void }) {
  const mine = api.data?.members.find((m) => m.userId === session.userId);
  const [nick, setNick] = useState(mine?.nick ?? "");
  return (
    <div className="panel settings">
      {backend.mode === "supabase" && (
        <>
          <div className="label">邀请码 · 发给你的搭子</div>
          <div className="row">
            <span className="code">{team.inviteCode}</span>
            <button
              className="btn small"
              onClick={() =>
                navigator.clipboard
                  .writeText(team.inviteCode)
                  .then(() => toast("已复制"))
                  .catch(() => toast("复制失败，请手动选中"))
              }
            >
              复制
            </button>
          </div>
        </>
      )}
      <label className="field">
        <span className="label">昵称</span>
        <div className="row">
          <input className="text" id="set-nick" maxLength={30} value={nick} onChange={(e) => setNick(e.target.value)} />
          <button className="btn small" onClick={() => void api.setNick(nick.trim()).then(() => toast("已保存"))}>
            保存
          </button>
        </div>
      </label>
      {backend.mode === "supabase" && (
        <div className="row between">
          <span className="note">已登录：{session.email}</span>
          <button className="btn small" onClick={() => void backend.signOut()}>
            退出登录
          </button>
        </div>
      )}
      <a className="note" href={REPO} target="_blank" rel="noopener noreferrer">
        在 GitHub 上查看源码
      </a>
    </div>
  );
}
