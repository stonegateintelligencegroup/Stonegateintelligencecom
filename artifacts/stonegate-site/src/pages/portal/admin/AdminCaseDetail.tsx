import { useEffect, useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Upload, Download, Send, FileText, AlertCircle, ChevronDown, ChevronUp, Clock } from "lucide-react";
import CaseNotes from "./CaseNotes";
import { useAuth } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Case {
  id: number; caseNumber: string; status: string;
  assignedInvestigator: string | null; notes: string | null; lastUpdate: string;
  clientId: number; clientName: string | null; clientEmail: string | null;
}
interface Doc { id: number; fileName: string; fileType: string; fileSize: number | null; objectPath: string; direction: string; createdAt: string; }
interface Message { id: number; content: string; createdAt: string; senderId: number; senderName: string | null; senderRole: string | null; }
interface Intake {
  id: number; fullName: string; submissionDate: string; referredBy: string | null;
  mailingAddress: string | null; phone: string; email: string;
  preferredContact: string; bestTime: string | null; clientType: string;
  services: string; otherServiceDescription: string | null;
  engagementDetails: string; timeline: string; targetCompletionDate: string | null;
  engagementStructure: string; budgetRange: string | null; budgetNotes: string | null;
  acknowledged: boolean; electronicSignature: string; signatureDate: string;
  status: string; internalNotes: string | null; createdAt: string;
}
interface TimeEntry {
  id: number; date: string; billedHours: string; investigator: string;
  activityType: string; description: string | null; billable: boolean;
  billingRate: string | null; billableAmount: string | null; billingStatus: string;
}
interface CaseBilling {
  linked: boolean; engagementId: number | null; engagementName: string | null;
  budget: string | null; billingStructure: string | null;
  summary: {
    totalHours: number; billableHours: number; nonBillableHours: number;
    billableAmount: number; unbilledAmount: number; invoicedAmount: number;
  } | null;
  entries: TimeEntry[];
}

const STATUSES = ["pending", "active", "on_hold", "closed"];
const BILLING_STATUS_COLOR: Record<string, string> = {
  unbilled: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  ready_to_invoice: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  invoiced: "text-green-400 border-green-400/30 bg-green-400/10",
  paid: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  written_off: "text-muted-foreground border-white/10 bg-white/5",
};

