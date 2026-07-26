import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/** ייצוא פתקי חיווט ל־CSV (עם BOM לתמיכה בעברית ב־Excel). */
export async function GET(req: NextRequest) {
  const db = getDb();
  const sp = req.nextUrl.searchParams;
  const cabinetId = sp.get("cabinetId");
  const cableId = sp.get("cableId");

  let sql = `
    SELECT cab.cabinet_no, c.cable_no, w.wire_no, w.source_cabinet, w.source_terminal,
           w.dest_cabinet, w.dest_terminal, c.cable_type, w.description
    FROM wires w
    JOIN cables c ON c.id = w.cable_id
    JOIN cabinets cab ON cab.id = c.cabinet_id
    WHERE 1=1`;
  const params: number[] = [];
  if (cabinetId) { sql += " AND cab.id = ?"; params.push(Number(cabinetId)); }
  if (cableId) { sql += " AND c.id = ?"; params.push(Number(cableId)); }
  sql += " ORDER BY cab.cabinet_no, c.cable_no, CAST(w.wire_no AS INTEGER)";

  const rows = db.prepare(sql).all(...params) as Record<string, string>[];

  const header = ["ארון", "כבל", "גיד", "ארון מקור", "מהדק מקור", "ארון יעד", "מהדק יעד", "סוג כבל", "תיאור"];
  const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    header.map(esc).join(","),
    ...rows.map((r) =>
      [r.cabinet_no, r.cable_no, r.wire_no, r.source_cabinet, r.source_terminal, r.dest_cabinet, r.dest_terminal, r.cable_type, r.description].map(esc).join(",")
    ),
  ];
  const csv = "﻿" + lines.join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wiring_labels.csv"`,
    },
  });
}
