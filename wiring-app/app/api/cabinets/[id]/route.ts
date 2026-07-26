import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk, requireUser } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();
  const cabinet = db.prepare(
    `SELECT c.*, u.name AS assignee_name,
       (SELECT COUNT(*) FROM deviations d WHERE d.cabinet_id = c.id AND d.status IN ('open','in_review')) AS open_deviations
     FROM cabinets c LEFT JOIN users u ON u.id = c.assignee_id WHERE c.id = ?`
  ).get(Number(id));
  if (!cabinet) return jsonError("ארון לא נמצא", 404);

  const cables = db.prepare(
    `SELECT c.*, u.name AS completed_by_name, uc.name AS checked_by_name,
       (SELECT COUNT(*) FROM wires w WHERE w.cable_id = c.id AND w.completed = 1) AS completed_wires
     FROM cables c
     LEFT JOIN users u ON u.id = c.completed_by
     LEFT JOIN users uc ON uc.id = c.checked_by
     WHERE c.cabinet_id = ? ORDER BY c.cable_no`
  ).all(Number(id));

  const workers = db.prepare(
    `SELECT DISTINCT u.id, u.name FROM wires w
     JOIN cables c ON c.id = w.cable_id
     JOIN users u ON u.id = w.completed_by
     WHERE c.cabinet_id = ?`
  ).all(Number(id));

  const activity = db.prepare(
    `SELECT a.*, u.name AS user_name FROM activity_log a JOIN users u ON u.id = a.user_id
     WHERE (a.entity_type = 'cabinet' AND a.entity_id = ?)
        OR (a.entity_type = 'cable' AND a.entity_id IN (SELECT id FROM cables WHERE cabinet_id = ?))
     ORDER BY a.created_at DESC, a.id DESC LIMIT 25`
  ).all(Number(id), Number(id));

  const deviations = db.prepare(
    `SELECT d.*, u.name AS reported_by_name FROM deviations d
     JOIN users u ON u.id = d.reported_by WHERE d.cabinet_id = ? ORDER BY d.reported_at DESC`
  ).all(Number(id));

  return jsonOk({ cabinet, cables, workers, activity, deviations });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const db = getDb();
  const cabinet = db.prepare("SELECT * FROM cabinets WHERE id = ?").get(Number(id)) as { id: number; cabinet_no: string; notes: string } | undefined;
  if (!cabinet) return jsonError("ארון לא נמצא", 404);

  const body = await req.json();
  if (typeof body.notes === "string") {
    db.prepare("UPDATE cabinets SET notes = ?, updated_at = datetime('now') WHERE id = ?").run(body.notes, cabinet.id);
    logActivity(db, auth.user.id, "עדכון הערות ארון", "cabinet", cabinet.id, cabinet.cabinet_no, cabinet.notes, body.notes);
  }
  if (body.assignee_id !== undefined) {
    db.prepare("UPDATE cabinets SET assignee_id = ?, updated_at = datetime('now') WHERE id = ?").run(body.assignee_id || null, cabinet.id);
    logActivity(db, auth.user.id, "שינוי עובד אחראי", "cabinet", cabinet.id, cabinet.cabinet_no);
  }
  return jsonOk(db.prepare("SELECT * FROM cabinets WHERE id = ?").get(cabinet.id));
}
