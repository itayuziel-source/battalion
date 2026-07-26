"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Card, ProgressBar, Spinner, StatusBadge } from "@/components/ui";
import { api, formatDateTime } from "@/lib/client";
import { DEVIATION_LABELS, ROLE_LABELS, type ActivityEntry, type DeviationStatus, type EntityStatus, type Role } from "@/lib/types";

interface AdminData {
  cabinets: { id: number; cabinet_no: string; name: string; status: EntityStatus; progress: number; total_cables: number; completed_cables: number; updated_at: string; assignee_name: string | null }[];
  byWorker: { id: number; name: string; role: Role; wires_done: number; last_activity: string | null }[];
  staleCabinets: { id: number; cabinet_no: string; name: string; status: EntityStatus; updated_at: string }[];
  openDeviations: { id: number; description: string; status: DeviationStatus; cabinet_no: string; cable_no: string | null; reported_by_name: string; reported_at: string }[];
  pendingCheck: { id: number; cable_no: string; wire_count: number; cabinet_no: string; completed_by_name: string | null; completed_at: string | null }[];
  recentActivity: ActivityEntry[];
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);

  useEffect(() => {
    api<AdminData>("/api/admin").then(setData).catch(() => {});
  }, []);

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-extrabold">📈 מסך ניהול</h1>
      {!data ? (
        <Spinner label="טוען…" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* התקדמות לפי ארון */}
          <Card>
            <h2 className="mb-3 font-bold">🗄️ התקדמות לפי ארון</h2>
            <div className="space-y-3">
              {data.cabinets.map((c) => (
                <Link key={c.id} href={`/cabinets/${c.id}`} className="block rounded-lg p-1.5 hover:bg-slate-50">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>
                      <b>{c.cabinet_no}</b> <span className="text-slate-500">{c.name}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={c.status} />
                      <b>{c.progress}%</b>
                    </span>
                  </div>
                  <ProgressBar percent={c.progress} />
                  <div className="mt-0.5 text-xs text-slate-400">
                    {c.completed_cables}/{c.total_cables} כבלים · {c.assignee_name ?? "לא שויך"}
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* התקדמות לפי עובד */}
          <Card>
            <h2 className="mb-3 font-bold">👷 התקדמות לפי עובד</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-right text-xs text-slate-500">
                  <th className="py-2">עובד</th>
                  <th className="py-2">תפקיד</th>
                  <th className="py-2">גידים שחווטו</th>
                  <th className="py-2">פעילות אחרונה</th>
                </tr>
              </thead>
              <tbody>
                {data.byWorker.map((w) => (
                  <tr key={w.id} className="border-b border-slate-100">
                    <td className="py-2 font-medium">{w.name}</td>
                    <td className="py-2 text-slate-500">{ROLE_LABELS[w.role]}</td>
                    <td className="py-2 font-bold text-blue-700">{w.wires_done}</td>
                    <td className="py-2 text-xs text-slate-400">{w.last_activity ? formatDateTime(w.last_activity) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* כבלים ממתינים לבדיקה */}
          <Card>
            <h2 className="mb-3 font-bold">🔍 כבלים שממתינים לבדיקה ({data.pendingCheck.length})</h2>
            {data.pendingCheck.length === 0 ? (
              <p className="text-sm text-slate-400">אין כבלים ממתינים</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {data.pendingCheck.map((c) => (
                  <li key={c.id}>
                    <Link href={`/cables/${c.id}`} className="flex items-center justify-between py-2 hover:bg-slate-50">
                      <span>
                        <b>{c.cable_no}</b> <span className="text-slate-500">(ארון {c.cabinet_no}, {c.wire_count} גידים)</span>
                      </span>
                      <span className="text-xs text-slate-400">
                        הושלם ע״י {c.completed_by_name ?? "—"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* חריגות פתוחות */}
          <Card>
            <h2 className="mb-3 font-bold">⚠️ חריגות פתוחות ({data.openDeviations.length})</h2>
            {data.openDeviations.length === 0 ? (
              <p className="text-sm text-slate-400">אין חריגות פתוחות 👍</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {data.openDeviations.map((d) => (
                  <li key={d.id} className="py-2">
                    <Link href="/deviations" className="block hover:bg-slate-50">
                      <span className="font-bold text-red-700">{DEVIATION_LABELS[d.status]}</span> — ארון {d.cabinet_no}
                      {d.cable_no ? ` · כבל ${d.cable_no}` : ""}
                      <div className="text-slate-600">{d.description}</div>
                      <div className="text-xs text-slate-400">
                        {d.reported_by_name} · {formatDateTime(d.reported_at)}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* ארונות ללא עדכון */}
          <Card>
            <h2 className="mb-3 font-bold">🕓 ארונות ללא עדכון (מעל 3 ימים)</h2>
            {data.staleCabinets.length === 0 ? (
              <p className="text-sm text-slate-400">כל הארונות מעודכנים</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {data.staleCabinets.map((c) => (
                  <li key={c.id}>
                    <Link href={`/cabinets/${c.id}`} className="flex items-center justify-between py-2 hover:bg-slate-50">
                      <span>
                        <b>{c.cabinet_no}</b> <span className="text-slate-500">{c.name}</span>
                      </span>
                      <span className="flex items-center gap-2 text-xs text-slate-400">
                        <StatusBadge status={c.status} />
                        {formatDateTime(c.updated_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* אירועים אחרונים */}
          <Card>
            <h2 className="mb-3 font-bold">📜 אירועים אחרונים</h2>
            <div className="max-h-80 overflow-y-auto">
              <ul className="divide-y divide-slate-100 text-sm">
                {data.recentActivity.map((a) => (
                  <li key={a.id} className="py-2">
                    <b>{a.user_name}</b> — {a.action}
                    {a.entity_label && <span className="text-slate-500"> ({a.entity_label})</span>}
                    <div className="text-xs text-slate-400">{formatDateTime(a.created_at)}</div>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
