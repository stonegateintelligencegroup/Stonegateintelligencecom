import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, UserPlus, Link } from "lucide-react";
import BillingLayout from "./BillingLayout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface BillingClient {
  id: number; name: string; primaryContact: string | null; email: string | null;
  phone: string | null; address: string | null; billingContact: string | null;
  billingEmail: string | null; defaultRate: string | null; paymentTerms: string | null;
  notes: string | null; isActive: boolean; createdAt: string; linkedPortalUserId: number | null;
}
interface PortalUser { id: number; fullName: string; email: string; }

const EMPTY = {
  name: "", primaryContact: "", email: "", phone: "", address: "",
  billingContact: "", billingEmail: "", defaultRate: "", paymentTerms: "30", notes: "",
  linkedPortalUserId: "",
};

export default function BillingClients() {
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showActive, setShowActive] = useState<"all" | "active" | "inactive">("all");
  const [editing, setEditing] = useState<BillingClient | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const load = () =>
    Promise.all([
      fetch(`${BASE}/api/portal/billing/clients`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}/api/portal/admin/clients`, { credentials: "include" }).then(r => r.json()),
    ]).then(([bc, pu]) => {
      setClients(Array.isArray(bc) ? bc : []);
      setPortalUsers(Array.isArray(pu) ? pu.map((u: any) => ({ id: u.id, fullName: u.fullName ?? u.name, email: u.email })) : []);
    }).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  // Portal clients not yet linked to any billing client
  const unlinkedPortalClients = portalUsers.filter(
    pu => !clients.some(bc => bc.linkedPortalUserId === pu.id)
  );

  const filtered = clients.filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.primaryContact ?? "").toLowerCase().includes(search.toLowerCase());
    const matchActive = showActive === "all" || (showActive === "active" ? c.isActive : !c.isActive);
    return matchSearch && matchActive;
  });

  const openCreate = (prefill?: Partial<typeof EMPTY>) => {
    setForm({ ...EMPTY, ...prefill });
    setCreating(true);
    setEditing(null);
  };

  // One-click: pre-fill form from a portal user and open create modal
  const addPortalClientToBilling = (u: PortalUser) => {
    openCreate({
      name: u.fullName,
      email: u.email,
      billingEmail: u.email,
      linkedPortalUserId: String(u.id),
    });
  };

  const openEdit = (c: BillingClient) => {
    setForm({
      name: c.name, primaryContact: c.primaryContact ?? "", email: c.email ?? "",
      phone: c.phone ?? "", address: c.address ?? "", billingContact: c.billingContact ?? "",
      billingEmail: c.billingEmail ?? "", defaultRate: c.defaultRate ?? "",
      paymentTerms: c.paymentTerms ?? "30", notes: c.notes ?? "",
      linkedPortalUserId: c.linkedPortalUserId ? String(c.linkedPortalUserId) : "",
    });
    setEditing(c); setCreating(false);
  };

  // When portal user is selected in form, auto-fill name/email if blank
  const onPortalUserSelect = (uid: string) => {
    setForm(p => {
      const user = portalUsers.find(u => String(u.id) === uid);
      if (!user) return { ...p, linkedPortalUserId: uid };
      return {
        ...p,
        linkedPortalUserId: uid,
        name: p.name || user.fullName,
        email: p.email || user.email,
        billingEmail: p.billingEmail || user.email,
      };
    });
  };

  const save = async () => {
    setSaving(true);
    const url = editing
      ? `${BASE}/api/portal/billing/clients/${editing.id}`
      : `${BASE}/api/portal/billing/clients`;
    const method = editing ? "PATCH" : "POST";
    const body = {
      ...form,
      defaultRate: form.defaultRate ? parseFloat(form.defaultRate) : null,
      linkedPortalUserId: form.linkedPortalUserId ? Number(form.linkedPortalUserId) : null,
    };
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

  const inp = "w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors";
  const lbl = "block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5";
  const showForm = creating || !!editing;

  return (
    <BillingLayout>
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-serif text-2xl text-foreground">Billing Clients</h2>
        <button onClick={() => openCreate()}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-5 py-2.5 rounded transition-colors">
          <Plus className="w-3.5 h-3.5" /> New Client
        </button>
      </div>

      {/* Unlinked portal clients banner */}
      {!loading && unlinkedPortalClients.length > 0 && (
        <div className="mb-6 border border-primary/20 bg-primary/5 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-primary" />
            <p className="text-sm text-foreground font-medium">Portal clients not yet in billing</p>
            <span className="text-xs text-muted-foreground">— click to add their billing profile</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {unlinkedPortalClients.map(u => (
              <button
                key={u.id}
                onClick={() => addPortalClientToBilling(u)}
                className="flex items-center gap-2 text-xs border border-white/15 hover:border-primary/40 bg-black hover:bg-primary/10 text-foreground hover:text-primary transition-colors px-3 py-2 rounded-md"
              >
                <Link className="w-3 h-3" />
                {u.fullName}
                <span className="text-muted-foreground">({u.email})</span>
              </button>
            ))}
          </div>
        </div>
      )}

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
          {filtered.map(c => {
            const linkedUser = portalUsers.find(u => u.id === c.linkedPortalUserId);
            return (
              <div key={c.id} className="border border-white/10 hover:border-white/20 rounded-lg px-5 py-4 bg-white/2 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded border ${c.isActive ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-muted-foreground border-white/10 bg-white/5"}`}>
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                      {linkedUser && (
                        <span className="text-xs px-2 py-0.5 rounded border text-blue-400 border-blue-400/30 bg-blue-400/10 flex items-center gap-1">
                          <Link className="w-2.5 h-2.5" /> Portal: {linkedUser.fullName}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      {c.email && <span>{c.email}</span>}
                      {c.phone && <span>{c.phone}</span>}
                      {c.primaryContact && <span>Contact: {c.primaryContact}</span>}
                      {c.defaultRate && <span>Rate: ${parseFloat(c.defaultRate).toFixed(2)}/hr</span>}
                      {c.paymentTerms && <span>Net {c.paymentTerms}</span>}
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
            );
          })}
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
            <div className="p-6 space-y-4">
              {/* Portal client link — top of form so auto-fill works */}
              <div>
                <label className={lbl}>
                  Link to Portal Client
                  <span className="normal-case text-muted-foreground/50 ml-1">(auto-fills name & email)</span>
                </label>
                <select value={form.linkedPortalUserId} onChange={e => onPortalUserSelect(e.target.value)} className={inp}>
                  <option value="">Not linked to a portal account</option>
                  {portalUsers.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={lbl}>Client Name *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} placeholder="Acme Corporation" />
                </div>
                {[
                  { key: "primaryContact", label: "Primary Contact" },
                  { key: "email", label: "Email" },
                  { key: "phone", label: "Phone" },
                  { key: "billingContact", label: "Billing Contact" },
                  { key: "billingEmail", label: "Billing Email" },
                  { key: "defaultRate", label: "Default Rate ($/hr)", type: "number" },
                  { key: "paymentTerms", label: "Payment Terms (days)", type: "number" },
                ].map(f => (
                  <div key={f.key}>
                    <label className={lbl}>{f.label}</label>
                    <input
                      type={f.type ?? "text"}
                      value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className={inp}
                    />
                  </div>
                ))}
                <div className="md:col-span-2">
                  <label className={lbl}>Address</label>
                  <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className={inp} />
                </div>
                <div className="md:col-span-2">
                  <label className={lbl}>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3}
                    className={inp + " resize-none"} />
                </div>
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
