import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk, requireUser } from "@/lib/api-helpers";
import { logActivity, notifyTransitions } from "@/lib/activity";
import { canApproveWiring } from "@/lib/permissions";
import { recalcCable } from "@/lib/recalc";
import { isCableComplete } from "@/lib/progress";
import { STATUS_LABELS, type EntityStatus } from "@/lib/types";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();
  const cable = db.prepare(
    `SELECT c.*, cab.cabinet_no, cab.id AS cabinet_id, u.name AS completed_by_name, uc.name AS checked_by_name,
       (SELECT COUNT(*) FROM wires w WHERE w.cable_id = c.id AND w.completed = 1) AS completed_wires
     FROM cables c
     JOIN cabinets cab ON cab.id = c.cabinet_id
     LEFT JOIN users u ON u.id = c.completed_by
     LEFT JOIN users uc ON uc.id = c.checked_by
     WHERE c.id = ?`
  ).get(Number(id));
  if (!cable) return jsonError("כבל לא נמצא", 404);

  const wires = db.prepare(
    `SELECT w.*, u.name AS completed_by_name FROM wires w
     LEFT JOIN users u ON u.id = w.completed_by
     WHERE w.cable_id = ? ORDER BY CAST(w.wire_no AS INTEGER), w.wire_no`
  ).all(Number(id));

  return jsonOk({ cable, wires });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const db = getDb();
  const cable = db.prepare("SELECT * FROM cables WHERE id = ?").get(Number(id)) as
    | { id: number; cable_no: string; status: EntityStatus; notes: string; checked: number }
    | undefined;
  if (!cable) return jsonError("כבל לא נמצא", 404);

  const body = await req.json();

  if (body.action === "verify") {
    // אישור בדיקה סופית — רק בודק או מנהל
    if (!canApproveWiring(auth.user.role)) {
      return jsonError("רק בודק או מנהל יכולים לאשר חיווט סופי", 403);
    }
    const wires = db.prepare("SELECT completed FROM wires WHERE cable_id = ?").all(cable.id) as { completed: number }[];
    if (!isCableComplete(wires)) {
      return jsonError("לא ניתן לאשר — לא כל הגידים הושלמו");
    }
    db.prepare(
      "UPDATE cables SET checked = 1, checked_by = ?, checked_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    ).run(auth.user.id, cable.id);
    const transitions = recalcCable(db, cable.id);
    notifyTransitions(db, transitions);
    logActivity(db, auth.user.id, "אישור בדיקת כבל", "cable", cable.id, cable.cable_no, STATUS_LABELS[cable.status], STATUS_LABELS.done);
  } else if (body.action === "unverify") {
    if (!canApproveWiring(auth.user.role)) {
      return jsonError("רק בודק או מנהל יכולים לבטל אישור בדיקה", 403);
    }
    db.prepare("UPDATE cables SET checked = 0, checked_by = NULL, checked_at = NULL, updated_at = datetime('now') WHERE id = ?").run(cable.id);
    const transitions = recalcCable(db, cable.id);
    notifyTransitions(db, transitions);
    logActivity(db, auth.user.id, "ביטול אישור בדיקת כבל", "cable", cable.id, cable.cable_no, STATUS_LABELS.done, "");
  } else if (typeof body.notes === "string") {
    db.prepare("UPDATE cables SET notes = ?, updated_at = datetime('now') WHERE id = ?").run(body.notes, cable.id);
    logActivity(db, auth.user.id, "עדכון הערות כבל", "cable", cable.id, cable.cable_no, cable.notes, body.notes);
  } else {
    return jsonError("פעולה לא מוכרת");
  }

  return jsonOk(db.prepare("SELECT * FROM cables WHERE id = ?").get(cable.id));
}
