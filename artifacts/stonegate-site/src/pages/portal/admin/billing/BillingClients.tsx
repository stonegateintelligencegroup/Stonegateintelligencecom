import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import BillingLayout from "./BillingLayout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface BillingClient {
  id: number; name: string; primaryContact: string | null; email: string | null;
  phone: string | null; address: string | null; billingContact: string | null;
  billingEmail: string | null; defaultRate: string | null; paymentTerms: string | null;
  notes: string | null; isActive: boolean; createdAt: string;
}

const EMPTY = {
  name: "", primaryContact: "", email: "", phone: "", address: "",
  billingContact: "", billingEmail: "", defaultRate: "", paymentTerms: "", notes: "",
};

export default function BillingClients() {
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showActive, setShowActive] = useState<"all" | "active" | "inactive">("all");
  const [editing, setEditing] = useState<BillingClient | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const load = () =>
    fetch(`${BASE}/api/portal/billing/clients`, { credentials: "include" })
      .then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const filtered = clients.filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.primaryContact ?? "").toLowerCase().includes(search.toLowerCase());
    const matchActive = showActive === "all" || (showActive === "active" ? c.isActive : !c.isActive);
    return matchSearch && matchActive;
  });

  const openCreate = () => { setForm(EMPTY); setCreating(true); setEditing(null); };
  const openEdit = (c: BillingClient) => {
    setForm({
      name: c.name, primaryContact: c.primaryContact ?? "", email: c.email ?? "",
      phone: c.phone ?? "", address: c.address ?? "", billingContact: c.billingContact ?? "",
      billingEmail: c.billingEmail ?? "", defaultRate: c.defaultRate ?? "",
      paymentTerms: c.paymentTerms ?? "", notes: c.notes ?? "",
    });
    setEditing(c); setCreating(false);
  };

  const save = async () => {
    setSaving(true);
    const url = editing
      ? `${BASE}/api/portal/billing/clients/${editing.id}`
      : `${BASE}/api/portal/billing/clients`;
    const method = editing ? "PATCH" : "POST";
    const body = { ...form, defaultRate: form.defaultRate ? parseFloat(form.defaultRate) : null };
    const res = await fetch(url, { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { setEditing(null); setCreating(false); load(); }
    setSaving(false);
  };

  const toggleActive = async (c: BillingClient) => {
    await fetch(`${BASE}/api/portal/billing/clients/${c.id}`, {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    load();
  };

  const del = async (id: number) => {
    await fetch(`${BASE}/api/portal/billing/clients/${id}`, { method: "DELETE", credentials: "include" });
    setConfirmDelete(null); load();
  };

  const showForm = creating || !!editing;

  return (
    <BillingLayout>
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif text-2xl text-foreground">Billing Clients</h2>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-5 py-2.5 rounded transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Client
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…"
            className="pl-9 pr-4 bg-black border border-white/15 rounded py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors w-56" />
        </div>
        <select value={showActive} onChange={e => setShowActive(e.target.value as any)}
          className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Client list */}
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="space-y-2 mb-8">
          {filtered.length === 0 && (
            <div className="border border-white/10 rounded-lg p-8 text-center text-muted-foreground text-sm">No clients found</div>
          )}
          {filtered.map(c => (
            <div key={c.id} className="border border-white/10 hover:border-white/20 rounded-lg px-5 py-4 bg-white/2 transition-colors">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded border ${c.isActive ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-muted-foreground border-white/10 bg-white/5"}`}>
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    {c.email && <span>{c.email}</span>}
                    {c.phone && <span>{c.phone}</span>}
                    {c.primaryContact && <span>Contact: {c.primaryContact}</span>}
                    {c.defaultRate && <span>Rate: ${parseFloat(c.defaultRate).toFixed(2)}/hr</span>}
                    {c.paymentTerms && <span>{c.paymentTerms}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleActive(c)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 border border-white/10 rounded hover:border-white/20">
                    {c.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-primary transition-colors p-1.5">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {confirmDelete === c.id ? (
                    <span className="flex items-center gap-1">
                      <button onClick={() => del(c.id)} className="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded">Delete?</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-muted-foreground hover:text-foreground px-1">✕</button>
                    </span>
                  ) : (
                    <button onClick={() => setConfirmDelete(c.id)} className="text-muted-foreground/40 hover:text-red-400 transition-colors p-1.5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {c.notes && <p className="text-xs text-muted-foreground/60 mt-2 truncate">{c.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
              <h3 className="font-serif text-lg text-foreground">{editing ? "Edit Client" : "New Billing Client"}</h3>
              <button onClick={() => { setEditing(null); setCreating(false); }} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "name", label: "Name *", full: true },
                { key: "primaryContact", label: "Primary Contact" },
                { key: "email", label: "Email" },
                { key: "phone", label: "Phone" },
                { key: "address", label: "Address", full: true },
                { key: "billingContact", label: "Billing Contact" },
                { key: "billingEmail", label: "Billing Email" },
                { key: "defaultRate", label: "Default Rate ($/hr)", type: "number" },
                { key: "paymentTerms", label: "Payment Terms" },
              ].map(f => (
                <div key={f.key} className={f.full ? "md:col-span-2" : ""}>
                  <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">{f.label}</label>
                  <input
                    type={f.type ?? "text"}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors"
                  />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3}
                  className="w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/8">
              <button onClick={() => { setEditing(null); setCreating(false); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-4 py-2">Cancel</button>
              <button onClick={save} disabled={saving || !form.name}
                className="bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.12em] uppercase px-5 py-2 rounded transition-colors disabled:opacity-50">
                {saving ? "Saving…" : "Save Client"}
              </button>
            </div>
          </div>
        </div>
      )}
    </BillingLayout>
  );
}
