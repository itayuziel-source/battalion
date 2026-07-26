import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { jsonOk } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return jsonOk({ cabinets: [], cables: [], wires: [] });
  const db = getDb();
  const like = `%${q}%`;

  const cabinets = db.prepare(
    "SELECT id, cabinet_no, name, status FROM cabinets WHERE cabinet_no LIKE ? OR name LIKE ? LIMIT 10"
  ).all(like, like);

  const cables = db.prepare(
    `SELECT c.id, c.cable_no, c.status, cab.cabinet_no FROM cables c
     JOIN cabinets cab ON cab.id = c.cabinet_id
     WHERE c.cable_no LIKE ? OR c.description LIKE ? LIMIT 10`
  ).all(like, like);

  const wires = db.prepare(
    `SELECT w.id, w.wire_no, w.cable_id, c.cable_no, w.source_terminal, w.dest_terminal FROM wires w
     JOIN cables c ON c.id = w.cable_id
     WHERE w.source_terminal LIKE ? OR w.dest_terminal LIKE ? OR (c.cable_no || '/' || w.wire_no) LIKE ? LIMIT 10`
  ).all(like, like, like);

  return jsonOk({ cabinets, cables, wires });
}
