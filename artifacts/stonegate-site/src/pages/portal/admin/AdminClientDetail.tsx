import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Plus, Clock, ChevronRight, AlertCircle } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PortalClient {
  id: number; name: string; email: string; isActive: boolean; createdAt: string;
  cases: PortalCase[];
}
interface PortalCase {
  id: number; caseNumber: string; status: string;
  assignedInvestigator: string | null; notes: string | null;
  lastUpdate: string; createdAt: string;
}
interface TimeEntry {
  id: number; date: string; billedHours: string;
  engagementId: number | null; engagementName: string | null;
  investigator: string; activityType: string; description: string | null;
  billable: boolean; billingRate: string | null; billableAmount: string | null;
  billingStatus: string;
}
interface BillingSummary {
  totalHours: number; billableAmount: number; unbilledAmount: number;
  invoicedAmount: number; paidAmount: number; retainerBalance: number | null;
}
interface BillingData {
  linked: boolean; billingClientId: number | null; billingClientName: string | null;
  summary: BillingSummary | null; entries: TimeEntry[];
}

const CASE_STATUS_COLOR: Record<string, string> = {
  pending: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  active:  "text-green-400 border-green-400/30 bg-green-400/10",
  on_hold: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  closed:  "text-muted-foreground border-white/10 bg-white/5",
};
const BILLING_STATUS_COLOR: Record<string, string> = {
  unbilled: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  ready_to_invoice: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  invoiced: "text-green-400 border-green-400/30 bg-green-400/10",
  paid: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  written_off: "text-muted-foreground border-white/10 bg-white/5",
};

type Tab = "overview" | "cases" | "billing";

