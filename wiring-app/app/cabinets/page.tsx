"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Card, ProgressBar, Spinner, StatusBadge } from "@/components/ui";
import { api, formatDateTime } from "@/lib/client";
import { STATUS_LABELS, type Cabinet, type EntityStatus } from "@/lib/types";

const FILTERS: { key: EntityStatus | "all"; label: string }[] = [
  { key: "all", label: "הכל" },
  { key: "done", label: STATUS_LABELS.done },
  { key: "in_progress", label: STATUS_LABELS.in_progress },
  { key: "pending_check", label: STATUS_LABELS.pending_check },
  { key: "issue", label: STATUS_LABELS.issue },
  { key: "not_started", label: STATUS_LABELS.not_started },
];

export default function CabinetsPage() {
  const [cabinets, setCabinets] = useState<Cabinet[] | null>(null);
  const [filter, setFilter] = useState<EntityStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"cards" | "table">("cards");

  useEffect(() => {
    api<Cabinet[]>("/api/cabinets").then(setCabinets).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!cabinets) return [];
    return cabinets.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (search.trim() && !`${c.cabinet_no} ${c.name} ${c.location}`.includes(search.trim())) return false;
      return true;
    });
  }, [cabinets, filter, search]);

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold">🗄️ ארונות</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש ארון…"
            className="w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={() => setView(view === "cards" ? "table" : "cards")}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
          >
            {view === "cards" ? "📋 תצוגת טבלה" : "🃏 תצוגת כרטיסים"}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filter === f.key ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!cabinets ? (
        <Spinner label="טוען ארונות…" />
      ) : view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => (
            <Link key={c.id} href={`/cabinets/${c.id}`}>
              <Card className="h-full transition hover:border-blue-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="ltr text-lg font-extrabold">{c.cabinet_no}</div>
                    <div className="text-sm text-slate-500">{c.name}</div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>
                      כבלים: {c.completed_cables}/{c.total_cables}
                    </span>
                    <span className="font-bold text-slate-700">{c.progress}%</span>
                  </div>
                  <ProgressBar percent={c.progress} />
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <div>👷 {c.assignee_name ?? "לא שויך עובד"}</div>
                  {(c.open_deviations ?? 0) > 0 && (
                    <div className="font-bold text-red-600">⚠️ {c.open_deviations} חריגות פתוחות</div>
                  )}
                  <div>🕓 עודכן {formatDateTime(c.updated_at)}</div>
                </div>
              </Card>
            </Link>
          ))}
          {filtered.length === 0 && <p className="col-span-full py-8 text-center text-slate-400">אין ארונות תואמים</p>}
        </div>
      ) : (
        <Card className="p-0">
          <div className="table-scroll">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-right text-xs text-slate-500">
                  <th className="px-3 py-2.5">ארון</th>
                  <th className="px-3 py-2.5">שם</th>
                  <th className="px-3 py-2.5">סטטוס</th>
                  <th className="px-3 py-2.5">כבלים</th>
                  <th className="px-3 py-2.5">התקדמות</th>
                  <th className="px-3 py-2.5">עובד אחראי</th>
                  <th className="px-3 py-2.5">חריגות</th>
                  <th className="px-3 py-2.5">עודכן</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-blue-50/40">
                    <td className="px-3 py-2.5">
                      <Link href={`/cabinets/${c.id}`} className="ltr font-bold text-blue-700 hover:underline">
                        {c.cabinet_no}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">{c.name}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={c.status} /></td>
                    <td className="px-3 py-2.5">{c.completed_cables}/{c.total_cables}</td>
                    <td className="px-3 py-2.5 w-40"><ProgressBar percent={c.progress} /></td>
                    <td className="px-3 py-2.5">{c.assignee_name ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      {(c.open_deviations ?? 0) > 0 ? <span className="font-bold text-red-600">{c.open_deviations}</span> : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{formatDateTime(c.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppShell>
  );
}
