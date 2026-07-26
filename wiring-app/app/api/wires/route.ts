import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk, requireUser } from "@/lib/api-helpers";
import { logActivity, notifyTransitions } from "@/lib/activity";
import { canMarkWires } from "@/lib/permissions";
import { recalcCable } from "@/lib/recalc";

/**
 * עדכון גידים — סימון בודד או מרובה כהושלם/פתוח, והוספת הערת שינוי.
 * שם העובד ותאריך הביצוע נשמרים אוטומטית.
 */
export async function PATCH(req: NextRequest) {
  const auth = requireUser(req);
  if ("error" in auth) return auth.error;
  if (!canMarkWires(auth.user.role)) return jsonError("אין הרשאה", 403);

  const db = getDb();
  const body = await req.json();
  const wireIds: number[] = Array.isArray(body.wireIds) ? body.wireIds.map(Number) : [];
  if (!wireIds.length) return jsonError("לא נבחרו גידים");

  const affectedCables = new Set<number>();

  if (body.action === "complete" || body.action === "uncomplete") {
    const completed = body.action === "complete" ? 1 : 0;
    const update = db.prepare(
      `UPDATE wires SET completed = ?, completed_by = ?, completed_at = ? WHERE id = ?`
    );
    for (const wid of wireIds) {
      const wire = db.prepare(
        "SELECT w.id, w.wire_no, w.completed, w.cable_id, c.cable_no, c.checked FROM wires w JOIN cables c ON c.id = w.cable_id WHERE w.id = ?"
      ).get(wid) as { id: number; wire_no: string; completed: number; cable_id: number; cable_no: string; checked: number } | undefined;
      if (!wire) continue;
      if (wire.completed === completed) continue;
      update.run(
        completed,
        completed ? auth.user.id : null,
        completed ? new Date().toISOString().replace("T", " ").slice(0, 19) : null,
        wid
      );
      if (!completed && wire.checked) {
        // ביטול השלמת גיד מבטל את אישור הבדיקה של הכבל
        db.prepare("UPDATE cables SET checked = 0, checked_by = NULL, checked_at = NULL WHERE id = ?").run(wire.cable_id);
      }
      affectedCables.add(wire.cable_id);
      logActivity(
        db, auth.user.id,
        completed ? "סימון גיד כהושלם" : "ביטול השלמת גיד",
        "cable", wire.cable_id, `${wire.cable_no} גיד ${wire.wire_no}`,
        completed ? "פתוח" : "הושלם",
        completed ? "הושלם" : "פתוח"
      );
    }
  } else if (body.action === "note") {
    const wid = wireIds[0];
    const wire = db.prepare(
      "SELECT w.*, c.cable_no FROM wires w JOIN cables c ON c.id = w.cable_id WHERE w.id = ?"
    ).get(wid) as { id: number; wire_no: string; cable_id: number; cable_no: string; deviation_note: string } | undefined;
    if (!wire) return jsonError("גיד לא נמצא", 404);
    const note = String(body.note ?? "");
    db.prepare("UPDATE wires SET deviation_note = ?, has_deviation = ? WHERE id = ?").run(note, note ? 1 : 0, wid);
    affectedCables.add(wire.cable_id);
    logActivity(db, auth.user.id, "הערת שינוי על גיד", "cable", wire.cable_id, `${wire.cable_no} גיד ${wire.wire_no}`, wire.deviation_note, note);
  } else {
    return jsonError("פעולה לא מוכרת");
  }

  for (const cableId of affectedCables) {
    const transitions = recalcCable(db, cableId);
    notifyTransitions(db, transitions);
  }

  return jsonOk({ ok: true, updated: wireIds.length });
}
