import type { Kind, Level, Pass, Plan, Team, TeamData } from "../lib/types";
import type { Backend, Session } from "./backend";

const KEY = "grind-buddy:v1";
const USER = "local-user";

function empty(): TeamData {
  return {
    team: { id: "local", name: "本地演示", inviteCode: "—" },
    members: [],
    plans: {},
    progress: {},
    passes: [],
    queues: {},
  };
}

/** Demo mode: everything lives in this browser's localStorage. No sync. */
export class LocalBackend implements Backend {
  readonly mode = "local" as const;
  private listeners = new Set<() => void>();

  private read(): TeamData {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as TeamData) : empty();
    } catch {
      return empty();
    }
  }
  private write(mut: (d: TeamData) => void) {
    const d = this.read();
    mut(d);
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
    } catch {
      /* storage full or blocked: keep running in memory */
    }
    this.listeners.forEach((l) => l());
  }

  async getSession(): Promise<Session> {
    return { userId: USER };
  }
  onAuthChange() {
    return () => {};
  }
  async signIn() {}
  async signOut() {}

  async myTeams(): Promise<Team[]> {
    const d = this.read();
    return d.members.length ? [d.team] : [];
  }
  async createTeam(_name: string, nick: string): Promise<Team> {
    this.write((d) => {
      d.members = [{ userId: USER, nick, joinedAt: Date.now() }];
    });
    return this.read().team;
  }
  async joinTeam(code: string, nick: string): Promise<Team> {
    return this.createTeam(code, nick);
  }
  async load(): Promise<TeamData> {
    return this.read();
  }
  subscribe(_teamId: string, onChange: () => void) {
    this.listeners.add(onChange);
    return () => void this.listeners.delete(onChange);
  }
  async setNick(_t: string, nick: string) {
    this.write((d) => d.members.forEach((m) => m.userId === USER && (m.nick = nick)));
  }
  async setPlan(_t: string, plan: Plan) {
    this.write((d) => (d.plans[plan.weekStart] = plan));
  }
  async setLevel(_t: string, kind: Kind, problemId: string, level: Level) {
    this.write((d) => {
      const p = (d.progress[USER] ??= { lc: {}, sd: {} });
      if (level === 0) delete p[kind][problemId];
      else p[kind][problemId] = level;
    });
  }
  async addPass(_t: string, pass: Pass) {
    this.write((d) => d.passes.push(pass));
  }
  async deletePass(_t: string, passId: string) {
    this.write((d) => (d.passes = d.passes.filter((p) => p.id !== passId)));
  }
  async setQueue(_t: string, weekStart: string, kind: Kind, items: string[]) {
    this.write((d) => {
      const u = (d.queues[USER] ??= {});
      (u[weekStart] ??= {})[kind] = items;
    });
  }
}
