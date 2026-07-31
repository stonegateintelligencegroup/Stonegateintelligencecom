import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Client { id: number; name: string; email: string; isActive: boolean; }

export default function AdminNewCase() {
  const [, setLocation] = useLocation();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [investigator, setInvestigator] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/portal/admin/clients`, { credentials: "include" })
      .then(r => r.json()).then(setClients);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/portal/admin/cases`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: Number(clientId), caseNumber, assignedInvestigator: investigator || null }),
      });
      if (!res.ok) { const { error } = await res.json(); throw new Error(error); }
      const newCase = await res.json();
      setLocation(`/portal/admin/cases/${newCase.id}`);
    } catch (err: any) {
      setError(err.message ?? "Failed to create case.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="border-b border-white/8 bg-black/80 sticky top-20 z-40">
        <div className="container mx-auto px-4 md:px-8 h-14 flex items-center gap-4">
          <button onClick={() => setLocation("/portal/admin")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </button>
          <span className="text-white/20">·</span>
          <span className="text-sm text-foreground">New Case</span>
        </div>
      </div>
      <div className="container mx-auto px-4 md:px-8 py-16 max-w-lg">
        <p className="text-xs tracking-[0.3em] uppercase text-primary mb-2">Administration</p>
        <h1 className="font-serif text-3xl text-foreground mb-10">Create New Case</h1>
        <div className="border border-white/10 rounded-lg p-8 bg-white/2">
          {error && <div className="mb-5 px-4 py-3 bg-red-950/50 border border-red-800/50 rounded text-sm text-red-400">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">Client</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)} required className="w-full bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
                <option value="">Select a client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">Case Number</label>
              <input type="text" value={caseNumber} onChange={e => setCaseNumber(e.target.value)} required className="w-full bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors" placeholder="e.g. SIG-2025-001" />
            </div>
            <div>
              <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">Assigned Investigator (optional)</label>
              <input type="text" value={investigator} onChange={e => setInvestigator(e.target.value)} className="w-full bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors" placeholder="Investigator name" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white font-sans text-xs tracking-[0.2em] uppercase py-3 rounded transition-colors disabled:opacity-50">
              {loading ? "Creating…" : "Create Case"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
