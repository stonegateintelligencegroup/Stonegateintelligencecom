import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Send } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminClientNew() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/portal/admin/clients`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to create client.");
      }
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6">
            <Send className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-serif text-2xl text-foreground mb-3">Invitation Sent</h2>
          <p className="text-muted-foreground text-sm mb-2">An invitation email has been sent to <strong className="text-foreground">{email}</strong>.</p>
          <p className="text-muted-foreground text-sm mb-8">The link expires in 72 hours. Once they set their password, the account will be active.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setName(""); setEmail(""); setDone(false); }}
              className="border border-white/15 hover:border-primary/40 text-foreground text-xs tracking-[0.15em] uppercase px-5 py-2.5 rounded transition-colors"
            >
              Add Another
            </button>
            <button
              onClick={() => setLocation("/portal/admin")}
              className="bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-5 py-2.5 rounded transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="border-b border-white/8 bg-black/80 sticky top-20 z-40">
        <div className="container mx-auto px-4 md:px-8 h-14 flex items-center gap-4">
          <button onClick={() => setLocation("/portal/admin")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </button>
          <span className="text-white/20">·</span>
          <span className="text-sm text-foreground">New Client</span>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-16">
        <div className="max-w-lg">
          <p className="text-xs tracking-[0.3em] uppercase text-primary mb-2">Administration</p>
          <h1 className="font-serif text-3xl text-foreground mb-10">Create Client Account</h1>

          <div className="border border-white/10 rounded-lg p-8 bg-white/2">
            {error && (
              <div className="mb-6 px-4 py-3 bg-red-950/50 border border-red-800/50 rounded text-sm text-red-400">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
                  placeholder="Client full name"
                />
              </div>
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
                  placeholder="client@example.com"
                />
              </div>
              <p className="text-xs text-muted-foreground">An invitation email will be sent to this address with a secure link to set their password. The link expires in 72 hours.</p>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-sans text-xs tracking-[0.2em] uppercase py-3 rounded transition-colors disabled:opacity-50"
              >
                {loading ? "Creating account…" : "Create Account & Send Invitation"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
