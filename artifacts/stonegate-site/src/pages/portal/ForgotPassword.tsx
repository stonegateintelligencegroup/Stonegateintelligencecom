import { useState } from "react";
import { useLocation } from "wouter";
import { Shield } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Something went wrong.");
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
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h2 className="font-serif text-2xl text-foreground mb-3">Check Your Email</h2>
          <p className="text-muted-foreground text-sm mb-6">
            If an account exists for that address, a password reset link has been sent. The link expires in 1 hour.
          </p>
          <button
            onClick={() => setLocation("/portal/login")}
            className="text-primary/70 hover:text-primary text-sm transition-colors underline-offset-2 hover:underline"
          >
            Back to sign in
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
          <h1 className="font-serif text-2xl text-foreground mb-1">Forgot Password</h1>
          <p className="text-xs text-muted-foreground tracking-[0.2em] uppercase">Stonegate Intelligence Group</p>
        </div>

        <div className="border border-white/10 bg-white/2 rounded-lg p-8">
          <p className="text-sm text-muted-foreground mb-6">
            Enter the email address associated with your account and we'll send you a reset link.
          </p>
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
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-sans text-xs tracking-[0.2em] uppercase py-3 rounded transition-colors disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Remember your password?{" "}
          <button
            onClick={() => setLocation("/portal/login")}
            className="text-primary/70 hover:text-primary transition-colors underline-offset-2 hover:underline"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
