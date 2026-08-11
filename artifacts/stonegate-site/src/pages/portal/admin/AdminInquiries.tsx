import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, AlertCircle, ExternalLink, Trash2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface InquirySummary {
  id: number; fullName: string; email: string; phone: string;
  clientType: string; services: string; timeline: string;
  status: string; submissionDate: string; createdAt: string;
  portalUserId: number | null; portalClientName: string | null;
}
interface InquiryDetail extends InquirySummary {
  referredBy: string | null; mailingAddress: string | null;
  preferredContact: string; bestTime: string | null;
  otherServiceDescription: string | null; engagementDetails: string;
  targetCompletionDate: string | null; engagementStructure: string;
  budgetRange: string | null; budgetNotes: string | null;
  acknowledged: boolean; electronicSignature: string;
  signatureDate: string; internalNotes: string | null; updatedAt: string;
  portalClientEmail: string | null;
}

const STATUSES = ["new_inquiry","contacted","consultation_scheduled","proposal_sent","accepted","declined","closed"];
const STATUS_LABELS: Record<string, string> = {
  new_inquiry: "New Inquiry", contacted: "Contacted",
  consultation_scheduled: "Consultation Scheduled", proposal_sent: "Proposal Sent",
  accepted: "Accepted", declined: "Declined", closed: "Closed",
};
const STATUS_COLORS: Record<string, string> = {
  new_inquiry: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  contacted: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  consultation_scheduled: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  proposal_sent: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  accepted: "text-green-400 bg-green-400/10 border-green-400/20",
  declined: "text-red-400 bg-red-400/10 border-red-400/20",
  closed: "text-muted-foreground bg-white/5 border-white/10",
};
const CLIENT_TYPE: Record<string, string> = {
  individual: "Individual", attorney: "Attorney / Law Firm", business: "Business / Corporation",
};
const SERVICE_LABELS: Record<string, string> = {
  investigative: "Investigative services", intelligence: "Intelligence consulting",
  due_diligence: "Due diligence research", risk: "Risk assessment",
  background: "Background research", litigation: "Litigation support",
  business_intel: "Business intelligence", other: "Other consulting",
};
const TIMELINE_LABELS: Record<string, string> = {
  urgent: "Urgent — within 48 hrs", standard: "Standard — 1–2 weeks", flexible: "Flexible",
};
const STRUCTURE_LABELS: Record<string, string> = {
  hourly: "Hourly rate", flat: "Flat fee", retainer: "Monthly retainer", unsure: "Not sure",
};

function parseServices(raw: string): string {
  try { return (JSON.parse(raw) as string[]).map(s => SERVICE_LABELS[s] ?? s).join(", "); }
  catch { return raw; }
}

