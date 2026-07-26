import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk, requireUser } from "@/lib/api-helpers";
import { logActivity, notify, notifyTransitions } from "@/lib/activity";
import { canResolveDeviation } from "@/lib/permissions";
import { recalcCabinet, recalcCable } from "@/lib/recalc";
import { DEVIATION_LABELS, type DeviationStatus } from "@/lib/types";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const db = getDb();
  const deviation = db.prepare("SELECT * FROM deviations WHERE id = ?").get(Number(id)) as
    | { id: number; status: DeviationStatus; cabinet_id: number; cable_id: number | null; description: string }
    | undefined;
  if (!deviation) return jsonError("חריגה לא נמצאה", 404);

  const body = await req.json();
  const action = body.action as string;

  if (action === "respond") {
    if (!canResolveDeviation(auth.user.role)) return jsonError("רק מנהל יכול להגיב ולאשר חריגות", 403);
    const newStatus = body.status as DeviationStatus;
    if (!["in_review", "approved", "rejected"].includes(newStatus)) return jsonError("סטטוס לא תקין");
    db.prepare(
      `UPDATE deviations SET status = ?, manager_response = ?,
         approved_by = CASE WHEN ? IN ('approved','rejected') THEN ? ELSE approved_by END,
         approved_at = CASE WHEN ? IN ('approved','rejected') THEN datetime('now') ELSE approved_at END
       WHERE id = ?`
    ).run(newStatus, String(body.manager_response ?? ""), newStatus, auth.user.id, newStatus, deviation.id);

    logActivity(db, auth.user.id, "טיפול בחריגה", "deviation", deviation.id, deviation.description.slice(0, 80), DEVIATION_LABELS[deviation.status], DEVIATION_LABELS[newStatus]);
    if (newStatus === "approved") {
      notify(db, "deviation_approved", `חריגה אושרה על ידי ${auth.user.name}`, "deviation", deviation.id);
    }

    const transitions = deviation.cable_id
      ? recalcCable(db, deviation.cable_id)
      : recalcCabinet(db, deviation.cabinet_id);
    notifyTransitions(db, transitions);
    return jsonOk(db.prepare("SELECT * FROM deviations WHERE id = ?").get(deviation.id));
  }

  return jsonError("פעולה לא מוכרת");
}
