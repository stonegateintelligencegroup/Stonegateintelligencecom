import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Plus, Pencil, Trash2, Eye, Send, FileText } from "lucide-react";
import BillingLayout from "./BillingLayout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUSES = ["draft", "published", "paid", "partially_paid", "overdue", "void"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_COLOR: Record<Status, string> = {
  draft:           "text-muted-foreground border-white/10 bg-white/5",
  published:       "text-blue-400 border-blue-400/30 bg-blue-400/10",
  paid:            "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  partially_paid:  "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  overdue:         "text-red-400 border-red-400/30 bg-red-400/10",
  void:            "text-muted-foreground/40 border-white/5 bg-white/2",
};

interface Statement {
  id: number;
  statementNumber: string;
  billingPeriod: string;
  statementDate: string;
  dueDate: string | null;
  amountDue: string;
  currentCharges: string;
  previousBalance: string;
  paymentsCredits: string;
  status: Status;
  publishedAt: string | null;
  clientName: string | null;
  engagementName: string | null;
  portalUserName: string | null;
}

interface Client { id: number; name: string; linkedPortalUserId: number | null; }
interface Engagement { id: number; name: string; clientId: number; }

function fmt(n: string | number) {
  return `$${parseFloat(String(n)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BillingStatements() {
  const [, setLocation] = useLocation();
  const [statements, setStatements] = useState<Statement[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [publishing, setPublishing] = useState<number | null>(null);

  const load = async () => {
    const [s, c, e] = await Promise.all([
      fetch(`${BASE}/api/portal/billing/statements`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}/api/portal/billing/clients`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}/api/portal/billing/engagements`, { credentials: "include" }).then(r => r.json()),
    ]);
    setStatements(Array.isArray(s) ? s : []);
    setClients(Array.isArray(c) ? c : []);
    setEngagements(Array.isArray(e) ? e : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = statements.filter(s =>
    (!filterClient || String(s.clientName)?.toLowerCase().includes(filterClient.toLowerCase()) ||
      clients.find(c => c.name === s.clientName && String(c.id) === filterClient)) &&
    (!filterStatus || s.status === filterStatus)
  );

  // Filter by client id properly
  const filteredByClient = filterClient
    ? statements.filter(s => {
        const client = clients.find(c => String(c.id) === filterClient);
        return client ? s.clientName === client.name : true;
      })
    : statements;
  const displayStatements = filterStatus
    ? filteredByClient.filter(s => s.status === filterStatus)
    : filteredByClient;

  const publish = async (id: number) => {
    setPublishing(id);
    await fetch(`${BASE}/api/portal/billing/statements/${id}/publish`, {
      method: "POST", credentials: "include",
    });
    setPublishing(null);
    load();
  };

  const del = async (id: number) => {
    await fetch(`${BASE}/api/portal/billing/statements/${id}`, {
      method: "DELETE", credentials: "include",
    });
    setConfirmDelete(null);
    load();
  };

  return (
    <BillingLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs tracking-[0.3em] uppercase text-primary mb-1">Admin · Billing</p>
          <h1 className="font-serif text-2xl md:text-3xl text-foreground">Billing Statements</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and publish client-facing billing statements</p>
        </div>
        <button
          onClick={() => setLocation("/portal/admin/billing/statements/new")}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-5 py-2.5 rounded transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New Statement
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
          className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
          <option value="">All Clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-black border border-white/15 rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {/* Statement list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-white/10 rounded-lg p-5 animate-pulse bg-white/2 h-20" />
          ))}
        </div>
      ) : displayStatements.length === 0 ? (
        <div className="border border-white/10 rounded-lg p-12 text-center">
          <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No billing statements yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Create a statement to send to a client</p>
        </div>
      ) : (
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-white/8 bg-white/2">
              <tr>
                <th className="px-5 py-3 text-left text-xs tracking-[0.1em] uppercase text-muted-foreground">Statement #</th>
                <th className="px-5 py-3 text-left text-xs tracking-[0.1em] uppercase text-muted-foreground">Client</th>
                <th className="px-5 py-3 text-left text-xs tracking-[0.1em] uppercase text-muted-foreground">Period</th>
                <th className="px-5 py-3 text-left text-xs tracking-[0.1em] uppercase text-muted-foreground">Date</th>
                <th className="px-5 py-3 text-left text-xs tracking-[0.1em] uppercase text-muted-foreground">Due</th>
                <th className="px-5 py-3 text-right text-xs tracking-[0.1em] uppercase text-muted-foreground">Amount Due</th>
                <th className="px-5 py-3 text-left text-xs tracking-[0.1em] uppercase text-muted-foreground">Status</th>
                <th className="px-5 py-3 text-right text-xs tracking-[0.1em] uppercase text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayStatements.map(s => (
                <tr key={s.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-4">
                    <span className="text-xs font-mono text-foreground">{s.statementNumber}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-foreground">{s.clientName ?? "—"}</span>
                    {s.engagementName && <span className="text-xs text-muted-foreground block">{s.engagementName}</span>}
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">{s.billingPeriod}</td>
                  <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">{s.statementDate}</td>
                  <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">{s.dueDate ?? "—"}</td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-sm font-medium text-foreground">{fmt(s.amountDue)}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLOR[s.status] ?? STATUS_COLOR.draft}`}>
                      {s.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setLocation(`/portal/admin/billing/statements/${s.id}`)}
                        title="View / Edit"
                        className="text-muted-foreground/50 hover:text-primary transition-colors p-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {s.status === "draft" && (
                        <>
                          <button
                            onClick={() => setLocation(`/portal/admin/billing/statements/${s.id}/edit`)}
                            title="Edit"
                            className="text-muted-foreground/50 hover:text-primary transition-colors p-1"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => publish(s.id)}
                            disabled={publishing === s.id}
                            title="Publish to client portal"
                            className="text-muted-foreground/50 hover:text-emerald-400 transition-colors p-1 disabled:opacity-40"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {confirmDelete === s.id ? (
                        <span className="flex items-center gap-1">
                          <button onClick={() => del(s.id)} className="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-0.5 rounded">Del?</button>
                          <button onClick={() => setConfirmDelete(null)} className="text-xs text-muted-foreground px-1">✕</button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(s.id)}
                          title="Delete"
                          className="text-muted-foreground/30 hover:text-red-400 transition-colors p-1"
                        >
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
      )}

      {/* Legend */}
      <div className="mt-6 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground/50">Status:</span>
        {STATUSES.map(s => (
          <span key={s} className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLOR[s]}`}>
            {s.replace(/_/g, " ")}
          </span>
        ))}
      </div>
    </BillingLayout>
  );
}
