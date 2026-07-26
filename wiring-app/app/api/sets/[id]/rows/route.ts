import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk, requireUser } from "@/lib/api-helpers";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDb();
  const set = db.prepare(
    `SELECT s.*, p.name AS project_name FROM wiring_sets s JOIN projects p ON p.id = s.project_id WHERE s.id = ?`
  ).get(Number(id));
  if (!set) return jsonError("סט חיווט לא נמצא", 404);
  const rows = db.prepare("SELECT * FROM extracted_rows WHERE set_id = ? ORDER BY cabinet_no, cable_no, CAST(wire_no AS INTEGER)").all(Number(id));
  return jsonOk({ set, rows });
}

/** עדכון שורה בודדת (עריכה במסך הבדיקה) או אישור שורות. */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const db = getDb();
  const body = await req.json();

  if (body.action === "update_row") {
    const r = body.row;
    if (!r?.id) return jsonError("שורה חסרה");
    const valid = !!(r.cabinet_no && r.cable_no && r.wire_no && r.source_terminal && r.dest_terminal);
    db.prepare(
      `UPDATE extracted_rows SET cabinet_no=?, cable_no=?, wire_no=?, cable_type=?, source_cabinet=?, source_terminal=?, dest_cabinet=?, dest_terminal=?, description=?, valid=?, error_msg=? WHERE id=? AND set_id=?`
    ).run(
      r.cabinet_no ?? "", r.cable_no ?? "", r.wire_no ?? "", r.cable_type ?? "",
      r.source_cabinet ?? "", r.source_terminal ?? "", r.dest_cabinet ?? "", r.dest_terminal ?? "",
      r.description ?? "", valid ? 1 : 0, valid ? "" : "שדות חובה חסרים (ארון, כבל, גיד, מהדקים)",
      r.id, Number(id)
    );
    return jsonOk(db.prepare("SELECT * FROM extracted_rows WHERE id = ?").get(r.id));
  }

  if (body.action === "approve_row") {
    const row = db.prepare("SELECT * FROM extracted_rows WHERE id = ? AND set_id = ?").get(body.rowId, Number(id)) as { valid: number } | undefined;
    if (!row) return jsonError("שורה לא נמצאה", 404);
    if (!row.valid) return jsonError("לא ניתן לאשר שורה לא תקינה — תקנו אותה קודם");
    db.prepare("UPDATE extracted_rows SET approved = 1 WHERE id = ?").run(body.rowId);
    return jsonOk({ ok: true });
  }

  if (body.action === "approve_all_valid") {
    const res = db.prepare("UPDATE extracted_rows SET approved = 1 WHERE set_id = ? AND valid = 1").run(Number(id));
    return jsonOk({ approved: res.changes });
  }

  if (body.action === "delete_row") {
    db.prepare("DELETE FROM extracted_rows WHERE id = ? AND set_id = ?").run(body.rowId, Number(id));
    return jsonOk({ ok: true });
  }

  return jsonError("פעולה לא מוכרת");
}
