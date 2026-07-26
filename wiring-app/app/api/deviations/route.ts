import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk, requireUser } from "@/lib/api-helpers";
import { logActivity, notify, notifyTransitions } from "@/lib/activity";
import { recalcCabinet, recalcCable } from "@/lib/recalc";

export async function GET() {
  const db = getDb();
  const deviations = db.prepare(
    `SELECT d.*, u.name AS reported_by_name, ua.name AS approved_by_name,
       cab.cabinet_no, c.cable_no, w.wire_no
     FROM deviations d
     JOIN users u ON u.id = d.reported_by
     LEFT JOIN users ua ON ua.id = d.approved_by
     JOIN cabinets cab ON cab.id = d.cabinet_id
     LEFT JOIN cables c ON c.id = d.cable_id
     LEFT JOIN wires w ON w.id = d.wire_id
     ORDER BY CASE d.status WHEN 'open' THEN 0 WHEN 'in_review' THEN 1 ELSE 2 END, d.reported_at DESC`
  ).all();
  return jsonOk(deviations);
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if ("error" in auth) return auth.error;
  const db = getDb();
  const body = await req.json();
  const { cabinet_id, cable_id, wire_id, description, reason, image_name } = body ?? {};
  if (!cabinet_id || !description) return jsonError("נדרשים ארון ותיאור השינוי");

  const cabinet = db.prepare("SELECT * FROM cabinets WHERE id = ?").get(Number(cabinet_id)) as { id: number; project_id: number; cabinet_no: string } | undefined;
  if (!cabinet) return jsonError("ארון לא נמצא", 404);

  const id = db.prepare(
    `INSERT INTO deviations (project_id, cabinet_id, cable_id, wire_id, description, reason, reported_by, image_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(cabinet.project_id, cabinet.id, cable_id || null, wire_id || null, String(description), String(reason ?? ""), auth.user.id, String(image_name ?? "")).lastInsertRowid as number;

  if (wire_id) {
    db.prepare("UPDATE wires SET has_deviation = 1, deviation_note = ? WHERE id = ?").run(String(description), wire_id);
  }

  logActivity(db, auth.user.id, "דיווח חריגה", "deviation", id, `${cabinet.cabinet_no}: ${description}`.slice(0, 80), "", "open");
  notify(db, "deviation_new", `נפתחה חריגה חדשה בארון ${cabinet.cabinet_no}`, "deviation", id);

  const transitions = cable_id ? recalcCable(db, Number(cable_id)) : recalcCabinet(db, cabinet.id);
  notifyTransitions(db, transitions);

  return jsonOk(db.prepare("SELECT * FROM deviations WHERE id = ?").get(id), 201);
}
