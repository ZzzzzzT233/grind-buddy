import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Kind, Level, Pass, Plan, Team, TeamData } from "../lib/types";
import type { Backend, Session } from "./backend";

/** Untyped DB row; columns are mapped by hand below. */
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const toTeam = (r: Row): Team => ({ id: r.id, name: r.name, inviteCode: r.invite_code });

export class SupabaseBackend implements Backend {
  readonly mode = "supabase" as const;
  private sb: SupabaseClient;
  private uid: string | null = null;

  constructor(url: string, anonKey: string) {
    this.sb = createClient(url, anonKey);
  }

  private async me(): Promise<string> {
    if (this.uid) return this.uid;
    const { data } = await this.sb.auth.getUser();
    if (!data.user) throw new Error("请先登录");
    this.uid = data.user.id;
    return this.uid;
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.sb.auth.getSession();
    const u = data.session?.user;
    this.uid = u?.id ?? null;
    return u ? { userId: u.id, email: u.email ?? undefined } : null;
  }
  onAuthChange(cb: (s: Session | null) => void) {
    const { data } = this.sb.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      this.uid = u?.id ?? null;
      cb(u ? { userId: u.id, email: u.email ?? undefined } : null);
    });
    return () => data.subscription.unsubscribe();
  }
  async signIn(email: string) {
    const redirect = window.location.origin + window.location.pathname;
    const { error } = await this.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
    if (error) throw error;
  }
  async signOut() {
    await this.sb.auth.signOut();
  }

  async myTeams(): Promise<Team[]> {
    const uid = await this.me();
    const { data, error } = await this.sb.from("team_members").select("teams(*)").eq("user_id", uid);
    if (error) throw error;
    return (data ?? []).map((r: Row) => r.teams).filter(Boolean).map(toTeam);
  }
  async createTeam(name: string, nick: string): Promise<Team> {
    const { data, error } = await this.sb.rpc("create_team", { team_name: name, my_nick: nick });
    if (error) throw error;
    return toTeam(data as Row);
  }
  async joinTeam(code: string, nick: string): Promise<Team> {
    const { data, error } = await this.sb.rpc("join_team", { code, my_nick: nick });
    if (error) throw new Error(error.message.includes("not found") ? "邀请码不存在" : error.message);
    return toTeam(data as Row);
  }

  async load(teamId: string): Promise<TeamData> {
    const q = (t: string) => this.sb.from(t).select("*").eq("team_id", teamId);
    const [team, members, plans, progress, passes, queues] = await Promise.all([
      this.sb.from("teams").select("*").eq("id", teamId).single(),
      q("team_members"),
      q("plans"),
      q("progress"),
      q("passes").order("created_at").limit(20000),
      q("queues"),
    ]);
    for (const r of [team, members, plans, progress, passes, queues]) if (r.error) throw r.error;

    const data: TeamData = {
      team: toTeam(team.data as Row),
      members: (members.data as Row[]).map((r) => ({
        userId: r.user_id,
        nick: r.nick,
        joinedAt: Date.parse(r.joined_at),
      })),
      plans: {},
      progress: {},
      passes: (passes.data as Row[]).map((r) => ({
        id: r.id,
        userId: r.user_id,
        kind: r.kind,
        problemId: r.problem_id,
        fromLevel: r.from_level,
        createdAt: Date.parse(r.created_at),
      })),
      queues: {},
    };
    for (const r of plans.data as Row[])
      data.plans[r.week_start] = {
        weekStart: r.week_start,
        lcTarget: r.lc_target,
        sdTarget: r.sd_target,
        mode: r.mode,
        focus: r.focus ?? [],
      };
    for (const r of progress.data as Row[]) {
      const p = (data.progress[r.user_id] ??= { lc: {}, sd: {} });
      if (r.level > 0) p[r.kind as Kind][r.problem_id] = r.level as Level;
    }
    for (const r of queues.data as Row[]) {
      const u = (data.queues[r.user_id] ??= {});
      (u[r.week_start] ??= {})[r.kind as Kind] = r.items ?? [];
    }
    return data;
  }

  subscribe(teamId: string, onChange: () => void) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const bump = () => {
      clearTimeout(timer);
      timer = setTimeout(onChange, 250);
    };
    const ch = this.sb.channel(`team-${teamId}`);
    for (const table of ["team_members", "plans", "progress", "passes", "queues"])
      ch.on("postgres_changes", { event: "*", schema: "public", table, filter: `team_id=eq.${teamId}` }, bump);
    ch.subscribe();
    return () => {
      clearTimeout(timer);
      void this.sb.removeChannel(ch);
    };
  }

  private async check<T extends { error: unknown }>(p: PromiseLike<T>) {
    const r = await p;
    if (r.error) throw r.error;
  }

  async setNick(teamId: string, nick: string) {
    const uid = await this.me();
    await this.check(this.sb.from("team_members").update({ nick }).eq("team_id", teamId).eq("user_id", uid));
  }
  async setPlan(teamId: string, plan: Plan) {
    const uid = await this.me();
    await this.check(
      this.sb.from("plans").upsert({
        team_id: teamId,
        week_start: plan.weekStart,
        lc_target: plan.lcTarget,
        sd_target: plan.sdTarget,
        mode: plan.mode,
        focus: plan.focus,
        updated_by: uid,
        updated_at: new Date().toISOString(),
      }),
    );
  }
  async setLevel(teamId: string, kind: Kind, problemId: string, level: Level) {
    const uid = await this.me();
    await this.check(
      this.sb.from("progress").upsert({
        team_id: teamId,
        user_id: uid,
        kind,
        problem_id: problemId,
        level,
        updated_at: new Date().toISOString(),
      }),
    );
  }
  async addPass(teamId: string, pass: Pass) {
    const uid = await this.me();
    await this.check(
      this.sb.from("passes").insert({
        id: pass.id,
        team_id: teamId,
        user_id: uid,
        kind: pass.kind,
        problem_id: pass.problemId,
        from_level: pass.fromLevel,
        created_at: new Date(pass.createdAt).toISOString(),
      }),
    );
  }
  async deletePass(_teamId: string, passId: string) {
    await this.check(this.sb.from("passes").delete().eq("id", passId));
  }
  async setQueue(teamId: string, weekStart: string, kind: Kind, items: string[]) {
    const uid = await this.me();
    await this.check(
      this.sb.from("queues").upsert({ team_id: teamId, user_id: uid, week_start: weekStart, kind, items }),
    );
  }
}
