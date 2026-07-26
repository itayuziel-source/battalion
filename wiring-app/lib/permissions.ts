import type { Role } from "./types";

/** רק בודק או מנהל יכולים לאשר חיווט סופי (בדיקת כבל). */
export function canApproveWiring(role: Role): boolean {
  return role === "inspector" || role === "manager";
}

/** רק מנהל יכול להגיב ולאשר חריגות. */
export function canResolveDeviation(role: Role): boolean {
  return role === "manager";
}

/** כל משתמש מחובר רשאי לסמן גידים שהושלמו ולדווח חריגות. */
export function canMarkWires(role: Role): boolean {
  return role === "worker" || role === "inspector" || role === "manager";
}

/** אישור נתוני מיפוי והזנתם לפרויקט. */
export function canCommitSet(role: Role): boolean {
  return role === "worker" || role === "inspector" || role === "manager";
}
