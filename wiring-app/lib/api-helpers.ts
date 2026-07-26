import { NextRequest, NextResponse } from "next/server";
import { getDb } from "./db";
import type { User } from "./types";

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** שליפת המשתמש הנוכחי מה־header שנשלח מהלקוח (התחברות הדגמה). */
export function getCurrentUser(req: NextRequest): User | null {
  const idHeader = req.headers.get("x-user-id");
  if (!idHeader) return null;
  const id = Number(idHeader);
  if (!Number.isInteger(id)) return null;
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
  return user ?? null;
}

export function requireUser(req: NextRequest): { user: User } | { error: NextResponse } {
  const user = getCurrentUser(req);
  if (!user) {
    return { error: jsonError("נדרשת התחברות — בחרו משתמש במסך הכניסה", 401) };
  }
  return { user };
}
