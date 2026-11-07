const pad = (n: number) => String(n).padStart(2, "0");

export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function parseKey(k: string): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const currentWeek = (now = new Date()) => dayKey(mondayOf(now));

export function shiftWeek(k: string, n: number): string {
  const d = parseKey(k);
  d.setDate(d.getDate() + 7 * n);
  return dayKey(d);
}

export function weekLabel(k: string): string {
  const a = parseKey(k);
  const b = parseKey(k);
  b.setDate(b.getDate() + 6);
  return `${a.getMonth() + 1}/${a.getDate()} – ${b.getMonth() + 1}/${b.getDate()}`;
}

/** Epoch ms of the Monday after this week (exclusive end). */
export function weekEnd(k: string): number {
  const d = parseKey(k);
  d.setDate(d.getDate() + 7);
  return d.getTime();
}

export const weekOf = (ms: number) => currentWeek(new Date(ms));

/** 0 = Monday … 6 = Sunday */
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;