function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminClientDetail() {
  const params = useParams<{ id: string }>();
  const clientId = Number(params.id);
  const [, setLocation] = useLocation();

  const [client, setClient] = useState<PortalClient | null>(null);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [error, setError] = useState("");

  // Billing tab filters
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = today.slice(0, 7) + "-01";
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [filterEngagement, setFilterEngagement] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterInvestigator, setFilterInvestigator] = useState("");

  useEffect(() => {
    fetch(`${BASE}/api/portal/admin/clients/${clientId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setClient(d); else setError("Client not found."); })
      .finally(() => setLoading(false));
  }, [clientId]);

  const loadBilling = () => {
    setBillingLoading(true);
    fetch(`${BASE}/api/portal/admin/clients/${clientId}/billing`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setBilling(d))
      .finally(() => setBillingLoading(false));
  };

  useEffect(() => {
    if (activeTab === "billing" && !billing) loadBilling();
  }, [activeTab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "cases", label: "Cases" },
    { key: "billing", label: "Billing & Time" },
  ];

  const billingUrl = (extra = "") => {
    const name = encodeURIComponent(client?.name ?? "");
    return `${BASE}/portal/admin/billing${extra}?from=client&fromId=${clientId}&fromName=${name}${billing?.billingClientId ? `&clientId=${billing.billingClientId}` : ""}`;
  };

  const filteredEntries = (billing?.entries ?? []).filter(e => {
    if (filterEngagement && String(e.engagementId) !== filterEngagement) return false;
    if (filterStatus && e.billingStatus !== filterStatus) return false;
    if (filterInvestigator && !e.investigator.toLowerCase().includes(filterInvestigator.toLowerCase())) return false;
    if (e.date < dateFrom || e.date > dateTo) return false;
    return true;
  });

  const engagements = Array.from(
    new Map((billing?.entries ?? [])
      .filter(e => e.engagementId)
      .map(e => [e.engagementId, { id: e.engagementId!, name: e.engagementName ?? "" }])
    ).values()
  );

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Loading…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-white/8 bg-black/80 sticky top-20 z-40">
        <div className="container mx-auto px-4 md:px-8">
          <div className="h-14 flex items-center gap-4">
            <button
              onClick={() => setLocation("/portal/admin")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-xs shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Client Portal
            </button>
            <span className="text-white/20">·</span>
            <span className="text-sm text-foreground truncate">{client?.name ?? "Client"}</span>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1 -mb-px">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-3 text-xs tracking-[0.1em] uppercase border-b-2 transition-colors ${
                  activeTab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-10 max-w-5xl">
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-6">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && client && (
          <div className="space-y-8">
            <div>
              <p className="text-xs tracking-[0.3em] uppercase text-primary mb-1">Client</p>
              <h1 className="font-serif text-3xl text-foreground mb-1">{client.name}</h1>
              <p className="text-muted-foreground text-sm">{client.email}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-white/10 rounded-lg p-5 bg-white/2">
                <p className="text-xs tracking-[0.1em] uppercase text-muted-foreground mb-2">Account Status</p>
                <span className={`text-sm px-2.5 py-1 rounded border ${client.isActive ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"}`}>
                  {client.isActive ? "Active" : "Invite Pending"}
                </span>
              </div>
              <div className="border border-white/10 rounded-lg p-5 bg-white/2">
                <p className="text-xs tracking-[0.1em] uppercase text-muted-foreground mb-2">Cases</p>
                <p className="text-2xl font-serif text-foreground">{client.cases.length}</p>
              </div>
              <div className="border border-white/10 rounded-lg p-5 bg-white/2">
                <p className="text-xs tracking-[0.1em] uppercase text-muted-foreground mb-2">Client Since</p>
                <p className="text-sm text-foreground">{new Date(client.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab("billing")}
                className="flex items-center gap-2 border border-primary/30 hover:border-primary/60 text-primary text-xs tracking-[0.12em] uppercase px-5 py-2.5 rounded transition-colors"
              >
                <Clock className="w-3.5 h-3.5" /> Billing & Time
              </button>
              <button
                onClick={() => {
                  const name = encodeURIComponent(client.name);
                  const bid = billing?.billingClientId;
                  setLocation(`/portal/admin/billing/time${bid ? `?clientId=${bid}` : ""}&from=client&fromId=${clientId}&fromName=${name}`.replace("?&", "?"));
                }}
                className="flex items-center gap-2 text-muted-foreground hover:text-primary border border-white/10 hover:border-primary/30 text-xs tracking-[0.12em] uppercase px-5 py-2.5 rounded transition-colors"
              >
                View All Time Entries →
              </button>
              <button
                onClick={() => setLocation("/portal/admin/cases/new")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground border border-white/10 text-xs tracking-[0.12em] uppercase px-5 py-2.5 rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Case
              </button>
            </div>
          </div>
        )}

        {/* ── CASES ── */}
        {activeTab === "cases" && client && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-xl text-foreground">Cases</h2>
              <button
                onClick={() => setLocation("/portal/admin/cases/new")}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-4 py-2 rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Case
              </button>
            </div>
            {client.cases.length === 0 ? (
              <div className="border border-white/10 rounded-lg p-8 text-center text-muted-foreground text-sm">No cases yet</div>
            ) : (
              <div className="space-y-2">
                {client.cases.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setLocation(`/portal/admin/cases/${c.id}`)}
                    className="w-full flex items-center justify-between border border-white/10 hover:border-white/25 rounded-lg px-5 py-4 bg-white/2 transition-colors group text-left"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span className={`text-xs px-2.5 py-1 rounded border shrink-0 ${CASE_STATUS_COLOR[c.status] ?? CASE_STATUS_COLOR.pending}`}>
                        {c.status.replace(/_/g, " ")}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{c.caseNumber}</p>
                        {c.assignedInvestigator && (
                          <p className="text-xs text-muted-foreground">Investigator: {c.assignedInvestigator}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BILLING & TIME ── */}
        {activeTab === "billing" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-xl text-foreground">Billing & Time</h2>
              <button
                onClick={() => {
                  if (!client) return;
                  const name = encodeURIComponent(client.name);
                  const bid = billing?.billingClientId;
                  const q = new URLSearchParams({ from: "client", fromId: String(clientId), fromName: client.name });
                  if (bid) q.set("clientId", String(bid));
                  setLocation(`/portal/admin/billing/time?${q}`);
                }}
                className="flex items-center gap-2 border border-primary/30 hover:border-primary/60 text-primary text-xs tracking-[0.12em] uppercase px-4 py-2 rounded transition-colors"
              >
                <Clock className="w-3.5 h-3.5" /> Open in Billable Hours
              </button>
            </div>

            {billingLoading ? (
              <p className="text-sm text-muted-foreground">Loading billing data…</p>
            ) : !billing?.linked ? (
              <div className="border border-white/10 rounded-lg p-8 text-center space-y-3">
                <p className="text-muted-foreground text-sm">No billing profile linked to this client.</p>
                <p className="text-xs text-muted-foreground/60">Create a billing client in the Billable Hours system and link it to this portal client.</p>
                <button
                  onClick={() => setLocation(`/portal/admin/billing/clients`)}
                  className="text-xs text-primary hover:text-primary/80 transition-colors underline"
                >
                  Go to Billing Clients →
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: "Billable Hours", value: (billing.summary?.totalHours ?? 0).toFixed(2) + "h" },
                    { label: "Billable Amount", value: fmt(billing.summary?.billableAmount ?? 0), accent: true },
                    { label: "Unbilled", value: fmt(billing.summary?.unbilledAmount ?? 0) },
                    { label: "Invoiced", value: fmt(billing.summary?.invoicedAmount ?? 0) },
                    { label: "Paid", value: fmt(billing.summary?.paidAmount ?? 0) },
                    ...(billing.summary?.retainerBalance != null
                      ? [{ label: "Retainer Balance", value: fmt(billing.summary.retainerBalance) }]
                      : []),
                  ].map(c => (
                    <div key={c.label} className={`border rounded-lg p-4 ${(c as any).accent ? "border-primary/30 bg-primary/5" : "border-white/10 bg-white/2"}`}>
                      <p className={`text-lg font-serif ${(c as any).accent ? "text-primary" : "text-foreground"}`}>{c.value}</p>
                      <p className="text-xs tracking-[0.08em] uppercase text-muted-foreground mt-0.5">{c.label}</p>
                    </div>
                  ))}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2">
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
                  <span className="text-muted-foreground self-center text-sm">–</span>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
                  <select value={filterEngagement} onChange={e => setFilterEngagement(e.target.value)}
                    className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
                    <option value="">All Cases</option>
                    {engagements.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  <input
                    value={filterInvestigator} onChange={e => setFilterInvestigator(e.target.value)}
                    placeholder="Investigator…"
                    className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors w-40"
                  />
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
                    <option value="">All Statuses</option>
                    {["unbilled","ready_to_invoice","invoiced","paid","written_off"].map(s => (
                      <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>

                {/* Time entry table */}
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-white/8 bg-white/2">
                        <tr>
                          {["Date","Case","Investigator","Activity","Description","Hours","Rate","Amount","Status"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs tracking-[0.1em] uppercase text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredEntries.length === 0 ? (
                          <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground text-sm">No entries in this range</td></tr>
                        ) : filteredEntries.map(e => (
                          <tr key={e.id} className="hover:bg-white/2 transition-colors">
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{e.date}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate">{e.engagementName ?? "—"}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{e.investigator}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{e.activityType}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate">{e.description ?? "—"}</td>
                            <td className="px-4 py-3 text-xs text-foreground text-right whitespace-nowrap">{parseFloat(e.billedHours).toFixed(2)}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground text-right whitespace-nowrap">{e.billingRate ? `$${parseFloat(e.billingRate).toFixed(2)}` : "—"}</td>
                            <td className="px-4 py-3 text-xs font-medium text-right whitespace-nowrap">
                              {e.billable && e.billableAmount ? `$${parseFloat(e.billableAmount).toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`text-xs px-2 py-0.5 rounded border ${BILLING_STATUS_COLOR[e.billingStatus] ?? BILLING_STATUS_COLOR.unbilled}`}>
                                {e.billingStatus.replace(/_/g, " ")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {filteredEntries.length > 0 && (
                  <div className="flex justify-end gap-8 text-xs text-muted-foreground px-1">
                    <span>Showing {filteredEntries.length} entries</span>
                    <span>Total: <strong className="text-foreground">{filteredEntries.reduce((s, e) => s + parseFloat(e.billedHours), 0).toFixed(2)}h</strong></span>
                    <span>Billable: <strong className="text-foreground">${filteredEntries.filter(e => e.billable).reduce((s, e) => s + parseFloat(e.billableAmount ?? "0"), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
