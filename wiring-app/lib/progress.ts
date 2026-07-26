import type { EntityStatus } from "./types";

/**
 * פונקציות חישוב טהורות של התקדמות וסטטוסים.
 * הכללים:
 * - כבל ייחשב כהושלם רק כאשר כל הגידים שלו הושלמו.
 * - כבל שכל גידיו הושלמו אך טרם נבדק — "ממתין לבדיקה".
 * - ארון ייחשב כהושלם רק כאשר כל הכבלים שלו הושלמו (נבדקו ואושרו).
 */

export interface WireLike {
  completed: number | boolean;
  has_deviation?: number | boolean;
}

export interface CableLike {
  status: EntityStatus;
}

export function percent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export function countCompletedWires(wires: WireLike[]): number {
  return wires.filter((w) => !!w.completed).length;
}

export function cableProgress(wires: WireLike[]): {
  completed: number;
  total: number;
  percent: number;
} {
  const completed = countCompletedWires(wires);
  return { completed, total: wires.length, percent: percent(completed, wires.length) };
}

export function isCableComplete(wires: WireLike[]): boolean {
  return wires.length > 0 && wires.every((w) => !!w.completed);
}

/**
 * סטטוס כבל נגזר ממצב הגידים, מבדיקת הבודק ומחריגות פתוחות.
 */
export function cableStatus(
  wires: WireLike[],
  checked: boolean,
  hasOpenDeviation: boolean
): EntityStatus {
  if (hasOpenDeviation) return "issue";
  const done = countCompletedWires(wires);
  if (wires.length === 0 || done === 0) return "not_started";
  if (done < wires.length) return "in_progress";
  // כל הגידים הושלמו
  return checked ? "done" : "pending_check";
}

export function cabinetProgress(cables: CableLike[]): {
  completed: number;
  total: number;
  percent: number;
} {
  const completed = cables.filter((c) => c.status === "done").length;
  return { completed, total: cables.length, percent: percent(completed, cables.length) };
}

export function cabinetStatus(cables: CableLike[], hasOpenDeviation: boolean): EntityStatus {
  if (hasOpenDeviation) return "issue";
  if (cables.length === 0) return "not_started";
  if (cables.every((c) => c.status === "done")) return "done";
  if (cables.some((c) => c.status === "pending_check") && cables.every((c) => c.status === "pending_check" || c.status === "done")) {
    return "pending_check";
  }
  if (cables.every((c) => c.status === "not_started")) return "not_started";
  return "in_progress";
}

export function projectProgress(cabinets: { progress: number; total_cables: number }[]): number {
  // ממוצע משוקלל לפי מספר הכבלים בכל ארון
  const totalCables = cabinets.reduce((s, c) => s + c.total_cables, 0);
  if (totalCables === 0) return 0;
  const weighted = cabinets.reduce((s, c) => s + c.progress * c.total_cables, 0);
  return Math.round(weighted / totalCables);
}
