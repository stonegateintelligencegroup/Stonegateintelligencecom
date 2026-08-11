import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { Shield } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SetPassword() {
  const params = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token, password }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to set password.");
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
        <div className="text-center max-w-lg">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h2 className="font-serif text-2xl text-foreground mb-3">Account Activated</h2>
          <p className="text-muted-foreground text-sm mb-8">
            Your Stonegate Intelligence Group portal account is now active.
            <br />
            Before signing in, please complete the Client Information Sheet so our team can prepare for your engagement.
          </p>
          <button
            onClick={() => setLocation("/intake?onboarding=1")}
            className="w-full bg-primary hover:bg-primary/90 text-white font-sans text-xs tracking-[0.2em] uppercase py-3 px-8 rounded transition-colors mb-3"
          >
            Complete Client Information Sheet
          </button>
          <button
            onClick={() => setLocation("/portal/login")}
            className="w-full text-muted-foreground hover:text-foreground text-xs tracking-[0.15em] uppercase py-2 transition-colors"
          >
            Skip for now — Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-serif text-2xl text-foreground mb-1">Set Your Password</h1>
          <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase">Stonegate Intelligence Group</p>
        </div>
        <div className="border border-white/10 bg-white/2 rounded-lg p-8">
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-950/50 border border-red-800/50 rounded text-sm text-red-400">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors"
                placeholder="Minimum 8 characters"
              />
            </div>
            <div>
              <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors"
                placeholder="Re-enter password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-sans text-xs tracking-[0.2em] uppercase py-3 rounded transition-colors disabled:opacity-50"
            >
              {loading ? "Setting password…" : "Set Password & Activate Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
