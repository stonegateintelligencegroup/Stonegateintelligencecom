import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Plus, Download, ChevronUp, ChevronDown, Pencil, Copy, Trash2, FileText } from "lucide-react";
import BillingLayout from "./BillingLayout";
import TimeEntryModal from "./TimeEntryModal";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface TimeEntry {
  id: number; date: string; startTime: string | null; endTime: string | null;
  billedHours: string; clientId: number; clientName: string | null;
  linkedPortalUserId: number | null;
  engagementId: number | null; engagementName: string | null;
  linkedPortalCaseId: number | null;
  investigator: string; activityType: string; description: string | null;
  billable: boolean; billingRate: string | null; billableAmount: string | null;
  billingStatus: string; internalNotes: string | null;
}
interface Client { id: number; name: string; defaultRate: string | null; linkedPortalUserId: number | null; }
interface Engagement { id: number; name: string; clientId: number; hourlyRate: string | null; linkedPortalCaseId: number | null; }

const STATUS_COLOR: Record<string, string> = {
  unbilled: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  ready_to_invoice: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  invoiced: "text-green-400 border-green-400/30 bg-green-400/10",
  paid: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  written_off: "text-muted-foreground border-white/10 bg-white/5",
};

type SortKey = "date" | "clientName" | "engagementName" | "investigator" | "activityType" | "billedHours" | "billingRate" | "billableAmount" | "billingStatus";

function getSearchParams() {
  return new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
}

