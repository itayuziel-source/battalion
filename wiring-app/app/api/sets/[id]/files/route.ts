import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk, requireUser } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const db = getDb();
  const set = db.prepare("SELECT * FROM wiring_sets WHERE id = ?").get(Number(id)) as { id: number; name: string } | undefined;
  if (!set) return jsonError("סט חיווט לא נמצא", 404);

  const body = await req.json();
  const files: { name: string; size: number }[] = body?.files ?? [];
  if (!files.length) return jsonError("לא נבחרו קבצים");

  const insertFile = db.prepare("INSERT INTO set_files (set_id, file_name, file_size) VALUES (?, ?, ?)");
  for (const f of files) insertFile.run(set.id, String(f.name), Number(f.size) || 0);
  db.prepare("UPDATE wiring_sets SET mapping_status = 'uploaded' WHERE id = ? AND mapping_status = 'new'").run(set.id);
  logActivity(db, auth.user.id, "העלאת קובצי PDF", "set", set.id, set.name, "", files.map((f) => f.name).join(", "));
  return jsonOk({ ok: true });
}
