import type Database from "better-sqlite3";

export function logActivity(
  db: Database.Database,
  userId: number,
  action: string,
  entityType: string,
  entityId: number,
  entityLabel: string,
  oldValue = "",
  newValue = ""
): void {
  db.prepare(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, entity_label, old_value, new_value)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, action, entityType, entityId, entityLabel, oldValue, newValue);
}

export function notify(
  db: Database.Database,
  type: string,
  message: string,
  entityType = "",
  entityId: number | null = null
): void {
  db.prepare(
    "INSERT INTO notifications (type, message, entity_type, entity_id) VALUES (?, ?, ?, ?)"
  ).run(type, message, entityType, entityId);
}

import type { StatusTransition } from "./recalc";
import { STATUS_LABELS } from "./types";

/** יצירת התראות אוטומטיות ממעברי סטטוס. */
export function notifyTransitions(db: Database.Database, transitions: StatusTransition[]): void {
  for (const t of transitions) {
    if (t.entity === "cabinet" && t.to === "done") {
      notify(db, "cabinet_done", `ארון ${t.label} הושלם 🎉`, "cabinet", t.id);
    } else if (t.entity === "cable" && t.to === "pending_check") {
      notify(db, "cable_pending", `כבל ${t.label} ממתין לבדיקה`, "cable", t.id);
    } else if (t.to === "issue") {
      const kind = t.entity === "cabinet" ? "ארון" : "כבל";
      notify(db, "issue", `${kind} ${t.label} סומן בחריגה (${STATUS_LABELS[t.from]} ← ${STATUS_LABELS[t.to]})`, t.entity, t.id);
    }
  }
}
