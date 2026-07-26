import { getDb } from "@/lib/db";
import { jsonOk } from "@/lib/api-helpers";

export async function GET() {
  const db = getDb();
  // הפרויקט הפעיל — האחרון שנוצר (למשל אחרי ייבוא סט חדש)
  const project = db.prepare("SELECT * FROM projects ORDER BY id DESC LIMIT 1").get();

  const cabinets = db.prepare("SELECT status, COUNT(*) AS n FROM cabinets GROUP BY status").all() as { status: string; n: number }[];
  const byStatus = Object.fromEntries(cabinets.map((c) => [c.status, c.n]));

  const cables = db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) AS done FROM cables").get() as { total: number; done: number };
  const wires = db.prepare("SELECT COUNT(*) AS total, SUM(completed) AS done FROM wires").get() as { total: number; done: number };
  const openDeviations = (db.prepare("SELECT COUNT(*) AS n FROM deviations WHERE status IN ('open','in_review')").get() as { n: number }).n;
  const pendingCheck = (db.prepare("SELECT COUNT(*) AS n FROM cables WHERE status = 'pending_check'").get() as { n: number }).n;

  const staleCabinets = db.prepare(
    `SELECT id, cabinet_no, name, status, updated_at FROM cabinets
     WHERE status NOT IN ('done') AND updated_at < datetime('now', '-3 days')
     ORDER BY updated_at ASC LIMIT 5`
  ).all();

  const recentActivity = db.prepare(
    `SELECT a.*, u.name AS user_name FROM activity_log a JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC, a.id DESC LIMIT 8`
  ).all();

  return jsonOk({
    project,
    cabinetsByStatus: byStatus,
    totalCabinets: Object.values(byStatus).reduce((s: number, n) => s + (n as number), 0),
    cables,
    wires: { total: wires.total, done: wires.done ?? 0, open: wires.total - (wires.done ?? 0) },
    openDeviations,
    pendingCheck,
    staleCabinets,
    recentActivity,
  });
}
