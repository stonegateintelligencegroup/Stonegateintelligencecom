import { useEffect, useState } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const ACTIVITY_TYPES = [
  "Research","Database Research","Public Records Research","Surveillance","Interview",
  "Background Investigation","Due Diligence","Litigation Support","Report Preparation",
  "Analysis","Client Communication","Travel","Administrative","Consultation","Other",
];

interface Client { id: number; name: string; defaultRate: string | null; }
interface Engagement { id: number; name: string; clientId: number; hourlyRate: string | null; }

interface Props {
  clients: Client[];
  engagements: Engagement[];
  initial?: Partial<EntryForm>;
  editId?: number;
  onClose: () => void;
  onSaved: () => void;
}

interface EntryForm {
  date: string; useTimer: boolean;
  startTime: string; endTime: string; durationMinutes: string;
  clientId: string; engagementId: string; investigator: string;
  activityType: string; description: string; billable: boolean;
  billingRate: string; internalNotes: string;
}

export default function TimeEntryModal({ clients, engagements, initial, editId, onClose, onSaved }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState<EntryForm>({
    date: today, useTimer: false,
    startTime: "", endTime: "", durationMinutes: "",
    clientId: "", engagementId: "", investigator: "",
    activityType: "Research", description: "", billable: true,
    billingRate: "", internalNotes: "",
    ...initial,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState({ minutes: 0, billed: 0, hours: "0.00", amount: "0.00" });
  const [billingIncrement, setBillingIncrement] = useState(6);

  useEffect(() => {
    fetch(`${BASE}/api/portal/billing/settings`, { credentials: "include" })
      .then(r => r.json()).then(s => { if (s?.billing_increment_minutes) setBillingIncrement(Number(s.billing_increment_minutes)); });
  }, []);

  // Auto-fill rate from engagement/client
  useEffect(() => {
    if (form.engagementId) {
      const eng = engagements.find(e => e.id === Number(form.engagementId));
      if (eng?.hourlyRate) { setForm(p => ({ ...p, billingRate: parseFloat(eng.hourlyRate!).toFixed(2) })); return; }
    }
    if (form.clientId) {
      const cl = clients.find(c => c.id === Number(form.clientId));
      if (cl?.defaultRate) { setForm(p => ({ ...p, billingRate: parseFloat(cl.defaultRate!).toFixed(2) })); }
    }
  }, [form.clientId, form.engagementId]);

  // Live preview calculation
  useEffect(() => {
    let rawMins = 0;
    if (!form.useTimer && form.startTime && form.endTime) {
      const [sh, sm] = form.startTime.split(":").map(Number);
      const [eh, em] = form.endTime.split(":").map(Number);
      rawMins = (eh * 60 + em) - (sh * 60 + sm);
      if (rawMins < 0) rawMins += 1440;
    } else if (form.useTimer && form.durationMinutes) {
      rawMins = Number(form.durationMinutes);
    }
    const billed = rawMins > 0 ? Math.ceil(rawMins / billingIncrement) * billingIncrement : 0;
    const hrs = (billed / 60).toFixed(2);
    const rate = parseFloat(form.billingRate || "0");
    const amount = (form.billable && rate > 0) ? (parseFloat(hrs) * rate).toFixed(2) : "0.00";
    setPreview({ minutes: rawMins, billed, hours: hrs, amount });
  }, [form.startTime, form.endTime, form.durationMinutes, form.useTimer, form.billingRate, form.billable, billingIncrement]);

  const filteredEngagements = form.clientId
    ? engagements.filter(e => e.clientId === Number(form.clientId))
    : engagements;

  const save = async () => {
    setError("");
    if (!form.clientId || !form.investigator || !form.activityType) {
      setError("Client, investigator, and activity type are required."); return;
    }
    if (!form.useTimer && !form.startTime && !form.endTime && !form.durationMinutes) {
      setError("Enter start/end times or a duration."); return;
    }
    setSaving(true);
    const body: any = {
      date: form.date,
      clientId: Number(form.clientId),
      engagementId: form.engagementId ? Number(form.engagementId) : null,
      investigator: form.investigator,
      activityType: form.activityType,
      description: form.description || null,
      billable: form.billable,
      billingRate: form.billingRate ? parseFloat(form.billingRate) : null,
      internalNotes: form.internalNotes || null,
    };
    if (!form.useTimer && form.startTime && form.endTime) {
      body.startTime = form.startTime; body.endTime = form.endTime;
    } else {
      body.durationMinutes = Number(form.durationMinutes);
    }

    const url = editId ? `${BASE}/api/portal/billing/time-entries/${editId}` : `${BASE}/api/portal/billing/time-entries`;
    const method = editId ? "PATCH" : "POST";
    const res = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { onSaved(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? "Save failed."); }
    setSaving(false);
  };

  const f = (key: keyof EntryForm, val: any) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg w-full max-w-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
          <h3 className="font-serif text-lg text-foreground">{editId ? "Edit Time Entry" : "New Time Entry"}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Date *</label>
              <input type="date" value={form.date} onChange={e => f("date", e.target.value)}
                className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                <input type="checkbox" checked={form.useTimer} onChange={e => f("useTimer", e.target.checked)} className="accent-primary" />
                Manual duration
              </label>
            </div>
          </div>

          {/* Time fields */}
          {!form.useTimer ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Start Time</label>
                <input type="time" value={form.startTime} onChange={e => f("startTime", e.target.value)}
                  className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
              </div>
              <div>
                <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">End Time</label>
                <input type="time" value={form.endTime} onChange={e => f("endTime", e.target.value)}
                  className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Duration (minutes)</label>
              <input type="number" min="1" value={form.durationMinutes} onChange={e => f("durationMinutes", e.target.value)}
                className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
            </div>
          )}

          {/* Duration preview */}
          {preview.minutes > 0 && (
            <div className="bg-white/3 border border-white/8 rounded px-4 py-3 text-xs text-muted-foreground flex flex-wrap gap-4">
              <span>Raw: {preview.minutes}m</span>
              <span>Billed: {preview.billed}m ({preview.hours}h)</span>
              {form.billable && parseFloat(form.billingRate || "0") > 0 && (
                <span className="text-primary font-medium">Amount: ${parseFloat(preview.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              )}
            </div>
          )}

          {/* Client & Engagement */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Client *</label>
              <select value={form.clientId} onChange={e => { f("clientId", e.target.value); f("engagementId", ""); }}
                className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
                <option value="">Select client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Engagement</label>
              <select value={form.engagementId} onChange={e => f("engagementId", e.target.value)}
                className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
                <option value="">No engagement</option>
                {filteredEngagements.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>

          {/* Investigator & Activity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Investigator *</label>
              <input value={form.investigator} onChange={e => f("investigator", e.target.value)}
                className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
            </div>
            <div>
              <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Activity Type *</label>
              <select value={form.activityType} onChange={e => f("activityType", e.target.value)}
                className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
                {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Description / Work Performed</label>
            <textarea value={form.description} onChange={e => f("description", e.target.value)} rows={2}
              className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors resize-none" />
          </div>

          {/* Billing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Billing Rate ($/hr)</label>
              <input type="number" step="0.01" value={form.billingRate} onChange={e => f("billingRate", e.target.value)}
                className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
                <input type="checkbox" checked={form.billable} onChange={e => f("billable", e.target.checked)} className="accent-primary" />
                Billable
              </label>
            </div>
          </div>

          {/* Internal notes */}
          <div>
            <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Internal Notes</label>
            <textarea value={form.internalNotes} onChange={e => f("internalNotes", e.target.value)} rows={2}
              className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors resize-none" />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/8">
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-4 py-2">Cancel</button>
          <button onClick={save} disabled={saving}
            className="bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.12em] uppercase px-5 py-2 rounded transition-colors disabled:opacity-50">
            {saving ? "Saving…" : editId ? "Update Entry" : "Save Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
