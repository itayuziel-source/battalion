"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Card, Modal, PrimaryButton, SecondaryButton, Spinner, showToast } from "@/components/ui";
import { api, formatDateTime, getStoredUser } from "@/lib/client";
import { canResolveDeviation } from "@/lib/permissions";
import { DEVIATION_LABELS, type Deviation, type DeviationStatus } from "@/lib/types";

const STATUS_STYLES: Record<DeviationStatus, string> = {
  open: "bg-red-100 text-red-700 border-red-300",
  in_review: "bg-orange-100 text-orange-700 border-orange-300",
  approved: "bg-green-100 text-green-700 border-green-300",
  rejected: "bg-gray-100 text-gray-600 border-gray-300",
};

export default function DeviationsPage() {
  const [deviations, setDeviations] = useState<Deviation[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<DeviationStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [respondTo, setRespondTo] = useState<Deviation | null>(null);
  const user = getStoredUser();

  const load = useCallback(() => {
    api<Deviation[]>("/api/deviations").then(setDeviations).catch(() => {});
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    if (!deviations) return [];
    return deviations.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim();
        return [d.cabinet_no, d.cable_no, d.description, d.reported_by_name].some((v) => String(v ?? "").includes(q));
      }
      return true;
    });
  }, [deviations, statusFilter, search]);

  const openCount = deviations?.filter((d) => d.status === "open" || d.status === "in_review").length ?? 0;

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold">
          ⚠️ שינויים וחריגות
          {openCount > 0 && <span className="mr-2 rounded-full bg-red-600 px-2.5 py-0.5 text-sm text-white">{openCount} פתוחות</span>}
        </h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי ארון, כבל, עובד…"
          className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["all", "open", "in_review", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              statusFilter === s ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s === "all" ? "הכל" : DEVIATION_LABELS[s]}
          </button>
        ))}
      </div>

      {!deviations ? (
        <Spinner label="טוען חריגות…" />
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <Card key={d.id} className={d.status === "open" ? "border-red-300 ring-1 ring-red-200" : ""}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLES[d.status]}`}>
                      {DEVIATION_LABELS[d.status]}
                    </span>
                    <Link href={`/cabinets/${d.cabinet_id}`} className="font-bold text-blue-700 hover:underline">
                      ארון {d.cabinet_no}
                    </Link>
                    {d.cable_no && (
                      <Link href={`/cables/${d.cable_id}`} className="text-sm text-blue-600 hover:underline">
                        כבל {d.cable_no}{d.wire_no ? ` · גיד ${d.wire_no}` : ""}
                      </Link>
                    )}
                  </div>
                  <p className="mt-2 font-medium">{d.description}</p>
                  {d.reason && <p className="mt-0.5 text-sm text-slate-500">סיבה: {d.reason}</p>}
                  {d.image_name && <p className="mt-0.5 text-xs text-slate-400">📷 תמונה מצורפת: {d.image_name} (הדגמה)</p>}
                  <p className="mt-1.5 text-xs text-slate-400">
                    דווח ע״י {d.reported_by_name} · {formatDateTime(d.reported_at)}
                  </p>
                  {d.manager_response && (
                    <div className="mt-2 rounded-lg bg-slate-50 p-2.5 text-sm">
                      <span className="font-bold">תגובת מנהל:</span> {d.manager_response}
                      {d.approved_by_name && (
                        <div className="mt-0.5 text-xs text-slate-400">
                          {d.status === "approved" ? "אושר" : "טופל"} ע״י {d.approved_by_name} · {formatDateTime(d.approved_at)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {user && canResolveDeviation(user.role) && (d.status === "open" || d.status === "in_review") && (
                  <PrimaryButton onClick={() => setRespondTo(d)}>💬 תגובה ואישור</PrimaryButton>
                )}
              </div>
            </Card>
          ))}
          {filtered.length === 0 && <p className="py-8 text-center text-slate-400">אין חריגות תואמות</p>}
        </div>
      )}

      <RespondModal deviation={respondTo} onClose={() => setRespondTo(null)} onSaved={load} />
    </AppShell>
  );
}

function RespondModal({ deviation, onClose, onSaved }: { deviation: Deviation | null; onClose: () => void; onSaved: () => void }) {
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => setResponse(deviation?.manager_response ?? ""), [deviation]);

  async function submit(status: DeviationStatus) {
    if (!deviation) return;
    setSaving(true);
    try {
      await api(`/api/deviations/${deviation.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "respond", status, manager_response: response }),
      });
      showToast(status === "approved" ? "החריגה אושרה" : status === "rejected" ? "החריגה נדחתה" : "החריגה הועברה לבדיקה");
      onSaved();
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!deviation} onClose={onClose} title="תגובת מנהל לחריגה">
      <p className="mb-3 rounded-lg bg-slate-50 p-3 text-sm">{deviation?.description}</p>
      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="תגובה / הנחיות…"
      />
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <SecondaryButton onClick={onClose} disabled={saving}>ביטול</SecondaryButton>
        <SecondaryButton onClick={() => submit("in_review")} disabled={saving}>העברה לבדיקה</SecondaryButton>
        <button
          onClick={() => submit("rejected")}
          disabled={saving}
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          דחייה
        </button>
        <button
          onClick={() => submit("approved")}
          disabled={saving}
          className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          אישור החריגה
        </button>
      </div>
    </Modal>
  );
}
