import type Database from "better-sqlite3";
import type { EntityStatus } from "./types";
import { cableStatus, cabinetStatus, cabinetProgress, cableProgress, projectProgress } from "./progress";

/**
 * חישוב מחדש של סטטוס והתקדמות לאורך השרשרת: כבל ← ארון ← פרויקט.
 * מחזיר מעברי סטטוס כדי שהשכבה הקוראת תוכל ליצור התראות.
 */

export interface StatusTransition {
  entity: "cable" | "cabinet";
  id: number;
  label: string;
  from: EntityStatus;
  to: EntityStatus;
}

export function recalcCable(db: Database.Database, cableId: number): StatusTransition[] {
  const cable = db
    .prepare("SELECT id, cabinet_id, cable_no, status, checked FROM cables WHERE id = ?")
    .get(cableId) as { id: number; cabinet_id: number; cable_no: string; status: EntityStatus; checked: number } | undefined;
  if (!cable) return [];

  const wires = db
    .prepare("SELECT completed FROM wires WHERE cable_id = ?")
    .all(cableId) as { completed: number }[];

  const openDev = db
    .prepare("SELECT COUNT(*) AS n FROM deviations WHERE cable_id = ? AND status IN ('open','in_review')")
    .get(cableId) as { n: number };

  const newStatus = cableStatus(wires, !!cable.checked, openDev.n > 0);
  const { completed } = cableProgress(wires);

  db.prepare(
    "UPDATE cables SET status = ?, wire_count = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(newStatus, wires.length, cableId);

  const transitions: StatusTransition[] = [];
  if (newStatus !== cable.status) {
    transitions.push({ entity: "cable", id: cableId, label: cable.cable_no, from: cable.status, to: newStatus });
  }
  // עדכון שדה עזר של גידים שהושלמו איננו נשמר בטבלת cables — מחושב בשאילתות.
  void completed;
  transitions.push(...recalcCabinet(db, cable.cabinet_id));
  return transitions;
}

export function recalcCabinet(db: Database.Database, cabinetId: number): StatusTransition[] {
  const cabinet = db
    .prepare("SELECT id, project_id, cabinet_no, status FROM cabinets WHERE id = ?")
    .get(cabinetId) as { id: number; project_id: number; cabinet_no: string; status: EntityStatus } | undefined;
  if (!cabinet) return [];

  const cables = db
    .prepare("SELECT status FROM cables WHERE cabinet_id = ?")
    .all(cabinetId) as { status: EntityStatus }[];

  const openDev = db
    .prepare("SELECT COUNT(*) AS n FROM deviations WHERE cabinet_id = ? AND status IN ('open','in_review')")
    .get(cabinetId) as { n: number };

  const newStatus = cabinetStatus(cables, openDev.n > 0);
  const prog = cabinetProgress(cables);

  db.prepare(
    `UPDATE cabinets SET status = ?, total_cables = ?, completed_cables = ?, progress = ?,
     finished_at = CASE WHEN ? = 'done' AND finished_at IS NULL THEN datetime('now') WHEN ? != 'done' THEN NULL ELSE finished_at END,
     updated_at = datetime('now') WHERE id = ?`
  ).run(newStatus, prog.total, prog.completed, prog.percent, newStatus, newStatus, cabinetId);

  const transitions: StatusTransition[] = [];
  if (newStatus !== cabinet.status) {
    transitions.push({ entity: "cabinet", id: cabinetId, label: cabinet.cabinet_no, from: cabinet.status, to: newStatus });
  }
  recalcProject(db, cabinet.project_id);
  return transitions;
}

export function recalcProject(db: Database.Database, projectId: number): void {
  const cabinets = db
    .prepare("SELECT progress, total_cables FROM cabinets WHERE project_id = ?")
    .all(projectId) as { progress: number; total_cables: number }[];
  const prog = projectProgress(cabinets);
  db.prepare("UPDATE projects SET progress = ?, updated_at = datetime('now') WHERE id = ?").run(prog, projectId);
}

export function recalcAll(db: Database.Database): void {
  const cables = db.prepare("SELECT id FROM cables").all() as { id: number }[];
  for (const c of cables) recalcCable(db, c.id);
}
