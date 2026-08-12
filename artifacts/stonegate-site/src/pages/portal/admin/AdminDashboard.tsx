import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Users, LogOut, Plus, Trash2, ChevronRight, FileText } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Client { id: number; name: string; email: string; isActive: boolean; createdAt: string; }
interface Case {
  id: number; caseNumber: string; status: string;
  clientId: number; clientName: string | null; clientEmail: string | null;
  assignedInvestigator: string | null; lastUpdate: string;
}
interface InquirySummary {
  id: number; fullName: string; email: string; status: string; createdAt: string;
  portalUserId: number | null; portalClientName: string | null;
}

const CASE_STATUS_COLOR: Record<string, string> = {
  pending: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  active:  "text-green-400 border-green-400/30 bg-green-400/10",
  on_hold: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  closed:  "text-muted-foreground border-white/10 bg-white/5",
};

const INQUIRY_STATUS_COLOR: Record<string, string> = {
  new_inquiry:     "text-amber-400 border-amber-400/30 bg-amber-400/10",
  accepted:        "text-green-400 border-green-400/30 bg-green-400/10",
  declined:        "text-red-400 border-red-400/30 bg-red-400/10",
  in_review:       "text-blue-400 border-blue-400/30 bg-blue-400/10",
  needs_follow_up: "text-purple-400 border-purple-400/30 bg-purple-400/10",
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [inquiries, setInquiries] = useState<InquirySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteClientId, setConfirmDeleteClientId] = useState<number | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<number | null>(null);
  const [confirmDeleteCaseId, setConfirmDeleteCaseId] = useState<number | null>(null);
  const [deletingCaseId, setDeletingCaseId] = useState<number | null>(null);

  const loadAll = () =>
    Promise.all([
      fetch(`${BASE}/api/portal/admin/clients`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}/api/portal/admin/cases`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}/api/portal/admin/inquiries`, { credentials: "include" }).then(r => r.json()),
    ]).then(([c, ca, inq]) => {
      setClients(Array.isArray(c) ? c : []);
      setCases(Array.isArray(ca) ? ca : []);
      setInquiries(Array.isArray(inq) ? inq : []);
    }).finally(() => setLoading(false));

  useEffect(() => { loadAll(); }, []);

  const handleLogout = async () => { await logout(); setLocation("/portal/login"); };

  const deleteClient = async (id: number) => {
    setDeletingClientId(id);
    try {
      const r = await fetch(`${BASE}/api/portal/admin/clients/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) return;
      setClients(prev => prev.filter(c => c.id !== id));
      setCases(prev => prev.filter(c => c.clientId !== id));
      setInquiries(prev => prev.map(i => i.portalUserId === id ? { ...i, portalUserId: null, portalClientName: null } : i));
    } finally {
      setDeletingClientId(null);
      setConfirmDeleteClientId(null);
    }
  };

  const deleteCase = async (id: number) => {
    setDeletingCaseId(id);
    try {
      const r = await fetch(`${BASE}/api/portal/admin/cases/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) return;
      setCases(prev => prev.filter(c => c.id !== id));
    } finally {
      setDeletingCaseId(null);
      setConfirmDeleteCaseId(null);
    }
  };

  // Inquiries not linked to any portal client
  const unlinkedInquiries = inquiries.filter(i => i.portalUserId === null);

  return (
    <div className="min-h-screen bg-black">
      {/* Admin Header */}
      <div className="border-b border-white/8 bg-black/80 sticky top-20 z-40">
        <div className="container mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs tracking-[0.2em] uppercase text-primary">Admin</span>
            <span className="text-white/20">·</span>
            <span className="text-sm text-foreground">{user?.name}</span>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-16">
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-primary mb-2">Administration</p>
            <h1 className="font-serif text-3xl text-foreground">Portal Dashboard</h1>
          </div>
          <button
            onClick={() => setLocation("/portal/admin/clients/new")}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-5 py-2.5 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New Client
          </button>
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <div className="space-y-10">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Clients",   value: clients.length },
                { label: "Active Clients",  value: clients.filter(c => c.isActive).length },
                { label: "Total Cases",     value: cases.length },
                { label: "Active Cases",    value: cases.filter(c => c.status === "active").length },
              ].map(s => (
                <div key={s.label} className="border border-white/10 bg-white/2 rounded-lg p-5">
                  <p className="text-2xl font-serif text-foreground mb-1">{s.value}</p>
                  <p className="text-xs tracking-[0.1em] uppercase text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Unified Clients + Cases + Inquiries */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-4 h-4 text-primary" />
                <h2 className="font-serif text-xl text-foreground">Clients</h2>
              </div>

              {clients.length === 0 && unlinkedInquiries.length === 0 ? (
                <div className="border border-white/10 rounded-lg p-8 text-center text-muted-foreground text-sm">
                  No clients yet
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Client rows */}
                  {clients.map(client => {
                    const clientCases = cases.filter(ca => ca.clientId === client.id);
                    const clientInquiry = inquiries.find(i => i.portalUserId === client.id);
                    const isConfirmingClient = confirmDeleteClientId === client.id;
                    const isDeletingClient = deletingClientId === client.id;

                    return (
                      <div key={client.id} className="border border-white/10 hover:border-white/20 rounded-lg px-5 py-4 bg-white/2 transition-colors">
                        <div className="flex items-start gap-4">
                          {/* Client identity */}
                          <div className="min-w-0 w-44 shrink-0">
                            <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                            {(() => {
                              const allClosed = clientCases.length > 0 && clientCases.every(c => c.status === "closed");
                              if (allClosed) return (
                                <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded border text-red-400 border-red-400/30 bg-red-400/10">Closed</span>
                              );
                              if (client.isActive) return (
                                <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded border text-green-400 border-green-400/30 bg-green-400/10">Active</span>
                              );
                              return (
                                <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded border text-yellow-400 border-yellow-400/30 bg-yellow-400/10">Invite Pending</span>
                              );
                            })()}
                          </div>

                          {/* Cases + inquiry */}
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Cases */}
                            {clientCases.length === 0 ? (
                              <button
                                onClick={() => setLocation("/portal/admin/cases/new")}
                                className="text-xs text-muted-foreground/50 hover:text-primary transition-colors flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Add case
                              </button>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {clientCases.map(c => {
                                  const isConfirmingCase = confirmDeleteCaseId === c.id;
                                  const isDeletingCase = deletingCaseId === c.id;
                                  return (
                                    <div key={c.id} className="flex items-center gap-1 group">
                                      <button
                                        onClick={() => setLocation(`/portal/admin/cases/${c.id}`)}
                                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors hover:opacity-80 ${CASE_STATUS_COLOR[c.status] ?? CASE_STATUS_COLOR.pending}`}
                                      >
                                        <ChevronRight className="w-3 h-3" />
                                        {c.caseNumber}
                                        <span className="opacity-60">· {c.status.replace("_", " ")}</span>
                                      </button>
                                      {isConfirmingCase ? (
                                        <span className="flex items-center gap-1">
                                          <button onClick={() => deleteCase(c.id)} disabled={isDeletingCase}
                                            className="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-0.5 rounded disabled:opacity-50">
                                            {isDeletingCase ? "…" : "Delete?"}
                                          </button>
                                          <button onClick={() => setConfirmDeleteCaseId(null)}
                                            className="text-xs text-muted-foreground hover:text-foreground px-1">✕</button>
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => setConfirmDeleteCaseId(c.id)}
                                          className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-400 transition-all p-0.5"
                                          title="Delete case"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Inquiry */}
                            {clientInquiry && (
                              <button
                                onClick={() => setLocation("/portal/admin/inquiries")}
                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors hover:opacity-80 ${INQUIRY_STATUS_COLOR[clientInquiry.status] ?? INQUIRY_STATUS_COLOR.new_inquiry}`}
                              >
                                <FileText className="w-3 h-3" />
                                Intake · {clientInquiry.status.replace(/_/g, " ")}
                                <span className="opacity-60 ml-1">{new Date(clientInquiry.createdAt).toLocaleDateString()}</span>
                              </button>
                            )}
                          </div>

                          {/* Delete client */}
                          <div className="shrink-0 flex items-center gap-2">
                            {isConfirmingClient ? (
                              <>
                                <button onClick={() => deleteClient(client.id)} disabled={isDeletingClient}
                                  className="text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50">
                                  {isDeletingClient ? "…" : "Confirm"}
                                </button>
                                <button onClick={() => setConfirmDeleteClientId(null)}
                                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1">
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button onClick={() => setConfirmDeleteClientId(client.id)}
                                className="text-muted-foreground/30 hover:text-red-400 transition-colors p-1" title="Delete client">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Unlinked inquiries */}
                  {unlinkedInquiries.length > 0 && (
                    <>
                      {clients.length > 0 && (
                        <div className="flex items-center gap-3 pt-4 pb-2">
                          <div className="flex-1 border-t border-white/8" />
                          <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground/50">Inquiries without a client account</span>
                          <div className="flex-1 border-t border-white/8" />
                        </div>
                      )}
                      {unlinkedInquiries.map(inq => (
                        <button
                          key={inq.id}
                          onClick={() => setLocation("/portal/admin/inquiries")}
                          className="w-full flex items-center gap-4 border border-white/8 hover:border-white/20 rounded-lg px-5 py-4 bg-white/1 transition-colors text-left group"
                        >
                          <div className="min-w-0 w-44 shrink-0">
                            <p className="text-sm text-foreground/80 group-hover:text-foreground truncate transition-colors">{inq.fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">{inq.email}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border ${INQUIRY_STATUS_COLOR[inq.status] ?? INQUIRY_STATUS_COLOR.new_inquiry}`}>
                              <FileText className="w-3 h-3" />
                              Intake · {inq.status.replace(/_/g, " ")}
                              <span className="opacity-60 ml-1">{new Date(inq.createdAt).toLocaleDateString()}</span>
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
