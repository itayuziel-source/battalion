"use client";

import { useCallback, useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Card, Modal, PrimaryButton, ProgressBar, SecondaryButton, Spinner, StatusBadge, showToast } from "@/components/ui";
import { api, formatDateTime, getStoredUser } from "@/lib/client";
import { STATUS_LABELS, type ActivityEntry, type Cable, type Cabinet, type Deviation, type EntityStatus } from "@/lib/types";

interface CabinetData {
  cabinet: Cabinet;
  cables: Cable[];
  workers: { id: number; name: string }[];
  activity: ActivityEntry[];
  deviations: Deviation[];
}

const CABLE_FILTERS: { key: EntityStatus | "all"; label: string }[] = [
  { key: "all", label: "הכל" },
  { key: "done", label: "גמור" },
  { key: "in_progress", label: "בביצוע" },
  { key: "not_started", label: "פתוח" },
  { key: "issue", label: "חריגה" },
  { key: "pending_check", label: "ממתין לבדיקה" },
];

export default function CabinetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<CabinetData | null>(null);
  const [filter, setFilter] = useState<EntityStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [qrOpen, setQrOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [deviationOpen, setDeviationOpen] = useState(false);

  const load = useCallback(() => {
    api<CabinetData>(`/api/cabinets/${id}`).then(setData).catch((e) => showToast(e.message, "error"));
  }, [id]);

  useEffect(load, [load]);

  const filteredCables = useMemo(() => {
    if (!data) return [];
    return data.cables.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (search.trim() && !`${c.cable_no} ${c.description} ${c.dest_cabinet}`.includes(search.trim())) return false;
      return true;
    });
  }, [data, filter, search]);

  if (!data) {
    return (
      <AppShell>
        <Spinner label="טוען ארון…" />
      </AppShell>
    );
  }

  const { cabinet } = data;

  return (
    <AppShell>
      {/* פרטי הארון */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="ltr text-2xl font-extrabold">{cabinet.cabinet_no}</h1>
              <StatusBadge status={cabinet.status} />
            </div>
            <p className="mt-0.5 text-slate-600">{cabinet.name}</p>
            <p className="text-sm text-slate-500">📍 {cabinet.location || "מיקום לא הוגדר"} · 👷 {cabinet.assignee_name ?? "לא שויך"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => setQrOpen(true)}>🔳 קוד QR</SecondaryButton>
            <SecondaryButton onClick={() => setNotesOpen(true)}>📝 הערות</SecondaryButton>
            <PrimaryButton onClick={() => setDeviationOpen(true)}>⚠️ דיווח חריגה</PrimaryButton>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-sm">
            <span>
              כבלים שהושלמו: <b>{cabinet.completed_cables}/{cabinet.total_cables}</b>
            </span>
            <span className="font-bold text-blue-700">{cabinet.progress}%</span>
          </div>
          <ProgressBar percent={cabinet.progress} />
        </div>
        {cabinet.notes && (
          <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-sm text-amber-800">📝 {cabinet.notes}</p>
        )}
        {(cabinet.open_deviations ?? 0) > 0 && (
          <Link href="/deviations" className="mt-2 block rounded-lg bg-red-50 p-2.5 text-sm font-bold text-red-700 hover:bg-red-100">
            ⚠️ {cabinet.open_deviations} חריגות פתוחות בארון — לחצו לצפייה
          </Link>
        )}
      </Card>

      {/* רשימת כבלים */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="ml-2 font-bold">🔌 כבלים ({data.cables.length})</h2>
        {CABLE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === f.key ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש כבל…"
          className="mr-auto w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filteredCables.map((c) => (
          <Link key={c.id} href={`/cables/${c.id}`}>
            <Card className="transition hover:border-blue-300 hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-extrabold">{c.cable_no}</span>
                  <span className="mr-2 text-xs text-slate-500">{c.cable_type}</span>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-1 text-sm text-slate-600">
                <span className="ltr">{c.source_cabinet} → {c.dest_cabinet}</span> · {c.description}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <ProgressBar percent={c.wire_count ? Math.round(((c.completed_wires ?? 0) / c.wire_count) * 100) : 0} className="flex-1" />
                <span className="text-xs font-bold text-slate-600">
                  {c.completed_wires ?? 0}/{c.wire_count} גידים
                </span>
              </div>
              {c.status === "done" && c.checked_by_name && (
                <p className="mt-1.5 text-xs text-green-700">✔️ נבדק ע״י {c.checked_by_name} · {formatDateTime(c.checked_at)}</p>
              )}
              {c.notes && <p className="mt-1.5 text-xs text-amber-700">📝 {c.notes}</p>}
            </Card>
          </Link>
        ))}
        {filteredCables.length === 0 && <p className="col-span-full py-6 text-center text-slate-400">אין כבלים תואמים</p>}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {/* עובדים */}
        <Card>
          <h3 className="mb-2 font-bold">👷 עובדים שביצעו עבודה בארון</h3>
          {data.workers.length === 0 ? (
            <p className="text-sm text-slate-400">טרם בוצעה עבודה</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.workers.map((w) => (
                <span key={w.id} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                  {w.name}
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* היסטוריה */}
        <Card>
          <h3 className="mb-2 font-bold">🕓 היסטוריית פעולות</h3>
          <div className="max-h-72 overflow-y-auto">
            {data.activity.length === 0 ? (
              <p className="text-sm text-slate-400">אין פעולות</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {data.activity.map((a) => (
                  <li key={a.id} className="py-2">
                    <span className="font-bold">{a.user_name}</span> — {a.action}
                    {a.entity_label && <span className="text-slate-500"> ({a.entity_label})</span>}
                    {a.old_value && a.new_value && (
                      <span className="text-xs text-slate-400"> [{a.old_value} ← {a.new_value}]</span>
                    )}
                    <div className="text-xs text-slate-400">{formatDateTime(a.created_at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <QrModal open={qrOpen} onClose={() => setQrOpen(false)} cabinet={cabinet} />
      <NotesModal open={notesOpen} onClose={() => setNotesOpen(false)} cabinet={cabinet} onSaved={load} />
      <DeviationModal open={deviationOpen} onClose={() => setDeviationOpen(false)} cabinet={cabinet} cables={data.cables} onSaved={load} />
    </AppShell>
  );
}

function QrModal({ open, onClose, cabinet }: { open: boolean; onClose: () => void; cabinet: Cabinet }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (open && typeof window !== "undefined") {
      setUrl(`${window.location.origin}/cabinets/${cabinet.id}`);
    }
  }, [open, cabinet.id]);

  function printQr() {
    window.print();
  }

  return (
    <Modal open={open} onClose={onClose} title={`קוד QR — ארון ${cabinet.cabinet_no}`}>
      <div className="text-center">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/qr?text=${encodeURIComponent(url)}`}
            alt={`QR לארון ${cabinet.cabinet_no}`}
            className="mx-auto h-56 w-56"
          />
        )}
        <p className="mt-2 break-all text-xs text-slate-500">{url}</p>
        <p className="mt-2 text-sm text-slate-600">
          סריקת הקוד תפתח את מסך הארון. הדביקו את הפתק על דלת הארון.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <SecondaryButton onClick={onClose}>סגירה</SecondaryButton>
          <PrimaryButton onClick={printQr}>🖨️ הדפסה</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

function NotesModal({ open, onClose, cabinet, onSaved }: { open: boolean; onClose: () => void; cabinet: Cabinet; onSaved: () => void }) {
  const [notes, setNotes] = useState(cabinet.notes);
  useEffect(() => setNotes(cabinet.notes), [cabinet.notes]);

  async function save() {
    try {
      await api(`/api/cabinets/${cabinet.id}`, { method: "PATCH", body: JSON.stringify({ notes }) });
      showToast("ההערות נשמרו");
      onSaved();
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`הערות — ארון ${cabinet.cabinet_no}`}>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={4}
        className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="הערות כלליות על הארון…"
      />
      <div className="mt-3 flex justify-end gap-2">
        <SecondaryButton onClick={onClose}>ביטול</SecondaryButton>
        <PrimaryButton onClick={save}>שמירה</PrimaryButton>
      </div>
    </Modal>
  );
}

function DeviationModal({
  open,
  onClose,
  cabinet,
  cables,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  cabinet: Cabinet;
  cables: Cable[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ cable_id: 0, description: "", reason: "", image_name: "" });
  const user = getStoredUser();

  async function submit() {
    try {
      await api("/api/deviations", {
        method: "POST",
        body: JSON.stringify({ cabinet_id: cabinet.id, cable_id: form.cable_id || null, description: form.description, reason: form.reason, image_name: form.image_name }),
      });
      showToast("החריגה דווחה ונשלחה לטיפול המנהל");
      onSaved();
      onClose();
      setForm({ cable_id: 0, description: "", reason: "", image_name: "" });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה", "error");
    }
  }

  const field = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <Modal open={open} onClose={onClose} title={`דיווח שינוי / חריגה — ארון ${cabinet.cabinet_no}`}>
      <div className="space-y-3">
        <label className="block text-sm text-slate-500">
          כבל (אופציונלי)
          <select className={field} value={form.cable_id} onChange={(e) => setForm({ ...form, cable_id: Number(e.target.value) })}>
            <option value={0}>— כללי לארון —</option>
            {cables.map((c) => (
              <option key={c.id} value={c.id}>{c.cable_no} ({STATUS_LABELS[c.status]})</option>
            ))}
          </select>
        </label>
        <textarea
          className={field}
          rows={3}
          placeholder="תיאור השינוי ביחס לתוכנית *"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <textarea
          className={field}
          rows={2}
          placeholder="סיבת השינוי"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
        <label className="block text-sm text-slate-500">
          צירוף תמונה (הדגמה — נשמר שם הקובץ בלבד)
          <input
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-sm"
            onChange={(e) => setForm({ ...form, image_name: e.target.files?.[0]?.name ?? "" })}
          />
        </label>
        <p className="text-xs text-slate-400">הדיווח יירשם על שם {user?.name ?? "המשתמש המחובר"} עם תאריך ושעה.</p>
        <div className="flex justify-end gap-2 pt-1">
          <SecondaryButton onClick={onClose}>ביטול</SecondaryButton>
          <PrimaryButton onClick={submit} disabled={!form.description.trim()}>שליחת דיווח</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
