import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { FileText, ArrowLeft, ChevronRight } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUS_COLOR: Record<string, string> = {
  published:      "text-blue-400 border-blue-400/30 bg-blue-400/10",
  paid:           "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  partially_paid: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  overdue:        "text-red-400 border-red-400/30 bg-red-400/10",
};

interface Statement {
  id: number;
  statementNumber: string;
  billingPeriod: string;
  statementDate: string;
  dueDate: string | null;
  amountDue: string;
  status: string;
}

function fmt(n: string | number) {
  return `$${parseFloat(String(n)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ClientBillingStatements() {
  const [, setLocation] = useLocation();
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${BASE}/api/portal/client/statements`, { credentials: "include" })
      .then(r => {
        if (!r.ok) throw new Error("Failed to load statements");
        return r.json();
      })
      .then(d => setStatements(Array.isArray(d) ? d : []))
      .catch(() => setError("Unable to load billing statements."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-white/8 bg-black sticky top-0 z-40">
        <div className="container mx-auto px-4 md:px-8">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setLocation("/portal/dashboard")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Dashboard
              </button>
              <span className="text-white/15">|</span>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary/60" />
                <span className="text-sm text-foreground">Billing Statements</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-10 max-w-4xl">
        <div className="mb-8">
          <p className="text-xs tracking-[0.3em] uppercase text-primary mb-1">Client Portal</p>
          <h1 className="font-serif text-2xl md:text-3xl text-foreground">Billing Statements</h1>
          <p className="text-sm text-muted-foreground mt-1">Your billing statements from Stonegate Intelligence Group</p>
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border border-white/10 rounded-lg p-5 animate-pulse bg-white/2 h-20" />
            ))}
          </div>
        )}

        {error && (
          <div className="border border-red-400/20 bg-red-400/5 rounded-lg p-5 text-sm text-red-300">{error}</div>
        )}

        {!loading && !error && statements.length === 0 && (
          <div className="border border-white/10 rounded-lg p-12 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No billing statements available</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Statements will appear here once Stonegate has published them for your account.
            </p>
          </div>
        )}

        {!loading && !error && statements.length > 0 && (
          <div className="space-y-3">
            {statements.map(s => (
              <div
                key={s.id}
                className="border border-white/10 hover:border-white/20 rounded-lg px-5 py-4 bg-white/2 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-foreground">{s.statementNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLOR[s.status] ?? STATUS_COLOR.published}`}>
                        {s.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{s.billingPeriod}</span>
                      <span>Dated: {s.statementDate}</span>
                      {s.dueDate && <span>Due: {s.dueDate}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <div className="text-right">
                      <p className="text-base font-serif text-foreground">{fmt(s.amountDue)}</p>
                      <p className="text-xs text-muted-foreground">Amount Due</p>
                    </div>
                    <button
                      onClick={() => setLocation(`/portal/statements/${s.id}`)}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors whitespace-nowrap border border-primary/30 hover:border-primary/60 px-3 py-1.5 rounded"
                    >
                      View Statement
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
