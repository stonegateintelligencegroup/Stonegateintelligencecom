import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";
import BillingLayout from "./BillingLayout";
import TimeEntryModal from "./TimeEntryModal";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Summary {
  totalHours: number; billableHours: number; nonBillableHours: number;
  billableAmount: number; unbilledAmount: number; invoicedAmount: number;
}
interface Client { id: number; name: string; }
interface Engagement { id: number; name: string; clientId: number; }

function fmt(n: number) { return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtH(n: number) { return n.toFixed(2) + "h"; }

export default function BillingDashboard() {
  const [, setLocation] = useLocation();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = today.slice(0, 7) + "-01";
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [clientId, setClientId] = useState("");
  const [engagementId, setEngagementId] = useState("");

  const loadSummary = async () => {
    setLoading(true);
    const params = new URLSearchParams({ dateFrom, dateTo });
    if (clientId) params.set("clientId", clientId);
    if (engagementId) params.set("engagementId", engagementId);
    const res = await fetch(`${BASE}/api/portal/billing/time-entries/summary?${params}`, { credentials: "include" });
    if (res.ok) setSummary(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/portal/billing/clients`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}/api/portal/billing/engagements`, { credentials: "include" }).then(r => r.json()),
    ]).then(([c, e]) => {
      setClients(Array.isArray(c) ? c : []);
      setEngagements(Array.isArray(e) ? e : []);
    });
  }, []);

  useEffect(() => { loadSummary(); }, [dateFrom, dateTo, clientId, engagementId]);

  const cards = summary ? [
    { label: "Total Hours",      value: fmtH(summary.totalHours),      sub: null },
    { label: "Billable Hours",   value: fmtH(summary.billableHours),   sub: null },
    { label: "Non-Billable",     value: fmtH(summary.nonBillableHours),sub: null },
    { label: "Billable Amount",  value: fmt(summary.billableAmount),    sub: null, accent: true },
    { label: "Unbilled",         value: fmt(summary.unbilledAmount),    sub: null },
    { label: "Invoiced",         value: fmt(summary.invoicedAmount),    sub: null },
  ] : [];

  const filteredEngagements = clientId
    ? engagements.filter(e => e.clientId === Number(clientId))
    : engagements;

  return (
    <BillingLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-primary mb-1">Admin · Billing</p>
          <h1 className="font-serif text-2xl md:text-3xl text-foreground">Billable Hours</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-5 py-2.5 rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Time Entry
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
        <span className="text-muted-foreground self-center text-sm">to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
        <select value={clientId} onChange={e => { setClientId(e.target.value); setEngagementId(""); }}
          className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={engagementId} onChange={e => setEngagementId(e.target.value)}
          className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
          <option value="">All Engagements</option>
          {filteredEngagements.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-white/10 rounded-lg p-5 bg-white/2 animate-pulse">
                <div className="h-7 bg-white/5 rounded mb-2" />
                <div className="h-3 bg-white/5 rounded w-2/3" />
              </div>
            ))
          : cards.map(c => (
              <div key={c.label} className={`border rounded-lg p-5 ${c.accent ? "border-primary/30 bg-primary/5" : "border-white/10 bg-white/2"}`}>
                <p className={`text-xl font-serif mb-1 ${c.accent ? "text-primary" : "text-foreground"}`}>{c.value}</p>
                <p className="text-xs tracking-[0.1em] uppercase text-muted-foreground">{c.label}</p>
              </div>
            ))
        }
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Manage Clients", desc: "Add and edit billing clients", href: "/portal/admin/billing/clients" },
          { label: "Engagements", desc: "Track cases and retainers", href: "/portal/admin/billing/engagements" },
          { label: "Time Entries", desc: "View and export time records", href: "/portal/admin/billing/time" },
        ].map(l => (
          <button key={l.href} onClick={() => setLocation(l.href)}
            className="border border-white/10 hover:border-primary/30 rounded-lg p-6 text-left transition-colors group bg-white/2">
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors mb-1">{l.label}</p>
            <p className="text-xs text-muted-foreground">{l.desc}</p>
          </button>
        ))}
      </div>

      {showModal && (
        <TimeEntryModal
          clients={clients}
          engagements={engagements}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadSummary(); }}
        />
      )}
    </BillingLayout>
  );
}