export default function AdminInquiries() {
  const [, setLocation] = useLocation();
  const [inquiries, setInquiries] = useState<InquirySummary[]>([]);
  const [selected, setSelected] = useState<InquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Support ?userId= filter (e.g. when navigating from a client view)
  const userId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("userId")
    : null;

  useEffect(() => {
    const url = userId
      ? `${BASE}/api/portal/admin/inquiries?userId=${userId}`
      : `${BASE}/api/portal/admin/inquiries`;
    fetch(url, { credentials: "include" })
      .then(r => r.json()).then(d => { setInquiries(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setError("Failed to load inquiries."); setLoading(false); });
  }, [userId]);

  const openDetail = async (id: number) => {
    try {
      const r = await fetch(`${BASE}/api/portal/admin/inquiries/${id}`, { credentials: "include" });
      const d: InquiryDetail = await r.json();
      setSelected(d);
      setStatus(d.status);
      setNotes(d.internalNotes ?? "");
      setSaved(false);
    } catch { setError("Failed to load submission."); }
  };

  const deleteCase = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      const r = await fetch(`${BASE}/api/portal/admin/inquiries/${selected.id}`, {
        method: "DELETE", credentials: "include",
      });
      if (!r.ok) { setError("Delete failed."); setDeleting(false); setConfirmDelete(false); return; }
      setInquiries(prev => prev.filter(i => i.id !== selected.id));
      setSelected(null);
      setConfirmDelete(false);
    } catch { setError("Network error."); }
    finally { setDeleting(false); }
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true); setSaved(false);
    try {
      const r = await fetch(`${BASE}/api/portal/admin/inquiries/${selected.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, internalNotes: notes }),
      });
      if (!r.ok) { setError("Save failed."); return; }
      const updated: InquiryDetail = await r.json();
      setSelected(prev => prev ? { ...prev, status: updated.status, internalNotes: updated.internalNotes } : prev);
      setInquiries(prev => prev.map(i => i.id === updated.id ? { ...i, status: updated.status } : i));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { setError("Network error."); }
    finally { setSaving(false); }
  };

  if (selected) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => { setSelected(null); setConfirmDelete(false); }}
              className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Inquiries
            </button>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 text-muted-foreground hover:text-red-400 text-sm transition-colors">
                <Trash2 className="w-4 h-4" /> Delete Case
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-red-900/10 border border-red-900/30 rounded px-4 py-2">
                <span className="text-xs text-red-300">Permanently delete this case?</span>
                <button onClick={deleteCase} disabled={deleting}
                  className="text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded transition-colors disabled:opacity-50">
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1">Submission #{selected.id}</p>
              <h1 className="font-serif text-3xl text-foreground">{selected.fullName}</h1>
              <p className="text-muted-foreground text-sm mt-1">{CLIENT_TYPE[selected.clientType] ?? selected.clientType}</p>
              {selected.portalClientName && (
                <div className="mt-2 flex items-center gap-2 text-xs text-primary/80">
                  <ExternalLink className="w-3 h-3" />
                  <span>Portal client: <strong className="text-primary">{selected.portalClientName}</strong>
                    {selected.portalClientEmail && <span className="text-muted-foreground ml-1">({selected.portalClientEmail})</span>}
                  </span>
                </div>
              )}
            </div>
            <span className={`text-xs tracking-wider uppercase px-3 py-1.5 rounded border ${STATUS_COLORS[selected.status]}`}>
              {STATUS_LABELS[selected.status] ?? selected.status}
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm mb-6 p-3 border border-red-900/30 rounded bg-red-900/10">
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}

          {/* Admin controls */}
          <div className="border border-white/10 rounded-lg p-6 bg-white/2 mb-8 space-y-4">
            <h2 className="font-serif text-lg text-foreground">Status & Notes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}
                  className="w-full bg-black border border-white/15 rounded px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">Internal Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                className="w-full bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors resize-none"
                placeholder="Internal notes (not visible to client)" />
            </div>
            <div className="flex items-center gap-4">
              <button onClick={save} disabled={saving}
                className="bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-6 py-2.5 rounded transition-colors disabled:opacity-50">
                {saving ? "Saving…" : "Save Changes"}
              </button>
              {saved && <span className="text-xs text-green-400">Saved ✓</span>}
            </div>
          </div>

          {/* Submission details */}
          {[
            {
              title: "Client Information",
              rows: [
                ["Date", selected.submissionDate],
                ["Email", selected.email],
                ["Phone", selected.phone],
                ["Preferred Contact", selected.preferredContact],
                ["Best Time", selected.bestTime],
                ["Referred By", selected.referredBy],
                ["Mailing Address", selected.mailingAddress],
              ],
            },
            {
              title: "Services Requested",
              rows: [
                ["Services", parseServices(selected.services)],
                ...(selected.otherServiceDescription ? [["Other Description", selected.otherServiceDescription]] : []),
              ],
            },
            {
              title: "Engagement Details",
              rows: [["Description", selected.engagementDetails]],
            },
            {
              title: "Timeline & Budget",
              rows: [
                ["Timeline", TIMELINE_LABELS[selected.timeline] ?? selected.timeline],
                ...(selected.targetCompletionDate ? [["Target Date", selected.targetCompletionDate]] : []),
                ["Engagement Structure", STRUCTURE_LABELS[selected.engagementStructure] ?? selected.engagementStructure],
                ...(selected.budgetRange ? [["Budget Range", selected.budgetRange]] : []),
                ...(selected.budgetNotes ? [["Budget Notes", selected.budgetNotes]] : []),
              ],
            },
            {
              title: "Acknowledgement",
              rows: [
                ["Acknowledged", selected.acknowledged ? "Yes" : "No"],
                ["Electronic Signature", selected.electronicSignature],
                ["Signature Date", selected.signatureDate],
              ],
            },
          ].map(section => (
            <div key={section.title} className="border border-white/10 rounded-lg overflow-hidden mb-4">
              <div className="px-6 py-4 bg-white/2 border-b border-white/8">
                <h3 className="font-serif text-base text-foreground">{section.title}</h3>
              </div>
              <div className="divide-y divide-white/5">
                {section.rows.filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="px-6 py-3 flex flex-col md:flex-row gap-1 md:gap-4">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground md:w-44 shrink-0">{label}</span>
                    <span className="text-sm text-foreground whitespace-pre-wrap">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="text-xs text-muted-foreground/50 mt-6">
            Submitted {new Date(selected.createdAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 md:px-8 max-w-5xl">
        <button onClick={() => setLocation("/portal/admin")}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="mb-10">
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2">Admin</p>
          <h1 className="font-serif text-4xl text-foreground">
            {userId ? "Client Intake Submission" : "Client Inquiries"}
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            {userId ? "Intake form submitted by this portal client." : "Intake form submissions from prospective and existing clients."}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-6 p-3 border border-red-900/30 rounded bg-red-900/10">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading inquiries…</p>
        ) : inquiries.length === 0 ? (
          <div className="border border-white/10 rounded-lg p-12 text-center text-muted-foreground">
            {userId
              ? "This client has not submitted an intake form yet."
              : "No inquiries yet. Submissions will appear here once clients complete the intake form."}
          </div>
        ) : (
          <div className="space-y-2">
            {inquiries.map(inq => (
              <button key={inq.id} onClick={() => openDetail(inq.id)}
                className="w-full text-left border border-white/10 rounded-lg px-6 py-5 bg-white/2 hover:bg-white/4 hover:border-primary/30 transition-all group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-foreground">{inq.fullName}</span>
                      {inq.portalClientName && (
                        <span className="text-[10px] tracking-wider text-primary/70 flex items-center gap-1">
                          <ExternalLink className="w-2.5 h-2.5" /> Portal Client
                        </span>
                      )}
                      <span className={`text-[10px] tracking-wider uppercase px-2 py-0.5 rounded border ${STATUS_COLORS[inq.status]}`}>
                        {STATUS_LABELS[inq.status] ?? inq.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {inq.email} · {CLIENT_TYPE[inq.clientType] ?? inq.clientType}
                    </p>
                    <p className="text-xs text-muted-foreground/50 mt-1">{parseServices(inq.services)}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{new Date(inq.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      <p className="text-[10px] text-muted-foreground/50 mt-0.5">#{inq.id}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