function formatBytes(b: number | null) {
  if (!b) return "";
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}
function fmt(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type Tab = "details" | "documents" | "notes" | "messages" | "billing";

export default function AdminCaseDetail() {
  const params = useParams<{ id: string }>();
  const caseId = Number(params.id);
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("details");

  // Edit state
  const [status, setStatus] = useState("");
  const [investigator, setInvestigator] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Message state
  const [msgContent, setMsgContent] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Billing tab
  const [caseBilling, setCaseBilling] = useState<CaseBilling | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  const loadAll = async () => {
    try {
      const [c, d, m, intakeRes] = await Promise.all([
        fetch(`${BASE}/api/portal/admin/cases`, { credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}/api/portal/admin/documents/${caseId}`, { credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}/api/portal/admin/messages/${caseId}`, { credentials: "include" }).then(r => r.json()),
        fetch(`${BASE}/api/portal/admin/cases/${caseId}/intake`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
      ]);
      const found: Case = Array.isArray(c) ? c.find((x: Case) => x.id === caseId) : null;
      if (found) {
        setCaseData(found);
        setStatus(found.status);
        setInvestigator(found.assignedInvestigator ?? "");
        setNotes(found.notes ?? "");
      }
      setDocs(Array.isArray(d) ? d : []);
      setMessages(Array.isArray(m) ? m : []);
      setIntake(intakeRes ?? null);
    } catch { setError("Failed to load case."); }
    finally { setLoading(false); }
  };

  const loadBilling = () => {
    setBillingLoading(true);
    fetch(`${BASE}/api/portal/admin/cases/${caseId}/billing`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setCaseBilling(d))
      .finally(() => setBillingLoading(false));
  };

  useEffect(() => { loadAll(); }, [caseId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (activeTab === "billing" && !caseBilling) loadBilling(); }, [activeTab]);

  const saveCase = async () => {
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch(`${BASE}/api/portal/admin/cases/${caseId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, assignedInvestigator: investigator || null, notes: notes || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Save failed (${res.status}).`); return;
      }
      await loadAll(); setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch { setError("Network error — could not save."); }
    finally { setSaving(false); }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const urlRes = await fetch(`${BASE}/api/storage/uploads/request-url`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      await fetch(`${BASE}/api/portal/admin/documents/${caseId}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size, objectPath }),
      });
      await loadAll();
    } catch { setError("Upload failed."); }
    finally { setUploading(false); }
  };

  const handleDownload = async (doc: Doc) => {
    const res = await fetch(`${BASE}/api/storage${doc.objectPath}`, { credentials: "include" });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = doc.fileName; a.click();
    URL.revokeObjectURL(url);
  };

  const deleteDoc = async (docId: number) => {
    await fetch(`${BASE}/api/portal/admin/documents/file/${docId}`, { method: "DELETE", credentials: "include" });
    await loadAll();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgContent.trim()) return;
    setSending(true);
    try {
      await fetch(`${BASE}/api/portal/admin/messages/${caseId}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msgContent }),
      });
      setMsgContent(""); await loadAll();
    } catch { setError("Failed to send."); }
    finally { setSending(false); }
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "details", label: "Case Details" },
    { key: "documents", label: "Documents", count: docs.length },
    { key: "notes", label: "Notes" },
    { key: "messages", label: "Messages", count: messages.length },
    { key: "billing", label: "Time & Billing" },
  ];

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Loading…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-black">
      {/* Header + breadcrumb + tabs */}
      <div className="border-b border-white/8 bg-black/80 sticky top-20 z-40">
        <div className="container mx-auto px-4 md:px-8">
          {/* Breadcrumb row */}
          <div className="h-12 flex items-center gap-2 text-xs text-muted-foreground">
            <button onClick={() => setLocation("/portal/admin")} className="hover:text-foreground transition-colors">
              Client Portal
            </button>
            {caseData?.clientId && (
              <>
                <span className="text-white/20">/</span>
                <button
                  onClick={() => setLocation(`/portal/admin/clients/${caseData.clientId}`)}
                  className="hover:text-foreground transition-colors"
                >
                  {caseData.clientName ?? "Client"}
                </button>
              </>
            )}
            <span className="text-white/20">/</span>
            <span className="text-foreground">{caseData?.caseNumber ?? `Case #${caseId}`}</span>
          </div>

          {/* Tab navigation */}
          <nav className="flex items-center gap-1 -mb-px overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs tracking-[0.1em] uppercase whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.key === "billing" && <Clock className="w-3 h-3" />}
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className="text-xs bg-white/10 rounded px-1.5 py-0.5 leading-none">{t.count}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-10 max-w-5xl space-y-10">
        {error && (
          <div className="flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}

        {/* ── CASE DETAILS ── */}
        {activeTab === "details" && (
          <>
            <div className="border border-white/10 rounded-lg p-8 bg-white/2">
              <h2 className="font-serif text-xl text-foreground mb-6">Case Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)}
                    className="w-full bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ").replace(/^\w/, c => c.toUpperCase())}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">Assigned Investigator</label>
                  <input type="text" value={investigator} onChange={e => setInvestigator(e.target.value)}
                    className="w-full bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
                    placeholder="Investigator name" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">Notes (visible to client)</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                    className="w-full bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors resize-none"
                    placeholder="Optional notes visible to the client" />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-4">
                <button onClick={saveCase} disabled={saving}
                  className="bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-6 py-2.5 rounded transition-colors disabled:opacity-50">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                {saved && <span className="text-xs text-green-400 tracking-wide">Saved ✓</span>}
              </div>
            </div>

            {/* Intake (only shown in details tab) */}
            {intake && (
              <div className="border border-white/10 rounded-lg bg-white/2 overflow-hidden">
                <button onClick={() => setIntakeOpen(o => !o)}
                  className="w-full flex items-center justify-between px-8 py-5 text-left hover:bg-white/3 transition-colors">
                  <div>
                    <h2 className="font-serif text-xl text-foreground">Intake Submission</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Submitted {new Date(intake.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      {intake.referredBy && ` · Referred by ${intake.referredBy}`}
                    </p>
                  </div>
                  {intakeOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {intakeOpen && (
                  <div className="px-8 pb-8 space-y-8 border-t border-white/8 pt-6">
                    <div>
                      <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-4">Contact Information</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        <IntakeField label="Full Name" value={intake.fullName} />
                        <IntakeField label="Email" value={intake.email} />
                        <IntakeField label="Phone" value={intake.phone} />
                        <IntakeField label="Preferred Contact" value={intake.preferredContact} />
                        {intake.bestTime && <IntakeField label="Best Time to Reach" value={intake.bestTime} />}
                        {intake.mailingAddress && <IntakeField label="Mailing Address" value={intake.mailingAddress} />}
                        {intake.referredBy && <IntakeField label="Referred By" value={intake.referredBy} />}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-4">Engagement Details</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        <IntakeField label="Client Type" value={intake.clientType} />
                        <IntakeField label="Engagement Structure" value={intake.engagementStructure} />
                        <IntakeField label="Timeline" value={intake.timeline} />
                        {intake.targetCompletionDate && (
                          <IntakeField label="Target Completion" value={new Date(intake.targetCompletionDate).toLocaleDateString()} />
                        )}
                      </div>
                      <div className="mt-3 space-y-3 text-sm">
                        <IntakeField label="Services Requested" value={(() => { try { return JSON.parse(intake.services).join(", "); } catch { return intake.services; } })()} />
                        {intake.otherServiceDescription && <IntakeField label="Other Service Details" value={intake.otherServiceDescription} />}
                        <IntakeField label="Engagement Details" value={intake.engagementDetails} block />
                      </div>
                    </div>
                    {(intake.budgetRange || intake.budgetNotes) && (
                      <div>
                        <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-4">Budget</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                          {intake.budgetRange && <IntakeField label="Budget Range" value={intake.budgetRange} />}
                          {intake.budgetNotes && <IntakeField label="Budget Notes" value={intake.budgetNotes} />}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-4">Agreement</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        <IntakeField label="Electronic Signature" value={intake.electronicSignature} />
                        <IntakeField label="Signature Date" value={new Date(intake.signatureDate).toLocaleDateString()} />
                        <IntakeField label="Acknowledged" value={intake.acknowledged ? "Yes" : "No"} />
                        <IntakeField label="Submission Date" value={new Date(intake.submissionDate).toLocaleDateString()} />
                      </div>
                    </div>
                    {intake.internalNotes && (
                      <div>
                        <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-4">Internal Notes</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{intake.internalNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <CreateCaseSection clientId={caseData?.clientId ?? 0} onCreated={loadAll} />
          </>
        )}

        {/* ── DOCUMENTS ── */}
        {activeTab === "documents" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-xl text-foreground">Documents</h2>
              <div>
                <input ref={fileRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs tracking-[0.15em] uppercase px-5 py-2 rounded transition-colors disabled:opacity-50">
                  <Upload className="w-3.5 h-3.5" />{uploading ? "Uploading…" : "Share Document"}
                </button>
              </div>
            </div>
            {docs.length === 0 ? (
              <div className="border border-white/10 rounded-lg p-8 text-center text-muted-foreground text-sm">No documents yet</div>
            ) : (
              <div className="space-y-2">
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between border border-white/10 rounded-lg px-5 py-4 bg-white/2">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{doc.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.direction === "client_upload" ? "Client upload" : "Shared by Stonegate"} · {formatBytes(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <button onClick={() => handleDownload(doc)} className="text-muted-foreground hover:text-primary transition-colors"><Download className="w-4 h-4" /></button>
                      <button onClick={() => deleteDoc(doc.id)} className="text-muted-foreground hover:text-red-400 transition-colors text-xs">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── NOTES ── */}
        {activeTab === "notes" && (
          <CaseNotes caseId={caseId} adminId={user?.id ?? 0} />
        )}

        {/* ── MESSAGES ── */}
        {activeTab === "messages" && (
          <div>
            <h2 className="font-serif text-xl text-foreground mb-6">Secure Messages</h2>
            <div className="border border-white/10 rounded-lg overflow-hidden bg-white/2">
              <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
                ) : messages.map(msg => {
                  const isAdmin = msg.senderRole === "admin";
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-lg px-4 py-3 ${isAdmin ? "bg-primary/20 border border-primary/30" : "bg-white/5 border border-white/10"}`}>
                        <p className={`text-xs mb-1 ${isAdmin ? "text-primary/70" : "text-muted-foreground"}`}>
                          {msg.senderName ?? (isAdmin ? "Stonegate" : "Client")} · {new Date(msg.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={sendMessage} className="flex gap-3 p-4 border-t border-white/8">
                <textarea value={msgContent} onChange={e => setMsgContent(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e as any); } }}
                  rows={2} placeholder="Message the client… (Enter to send)"
                  className="flex-1 bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors resize-none" />
                <button type="submit" disabled={sending || !msgContent.trim()}
                  className="bg-primary hover:bg-primary/90 text-white px-4 rounded transition-colors disabled:opacity-50 shrink-0">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── TIME & BILLING ── */}
        {activeTab === "billing" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-xl text-foreground">Time & Billing</h2>
              {caseBilling?.linked && caseBilling.engagementId && (
                <button
                  onClick={() => {
                    const q = new URLSearchParams({
                      engagementId: String(caseBilling.engagementId),
                      from: "case",
                      fromId: String(caseId),
                      fromName: caseData?.caseNumber ?? "",
                    });
                    if (caseData?.clientId) q.set("fromClientId", String(caseData.clientId));
                    if (caseData?.clientName) q.set("fromClientName", caseData.clientName);
                    setLocation(`/portal/admin/billing/time?${q}`);
                  }}
                  className="flex items-center gap-2 border border-primary/30 hover:border-primary/60 text-primary text-xs tracking-[0.12em] uppercase px-4 py-2 rounded transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" /> Open in Billable Hours
                </button>
              )}
            </div>

            {billingLoading ? (
              <p className="text-sm text-muted-foreground">Loading billing data…</p>
            ) : !caseBilling?.linked ? (
              <div className="border border-white/10 rounded-lg p-8 text-center space-y-3">
                <p className="text-muted-foreground text-sm">No billing engagement linked to this case.</p>
                <p className="text-xs text-muted-foreground/60">
                  Create a billing engagement in the Billable Hours system and set its "Linked Portal Case ID" to <strong className="text-foreground">#{caseId}</strong>.
                </p>
                <button onClick={() => setLocation("/portal/admin/billing/engagements")}
                  className="text-xs text-primary hover:text-primary/80 transition-colors underline">
                  Go to Billing Engagements →
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: "Total Hours", value: (caseBilling.summary?.totalHours ?? 0).toFixed(2) + "h" },
                    { label: "Billable Hours", value: (caseBilling.summary?.billableHours ?? 0).toFixed(2) + "h" },
                    { label: "Non-Billable", value: (caseBilling.summary?.nonBillableHours ?? 0).toFixed(2) + "h" },
                    { label: "Billable Amount", value: fmt(caseBilling.summary?.billableAmount ?? 0), accent: true },
                    { label: "Unbilled", value: fmt(caseBilling.summary?.unbilledAmount ?? 0) },
                    { label: "Invoiced", value: fmt(caseBilling.summary?.invoicedAmount ?? 0) },
                  ].map(c => (
                    <div key={c.label} className={`border rounded-lg p-4 ${(c as any).accent ? "border-primary/30 bg-primary/5" : "border-white/10 bg-white/2"}`}>
                      <p className={`text-lg font-serif ${(c as any).accent ? "text-primary" : "text-foreground"}`}>{c.value}</p>
                      <p className="text-xs tracking-[0.08em] uppercase text-muted-foreground mt-0.5">{c.label}</p>
                    </div>
                  ))}
                </div>

                {/* Budget bar if applicable */}
                {caseBilling.budget && (
                  <div className="border border-white/10 rounded-lg p-4 bg-white/2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>Budget: {fmt(parseFloat(caseBilling.budget))}</span>
                      <span>Remaining: {fmt(parseFloat(caseBilling.budget) - (caseBilling.summary?.billableAmount ?? 0))}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min(((caseBilling.summary?.billableAmount ?? 0) / parseFloat(caseBilling.budget)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Entries table */}
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-white/8 bg-white/2">
                        <tr>
                          {["Date","Investigator","Activity","Description","Hours","Rate","Amount","Status"].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs tracking-[0.1em] uppercase text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {caseBilling.entries.length === 0 ? (
                          <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-sm">No time entries for this case</td></tr>
                        ) : caseBilling.entries.map(e => (
                          <tr key={e.id} className="hover:bg-white/2 transition-colors">
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{e.date}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">{e.investigator}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{e.activityType}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate">{e.description ?? "—"}</td>
                            <td className="px-4 py-3 text-xs text-foreground text-right whitespace-nowrap">{parseFloat(e.billedHours).toFixed(2)}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground text-right whitespace-nowrap">{e.billingRate ? `$${parseFloat(e.billingRate).toFixed(2)}` : "—"}</td>
                            <td className="px-4 py-3 text-xs font-medium text-right whitespace-nowrap">
                              {e.billable && e.billableAmount ? `$${parseFloat(e.billableAmount).toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`text-xs px-2 py-0.5 rounded border ${BILLING_STATUS_COLOR[e.billingStatus] ?? BILLING_STATUS_COLOR.unbilled}`}>
                                {e.billingStatus.replace(/_/g, " ")}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IntakeField({ label, value, block }: { label: string; value: string; block?: boolean }) {
  return (
    <div className={block ? "md:col-span-2" : ""}>
      <span className="text-muted-foreground">{label}: </span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function CreateCaseSection({ clientId, onCreated }: { clientId: number; onCreated: () => void }) {
  const [show, setShow] = useState(false);
  const [caseNum, setCaseNum] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await fetch(`${BASE}/api/portal/admin/cases`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, caseNumber: caseNum }),
      });
      setCaseNum(""); setShow(false); onCreated();
    } finally { setSaving(false); }
  };

  if (!show) return null;
  return (
    <div className="border border-white/10 rounded-lg p-6 bg-white/2">
      <h3 className="font-serif text-lg text-foreground mb-4">Add Another Case</h3>
      <form onSubmit={handleCreate} className="flex gap-3">
        <input type="text" value={caseNum} onChange={e => setCaseNum(e.target.value)} required placeholder="Case number"
          className="flex-1 bg-black border border-white/15 rounded px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
        <button type="submit" disabled={saving}
          className="bg-primary text-white text-xs tracking-[0.1em] uppercase px-5 py-2 rounded disabled:opacity-50">
          {saving ? "Creating…" : "Create"}
        </button>
      </form>
    </div>
  );
}
