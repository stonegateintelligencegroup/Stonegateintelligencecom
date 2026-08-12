import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import BillingLayout from "./BillingLayout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Engagement {
  id: number; clientId: number; clientName: string | null; name: string;
  description: string | null; caseType: string; dateOpened: string;
  targetCompletion: string | null; assignedInvestigator: string | null;
  billingStructure: string; hourlyRate: string | null; retainerAmount: string | null;
  retainerStartDate: string | null; budget: string | null; status: string;
  notes: string | null; billedAmount: number;
}
interface Client { id: number; name: string; defaultRate: string | null; }

const CASE_TYPES = [
  "Investigative Services","Intelligence Consulting","Due Diligence","Risk Assessment",
  "Background Research","Litigation Support","Business Intelligence","Other Consulting",
];
const STATUSES = ["open","on_hold","completed","closed"];
const STATUS_COLOR: Record<string, string> = {
  open: "text-green-400 border-green-400/30 bg-green-400/10",
  on_hold: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  completed: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  closed: "text-muted-foreground border-white/10 bg-white/5",
};

const EMPTY_FORM = {
  clientId: "", name: "", description: "", caseType: "Investigative Services",
  dateOpened: new Date().toISOString().split("T")[0], targetCompletion: "",
  assignedInvestigator: "", billingStructure: "hourly",
  hourlyRate: "", retainerAmount: "", retainerStartDate: "", budget: "", status: "open", notes: "",
};

function BudgetBar({ used, budget, retainer, retainerWarningPct }: {
  used: number; budget: number | null; retainer: number | null; retainerWarningPct: number;
}) {
  if (!budget && !retainer) return null;
  const total = budget ?? retainer!;
  const pct = Math.min((used / total) * 100, 100);
  const overBudget = used > total;
  const remaining = total - used;
  const remainingPct = (remaining / total) * 100;
  const warn = retainer ? remainingPct <= retainerWarningPct : pct >= 75;
  const danger = retainer ? remainingPct <= 10 : pct >= 90;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>{retainer ? "Retainer" : "Budget"}: ${total.toLocaleString()}</span>
        <span className={overBudget ? "text-red-400 font-medium" : warn ? "text-orange-400" : ""}>
          {overBudget ? `Exceeded by $${(used - total).toLocaleString()}` : `$${remaining.toLocaleString()} remaining`}
        </span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${danger ? "bg-red-500" : warn ? "bg-orange-400" : "bg-primary"}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      {overBudget && (
        <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Authorized budget has been exceeded.</p>
      )}
      {!overBudget && retainer && remainingPct <= retainerWarningPct && (
        <p className="text-xs text-orange-400 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Retainer balance is approaching depletion.</p>
      )}
    </div>
  );
}

