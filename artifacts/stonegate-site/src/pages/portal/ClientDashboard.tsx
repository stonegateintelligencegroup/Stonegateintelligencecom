import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Briefcase, Clock, User, AlertCircle, LogOut, FileText } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Case {
  id: number;
  caseNumber: string;
  status: string;
  assignedInvestigator: string | null;
  lastUpdate: string;
  notes: string | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:  { label: "Pending",  color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" },
  active:   { label: "Active",   color: "text-green-400 bg-green-400/10 border-green-400/30" },
  on_hold:  { label: "On Hold",  color: "text-orange-400 bg-orange-400/10 border-orange-400/30" },
  closed:   { label: "Closed",   color: "text-muted-foreground bg-white/5 border-white/10" },
};

interface ClientNote { id: number; title: string; content: string; updatedAt: string; }

export default function ClientDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/api/portal/client/case`, { credentials: "include" })
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(setCaseData)
        .catch(e => { if (e !== 404) setError("Could not load case data."); }),
      fetch(`${BASE}/api/portal/client/notes`, { credentials: "include" })
        .then(r => r.ok ? r.json() : [])
        .then(data => setClientNotes(Array.isArray(data) ? data : []))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => { await logout(); setLocation("/portal/login"); };

  const status = caseData ? (STATUS_LABELS[caseData.status] ?? STATUS_LABELS.pending) : null;

  return (
    <div className="min-h-screen bg-black">
      {/* Portal Header */}
      <div className="border-b border-white/8 bg-black/80 sticky top-20 z-40">
        <div className="container mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs tracking-[0.2em] uppercase text-muted-foreground">Client Portal</span>
            <span className="text-white/20">·</span>
            <span className="text-sm text-foreground">{user?.name}</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setLocation("/portal/documents")} className="text-xs tracking-[0.1em] uppercase text-muted-foreground hover:text-primary transition-colors">Documents</button>
            <button onClick={() => setLocation("/portal/messages")} className="text-xs tracking-[0.1em] uppercase text-muted-foreground hover:text-primary transition-colors">Messages</button>
            <button onClick={() => setLocation("/portal/statements")} className="text-xs tracking-[0.1em] uppercase text-muted-foreground hover:text-primary transition-colors">Billing Statements</button>
            <button onClick={() => setLocation("/portal/intake")} className="text-xs tracking-[0.1em] uppercase text-muted-foreground hover:text-primary transition-colors">Intake Form</button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-16">
        <div className="mb-12">
          <p className="text-xs tracking-[0.3em] uppercase text-primary mb-2">Secure Client Portal</p>
          <h1 className="font-serif text-3xl md:text-4xl text-foreground">Welcome, {user?.name?.split(" ")[0]}</h1>
        </div>

        {loading && <p className="text-muted-foreground text-sm">Loading your case information…</p>}
        {error && (
          <div className="flex items-center gap-3 text-red-400 text-sm"><AlertCircle className="w-4 h-4" />{error}</div>
        )}

        {!loading && !caseData && !error && (
          <div className="border border-white/10 rounded-lg p-12 text-center max-w-lg">
            <Briefcase className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground mb-2">No case assigned yet</p>
            <p className="text-sm text-muted-foreground">Your case details will appear here once an investigator has been assigned. Please contact us if you have any questions.</p>
          </div>
        )}

        {caseData && (
          <div className="grid gap-6 max-w-4xl">
            {/* Case Overview */}
            <div className="border border-white/10 rounded-lg p-8 bg-white/2">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1">Case Number</p>
                  <p className="font-serif text-2xl text-foreground">{caseData.caseNumber}</p>
                </div>
                {status && (
                  <span className={`text-xs tracking-[0.1em] uppercase px-3 py-1 rounded border ${status.color}`}>
                    {status.label}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1">Assigned Investigator</p>
                    <p className="text-sm text-foreground">{caseData.assignedInvestigator ?? "To be assigned"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1">Last Update</p>
                    <p className="text-sm text-foreground">{new Date(caseData.lastUpdate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                </div>
              </div>
              {caseData.notes && (
                <div className="mt-6 pt-6 border-t border-white/8">
                  <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm text-foreground/80 leading-relaxed">{caseData.notes}</p>
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setLocation("/portal/documents")} className="border border-white/10 hover:border-primary/30 rounded-lg p-6 text-left transition-colors group bg-white/2">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors mb-1">Documents</p>
                <p className="text-xs text-muted-foreground">Upload files or download reports shared by Stonegate</p>
              </button>
              <button onClick={() => setLocation("/portal/messages")} className="border border-white/10 hover:border-primary/30 rounded-lg p-6 text-left transition-colors group bg-white/2">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors mb-1">Secure Messages</p>
                <p className="text-xs text-muted-foreground">Communicate directly with your investigative team</p>
              </button>
            </div>

            {/* Notes from Investigator */}
            {clientNotes.length > 0 && (
              <div className="border border-white/10 rounded-lg bg-white/2 overflow-hidden">
                <div className="px-8 py-5 border-b border-white/8 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-primary" />
                  <h2 className="font-serif text-xl text-foreground">Notes from Investigator</h2>
                  <span className="text-xs text-muted-foreground">({clientNotes.length})</span>
                </div>
                <div className="divide-y divide-white/5">
                  {clientNotes.map(note => (
                    <div key={note.id} className="px-8 py-5">
                      <p className="text-sm font-medium text-foreground mb-2">{note.title || "Note"}</p>
                      {note.content && (
                        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                      )}
                      <p className="text-xs text-muted-foreground/50 mt-3">
                        {new Date(note.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
