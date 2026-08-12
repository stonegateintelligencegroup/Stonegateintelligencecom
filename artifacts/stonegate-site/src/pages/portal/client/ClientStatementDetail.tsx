import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Printer, Download } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface StatementItem {
  id: number;
  description: string;
  servicePeriod: string | null;
  quantity: string | null;
  rate: string | null;
  amount: string;
  showQuantity: boolean;
  showRate: boolean;
  sortOrder: number;
}

interface Statement {
  id: number;
  statementNumber: string;
  billingPeriod: string;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  statementDate: string;
  dueDate: string | null;
  previousBalance: string;
  currentCharges: string;
  paymentsCredits: string;
  amountDue: string;
  retainerApplied: string;
  remainingRetainer: string;
  status: string;
  clientName: string | null;
  clientAddress: string | null;
  clientEmail: string | null;
  engagementName: string | null;
  items: StatementItem[];
}

function fmt(n: string | number) {
  const v = parseFloat(String(n));
  if (isNaN(v)) return "$0.00";
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ClientStatementDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/portal/statements/:id");
  const id = params?.id;

  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`${BASE}/api/portal/client/statements/${id}`, { credentials: "include" })
      .then(r => {
        if (r.status === 403 || r.status === 404) throw new Error("not_found");
        if (!r.ok) throw new Error("server_error");
        return r.json();
      })
      .then(setStatement)
      .catch(e => setError(e.message === "not_found" ? "Statement not found." : "Unable to load this statement."))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => window.print();
  const handlePDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading statement…</p>
      </div>
    );
  }

  if (error || !statement) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-sm mb-4">{error || "Statement not found."}</p>
          <button onClick={() => setLocation("/portal/statements")} className="text-xs text-primary hover:underline">
            ← Back to Statements
          </button>
        </div>
      </div>
    );
  }

  const hasRetainer = parseFloat(statement.retainerApplied) > 0 || parseFloat(statement.remainingRetainer) > 0;
  const hasPrevBalance = parseFloat(statement.previousBalance) > 0;
  const hasPayments = parseFloat(statement.paymentsCredits) > 0;

  // Column visibility
  const showQtyCol = statement.items.some(i => i.showQuantity && i.quantity != null);
  const showRateCol = statement.items.some(i => i.showRate && i.rate != null);

  return (
    <>
      {/* Screen-only nav bar */}
      <div className="print:hidden border-b border-white/8 bg-black sticky top-0 z-40">
        <div className="container mx-auto px-4 md:px-8">
          <div className="h-16 flex items-center justify-between">
            <button
              onClick={() => setLocation("/portal/statements")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Billing Statements
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-white/10 hover:border-white/20 px-3 py-2 rounded"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button
                onClick={handlePDF}
                className="flex items-center gap-1.5 text-xs bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statement body */}
      <div className="min-h-screen bg-black print:bg-white print:min-h-0">
        <div className="container mx-auto px-4 md:px-8 py-10 max-w-3xl print:max-w-none print:px-8 print:py-0">

          {/* Statement document */}
          <div className="bg-[#0a0a0a] print:bg-white border border-white/10 print:border-0 rounded-lg overflow-hidden print:rounded-none p-8 md:p-12 print:p-0">

            {/* Header */}
            <div className="flex items-start justify-between mb-10 pb-8 border-b border-white/10 print:border-gray-200">
              <div>
                {/* Logo / wordmark */}
                <p className="text-xs tracking-[0.4em] uppercase text-primary print:text-red-700 mb-0.5 font-sans">Stonegate</p>
                <p className="text-xs tracking-[0.4em] uppercase text-primary print:text-red-700 mb-4 font-sans">Intelligence Group</p>
                <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground print:text-gray-400 italic max-w-[200px] font-sans leading-relaxed">
                  Every question deserves an answer grounded in evidence
                </p>
              </div>
              <div className="text-right">
                <h1 className="font-serif text-xl text-foreground print:text-black mb-1">Monthly Billing Statement</h1>
                <p className="text-xs text-muted-foreground print:text-gray-500 font-sans">Stonegate Intelligence Group, LLC</p>
              </div>
            </div>

            {/* Statement metadata + client info */}
            <div className="grid grid-cols-2 gap-8 mb-10">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground print:text-gray-400 mb-3 font-sans">Statement Details</p>
                <table className="text-xs font-sans w-full">
                  <tbody className="space-y-1">
                    {[
                      ["Statement Number", statement.statementNumber],
                      ["Statement Date", statement.statementDate],
                      ["Billing Period", statement.billingPeriod],
                      ...(statement.dueDate ? [["Due Date", statement.dueDate]] : []),
                    ].map(([label, value]) => (
                      <tr key={label}>
                        <td className="text-muted-foreground print:text-gray-500 pr-4 py-0.5 whitespace-nowrap">{label}</td>
                        <td className="text-foreground print:text-black font-medium">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground print:text-gray-400 mb-3 font-sans">Bill To</p>
                <div className="text-xs font-sans space-y-0.5">
                  <p className="text-foreground print:text-black font-medium">{statement.clientName ?? "—"}</p>
                  {statement.engagementName && (
                    <p className="text-muted-foreground print:text-gray-500">Re: {statement.engagementName}</p>
                  )}
                  {statement.clientAddress && (
                    <p className="text-muted-foreground print:text-gray-500 whitespace-pre-line mt-1">{statement.clientAddress}</p>
                  )}
                  {statement.clientEmail && (
                    <p className="text-muted-foreground print:text-gray-500">{statement.clientEmail}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Service line items */}
            <div className="mb-8">
              <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground print:text-gray-400 mb-3 font-sans">Services</p>
              <div className="border border-white/10 print:border-gray-200 rounded overflow-hidden print:rounded-none">
                <table className="w-full text-xs font-sans">
                  <thead>
                    <tr className="bg-white/5 print:bg-gray-50 border-b border-white/10 print:border-gray-200">
                      <th className="px-4 py-3 text-left text-[10px] tracking-[0.12em] uppercase text-muted-foreground print:text-gray-500 font-normal">Description</th>
                      <th className="px-4 py-3 text-left text-[10px] tracking-[0.12em] uppercase text-muted-foreground print:text-gray-500 font-normal whitespace-nowrap">Service Period</th>
                      {showQtyCol && <th className="px-4 py-3 text-right text-[10px] tracking-[0.12em] uppercase text-muted-foreground print:text-gray-500 font-normal">Hrs / Units</th>}
                      {showRateCol && <th className="px-4 py-3 text-right text-[10px] tracking-[0.12em] uppercase text-muted-foreground print:text-gray-500 font-normal">Rate</th>}
                      <th className="px-4 py-3 text-right text-[10px] tracking-[0.12em] uppercase text-muted-foreground print:text-gray-500 font-normal">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-gray-100">
                    {statement.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground print:text-gray-400">No items on this statement.</td>
                      </tr>
                    ) : statement.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-foreground print:text-black">{item.description}</td>
                        <td className="px-4 py-3 text-muted-foreground print:text-gray-500 whitespace-nowrap">{item.servicePeriod ?? "—"}</td>
                        {showQtyCol && (
                          <td className="px-4 py-3 text-right text-foreground print:text-black">
                            {item.showQuantity && item.quantity ? parseFloat(item.quantity).toFixed(2) : "—"}
                          </td>
                        )}
                        {showRateCol && (
                          <td className="px-4 py-3 text-right text-muted-foreground print:text-gray-500">
                            {item.showRate && item.rate ? fmt(item.rate) : "—"}
                          </td>
                        )}
                        <td className="px-4 py-3 text-right text-foreground print:text-black font-medium">{fmt(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-full max-w-xs font-sans text-xs">
                <div className="border border-white/10 print:border-gray-200 rounded print:rounded-none overflow-hidden">
                  <table className="w-full">
                    <tbody>
                      {hasPrevBalance && (
                        <tr className="border-b border-white/8 print:border-gray-100">
                          <td className="px-4 py-2 text-muted-foreground print:text-gray-500">Previous Balance</td>
                          <td className="px-4 py-2 text-right text-foreground print:text-black">{fmt(statement.previousBalance)}</td>
                        </tr>
                      )}
                      <tr className="border-b border-white/8 print:border-gray-100">
                        <td className="px-4 py-2 text-muted-foreground print:text-gray-500">Current Charges</td>
                        <td className="px-4 py-2 text-right text-foreground print:text-black">{fmt(statement.currentCharges)}</td>
                      </tr>
                      {hasPayments && (
                        <tr className="border-b border-white/8 print:border-gray-100">
                          <td className="px-4 py-2 text-muted-foreground print:text-gray-500">Payments / Credits</td>
                          <td className="px-4 py-2 text-right text-emerald-400 print:text-green-700">({fmt(statement.paymentsCredits)})</td>
                        </tr>
                      )}
                      {hasRetainer && (
                        <>
                          <tr className="border-b border-white/8 print:border-gray-100">
                            <td className="px-4 py-2 text-muted-foreground print:text-gray-500">Retainer Applied</td>
                            <td className="px-4 py-2 text-right text-emerald-400 print:text-green-700">({fmt(statement.retainerApplied)})</td>
                          </tr>
                          <tr className="border-b border-white/8 print:border-gray-100">
                            <td className="px-4 py-2 text-muted-foreground print:text-gray-500">Remaining Retainer</td>
                            <td className="px-4 py-2 text-right text-foreground print:text-black">{fmt(statement.remainingRetainer)}</td>
                          </tr>
                        </>
                      )}
                      <tr className="bg-white/5 print:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-foreground print:text-black tracking-wide">Total Due</td>
                        <td className="px-4 py-3 text-right font-serif text-base text-foreground print:text-black">{fmt(statement.amountDue)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {statement.dueDate && (
                  <p className="text-muted-foreground print:text-gray-400 text-[10px] mt-2 text-right">
                    Payment due {statement.dueDate}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-white/8 print:border-gray-200 text-center">
              <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground print:text-gray-400 font-sans">
                Stonegate Intelligence Group, LLC &mdash; Confidential
              </p>
              <p className="text-[10px] text-muted-foreground/50 print:text-gray-300 font-sans mt-1">
                Questions about this statement? Contact us at your dedicated case line.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          .print\\:text-black { color: black !important; }
          .print\\:text-gray-500 { color: #6b7280 !important; }
          .print\\:text-gray-400 { color: #9ca3af !important; }
          .print\\:text-gray-300 { color: #d1d5db !important; }
          .print\\:text-red-700 { color: #b91c1c !important; }
          .print\\:text-green-700 { color: #15803d !important; }
          .print\\:border-0 { border: none !important; }
          .print\\:border-gray-200 { border-color: #e5e7eb !important; }
          .print\\:border-gray-100 { border-color: #f3f4f6 !important; }
          .print\\:bg-gray-50 { background: #f9fafb !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:px-8 { padding-left: 2rem !important; padding-right: 2rem !important; }
          .print\\:py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
          .print\\:max-w-none { max-width: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:min-h-0 { min-height: 0 !important; }
        }
      `}</style>
    </>
  );
}
