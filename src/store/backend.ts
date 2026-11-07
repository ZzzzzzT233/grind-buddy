import type { Kind, Level, Pass, Plan, Team, TeamData } from "../lib/types";

export interface Session {
  userId: string;
  email?: string;
}

/**
 * Storage contract. Two implementations ship:
 *  - SupabaseBackend: real accounts + realtime sync between teammates
 *  - LocalBackend:    demo mode, single person, data in localStorage
 */
export interface Backend {
  readonly mode: "supabase" | "local";
  getSession(): Promise<Session | null>;
  onAuthChange(cb: (s: Session | null) => void): () => void;
  signIn(email: string): Promise<void>;
  signOut(): Promise<void>;

  myTeams(): Promise<Team[]>;
  createTeam(name: string, nick: string): Promise<Team>;
  joinTeam(code: string, nick: string): Promise<Team>;

  load(teamId: string): Promise<TeamData>;
  /** Calls `onChange` whenever anyone in the team writes something. */
  subscribe(teamId: string, onChange: () => void): () => void;

  setNick(teamId: string, nick: string): Promise<void>;
  setPlan(teamId: string, plan: Plan): Promise<void>;
  setLevel(teamId: string, kind: Kind, problemId: string, level: Level): Promise<void>;
  addPass(teamId: string, pass: Pass): Promise<void>;
  deletePass(teamId: string, passId: string): Promise<void>;
  setQueue(teamId: string, weekStart: string, kind: Kind, items: string[]): Promise<void>;
}

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
