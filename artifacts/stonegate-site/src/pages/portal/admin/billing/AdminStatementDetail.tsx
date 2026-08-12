import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Printer, Pencil, Send, CheckCircle, XCircle } from "lucide-react";
import BillingLayout from "./BillingLayout";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const STATUSES = ["draft","published","paid","partially_paid","overdue","void"] as const;
type Status = (typeof STATUSES)[number];
const STATUS_COLOR: Record<Status, string> = {
  draft:          "text-muted-foreground border-white/10 bg-white/5",
  published:      "text-blue-400 border-blue-400/30 bg-blue-400/10",
  paid:           "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  partially_paid: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  overdue:        "text-red-400 border-red-400/30 bg-red-400/10",
  void:           "text-muted-foreground/40 border-white/5 bg-white/2",
};

interface StatementItem {
  id: number; description: string; servicePeriod: string | null;
  quantity: string | null; rate: string | null; amount: string;
  showQuantity: boolean; showRate: boolean; sortOrder: number; timeEntryIds: string;
}
interface Statement {
  id: number; statementNumber: string; billingPeriod: string; billingPeriodStart: string | null;
  billingPeriodEnd: string | null; statementDate: string; dueDate: string | null;
  previousBalance: string; currentCharges: string; paymentsCredits: string; amountDue: string;
  retainerApplied: string; remainingRetainer: string; status: Status;
  adminNotes: string | null; publishedAt: string | null;
  clientName: string | null; clientAddress: string | null; clientEmail: string | null;
  engagementName: string | null; portalUserId: number | null;
  items: StatementItem[];
}

