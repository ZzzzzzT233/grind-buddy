export type Difficulty = "E" | "M" | "H";
export type Kind = "lc" | "sd";
/** 0 = not started, 1–3 = done that many times, 4 = fully mastered. */
export type Level = 0 | 1 | 2 | 3 | 4;

export interface Item {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  difficulty?: Difficulty;
  url?: string;
}

export interface Team {
  id: string;
  name: string;
  inviteCode: string;
}

export interface Member {
  userId: string;
  nick: string;
  joinedAt: number; // ms
}

export interface Plan {
  weekStart: string; // YYYY-MM-DD (Monday)
  lcTarget: number;
  sdTarget: number;
  mode: "focus" | "random";
  focus: string[];
}

/** One completed attempt ("+1 次" or "完全掌握"). Weekly targets count these. */
export interface Pass {
  id: string;
  userId: string;
  kind: Kind;
  problemId: string;
  fromLevel: Level;
  createdAt: number; // ms
}

export type ProgressMap = Record<Kind, Record<string, Level>>;

export interface TeamData {
  team: Team;
  members: Member[];
  plans: Record<string, Plan>;
  progress: Record<string, ProgressMap>; // by userId
  passes: Pass[];
  /** queues[userId][weekStart][kind] = problem ids drawn for that week */
  queues: Record<string, Record<string, Partial<Record<Kind, string[]>>>>;
}
