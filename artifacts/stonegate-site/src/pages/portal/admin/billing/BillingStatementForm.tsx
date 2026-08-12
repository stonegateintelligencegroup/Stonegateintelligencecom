import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Plus, Trash2, ChevronUp, ChevronDown, Eye } from "lucide-react";
import BillingLayout from "./BillingLayout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Client { id: number; name: string; linkedPortalUserId: number | null; }
interface Engagement { id: number; name: string; clientId: number; linkedPortalCaseId: number | null; }
interface PortalUser { id: number; fullName: string; email: string; }
interface TimeEntry {
  id: number; date: string; investigator: string; activityType: string; description: string | null;
  billedHours: string; billableAmount: string | null; billingRate: string | null; engagementName: string | null;
}
interface LineItem {
  id?: number;
  description: string; servicePeriod: string; quantity: string; rate: string; amount: string;
  showQuantity: boolean; showRate: boolean; sortOrder: number; timeEntryIds: number[];
  _key: string;
}

function uid() { return Math.random().toString(36).slice(2); }
function fmt(n: string | number) { return `$${parseFloat(String(n || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function newItem(sortOrder = 0): LineItem {
  return { description: "", servicePeriod: "", quantity: "", rate: "", amount: "0", showQuantity: true, showRate: true, sortOrder, timeEntryIds: [], _key: uid() };
}

function calcItemAmount(item: LineItem): number {
  const qty = parseFloat(item.quantity);
  const rate = parseFloat(item.rate);
  if (!isNaN(qty) && !isNaN(rate)) return qty * rate;
  const amt = parseFloat(item.amount);
  return isNaN(amt) ? 0 : amt;
}

export default function BillingStatementForm() {
  const [, setLocation] = useLocation();
  const [matchEdit, paramsEdit] = useRoute("/portal/admin/billing/statements/:id/edit");
  const isEdit = matchEdit && paramsEdit?.id;
  const editId = isEdit ? Number(paramsEdit.id) : null;

  const today = new Date().toISOString().split("T")[0];

  const [clients, setClients] = useState<Client[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [availableEntries, setAvailableEntries] = useState<TimeEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<number>>(new Set());
  // Separate filter state for the Time Entries tab (independent from the Details selectors)
  const [entryClientId, setEntryClientId] = useState("");
  const [entryEngagementId, setEntryEngagementId] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "items" | "entries">("details");

  // Form state
  const [billingClientId, setBillingClientId] = useState("");
  const [engagementId, setEngagementId] = useState("");
  const [portalUserId, setPortalUserId] = useState("");
  const [billingPeriod, setBillingPeriod] = useState("");
  const [billingPeriodStart, setBillingPeriodStart] = useState("");
  const [billingPeriodEnd, setBillingPeriodEnd] = useState("");
  const [statementDate, setStatementDate] = useState(today);
  const [dueDate, setDueDate] = useState("");
  const [previousBalance, setPreviousBalance] = useState("0");
  const [paymentsCredits, setPaymentsCredits] = useState("0");
  const [retainerApplied, setRetainerApplied] = useState("0");
  const [remainingRetainer, setRemainingRetainer] = useState("0");
  const [adminNotes, setAdminNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([newItem()]);

  // Load meta data
  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/portal/billing/clients`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}/api/portal/billing/engagements`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}/api/portal/admin/clients`, { credentials: "include" }).then(r => r.json()),
    ]).then(([c, e, pu]) => {
      setClients(Array.isArray(c) ? c : []);
      setEngagements(Array.isArray(e) ? e : []);
      setPortalUsers(Array.isArray(pu) ? pu.map((u: any) => ({ id: u.id, fullName: u.fullName ?? u.name, email: u.email })) : []);
    });
  }, []);

  // Load existing statement for edit
  useEffect(() => {
    if (!editId) return;
    fetch(`${BASE}/api/portal/billing/statements/${editId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setBillingClientId(d.billingClientId ? String(d.billingClientId) : "");
        setEngagementId(d.engagementId ? String(d.engagementId) : "");
        setPortalUserId(d.portalUserId ? String(d.portalUserId) : "");
        setBillingPeriod(d.billingPeriod ?? "");
        setBillingPeriodStart(d.billingPeriodStart ?? "");
        setBillingPeriodEnd(d.billingPeriodEnd ?? "");
        setStatementDate(d.statementDate ?? today);
        setDueDate(d.dueDate ?? "");
        setPreviousBalance(d.previousBalance ?? "0");
        setPaymentsCredits(d.paymentsCredits ?? "0");
        setRetainerApplied(d.retainerApplied ?? "0");
        setRemainingRetainer(d.remainingRetainer ?? "0");
        setAdminNotes(d.adminNotes ?? "");
        if (Array.isArray(d.items) && d.items.length > 0) {
          setItems(d.items.map((i: any) => ({
            id: i.id, description: i.description, servicePeriod: i.servicePeriod ?? "",
            quantity: i.quantity ?? "", rate: i.rate ?? "", amount: i.amount ?? "0",
            showQuantity: i.showQuantity !== false, showRate: i.showRate !== false,
            sortOrder: i.sortOrder ?? 0, timeEntryIds: Array.isArray(i.timeEntryIds) ? i.timeEntryIds : [], _key: uid(),
          })));
        }
      });
  }, [editId]);

  // Auto-set portalUserId when billingClientId changes
  useEffect(() => {
    if (billingClientId) {
      const client = clients.find(c => String(c.id) === billingClientId);
      if (client?.linkedPortalUserId) setPortalUserId(String(client.linkedPortalUserId));
    }
  }, [billingClientId, clients]);

  // Load available time entries using the tab's own client/engagement filters
  const loadEntries = async (clientOverride?: string, engagementOverride?: string) => {
    const cid = clientOverride ?? entryClientId;
    const eid = engagementOverride ?? entryEngagementId;
    setLoadingEntries(true);
    setEntriesLoaded(true);
    const params = new URLSearchParams();
    if (cid) params.set("clientId", cid);
    if (eid) params.set("engagementId", eid);
    const url = editId
      ? `${BASE}/api/portal/billing/statements/${editId}/available-time-entries?${params}`
      : `${BASE}/api/portal/billing/time-entries?${params}&billingStatus=unbilled`;
    const res = await fetch(url, { credentials: "include" }).then(r => r.json());
    setAvailableEntries(Array.isArray(res) ? res : []);
    setLoadingEntries(false);
  };

  // Import selected time entries as line items
  const importEntries = () => {
    const toImport = availableEntries.filter(e => selectedEntries.has(e.id));
    const newItems = toImport.map((e, i) => ({
      description: e.description ?? `${e.activityType} — ${e.date}`,
      servicePeriod: e.date,
      quantity: e.billedHours,
      rate: e.billingRate ?? "",
      amount: e.billableAmount ?? String(parseFloat(e.billedHours) * parseFloat(e.billingRate ?? "0")),
      showQuantity: true,
      showRate: !!e.billingRate,
      sortOrder: items.length + i,
      timeEntryIds: [e.id],
      _key: uid(),
    }));
    setItems(prev => [...prev.filter(i => i.description), ...newItems]);
    setSelectedEntries(new Set());
    setActiveTab("items");
  };

  const filteredEngagements = billingClientId
    ? engagements.filter(e => e.clientId === Number(billingClientId))
    : engagements;

  const currentCharges = items.reduce((s, i) => s + calcItemAmount(i), 0);
  const amountDue = Math.max(0,
    parseFloat(previousBalance || "0") +
    currentCharges -
    parseFloat(paymentsCredits || "0") -
    parseFloat(retainerApplied || "0")
  );

  const updateItem = (key: string, field: keyof LineItem, value: any) => {
    setItems(prev => prev.map(i => {
      if (i._key !== key) return i;
      const updated = { ...i, [field]: value };
      // Auto-calc amount from qty * rate
      if (field === "quantity" || field === "rate") {
        const qty = parseFloat(field === "quantity" ? value : updated.quantity);
        const rate = parseFloat(field === "rate" ? value : updated.rate);
        if (!isNaN(qty) && !isNaN(rate)) updated.amount = String(qty * rate);
      }
      return updated;
    }));
  };

  const moveItem = (key: string, dir: -1 | 1) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i._key === key);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr.map((item, i) => ({ ...item, sortOrder: i }));
    });
  };

  const save = async () => {
    if (!billingPeriod || !statementDate) return;
    setSaving(true);

    const body = {
      billingClientId: billingClientId ? Number(billingClientId) : null,
      engagementId: engagementId ? Number(engagementId) : null,
      portalUserId: portalUserId ? Number(portalUserId) : null,
      billingPeriod, billingPeriodStart: billingPeriodStart || null, billingPeriodEnd: billingPeriodEnd || null,
      statementDate, dueDate: dueDate || null,
      previousBalance: parseFloat(previousBalance || "0"),
      paymentsCredits: parseFloat(paymentsCredits || "0"),
      retainerApplied: parseFloat(retainerApplied || "0"),
      remainingRetainer: parseFloat(remainingRetainer || "0"),
      adminNotes: adminNotes || null,
    };

    let stmtId = editId;
    if (editId) {
      await fetch(`${BASE}/api/portal/billing/statements/${editId}`, {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      const res = await fetch(`${BASE}/api/portal/billing/statements`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      stmtId = data.id;
    }

    // Sync items: for new statements add all; for edits compare by id
    if (stmtId) {
      for (let idx = 0; idx < items.length; idx++) {
        const item = { ...items[idx], sortOrder: idx };
        const itemBody = {
          description: item.description, servicePeriod: item.servicePeriod || null,
          quantity: item.quantity ? parseFloat(item.quantity) : null,
          rate: item.rate ? parseFloat(item.rate) : null,
          amount: calcItemAmount(item),
          showQuantity: item.showQuantity, showRate: item.showRate,
          sortOrder: idx, timeEntryIds: item.timeEntryIds,
        };
        if (item.id) {
          await fetch(`${BASE}/api/portal/billing/statements/${stmtId}/items/${item.id}`, {
            method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(itemBody),
          });
        } else {
          await fetch(`${BASE}/api/portal/billing/statements/${stmtId}/items`, {
            method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(itemBody),
          });
        }
      }
    }

    setSaving(false);
    setLocation(`/portal/admin/billing/statements/${stmtId}`);
  };

  const inp = "w-full bg-black border border-white/15 rounded px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors";
  const label = "block text-xs tracking-[0.12em] uppercase text-muted-foreground mb-1.5";

  return (
    <BillingLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-primary mb-1">Admin · Billing · Statements</p>
          <h1 className="font-serif text-2xl text-foreground">{editId ? "Edit Statement" : "New Billing Statement"}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/portal/admin/billing/statements")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-4 py-2">
            Cancel
          </button>
          <button onClick={save} disabled={saving || !billingPeriod || !statementDate}
            className="bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-5 py-2.5 rounded transition-colors disabled:opacity-50">
            {saving ? "Saving…" : "Save Statement"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/8">
        {(["details", "items", "entries"] as const).map(t => (
          <button key={t} onClick={() => {
            setActiveTab(t);
            if (t === "entries" && !entriesLoaded) {
              // Pre-fill filters from the Details tab when first opening
              const cid = entryClientId || billingClientId;
              const eid = entryEngagementId || engagementId;
              setEntryClientId(cid);
              setEntryEngagementId(eid);
              loadEntries(cid, eid);
            }
          }}
            className={`px-5 py-2.5 text-xs tracking-[0.1em] uppercase border-b-2 transition-colors ${activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "entries" ? "Time Entries" : t === "items" ? `Line Items (${items.length})` : t}
          </button>
        ))}
      </div>

      {/* ── Details tab ── */}
      {activeTab === "details" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
          <div>
            <label className={label}>Billing Client</label>
            <select value={billingClientId} onChange={e => { setBillingClientId(e.target.value); setEngagementId(""); }} className={inp}>
              <option value="">Not linked to a billing client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Engagement / Case</label>
            <select value={engagementId} onChange={e => setEngagementId(e.target.value)} className={inp}>
              <option value="">All engagements</option>
              {filteredEngagements.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={label}>Portal Client (controls who sees this statement)</label>
            <select value={portalUserId} onChange={e => setPortalUserId(e.target.value)} className={inp}>
              <option value="">Not linked — statement won't appear in any client portal</option>
              {portalUsers.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Billing Period *</label>
            <input value={billingPeriod} onChange={e => setBillingPeriod(e.target.value)} placeholder="July 2026" className={inp} />
          </div>
          <div>
            <label className={label}>Statement Date *</label>
            <input type="date" value={statementDate} onChange={e => setStatementDate(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={label}>Billing Period Start</label>
            <input type="date" value={billingPeriodStart} onChange={e => setBillingPeriodStart(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={label}>Billing Period End</label>
            <input type="date" value={billingPeriodEnd} onChange={e => setBillingPeriodEnd(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={label}>Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inp} />
          </div>
          <div className="md:col-span-2 border-t border-white/8 pt-5 mt-1">
            <p className="text-xs tracking-[0.1em] uppercase text-muted-foreground mb-4">Financial Summary</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={label}>Previous Balance ($)</label>
                <input type="number" step="0.01" value={previousBalance} onChange={e => setPreviousBalance(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={label}>Payments / Credits ($)</label>
                <input type="number" step="0.01" value={paymentsCredits} onChange={e => setPaymentsCredits(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={label}>Retainer Applied ($)</label>
                <input type="number" step="0.01" value={retainerApplied} onChange={e => setRetainerApplied(e.target.value)} className={inp} />
              </div>
              <div>
                <label className={label}>Remaining Retainer ($)</label>
                <input type="number" step="0.01" value={remainingRetainer} onChange={e => setRemainingRetainer(e.target.value)} className={inp} />
              </div>
            </div>
            <div className="mt-4 p-4 border border-white/8 rounded-lg bg-white/2 text-sm space-y-1">
              <div className="flex justify-between text-muted-foreground"><span>Current Charges (from items):</span><span>{fmt(currentCharges)}</span></div>
              {parseFloat(previousBalance) > 0 && <div className="flex justify-between text-muted-foreground"><span>Previous Balance:</span><span>+ {fmt(previousBalance)}</span></div>}
              {parseFloat(paymentsCredits) > 0 && <div className="flex justify-between text-muted-foreground"><span>Payments / Credits:</span><span>- {fmt(paymentsCredits)}</span></div>}
              {parseFloat(retainerApplied) > 0 && <div className="flex justify-between text-muted-foreground"><span>Retainer Applied:</span><span>- {fmt(retainerApplied)}</span></div>}
              <div className="flex justify-between font-medium text-foreground border-t border-white/8 pt-2 mt-1"><span>Amount Due:</span><span>{fmt(amountDue)}</span></div>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className={label}>Internal Notes (admin only — not shown to client)</label>
            <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3} placeholder="Internal notes about this statement…"
              className={inp + " resize-none"} />
          </div>
        </div>
      )}

      {/* ── Line items tab ── */}
      {activeTab === "items" && (
        <div className="max-w-4xl">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Add the services that will appear on the client-facing statement. Investigator names and internal time entries are never shown to the client.</p>
            <button onClick={() => setItems(prev => [...prev, newItem(prev.length)])}
              className="flex items-center gap-1.5 text-xs border border-white/10 hover:border-primary/30 text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded">
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item._key} className="border border-white/10 rounded-lg p-4 bg-white/2">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-1 pt-1">
                    <button onClick={() => moveItem(item._key, -1)} disabled={idx === 0} className="text-muted-foreground/40 hover:text-foreground disabled:opacity-20 transition-colors">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveItem(item._key, 1)} disabled={idx === items.length - 1} className="text-muted-foreground/40 hover:text-foreground disabled:opacity-20 transition-colors">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="md:col-span-3">
                      <label className={label}>Description *</label>
                      <input value={item.description} onChange={e => updateItem(item._key, "description", e.target.value)}
                        placeholder="Investigative and research services…" className={inp} />
                    </div>
                    <div>
                      <label className={label}>Service Period</label>
                      <input value={item.servicePeriod} onChange={e => updateItem(item._key, "servicePeriod", e.target.value)}
                        placeholder="July 2026" className={inp} />
                    </div>
                    <div>
                      <label className={label}>Hrs / Units</label>
                      <input type="number" step="0.01" value={item.quantity} onChange={e => updateItem(item._key, "quantity", e.target.value)} className={inp} />
                    </div>
                    <div>
                      <label className={label}>Rate ($)</label>
                      <input type="number" step="0.01" value={item.rate} onChange={e => updateItem(item._key, "rate", e.target.value)} className={inp} />
                    </div>
                    <div>
                      <label className={label}>Amount ($) *</label>
                      <input type="number" step="0.01" value={item.amount} onChange={e => updateItem(item._key, "amount", e.target.value)} className={inp} />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-4 pt-5">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={item.showQuantity} onChange={e => updateItem(item._key, "showQuantity", e.target.checked)} className="accent-primary" />
                        Show hours/units
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={item.showRate} onChange={e => updateItem(item._key, "showRate", e.target.checked)} className="accent-primary" />
                        Show rate
                      </label>
                    </div>
                    {item.timeEntryIds.length > 0 && (
                      <div className="md:col-span-4">
                        <p className="text-[10px] text-muted-foreground/50">Linked time entries: {item.timeEntryIds.join(", ")} (internal only)</p>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setItems(prev => prev.filter(i => i._key !== item._key))}
                    className="text-muted-foreground/30 hover:text-red-400 transition-colors p-1 mt-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <div className="text-sm font-medium text-foreground">
              Current Charges Total: <span className="font-serif text-lg">{fmt(currentCharges)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Time entries tab ── */}
      {activeTab === "entries" && (
        <div className="max-w-4xl">
          {/* Filter row */}
          <div className="flex flex-wrap items-end gap-3 mb-5 p-4 bg-white/2 border border-white/8 rounded-lg">
            <div className="flex-1 min-w-[180px]">
              <label className={label}>Filter by Client</label>
              <select
                value={entryClientId}
                onChange={e => { setEntryClientId(e.target.value); setEntryEngagementId(""); }}
                className={inp}
              >
                <option value="">All clients</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className={label}>Filter by Engagement</label>
              <select
                value={entryEngagementId}
                onChange={e => setEntryEngagementId(e.target.value)}
                className={inp}
              >
                <option value="">All engagements</option>
                {(entryClientId
                  ? engagements.filter(e => e.clientId === Number(entryClientId))
                  : engagements
                ).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <button
              onClick={() => loadEntries()}
              disabled={loadingEntries}
              className="flex items-center gap-1.5 text-xs border border-white/15 hover:border-primary/40 text-muted-foreground hover:text-primary transition-colors px-4 py-2.5 rounded disabled:opacity-50"
            >
              {loadingEntries ? "Loading…" : "Load Entries"}
            </button>
            {selectedEntries.size > 0 && (
              <button onClick={importEntries}
                className="flex items-center gap-1.5 text-xs bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded transition-colors">
                <Plus className="w-3 h-3" /> Import {selectedEntries.size} selected
              </button>
            )}
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            Select unbilled time entries to import as line items. <strong>Investigator names and internal details are never exposed to clients.</strong>
          </p>

          {!entriesLoaded ? (
            <div className="border border-white/10 rounded-lg p-8 text-center text-muted-foreground text-sm">
              Select a client above and click <strong>Load Entries</strong> to see available time entries.
            </div>
          ) : loadingEntries ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : availableEntries.length === 0 ? (
            <div className="border border-white/10 rounded-lg p-8 text-center text-muted-foreground text-sm">
              No unbilled time entries found{entryClientId ? " for the selected client" : ""}. Try selecting a different client or changing the engagement filter.
            </div>
          ) : (
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="border-b border-white/8 bg-white/2">
                  <tr>
                    <th className="px-4 py-3 w-8">
                      <input type="checkbox"
                        checked={selectedEntries.size === availableEntries.length}
                        onChange={e => setSelectedEntries(e.target.checked ? new Set(availableEntries.map(e => e.id)) : new Set())}
                        className="accent-primary" />
                    </th>
                    <th className="px-4 py-3 text-left text-muted-foreground font-normal">Date</th>
                    <th className="px-4 py-3 text-left text-muted-foreground font-normal">Activity</th>
                    <th className="px-4 py-3 text-left text-muted-foreground font-normal">Description</th>
                    <th className="px-4 py-3 text-right text-muted-foreground font-normal">Hours</th>
                    <th className="px-4 py-3 text-right text-muted-foreground font-normal">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {availableEntries.map(e => (
                    <tr key={e.id} className={`hover:bg-white/2 transition-colors ${selectedEntries.has(e.id) ? "bg-primary/5" : ""}`}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={selectedEntries.has(e.id)}
                          onChange={() => setSelectedEntries(prev => { const n = new Set(prev); n.has(e.id) ? n.delete(e.id) : n.add(e.id); return n; })}
                          className="accent-primary" />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{e.date}</td>
                      <td className="px-4 py-3 text-foreground">{e.activityType}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{e.description ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-foreground">{parseFloat(e.billedHours).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-foreground">{e.billableAmount ? fmt(e.billableAmount) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </BillingLayout>
  );
}