export default function BillingEngagements() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [editing, setEditing] = useState<Engagement | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [retainerWarningPct, setRetainerWarningPct] = useState(20);

  const load = async () => {
    const [e, c, s] = await Promise.all([
      fetch(`${BASE}/api/portal/billing/engagements`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}/api/portal/billing/clients`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}/api/portal/billing/settings`, { credentials: "include" }).then(r => r.json()),
    ]);
    setEngagements(Array.isArray(e) ? e : []);
    setClients(Array.isArray(c) ? c : []);
    if (s?.retainer_warning_pct) setRetainerWarningPct(Number(s.retainer_warning_pct));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = engagements.filter(e =>
    (!filterClient || e.clientId === Number(filterClient)) &&
    (!filterStatus || e.status === filterStatus)
  );

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, clientId: filterClient || "" });
    setCreating(true); setEditing(null);
  };
  const openEdit = (e: Engagement) => {
    setForm({
      clientId: String(e.clientId), name: e.name, description: e.description ?? "",
      caseType: e.caseType, dateOpened: e.dateOpened, targetCompletion: e.targetCompletion ?? "",
      assignedInvestigator: e.assignedInvestigator ?? "", billingStructure: e.billingStructure,
      hourlyRate: e.hourlyRate ?? "", retainerAmount: e.retainerAmount ?? "",
      retainerStartDate: e.retainerStartDate ?? "", budget: e.budget ?? "",
      status: e.status, notes: e.notes ?? "",
    });
    setEditing(e); setCreating(false);
  };

  const n = (v: string) => v ? parseFloat(v) : undefined;

  const save = async () => {
    setSaving(true);
    const url = editing ? `${BASE}/api/portal/billing/engagements/${editing.id}` : `${BASE}/api/portal/billing/engagements`;
    const method = editing ? "PATCH" : "POST";
    const body = { ...form, clientId: Number(form.clientId), hourlyRate: n(form.hourlyRate), retainerAmount: n(form.retainerAmount), budget: n(form.budget) };
    const res = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { setEditing(null); setCreating(false); load(); }
    setSaving(false);
  };

  const del = async (id: number) => {
    await fetch(`${BASE}/api/portal/billing/engagements/${id}`, { method: "DELETE", credentials: "include" });
    setConfirmDelete(null); load();
  };

  const showForm = creating || !!editing;

  return (
    <BillingLayout>
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif text-2xl text-foreground">Engagements</h2>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-5 py-2.5 rounded transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Engagement
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
          className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-3 mb-8">
          {filtered.length === 0 && (
            <div className="border border-white/10 rounded-lg p-8 text-center text-muted-foreground text-sm">No engagements found</div>
          )}
          {filtered.map(e => (
            <div key={e.id} className="border border-white/10 hover:border-white/20 rounded-lg p-5 bg-white/2 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{e.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLOR[e.status] ?? STATUS_COLOR.open}`}>
                      {e.status.replace("_", " ")}
                    </span>
                    <span className="text-xs text-muted-foreground/60">{e.caseType}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mb-1">
                    <span>{e.clientName}</span>
                    {e.assignedInvestigator && <span>Inv: {e.assignedInvestigator}</span>}
                    <span>Opened: {e.dateOpened}</span>
                    {e.targetCompletion && <span>Target: {e.targetCompletion}</span>}
                    {e.hourlyRate && <span>${parseFloat(e.hourlyRate).toFixed(2)}/hr</span>}
                    <span className="capitalize">{e.billingStructure.replace("_", " ")}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Billed: <span className="text-foreground">${e.billedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <BudgetBar
                    used={e.billedAmount}
                    budget={e.billingStructure !== "retainer" && e.budget ? parseFloat(e.budget) : null}
                    retainer={e.billingStructure === "retainer" && e.retainerAmount ? parseFloat(e.retainerAmount) : null}
                    retainerWarningPct={retainerWarningPct}
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEdit(e)} className="text-muted-foreground hover:text-primary transition-colors p-1.5">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {confirmDelete === e.id ? (
                    <span className="flex items-center gap-1">
                      <button onClick={() => del(e.id)} className="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded">Delete?</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-muted-foreground hover:text-foreground px-1">✕</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDelete(e.id)} className="text-muted-foreground/40 hover:text-red-400 transition-colors p-1.5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
              <h3 className="font-serif text-lg text-foreground">{editing ? "Edit Engagement" : "New Engagement"}</h3>
              <button onClick={() => { setEditing(null); setCreating(false); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Client *</label>
                <select value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}
                  className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Case / Engagement Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
              </div>
              <div>
                <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Case Type</label>
                <select value={form.caseType} onChange={e => setForm(p => ({ ...p, caseType: e.target.value }))}
                  className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
                  {CASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Status</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Date Opened *</label>
                <input type="date" value={form.dateOpened} onChange={e => setForm(p => ({ ...p, dateOpened: e.target.value }))}
                  className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
              </div>
              <div>
                <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Target Completion</label>
                <input type="date" value={form.targetCompletion} onChange={e => setForm(p => ({ ...p, targetCompletion: e.target.value }))}
                  className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
              </div>
              <div>
                <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Assigned Investigator</label>
                <input value={form.assignedInvestigator} onChange={e => setForm(p => ({ ...p, assignedInvestigator: e.target.value }))}
                  className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
              </div>
              <div>
                <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Billing Structure</label>
                <select value={form.billingStructure} onChange={e => setForm(p => ({ ...p, billingStructure: e.target.value }))}
                  className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
                  {["hourly","retainer","flat_fee","contingency"].map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Hourly Rate ($/hr)</label>
                <input type="number" step="0.01" value={form.hourlyRate} onChange={e => setForm(p => ({ ...p, hourlyRate: e.target.value }))}
                  className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
              </div>
              <div>
                <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Retainer Amount ($)</label>
                <input type="number" step="0.01" value={form.retainerAmount} onChange={e => setForm(p => ({ ...p, retainerAmount: e.target.value }))}
                  className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
              </div>
              <div>
                <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Budget / Authorized ($)</label>
                <input type="number" step="0.01" value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
                  className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                  className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors resize-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                  className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/8">
              <button onClick={() => { setEditing(null); setCreating(false); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-4 py-2">Cancel</button>
              <button onClick={save} disabled={saving || !form.clientId || !form.name || !form.dateOpened}
                className="bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.12em] uppercase px-5 py-2 rounded transition-colors disabled:opacity-50">
                {saving ? "Saving…" : "Save Engagement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </BillingLayout>
  );
}
