"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Card, Modal, PrimaryButton, SecondaryButton, Spinner, showToast } from "@/components/ui";
import { api, formatDate } from "@/lib/client";
import { MAPPING_LABELS, type MappingStatus, type Project, type SetFile } from "@/lib/types";

interface SetWithFiles {
  id: number;
  project_id: number;
  name: string;
  version: string;
  received_date: string;
  mapping_status: MappingStatus;
  approver_name: string | null;
  approved_at: string | null;
  project_name: string;
  files: SetFile[];
  row_count: number;
}

const MAPPING_COLORS: Record<MappingStatus, string> = {
  new: "bg-gray-100 text-gray-600",
  uploaded: "bg-sky-100 text-sky-700",
  extracting: "bg-orange-100 text-orange-700",
  review: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [sets, setSets] = useState<SetWithFiles[] | null>(null);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newSetOpen, setNewSetOpen] = useState(false);
  const [extracting, setExtracting] = useState<number | null>(null);

  const load = useCallback(() => {
    api<Project[]>("/api/projects").then(setProjects).catch(() => {});
    api<SetWithFiles[]>("/api/sets").then(setSets).catch(() => {});
  }, []);

  useEffect(load, [load]);

  async function runExtraction(set: SetWithFiles) {
    setExtracting(set.id);
    try {
      const res = await api<{ rowCount: number; invalidCount: number; engineName: string }>(
        `/api/sets/${set.id}/extract`,
        { method: "POST" }
      );
      showToast(`המיפוי הסתיים: ${res.rowCount} שורות זוהו (${res.invalidCount} דורשות תיקון)`);
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה במיפוי", "error");
    } finally {
      setExtracting(null);
    }
  }

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold">📁 פרויקטים וסטי חיווט</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/import" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            📥 ייבוא מקובץ JSON
          </Link>
          <SecondaryButton onClick={() => setNewProjectOpen(true)}>+ פרויקט חדש</SecondaryButton>
          <PrimaryButton onClick={() => setNewSetOpen(true)}>⬆️ העלאת סט חיווט</PrimaryButton>
        </div>
      </div>

      {!projects || !sets ? (
        <Spinner label="טוען…" />
      ) : (
        <div className="space-y-5">
          {projects.map((p) => (
            <Card key={p.id}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-extrabold">{p.name}</h2>
                  <p className="text-sm text-slate-500">
                    {p.station_name} · מס׳ עבודה {p.work_number} · התחלה {formatDate(p.start_date)} · אחראי {p.manager_name}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">{p.progress}% התקדמות</span>
              </div>

              <h3 className="mb-2 text-sm font-bold text-slate-600">סטי חיווט</h3>
              {sets.filter((s) => s.project_id === p.id).length === 0 && (
                <p className="text-sm text-slate-400">אין סטים עדיין — העלו סט חיווט חדש.</p>
              )}
              <div className="space-y-2">
                {sets
                  .filter((s) => s.project_id === p.id)
                  .map((s) => (
                    <div key={s.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-bold">{s.name}</span>
                          <span className="mr-2 text-xs text-slate-500">גרסה {s.version} · התקבל {formatDate(s.received_date)}</span>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${MAPPING_COLORS[s.mapping_status]}`}>
                          {MAPPING_LABELS[s.mapping_status]}
                        </span>
                      </div>

                      {s.files.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {s.files.map((f) => (
                            <span key={f.id} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              📄 {f.file_name} ({(f.file_size / 1024 / 1024).toFixed(1)}MB)
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {s.mapping_status === "uploaded" || s.mapping_status === "new" ? (
                          <PrimaryButton
                            onClick={() => runExtraction(s)}
                            disabled={extracting === s.id || s.files.length === 0}
                          >
                            {extracting === s.id ? "⏳ מבצע מיפוי…" : "▶️ מיפוי סט החיווט"}
                          </PrimaryButton>
                        ) : null}
                        {s.mapping_status === "review" && (
                          <>
                            <Link
                              href={`/review/${s.id}`}
                              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                              🔎 בדיקת הנתונים ({s.row_count} שורות)
                            </Link>
                            <SecondaryButton onClick={() => runExtraction(s)} disabled={extracting === s.id}>
                              {extracting === s.id ? "⏳ מבצע מיפוי…" : "מיפוי מחדש"}
                            </SecondaryButton>
                          </>
                        )}
                        {s.mapping_status === "approved" && (
                          <span className="text-sm text-green-700">
                            ✔️ אושר על ידי {s.approver_name ?? "—"} בתאריך {formatDate(s.approved_at)}
                          </span>
                        )}
                        {extracting === s.id && (
                          <span className="flex items-center gap-2 text-sm text-orange-600">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-300 border-t-orange-600" />
                            מנוע הדגמה מעבד את הקבצים… (נתונים מדומים)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <NewProjectModal open={newProjectOpen} onClose={() => setNewProjectOpen(false)} onCreated={load} />
      <NewSetModal open={newSetOpen} onClose={() => setNewSetOpen(false)} onCreated={load} projects={projects ?? []} />
    </AppShell>
  );
}

function NewProjectModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", station_name: "", work_number: "", manager_name: "", start_date: "" });
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await api("/api/projects", { method: "POST", body: JSON.stringify(form) });
      showToast("הפרויקט נוצר בהצלחה");
      onCreated();
      onClose();
      setForm({ name: "", station_name: "", work_number: "", manager_name: "", start_date: "" });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה", "error");
    } finally {
      setSaving(false);
    }
  }

  const field = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <Modal open={open} onClose={onClose} title="פרויקט חדש">
      <div className="space-y-3">
        <input className={field} placeholder="שם הפרויקט *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={field} placeholder="שם התחנה *" value={form.station_name} onChange={(e) => setForm({ ...form, station_name: e.target.value })} />
        <input className={field} placeholder="מספר עבודה" value={form.work_number} onChange={(e) => setForm({ ...form, work_number: e.target.value })} />
        <input className={field} placeholder="אחראי" value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} />
        <label className="block text-sm text-slate-500">
          תאריך התחלה
          <input type="date" className={field} value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <SecondaryButton onClick={onClose}>ביטול</SecondaryButton>
          <PrimaryButton onClick={submit} disabled={saving || !form.name || !form.station_name}>
            {saving ? "שומר…" : "יצירת פרויקט"}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

function NewSetModal({
  open,
  onClose,
  onCreated,
  projects,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  projects: Project[];
}) {
  const [form, setForm] = useState({ project_id: 0, name: "", version: "1" });
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && projects.length && !form.project_id) {
      setForm((f) => ({ ...f, project_id: projects[0].id }));
    }
  }, [open, projects, form.project_id]);

  async function submit() {
    setSaving(true);
    try {
      await api("/api/sets", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          files: files.map((f) => ({ name: f.name, size: f.size })),
        }),
      });
      showToast("הסט נוצר והקבצים נשמרו — ניתן להפעיל מיפוי");
      onCreated();
      onClose();
      setForm({ project_id: projects[0]?.id ?? 0, name: "", version: "1" });
      setFiles([]);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה", "error");
    } finally {
      setSaving(false);
    }
  }

  const field = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <Modal open={open} onClose={onClose} title="העלאת סט חיווט חדש">
      <div className="space-y-3">
        <label className="block text-sm text-slate-500">
          פרויקט
          <select className={field} value={form.project_id} onChange={(e) => setForm({ ...form, project_id: Number(e.target.value) })}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
        <input className={field} placeholder="שם הסט * (למשל: סט חיווט 02)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={field} placeholder="מספר גרסה" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />

        <div
          className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 hover:border-blue-400 hover:bg-blue-50/40"
          onClick={() => fileInput.current?.click()}
        >
          📄 לחצו לבחירת קובצי PDF של סט החיווט
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
        </div>
        {files.length > 0 && (
          <ul className="space-y-1 text-sm">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1.5">
                <span>📄 {f.name}</span>
                <span className="text-xs text-slate-400">{(f.size / 1024 / 1024).toFixed(1)}MB</span>
              </li>
            ))}
          </ul>
        )}
        <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-700">
          הדגמה: תוכן הקבצים אינו נקרא ואינו נשלח לשום מקום — נשמרים רק שם וגודל,
          ונתוני החיווט מיוצרים על ידי מנוע הדגמה מדומה.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <SecondaryButton onClick={onClose}>ביטול</SecondaryButton>
          <PrimaryButton onClick={submit} disabled={saving || !form.name || !form.project_id}>
            {saving ? "שומר…" : "שמירת הסט"}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