function fmt(n: string | number) {
  const v = parseFloat(String(n));
  return isNaN(v) ? "$0.00" : `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminStatementDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/portal/admin/billing/statements/:id");
  const id = params?.id ? Number(params.id) : null;

  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [statusChange, setStatusChange] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);

  const load = () => {
    if (!id) return;
    fetch(`${BASE}/api/portal/billing/statements/${id}`, { credentials: "include" })
      .then(r => r.json())
      .then(setStatement)
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const publish = async () => {
    if (!id) return;
    setPublishing(true);
    await fetch(`${BASE}/api/portal/billing/statements/${id}/publish`, { method: "POST", credentials: "include" });
    setPublishing(false);
    load();
  };

  const changeStatus = async () => {
    if (!id || !statusChange) return;
    setChangingStatus(true);
    await fetch(`${BASE}/api/portal/billing/statements/${id}/status`, {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusChange }),
    });
    setChangingStatus(false);
    setStatusChange("");
    load();
  };

  if (loading) {
    return (
      <BillingLayout>
        <div className="text-sm text-muted-foreground">Loading…</div>
      </BillingLayout>
    );
  }

  if (!statement) {
    return (
      <BillingLayout>
        <p className="text-sm text-muted-foreground">Statement not found.</p>
      </BillingLayout>
    );
  }

  const hasRetainer = parseFloat(statement.retainerApplied) > 0 || parseFloat(statement.remainingRetainer) > 0;
  const hasPrevBalance = parseFloat(statement.previousBalance) > 0;
  const hasPayments = parseFloat(statement.paymentsCredits) > 0;
  const showQtyCol = statement.items.some(i => i.showQuantity && i.quantity != null);
  const showRateCol = statement.items.some(i => i.showRate && i.rate != null);

  return (
    <BillingLayout>
      {/* Actions bar */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-serif text-2xl text-foreground">{statement.statementNumber}</h1>
            <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLOR[statement.status] ?? STATUS_COLOR.draft}`}>
              {statement.status.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{statement.clientName ?? "No client"} · {statement.billingPeriod}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-white/10 hover:border-white/20 px-3 py-2 rounded transition-colors">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          {statement.status === "draft" && (
            <>
              <button onClick={() => setLocation(`/portal/admin/billing/statements/${id}/edit`)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-white/10 hover:border-primary/30 px-3 py-2 rounded transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={publish} disabled={publishing}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-5 py-2 rounded transition-colors disabled:opacity-50">
                <Send className="w-3.5 h-3.5" /> {publishing ? "Publishing…" : "Publish to Client"}
              </button>
            </>
          )}
          {statement.status !== "draft" && (
            <div className="flex items-center gap-2">
              <select value={statusChange} onChange={e => setStatusChange(e.target.value)}
                className="bg-black border border-white/15 rounded px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/60 transition-colors">
                <option value="">Change status…</option>
                {STATUSES.filter(s => s !== statement.status).map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
              {statusChange && (
                <button onClick={changeStatus} disabled={changingStatus}
                  className="text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3 py-2 rounded transition-colors">
                  {changingStatus ? "Saving…" : "Apply"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin-only info banner */}
      <div className="mb-6 flex items-center gap-3 bg-yellow-400/5 border border-yellow-400/20 rounded-lg px-4 py-3">
        <span className="text-xs tracking-[0.1em] uppercase text-yellow-400/70">Internal View</span>
        <span className="text-xs text-muted-foreground">
          {statement.status === "published"
            ? `Published${statement.publishedAt ? ` · ${new Date(statement.publishedAt).toLocaleDateString()}` : ""}. Visible to client in their portal.`
            : statement.status === "draft"
            ? "Draft — not yet visible to the client."
            : `Status: ${statement.status.replace(/_/g, " ")}`}
        </span>
        {statement.portalUserId && (
          <span className="text-xs text-muted-foreground ml-auto">Portal user ID: {statement.portalUserId}</span>
        )}
      </div>

      {/* Statement preview */}
      <div className="border border-white/10 rounded-lg overflow-hidden bg-[#080808] p-8 md:p-10 mb-8 print:bg-white print:border-0">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b border-white/10 print:border-gray-200">
          <div>
            <p className="text-xs tracking-[0.4em] uppercase text-primary print:text-red-700 mb-0.5">Stonegate</p>
            <p className="text-xs tracking-[0.4em] uppercase text-primary print:text-red-700 mb-3">Intelligence Group</p>
            <p className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground/60 italic max-w-[180px] leading-relaxed">
              Every question deserves an answer grounded in evidence
            </p>
          </div>
          <div className="text-right">
            <h2 className="font-serif text-xl text-foreground print:text-black mb-1">Monthly Billing Statement</h2>
            <p className="text-xs text-muted-foreground">Stonegate Intelligence Group, LLC</p>
          </div>
        </div>

        {/* Metadata + client */}
        <div className="grid grid-cols-2 gap-8 mb-8 text-xs">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Statement Details</p>
            <table className="w-full">
              <tbody>
                {[
                  ["Statement Number", statement.statementNumber],
                  ["Statement Date", statement.statementDate],
                  ["Billing Period", statement.billingPeriod],
                  ...(statement.dueDate ? [["Due Date", statement.dueDate]] : []),
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="text-muted-foreground pr-4 py-0.5 whitespace-nowrap">{k}</td>
                    <td className="text-foreground print:text-black font-medium">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Bill To</p>
            <p className="text-foreground print:text-black font-medium">{statement.clientName ?? "—"}</p>
            {statement.engagementName && <p className="text-muted-foreground">Re: {statement.engagementName}</p>}
            {statement.clientAddress && <p className="text-muted-foreground mt-1 whitespace-pre-line">{statement.clientAddress}</p>}
            {statement.clientEmail && <p className="text-muted-foreground">{statement.clientEmail}</p>}
          </div>
        </div>

        {/* Items */}
        <div className="mb-8">
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Services</p>
          <div className="border border-white/10 print:border-gray-200 rounded overflow-hidden print:rounded-none">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/5 print:bg-gray-50 border-b border-white/8">
                  <th className="px-4 py-2.5 text-left text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-normal">Description</th>
                  <th className="px-4 py-2.5 text-left text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-normal whitespace-nowrap">Service Period</th>
                  {showQtyCol && <th className="px-4 py-2.5 text-right text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-normal">Hrs / Units</th>}
                  {showRateCol && <th className="px-4 py-2.5 text-right text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-normal">Rate</th>}
                  <th className="px-4 py-2.5 text-right text-[10px] tracking-[0.1em] uppercase text-muted-foreground font-normal">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {statement.items.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-xs">No line items added yet. Edit this statement to add services.</td></tr>
                ) : statement.items.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-foreground print:text-black">{item.description}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{item.servicePeriod ?? "—"}</td>
                    {showQtyCol && <td className="px-4 py-3 text-right text-foreground print:text-black">{item.showQuantity && item.quantity ? parseFloat(item.quantity).toFixed(2) : "—"}</td>}
                    {showRateCol && <td className="px-4 py-3 text-right text-muted-foreground">{item.showRate && item.rate ? fmt(item.rate) : "—"}</td>}
                    <td className="px-4 py-3 text-right text-foreground print:text-black font-medium">{fmt(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-full max-w-xs text-xs border border-white/10 print:border-gray-200 rounded print:rounded-none overflow-hidden">
            <table className="w-full">
              <tbody>
                {hasPrevBalance && (
                  <tr className="border-b border-white/8"><td className="px-4 py-2 text-muted-foreground">Previous Balance</td><td className="px-4 py-2 text-right text-foreground">{fmt(statement.previousBalance)}</td></tr>
                )}
                <tr className="border-b border-white/8"><td className="px-4 py-2 text-muted-foreground">Current Charges</td><td className="px-4 py-2 text-right text-foreground">{fmt(statement.currentCharges)}</td></tr>
                {hasPayments && (
                  <tr className="border-b border-white/8"><td className="px-4 py-2 text-muted-foreground">Payments / Credits</td><td className="px-4 py-2 text-right text-emerald-400">({fmt(statement.paymentsCredits)})</td></tr>
                )}
                {hasRetainer && (
                  <>
                    <tr className="border-b border-white/8"><td className="px-4 py-2 text-muted-foreground">Retainer Applied</td><td className="px-4 py-2 text-right text-emerald-400">({fmt(statement.retainerApplied)})</td></tr>
                    <tr className="border-b border-white/8"><td className="px-4 py-2 text-muted-foreground">Remaining Retainer</td><td className="px-4 py-2 text-right text-foreground">{fmt(statement.remainingRetainer)}</td></tr>
                  </>
                )}
                <tr className="bg-white/5"><td className="px-4 py-3 font-medium text-foreground">Total Due</td><td className="px-4 py-3 text-right font-serif text-base text-foreground">{fmt(statement.amountDue)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10 pt-5 border-t border-white/8 text-center">
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50">Stonegate Intelligence Group, LLC — Confidential</p>
        </div>
      </div>

      {/* Admin-only: internal notes */}
      {statement.adminNotes && (
        <div className="border border-yellow-400/20 bg-yellow-400/5 rounded-lg p-4 mb-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-yellow-400/60 mb-2">Internal Notes (not shown to client)</p>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{statement.adminNotes}</p>
        </div>
      )}
    </BillingLayout>
  );
}
