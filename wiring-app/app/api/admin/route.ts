import { getDb } from "@/lib/db";
import { jsonOk } from "@/lib/api-helpers";

export async function GET() {
  const db = getDb();

  const cabinets = db.prepare(
    `SELECT c.id, c.cabinet_no, c.name, c.status, c.progress, c.total_cables, c.completed_cables, c.updated_at,
            u.name AS assignee_name
     FROM cabinets c LEFT JOIN users u ON u.id = c.assignee_id ORDER BY c.cabinet_no`
  ).all();

  const byWorker = db.prepare(
    `SELECT u.id, u.name, u.role,
       COUNT(w.id) AS wires_done,
       MAX(w.completed_at) AS last_activity
     FROM users u
     LEFT JOIN wires w ON w.completed_by = u.id AND w.completed = 1
     GROUP BY u.id ORDER BY wires_done DESC`
  ).all();

  const staleCabinets = db.prepare(
    `SELECT id, cabinet_no, name, status, updated_at FROM cabinets
     WHERE status NOT IN ('done') AND updated_at < datetime('now', '-3 days')
     ORDER BY updated_at ASC`
  ).all();

  const openDeviations = db.prepare(
    `SELECT d.*, u.name AS reported_by_name, cab.cabinet_no, c.cable_no
     FROM deviations d
     JOIN users u ON u.id = d.reported_by
     JOIN cabinets cab ON cab.id = d.cabinet_id
     LEFT JOIN cables c ON c.id = d.cable_id
     WHERE d.status IN ('open','in_review') ORDER BY d.reported_at DESC`
  ).all();

  const pendingCheck = db.prepare(
    `SELECT c.id, c.cable_no, c.wire_count, cab.cabinet_no, u.name AS completed_by_name, c.completed_at
     FROM cables c
     JOIN cabinets cab ON cab.id = c.cabinet_id
     LEFT JOIN users u ON u.id = c.completed_by
     WHERE c.status = 'pending_check' ORDER BY c.completed_at ASC`
  ).all();

  const recentActivity = db.prepare(
    `SELECT a.*, u.name AS user_name FROM activity_log a JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC, a.id DESC LIMIT 20`
  ).all();

  return jsonOk({ cabinets, byWorker, staleCabinets, openDeviations, pendingCheck, recentActivity });
}
