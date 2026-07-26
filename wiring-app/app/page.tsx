"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Card, ProgressBar, Spinner, StatusBadge } from "@/components/ui";
import { api, formatDateTime } from "@/lib/client";
import type { ActivityEntry, EntityStatus, Project } from "@/lib/types";

interface DashboardData {
  project: Project | null;
  cabinetsByStatus: Record<string, number>;
  totalCabinets: number;
  cables: { total: number; done: number };
  wires: { total: number; done: number; open: number };
  openDeviations: number;
  pendingCheck: number;
  staleCabinets: { id: number; cabinet_no: string; name: string; status: EntityStatus; updated_at: string }[];
  recentActivity: ActivityEntry[];
}

function Stat({ label, value, tone = "default", href }: { label: string; value: number | string; tone?: "default" | "green" | "orange" | "red" | "blue"; href?: string }) {
  const tones = {
    default: "text-slate-800",
    green: "text-green-600",
    orange: "text-orange-600",
    red: "text-red-600",
    blue: "text-blue-600",
  };
  const content = (
    <Card className="text-center transition hover:shadow-md">
      <div className={`text-3xl font-extrabold ${tones[tone]}`}>{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api<DashboardData>("/api/dashboard").then(setData).catch(() => {});
  }, []);

  return (
    <AppShell>
      {!data ? (
        <Spinner label="טוען נתונים…" />
      ) : (
        <div className="space-y-5">
          {/* כותרת פרויקט */}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-extrabold">{data.project?.name ?? "—"}</h1>
                <p className="text-sm text-slate-500">
                  {data.project?.station_name} · מס׳ עבודה {data.project?.work_number} · אחראי: {data.project?.manager_name}
                </p>
              </div>
              <Link
                href="/projects"
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                ⬆️ העלאת סט חיווט
              </Link>
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium">התקדמות כללית</span>
                <span className="font-bold text-blue-700">{data.project?.progress ?? 0}%</span>
              </div>
              <ProgressBar percent={data.project?.progress ?? 0} />
            </div>
          </Card>

          {/* סטטיסטיקות */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="ארונות שהושלמו" value={`${data.cabinetsByStatus.done ?? 0}/${data.totalCabinets}`} tone="green" href="/cabinets" />
            <Stat label="ארונות בביצוע" value={data.cabinetsByStatus.in_progress ?? 0} tone="orange" href="/cabinets" />
            <Stat label="כבלים שהושלמו" value={`${data.cables.done ?? 0}/${data.cables.total}`} tone="green" />
            <Stat label="גידים פתוחים" value={data.wires.open} tone="blue" />
            <Stat label="חריגות פתוחות" value={data.openDeviations} tone={data.openDeviations > 0 ? "red" : "default"} href="/deviations" />
            <Stat label="ממתינים לבדיקה" value={data.pendingCheck} tone="blue" href="/admin" />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* ארונות לא מעודכנים */}
            <Card>
              <h2 className="mb-3 font-bold">🕓 ארונות שלא עודכנו לאחרונה</h2>
              {data.staleCabinets.length === 0 ? (
                <p className="text-sm text-slate-400">כל הארונות מעודכנים 👍</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.staleCabinets.map((c) => (
                    <li key={c.id}>
                      <Link href={`/cabinets/${c.id}`} className="flex items-center justify-between py-2.5 hover:bg-slate-50">
                        <span>
                          <span className="font-bold">{c.cabinet_no}</span>
                          <span className="mr-2 text-sm text-slate-500">{c.name}</span>
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

            {/* פעילות אחרונה */}
            <Card>
              <h2 className="mb-3 font-bold">🛠️ עדכוני ביצוע אחרונים</h2>
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-slate-400">אין פעילות עדיין</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recentActivity.map((a) => (
                    <li key={a.id} className="py-2.5 text-sm">
                      <span className="font-bold">{a.user_name}</span> — {a.action}
                      {a.entity_label && <span className="text-slate-500"> ({a.entity_label})</span>}
                      <div className="text-xs text-slate-400">{formatDateTime(a.created_at)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