function exportCSV(entries: TimeEntry[]) {
  const headers = ["Date","Client","Engagement","Investigator","Activity","Description","Hours","Rate","Amount","Billable","Status"];
  const rows = entries.map(e => [
    e.date, e.clientName ?? "", e.engagementName ?? "", e.investigator, e.activityType,
    e.description ?? "", e.billedHours,
    e.billingRate ?? "0", e.billableAmount ?? "0",
    e.billable ? "Yes" : "No", e.billingStatus.replace(/_/g, " ")
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = `time-entries-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
}

export default function BillingTimeEntries() {
  const [, setLocation] = useLocation();
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = today.slice(0, 7) + "-01";

  // Read initial state from URL params
  const urlParams = getSearchParams();
  const initClientId = urlParams.get("clientId") ?? "";
  const initEngagementId = urlParams.get("engagementId") ?? "";

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [filterClient, setFilterClient] = useState(initClientId);
  const [filterEngagement, setFilterEngagement] = useState(initEngagementId);
  const [filterBillable, setFilterBillable] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [showCreate, setShowCreate] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const loadMeta = async () => {
    const [c, e] = await Promise.all([
      fetch(`${BASE}/api/portal/billing/clients`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}/api/portal/billing/engagements`, { credentials: "include" }).then(r => r.json()),
    ]);
    setClients(Array.isArray(c) ? c : []);
    setEngagements(Array.isArray(e) ? e.map((x: any) => ({
      id: x.id, name: x.name, clientId: x.clientId,
      hourlyRate: x.hourlyRate, linkedPortalCaseId: x.linkedPortalCaseId ?? null,
    })) : []);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ dateFrom, dateTo });
    if (filterClient) params.set("clientId", filterClient);
    if (filterEngagement) params.set("engagementId", filterEngagement);
    if (filterBillable) params.set("billable", filterBillable);
    if (filterStatus) params.set("billingStatus", filterStatus);
    const res = await fetch(`${BASE}/api/portal/billing/time-entries?${params}`, { credentials: "include" });
    const data = await res.json();
    setEntries(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [dateFrom, dateTo, filterClient, filterEngagement, filterBillable, filterStatus]);

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { load(); }, [load]);

  const sorted = [...entries].sort((a, b) => {
    const av = (a as any)[sortKey] ?? "";
    const bv = (b as any)[sortKey] ?? "";
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />) : null;

  const toggleSelect = (id: number) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(s => s.size === sorted.length ? new Set() : new Set(sorted.map(e => e.id)));

  const bulkStatus = async (status: string) => {
    if (selected.size === 0) return;
    await fetch(`${BASE}/api/portal/billing/time-entries/bulk-status`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), billingStatus: status }),
    });
    setSelected(new Set()); load();
  };

  const duplicate = async (entry: TimeEntry) => {
    await fetch(`${BASE}/api/portal/billing/time-entries/${entry.id}/duplicate`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today }),
    });
    load();
  };

  const del = async (id: number) => {
    await fetch(`${BASE}/api/portal/billing/time-entries/${id}`, { method: "DELETE", credentials: "include" });
    setConfirmDelete(null); load();
  };

  // Filter engagements based on selected client (prevent cross-client association)
  const filteredEngagements = filterClient
    ? engagements.filter(e => e.clientId === Number(filterClient))
    : engagements;

  const th = (label: string, key: SortKey) => (
    <th
      className="px-4 py-3 text-left text-xs tracking-[0.1em] uppercase text-muted-foreground cursor-pointer hover:text-foreground transition-colors whitespace-nowrap"
      onClick={() => toggleSort(key)}
    >
      {label} <SortIcon k={key} />
    </th>
  );

  // Navigate to portal client detail
  const goToClient = (e: TimeEntry) => {
    if (e.linkedPortalUserId) {
      setLocation(`/portal/admin/clients/${e.linkedPortalUserId}`);
    }
  };

  // Navigate to portal case detail
  const goToCase = (e: TimeEntry) => {
    if (e.linkedPortalCaseId) {
      setLocation(`/portal/admin/cases/${e.linkedPortalCaseId}`);
    }
  };

  return (
    <BillingLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl text-foreground">Time Entries</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => exportCSV(sorted)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors border border-white/10 hover:border-primary/30 px-4 py-2 rounded">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-5 py-2.5 rounded transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Entry
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
        <span className="text-muted-foreground self-center text-sm">–</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
        <select value={filterClient} onChange={e => { setFilterClient(e.target.value); setFilterEngagement(""); }}
          className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterEngagement} onChange={e => setFilterEngagement(e.target.value)}
          className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
          <option value="">All Engagements</option>
          {filteredEngagements.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={filterBillable} onChange={e => setFilterBillable(e.target.value)}
          className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
          <option value="">Billable & Non-Billable</option>
          <option value="true">Billable Only</option>
          <option value="false">Non-Billable Only</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
          <option value="">All Statuses</option>
          {["unbilled","ready_to_invoice","invoiced","paid","written_off"].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 border border-primary/30 bg-primary/5 rounded-lg">
          <span className="text-xs text-primary">{selected.size} selected</span>
          <button onClick={() => bulkStatus("ready_to_invoice")}
            className="text-xs bg-blue-900/40 hover:bg-blue-900/60 border border-blue-400/30 text-blue-300 px-3 py-1.5 rounded transition-colors">
            Mark Ready to Invoice
          </button>
          <button onClick={() => bulkStatus("written_off")}
            className="text-xs text-muted-foreground hover:text-foreground border border-white/10 hover:border-white/20 px-3 py-1.5 rounded transition-colors">
            Write Off
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-muted-foreground hover:text-foreground ml-auto">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/8 bg-white/2">
              <tr>
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={selected.size === sorted.length && sorted.length > 0}
                    onChange={toggleAll} className="accent-primary" />
                </th>
                {th("Date", "date")}
                {th("Client", "clientName")}
                {th("Case", "engagementName")}
                {th("Investigator", "investigator")}
                {th("Activity", "activityType")}
                <th className="px-4 py-3 text-left text-xs tracking-[0.1em] uppercase text-muted-foreground">Description</th>
                {th("Hours", "billedHours")}
                {th("Rate", "billingRate")}
                {th("Amount", "billableAmount")}
                {th("Status", "billingStatus")}
                <th className="px-4 py-3 text-right text-xs tracking-[0.1em] uppercase text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-muted-foreground text-sm">No entries found</td></tr>
              ) : sorted.map(e => (
                <tr key={e.id} className={`hover:bg-white/2 transition-colors ${selected.has(e.id) ? "bg-primary/5" : ""}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleSelect(e.id)} className="accent-primary" />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{e.date}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {e.linkedPortalUserId ? (
                      <button
                        onClick={() => goToClient(e)}
                        className="text-xs text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
                        title="Open client detail"
                      >
                        {e.clientName ?? "—"}
                      </button>
                    ) : (
                      <span className="text-xs text-foreground">{e.clientName ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[120px]">
                    {e.linkedPortalCaseId ? (
                      <button
                        onClick={() => goToCase(e)}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-2 hover:underline truncate block"
                        title="Open case detail"
                      >
                        {e.engagementName ?? "—"}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground truncate block">{e.engagementName ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{e.investigator}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{e.activityType}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate">{e.description ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-foreground text-right whitespace-nowrap">{parseFloat(e.billedHours).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground text-right whitespace-nowrap">
                    {e.billingRate ? `$${parseFloat(e.billingRate).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-right whitespace-nowrap">
                    {e.billable && e.billableAmount ? `$${parseFloat(e.billableAmount).toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {e.billingStatus === "ready_to_invoice" ? (
                      <button
                        title="Create invoice for this entry"
                        onClick={() => {
                          const q = new URLSearchParams({
                            preClientId: String(e.clientId),
                            preselect: String(e.id),
                            entryStatus: "ready_to_invoice",
                          });
                          if (e.engagementId) q.set("preEngId", String(e.engagementId));
                          setLocation(`/portal/admin/billing/statements/new?${q}`);
                        }}
                        className={`text-xs px-2 py-0.5 rounded border transition-all hover:ring-1 hover:ring-blue-400/50 hover:bg-blue-400/20 cursor-pointer flex items-center gap-1 ${STATUS_COLOR.ready_to_invoice}`}
                      >
                        ready to invoice <FileText className="w-3 h-3 opacity-70" />
                      </button>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLOR[e.billingStatus] ?? STATUS_COLOR.unbilled}`}>
                        {e.billingStatus.replace(/_/g, " ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditEntry(e)} title="Edit" className="text-muted-foreground/50 hover:text-primary transition-colors p-1">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => duplicate(e)} title="Duplicate" className="text-muted-foreground/50 hover:text-blue-400 transition-colors p-1">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {confirmDelete === e.id ? (
                        <span className="flex items-center gap-1">
                          <button onClick={() => del(e.id)} className="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-0.5 rounded">Del?</button>
                          <button onClick={() => setConfirmDelete(null)} className="text-xs text-muted-foreground px-1">✕</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDelete(e.id)} title="Delete" className="text-muted-foreground/30 hover:text-red-400 transition-colors p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals row */}
      {!loading && sorted.length > 0 && (
        <div className="flex items-center justify-end gap-8 mt-3 text-xs text-muted-foreground px-2">
          <span>{sorted.length} entries</span>
          <span>Total: <strong className="text-foreground">{sorted.reduce((s, e) => s + parseFloat(e.billedHours), 0).toFixed(2)}h</strong></span>
          <span>Billable: <strong className="text-foreground">${sorted.filter(e => e.billable).reduce((s, e) => s + parseFloat(e.billableAmount ?? "0"), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></span>
        </div>
      )}

      {showCreate && (
        <TimeEntryModal
          clients={clients}
          engagements={engagements}
          // Pre-select client if filter active (prevents cross-client association)
          initial={filterClient ? { clientId: filterClient } : undefined}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); load(); }}
        />
      )}
      {editEntry && (
        <TimeEntryModal
          clients={clients}
          engagements={engagements}
          editId={editEntry.id}
          initial={{
            date: editEntry.date, startTime: editEntry.startTime ?? "", endTime: editEntry.endTime ?? "",
            clientId: String(editEntry.clientId), engagementId: editEntry.engagementId ? String(editEntry.engagementId) : "",
            investigator: editEntry.investigator, activityType: editEntry.activityType,
            description: editEntry.description ?? "", billable: editEntry.billable,
            billingRate: editEntry.billingRate ?? "", internalNotes: editEntry.internalNotes ?? "",
          }}
          onClose={() => setEditEntry(null)} onSaved={() => { setEditEntry(null); load(); }}
        />
      )}
    </BillingLayout>
  );
}
