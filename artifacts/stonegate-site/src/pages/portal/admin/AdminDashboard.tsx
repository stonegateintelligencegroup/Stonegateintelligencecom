import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Users, Briefcase, LogOut, Plus, ClipboardList } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Client { id: number; name: string; email: string; isActive: boolean; createdAt: string; }
interface Case {
  id: number; caseNumber: string; status: string;
  clientId: number; clientName: string | null; clientEmail: string | null;
  assignedInvestigator: string | null; lastUpdate: string;
}
interface InquirySummary {
  id: number; fullName: string; email: string; status: string; createdAt: string;
  portalClientName: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  active:  "text-green-400 border-green-400/30 bg-green-400/10",
  on_hold: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  closed:  "text-muted-foreground border-white/10 bg-white/5",
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [inquiries, setInquiries] = useState<InquirySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/portal/admin/clients`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}/api/portal/admin/cases`, { credentials: "include" }).then(r => r.json()),
      fetch(`${BASE}/api/portal/admin/inquiries`, { credentials: "include" }).then(r => r.json()),
    ]).then(([c, ca, inq]) => {
      setClients(c);
      setCases(ca);
      setInquiries(Array.isArray(inq) ? inq : []);
    }).finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => { await logout(); setLocation("/portal/login"); };

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
          <div className="space-y-12">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "Total Clients",  value: clients.length,                                    anchor: "section-clients",  path: null },
                { label: "Active Clients", value: clients.filter(c => c.isActive).length,            anchor: "section-clients",  path: null },
                { label: "Total Cases",    value: cases.length,                                      anchor: "section-cases",    path: null },
                { label: "Active Cases",   value: cases.filter(c => c.status === "active").length,   anchor: "section-cases",    path: null },
                { label: "Inquiries",      value: inquiries.length,                                  anchor: null,               path: "/portal/admin/inquiries" },
              ].map(s => (
                <button
                  key={s.label}
                  onClick={() => s.path ? setLocation(s.path) : document.getElementById(s.anchor!)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className={`rounded-lg p-5 text-left transition-colors ${
                    s.path
                      ? "border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50"
                      : "border border-white/10 bg-white/2 hover:bg-white/4 hover:border-white/20"
                  }`}
                >
                  <p className="text-2xl font-serif text-foreground mb-1">{s.value}</p>
                  <p className={`text-xs tracking-[0.1em] uppercase ${s.path ? "text-primary/70" : "text-muted-foreground"}`}>{s.label}</p>
                </button>
              ))}
            </div>

            {/* Cases */}
            <div id="section-cases">
              <div className="flex items-center gap-3 mb-6">
                <Briefcase className="w-4 h-4 text-primary" />
                <h2 className="font-serif text-xl text-foreground">All Cases</h2>
              </div>
              {cases.length === 0 ? (
                <div className="border border-white/10 rounded-lg p-8 text-center text-muted-foreground text-sm">No cases yet</div>
              ) : (
                <div className="space-y-2">
                  {cases.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setLocation(`/portal/admin/cases/${c.id}`)}
                      className="w-full flex items-center justify-between border border-white/10 hover:border-primary/30 rounded-lg px-5 py-4 bg-white/2 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-6 min-w-0">
                        <div className="shrink-0">
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{c.caseNumber}</p>
                          <p className="text-xs text-muted-foreground">{c.clientName ?? "—"}</p>
                        </div>
                        {c.assignedInvestigator && (
                          <p className="text-xs text-muted-foreground hidden md:block">Inv: {c.assignedInvestigator}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <p className="text-xs text-muted-foreground hidden md:block">{new Date(c.lastUpdate).toLocaleDateString()}</p>
                        <span className={`text-xs px-2.5 py-1 rounded border tracking-[0.05em] uppercase ${STATUS_COLOR[c.status] ?? STATUS_COLOR.pending}`}>
                          {c.status.replace("_", " ")}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Inquiries */}
            {inquiries.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-4 h-4 text-primary" />
                    <h2 className="font-serif text-xl text-foreground">Recent Inquiries</h2>
                  </div>
                  <button onClick={() => setLocation("/portal/admin/inquiries")}
                    className="text-xs text-primary/70 hover:text-primary transition-colors">
                    View all →
                  </button>
                </div>
                <div className="space-y-2">
                  {inquiries.slice(0, 5).map(inq => (
                    <button key={inq.id} onClick={() => setLocation("/portal/admin/inquiries")}
                      className="w-full flex items-center justify-between border border-white/10 hover:border-primary/30 rounded-lg px-5 py-4 bg-white/2 transition-colors text-left group">
                      <div>
                        <p className="text-sm text-foreground group-hover:text-primary transition-colors">{inq.fullName}</p>
                        <p className="text-xs text-muted-foreground">{inq.email}{inq.portalClientName && <span className="text-primary/60 ml-2">· Portal Client</span>}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p className="text-xs text-muted-foreground hidden md:block">{new Date(inq.createdAt).toLocaleDateString()}</p>
                        <span className={`text-xs px-2.5 py-1 rounded border tracking-[0.05em] uppercase ${
                          inq.status === "new_inquiry" ? "text-amber-400 border-amber-400/30 bg-amber-400/10" :
                          inq.status === "accepted"    ? "text-green-400 border-green-400/30 bg-green-400/10" :
                          inq.status === "declined"    ? "text-red-400 border-red-400/30 bg-red-400/10" :
                          "text-blue-400 border-blue-400/30 bg-blue-400/10"
                        }`}>{inq.status.replace(/_/g, " ")}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clients */}
            <div id="section-clients">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-4 h-4 text-primary" />
                <h2 className="font-serif text-xl text-foreground">Clients</h2>
              </div>
              {clients.length === 0 ? (
                <div className="border border-white/10 rounded-lg p-8 text-center text-muted-foreground text-sm">No clients yet</div>
              ) : (
                <div className="space-y-2">
                  {clients.map(c => {
                    const clientCase = cases.find(ca => ca.clientId === c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => clientCase ? setLocation(`/portal/admin/cases/${clientCase.id}`) : setLocation(`/portal/admin/cases/new`)}
                        className="flex items-center justify-between border border-white/10 rounded-lg px-5 py-4 bg-white/2 cursor-pointer hover:border-primary/40 hover:bg-white/4 transition-colors"
                      >
                        <div>
                          <p className="text-sm text-foreground">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.email}</p>
                          {clientCase && <p className="text-xs text-primary/70 mt-0.5">{clientCase.caseNumber}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2.5 py-1 rounded border ${c.isActive ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-yellow-400 border-yellow-400/30 bg-yellow-400/10"}`}>
                            {c.isActive ? "Active" : "Invite Pending"}
                          </span>
                          <span className="text-muted-foreground/40 text-xs">→</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
