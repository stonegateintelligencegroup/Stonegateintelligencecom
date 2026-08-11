import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Shield, LayoutDashboard, Users } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showChoice, setShowChoice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === "admin") {
        setShowChoice(true);
      } else {
        setLocation("/portal/dashboard");
      }
    } catch (err: any) {
      setError(err.message ?? "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  if (showChoice) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="flex flex-col items-center mb-10">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-serif text-2xl text-foreground mb-1">Welcome back, Monica</h1>
            <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase">Select a view to continue</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setLocation("/portal/admin")}
              className="group border border-white/10 hover:border-primary/50 bg-white/2 hover:bg-primary/5 rounded-lg p-8 text-left transition-all"
            >
              <div className="w-10 h-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 group-hover:border-primary/40 transition-colors">
                <LayoutDashboard className="w-5 h-5 text-primary" />
              </div>
              <p className="font-serif text-lg text-foreground mb-1">Administration</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Manage clients, cases, and intake submissions.</p>
            </button>

            <button
              onClick={() => setLocation("/portal/dashboard")}
              className="group border border-white/10 hover:border-white/30 bg-white/2 hover:bg-white/4 rounded-lg p-8 text-left transition-all"
            >
              <div className="w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center mb-5 group-hover:border-white/20 transition-colors">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="font-serif text-lg text-foreground mb-1">Client View</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Access the portal as a client would see it.</p>
            </button>
          </div>
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
          <h1 className="font-serif text-2xl text-foreground mb-1">Client Portal</h1>
          <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase">Stonegate Intelligence Group</p>
        </div>

        <div className="border border-white/10 bg-white/2 rounded-lg p-8">
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-950/50 border border-red-800/50 rounded text-sm text-red-400">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-sans text-xs tracking-[0.2em] uppercase py-3 rounded transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setLocation("/portal/forgot-password")}
                className="text-xs text-muted-foreground hover:text-primary/70 transition-colors"
              >
                Forgot password?
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Access by invitation only. Contact Stonegate Intelligence Group to request access.
        </p>
      </div>
    </div>
  );
}
