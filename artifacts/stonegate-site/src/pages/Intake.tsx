import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronRight, Check, AlertCircle, ArrowLeft, ArrowRight, Pencil } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const TODAY = new Date().toISOString().split("T")[0];

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  // Step 1
  fullName: string; submissionDate: string; referredBy: string;
  mailingAddress: string; phone: string; email: string;
  preferredContact: string; bestTime: string; clientType: string;
  // Step 2
  services: string[]; otherServiceDescription: string;
  // Step 3
  engagementDetails: string;
  // Step 4
  timeline: string; targetCompletionDate: string;
  engagementStructure: string; budgetRange: string; budgetNotes: string;
  // Step 5
  acknowledged: boolean; electronicSignature: string; signatureDate: string;
}

const EMPTY: FormData = {
  fullName: "", submissionDate: TODAY, referredBy: "", mailingAddress: "",
  phone: "", email: "", preferredContact: "", bestTime: "", clientType: "",
  services: [], otherServiceDescription: "", engagementDetails: "",
  timeline: "", targetCompletionDate: "", engagementStructure: "",
  budgetRange: "", budgetNotes: "", acknowledged: false,
  electronicSignature: "", signatureDate: TODAY,
};

const STEP_LABELS = [
  "Client Information", "Services", "Engagement Details",
  "Timeline & Budget", "Acknowledgement", "Review & Submit",
];

const SERVICES = [
  { value: "investigative", label: "Investigative services" },
  { value: "intelligence", label: "Intelligence consulting" },
  { value: "due_diligence", label: "Due diligence research" },
  { value: "risk", label: "Risk assessment" },
  { value: "background", label: "Background research" },
  { value: "litigation", label: "Litigation support services" },
  { value: "business_intel", label: "Business intelligence services" },
  { value: "other", label: "Other consulting" },
];

const SERVICE_MAP: Record<string, string> = Object.fromEntries(SERVICES.map(s => [s.value, s.label]));

const TIMELINE_OPTIONS = [
  { value: "urgent", label: "Urgent — within 48 hours" },
  { value: "standard", label: "Standard — within 1–2 weeks" },
  { value: "flexible", label: "Flexible / no set deadline" },
];

const STRUCTURE_OPTIONS = [
  { value: "hourly", label: "Hourly rate" },
  { value: "flat", label: "Flat fee — defined scope" },
  { value: "retainer", label: "Monthly retainer" },
  { value: "unsure", label: "Not sure — would like a recommendation" },
];

const BUDGET_OPTIONS = [
  "Under $500", "$500–$1,000", "$1,000–$2,500",
  "$2,500–$5,000", "$5,000+", "Not sure",
];

const CLIENT_LABELS: Record<string, string> = {
  individual: "Individual", attorney: "Attorney / Law Firm", business: "Company",
};

const CLIENT_ICONS: Record<string, string> = {
  individual: "👤", attorney: "⚖️", business: "🏢",
};

const CLIENT_DESCRIPTIONS: Record<string, string> = {
  individual: "Private individual seeking personal investigative or research services",
  attorney: "Law firm or attorney seeking litigation support, due diligence, or investigative assistance",
  business: "Corporation, LLC, or other business entity seeking intelligence or investigative services",
};
const TIMELINE_LABELS: Record<string, string> = {
  urgent: "Urgent — within 48 hours", standard: "Standard — 1–2 weeks", flexible: "Flexible / no set deadline",
};
const STRUCTURE_LABELS: Record<string, string> = {
  hourly: "Hourly rate", flat: "Flat fee — defined scope",
  retainer: "Monthly retainer", unsure: "Not sure — would like a recommendation",
};

// ── Reusable field components ─────────────────────────────────────────────────

function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">
        {label}{required && <span className="text-primary ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground/60 mt-1.5 leading-relaxed">{hint}</p>}
      {error && <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><AlertCircle className="w-3 h-3 shrink-0" />{error}</p>}
    </div>
  );
}

const inputCls = "w-full bg-black border border-white/15 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60 transition-colors";
const inputErrCls = "w-full bg-black border border-red-500/40 rounded px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-red-400/60 transition-colors";

// ── Main component ────────────────────────────────────────────────────────────

export default function Intake() {
  const isOnboarding = typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("onboarding") === "1";
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [editFrom, setEditFrom] = useState<number | null>(null); // step we came from review
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const up = (patch: Partial<FormData>) => setData(d => ({ ...d, ...patch }));
  const err = (f: string) => errors[f];

  // ── Validation ───────────────────────────────────────────────────────────────

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!data.fullName.trim()) e.fullName = "Full name is required.";
      if (!data.submissionDate) e.submissionDate = "Date is required.";
      if (!data.phone.trim() || data.phone.replace(/\D/g, "").length < 10)
        e.phone = "Enter a valid phone number (at least 10 digits).";
      if (!data.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
        e.email = "Enter a valid email address.";
      if (!data.preferredContact) e.preferredContact = "Select a preferred contact method.";
      if (!data.clientType) e.clientType = "Select a client type.";
    }
    if (s === 2) {
      if (data.services.length === 0) e.services = "Select at least one service.";
      if (data.services.includes("other") && !data.otherServiceDescription.trim())
        e.otherServiceDescription = "Please describe the service you are seeking.";
    }
    if (s === 3) {
      if (!data.engagementDetails.trim() || data.engagementDetails.trim().length < 10)
        e.engagementDetails = "Please provide at least a brief description of your inquiry.";
    }
    if (s === 4) {
      if (!data.timeline) e.timeline = "Select a timeline.";
      if (!data.engagementStructure) e.engagementStructure = "Select an engagement structure.";
    }
    if (s === 5) {
      if (!data.acknowledged) e.acknowledged = "You must acknowledge the terms to continue.";
      if (!data.electronicSignature.trim()) e.electronicSignature = "Enter your full legal name as your electronic signature.";
      if (!data.signatureDate) e.signatureDate = "Signature date is required.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Navigation ───────────────────────────────────────────────────────────────

  const next = () => {
    if (!validate(step)) return;
    if (editFrom !== null) { setStep(editFrom); setEditFrom(null); }
    else setStep(s => Math.min(s + 1, 6));
  };

  const back = () => {
    setErrors({});
    if (editFrom !== null) { setStep(editFrom); setEditFrom(null); }
    else setStep(s => Math.max(s - 1, 1));
  };

  const editSection = (s: number) => {
    setErrors({});
    setEditFrom(6);
    setStep(s);
  };

  // ── Submit ────────────────────────────────────────────────────────────────────

  const submit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`${BASE}/api/intake`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          services: JSON.stringify(data.services),
          _honey: "", // honeypot must be empty
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setSubmitError(body.error ?? `Submission failed (${res.status}). Please try again.`);
        return;
      }
      setConfirmed(true);
    } catch {
      setSubmitError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Confirmation screen ───────────────────────────────────────────────────────

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-20">
        <div className="max-w-xl w-full text-center space-y-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="font-serif text-3xl text-foreground mb-4">
              {isOnboarding ? "Information Received" : "Inquiry Received"}
            </h1>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Thank you for contacting Stonegate Intelligence Group. Your information has been received.
              A representative will review the information provided and contact you regarding next steps.
            </p>
            <p className="text-sm text-muted-foreground/60 border border-white/8 rounded-lg p-4 leading-relaxed">
              Submission of this form does not create an attorney-client relationship, investigator-client
              relationship, or guarantee that Stonegate Intelligence Group will accept an engagement.
            </p>
          </div>
          {isOnboarding ? (
            <Link href="/portal/login" className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-8 py-3 rounded transition-colors">
              Sign In to Your Portal <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link href="/" className="inline-flex items-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs tracking-[0.15em] uppercase px-6 py-3 rounded transition-colors">
              Return to Stonegate Intelligence Group <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ── Progress bar ──────────────────────────────────────────────────────────────

  const progress = editFrom !== null ? 6 : step;

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <div className="container mx-auto px-4 md:px-8 max-w-2xl">

        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs tracking-[0.3em] uppercase text-primary mb-3">Stonegate Intelligence Group</p>
          <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground/50 mb-8">Every Question Deserves an Answer Grounded in Evidence</p>
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-3">Client Information Sheet</h1>
          {isOnboarding ? (
            <p className="text-muted-foreground text-sm">
              Welcome. Before accessing your portal, please complete this form so our team can prepare for your engagement.
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">Please complete all sections that apply to your inquiry.</p>
          )}
          <div className="mt-6 border border-amber-900/30 bg-amber-900/10 rounded-lg px-5 py-4 text-left">
            <p className="text-xs text-amber-400/80 leading-relaxed">
              <strong className="text-amber-400">Privacy Notice:</strong> Please do not submit passwords, Social Security numbers,
              financial account numbers, medical records, or other highly sensitive personal information through this form.
              A Stonegate representative will contact you regarding secure methods for providing sensitive documentation when appropriate.
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mb-10">
          <div className="flex justify-between mb-2">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className={`text-[9px] uppercase tracking-wider hidden md:block ${i + 1 === progress ? "text-primary" : i + 1 < progress ? "text-primary/50" : "text-muted-foreground/30"}`}>
                {i + 1}. {label}
              </div>
            ))}
          </div>
          <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-primary/70 rounded-full transition-all duration-500" style={{ width: `${((progress - 1) / 5) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">Step {progress} of 6</span>
            <span className="text-xs text-primary">{STEP_LABELS[progress - 1]}</span>
          </div>
        </div>

        {/* ── Step 1: Client Information ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-8">
            <SectionTitle>Section 1 — Client Information</SectionTitle>

            {/* Client type — prominent card selection, asked first */}
            <div>
              <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-1">
                I am contacting Stonegate as a… <span className="text-primary">*</span>
              </p>
              <p className="text-xs text-muted-foreground/50 mb-4">Select the option that best describes you.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(["individual", "attorney", "business"] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => up({ clientType: v })}
                    className={`relative text-left p-5 rounded-lg border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                      data.clientType === v
                        ? "border-primary bg-primary/8 shadow-[0_0_0_1px_rgba(192,57,43,0.15)]"
                        : "border-white/10 bg-white/2 hover:border-white/25 hover:bg-white/4"
                    }`}
                  >
                    {data.clientType === v && (
                      <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                    <span className="block text-xl mb-2">{CLIENT_ICONS[v]}</span>
                    <span className="block text-sm font-medium text-foreground mb-1.5">{CLIENT_LABELS[v]}</span>
                    <span className="block text-xs text-muted-foreground/60 leading-relaxed">{CLIENT_DESCRIPTIONS[v]}</span>
                  </button>
                ))}
              </div>
              {err("clientType") && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{err("clientType")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <Field label="Full Name / Company Name" required error={err("fullName")}>
                  <input value={data.fullName} onChange={e => up({ fullName: e.target.value })}
                    className={err("fullName") ? inputErrCls : inputCls} placeholder="Your full name or company name" />
                </Field>
              </div>
              <Field label="Date" required error={err("submissionDate")}>
                <input type="date" value={data.submissionDate} onChange={e => up({ submissionDate: e.target.value })}
                  className={err("submissionDate") ? inputErrCls : inputCls} />
              </Field>
              <Field label="Referred By">
                <input value={data.referredBy} onChange={e => up({ referredBy: e.target.value })}
                  className={inputCls} placeholder="Name of referral (optional)" />
              </Field>
              <div className="md:col-span-2">
                <Field label="Mailing Address">
                  <input value={data.mailingAddress} onChange={e => up({ mailingAddress: e.target.value })}
                    className={inputCls} placeholder="Street, City, State, ZIP (optional)" />
                </Field>
              </div>
              <Field label="Phone" required error={err("phone")}>
                <input type="tel" value={data.phone} onChange={e => up({ phone: e.target.value })}
                  className={err("phone") ? inputErrCls : inputCls} placeholder="(555) 555-5555" />
              </Field>
              <Field label="Email" required error={err("email")}>
                <input type="email" value={data.email} onChange={e => up({ email: e.target.value })}
                  className={err("email") ? inputErrCls : inputCls} placeholder="email@example.com" />
              </Field>
              <Field label="Preferred Contact Method" required error={err("preferredContact")}>
                <select value={data.preferredContact} onChange={e => up({ preferredContact: e.target.value })}
                  className={err("preferredContact") ? inputErrCls : inputCls}>
                  <option value="">Select…</option>
                  <option value="Phone">Phone</option>
                  <option value="Email">Email</option>
                  <option value="Text Message">Text Message</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Best Time to Reach You">
                <input value={data.bestTime} onChange={e => up({ bestTime: e.target.value })}
                  className={inputCls} placeholder="e.g., Weekdays 9am–5pm" />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 2: Services ────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <SectionTitle>Section 2 — Services Needed</SectionTitle>
            <p className="text-sm text-muted-foreground">Please select all that apply.</p>
            <div className="space-y-3">
              {SERVICES.map(s => (
                <label key={s.value} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${data.services.includes(s.value) ? "border-primary bg-primary/20" : "border-white/20 group-hover:border-white/40"}`}>
                    {data.services.includes(s.value) && <Check className="w-2.5 h-2.5 text-primary" />}
                  </div>
                  <input type="checkbox" className="sr-only" value={s.value}
                    checked={data.services.includes(s.value)}
                    onChange={e => up({ services: e.target.checked ? [...data.services, s.value] : data.services.filter(x => x !== s.value) })} />
                  <span className="text-sm text-foreground">{s.label}</span>
                </label>
              ))}
            </div>
            {err("services") && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{err("services")}</p>}
            {data.services.includes("other") && (
              <Field label="Please describe the service you are seeking" required error={err("otherServiceDescription")}>
                <textarea value={data.otherServiceDescription} onChange={e => up({ otherServiceDescription: e.target.value })}
                  rows={3} className={err("otherServiceDescription") ? inputErrCls + " resize-none" : inputCls + " resize-none"}
                  placeholder="Describe the service you need…" />
              </Field>
            )}
          </div>
        )}

        {/* ── Step 3: Engagement Details ──────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <SectionTitle>Section 3 — Case / Engagement Details</SectionTitle>
            <Field
              label="Please briefly describe the nature of your inquiry, including relevant names, dates, locations, and desired outcome"
              required error={err("engagementDetails")}
              hint="Please provide only information necessary for Stonegate to understand your inquiry. Additional documentation can be provided through a secure method if requested.">
              <textarea value={data.engagementDetails} onChange={e => up({ engagementDetails: e.target.value })}
                rows={10} className={(err("engagementDetails") ? inputErrCls : inputCls) + " resize-y leading-relaxed"}
                placeholder="Describe your inquiry here…" />
            </Field>
          </div>
        )}

        {/* ── Step 4: Timeline & Budget ───────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-8">
            <SectionTitle>Section 4 — Timeline & Urgency</SectionTitle>
            <div className="space-y-3">
              {TIMELINE_OPTIONS.map(o => (
                <label key={o.value} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${data.timeline === o.value ? "border-primary bg-primary/20" : "border-white/20 group-hover:border-white/40"}`}>
                    {data.timeline === o.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <input type="radio" className="sr-only" value={o.value} checked={data.timeline === o.value} onChange={() => up({ timeline: o.value })} />
                  <span className="text-sm text-foreground">{o.label}</span>
                </label>
              ))}
            </div>
            {err("timeline") && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{err("timeline")}</p>}
            {data.timeline === "urgent" && (
              <div className="border border-amber-900/30 bg-amber-900/10 rounded-lg px-4 py-3">
                <p className="text-xs text-amber-400/80 leading-relaxed">
                  Urgent requests may be subject to expedited-service availability and additional fees.
                </p>
              </div>
            )}
            <Field label="Target Completion Date (if applicable)">
              <input type="date" value={data.targetCompletionDate} onChange={e => up({ targetCompletionDate: e.target.value })}
                className={inputCls} />
            </Field>

            <SectionTitle>Section 5 — Budget / Engagement Preference</SectionTitle>
            <div>
              <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-3">Preferred Engagement Structure <span className="text-primary">*</span></p>
              <div className="space-y-3">
                {STRUCTURE_OPTIONS.map(o => (
                  <label key={o.value} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${data.engagementStructure === o.value ? "border-primary bg-primary/20" : "border-white/20 group-hover:border-white/40"}`}>
                      {data.engagementStructure === o.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <input type="radio" className="sr-only" value={o.value} checked={data.engagementStructure === o.value} onChange={() => up({ engagementStructure: o.value })} />
                    <span className="text-sm text-foreground">{o.label}</span>
                  </label>
                ))}
              </div>
              {err("engagementStructure") && <p className="text-xs text-red-400 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{err("engagementStructure")}</p>}
            </div>
            <Field label="Estimated Budget Range (optional)">
              <select value={data.budgetRange} onChange={e => up({ budgetRange: e.target.value })} className={inputCls}>
                <option value="">Select…</option>
                {BUDGET_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Additional Budget or Engagement Information">
              <textarea value={data.budgetNotes} onChange={e => up({ budgetNotes: e.target.value })}
                rows={3} className={inputCls + " resize-none"} placeholder="Any additional notes (optional)" />
            </Field>
          </div>
        )}

        {/* ── Step 5: Acknowledgement ─────────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-8">
            <SectionTitle>Section 6 — Acknowledgement</SectionTitle>
            <div className="border border-white/10 rounded-lg p-6 bg-white/2">
              <p className="text-sm text-foreground/80 leading-relaxed">
                "I certify that the information provided above is accurate to the best of my knowledge,
                and that any services requested from Stonegate Intelligence Group will be used for lawful purposes only."
              </p>
            </div>
            <div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${data.acknowledged ? "border-primary bg-primary/20" : "border-white/20 group-hover:border-white/40"}`}>
                  {data.acknowledged && <Check className="w-3 h-3 text-primary" />}
                </div>
                <input type="checkbox" className="sr-only" checked={data.acknowledged} onChange={e => up({ acknowledged: e.target.checked })} />
                <span className="text-sm text-foreground">I agree to the acknowledgement above. <span className="text-primary">*</span></span>
              </label>
              {err("acknowledged") && <p className="text-xs text-red-400 mt-2 flex items-center gap-1 ml-8"><AlertCircle className="w-3 h-3" />{err("acknowledged")}</p>}
            </div>
            <Field label="Electronic Signature" required error={err("electronicSignature")}
              hint="Type your full legal name to serve as your electronic signature.">
              <input value={data.electronicSignature} onChange={e => up({ electronicSignature: e.target.value })}
                className={err("electronicSignature") ? inputErrCls : inputCls}
                placeholder="Full legal name" style={{ fontStyle: "italic" }} />
            </Field>
            <Field label="Signature Date" required error={err("signatureDate")}>
              <input type="date" value={data.signatureDate} onChange={e => up({ signatureDate: e.target.value })}
                className={err("signatureDate") ? inputErrCls : inputCls} />
            </Field>
          </div>
        )}

        {/* ── Step 6: Review & Submit ─────────────────────────────────────────── */}
        {step === 6 && (
          <div className="space-y-6">
            <SectionTitle>Review Your Information</SectionTitle>
            <p className="text-sm text-muted-foreground">Please review all information before submitting. Click "Edit" next to any section to make changes.</p>

            {submitError && (
              <div className="flex items-start gap-2 text-red-400 text-sm p-4 border border-red-900/30 bg-red-900/10 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {[
              {
                title: "Client Information", step: 1,
                rows: [
                  ["Full Name / Company Name", data.fullName],
                  ["Date", data.submissionDate],
                  ["Phone", data.phone],
                  ["Email", data.email],
                  ["Preferred Contact", data.preferredContact],
                  ...(data.referredBy ? [["Referred By", data.referredBy]] : []),
                  ...(data.mailingAddress ? [["Mailing Address", data.mailingAddress]] : []),
                  ...(data.bestTime ? [["Best Time to Reach", data.bestTime]] : []),
                  ["Client Type", CLIENT_LABELS[data.clientType] ?? data.clientType],
                ],
              },
              {
                title: "Services Needed", step: 2,
                rows: [
                  ["Services", data.services.map(s => SERVICE_MAP[s] ?? s).join(", ") || "—"],
                  ...(data.otherServiceDescription ? [["Other Description", data.otherServiceDescription]] : []),
                ],
              },
              {
                title: "Engagement Details", step: 3,
                rows: [["Description", data.engagementDetails]],
              },
              {
                title: "Timeline & Budget", step: 4,
                rows: [
                  ["Timeline", TIMELINE_LABELS[data.timeline] ?? data.timeline],
                  ...(data.targetCompletionDate ? [["Target Date", data.targetCompletionDate]] : []),
                  ["Engagement Structure", STRUCTURE_LABELS[data.engagementStructure] ?? data.engagementStructure],
                  ...(data.budgetRange ? [["Budget Range", data.budgetRange]] : []),
                  ...(data.budgetNotes ? [["Budget Notes", data.budgetNotes]] : []),
                ],
              },
              {
                title: "Acknowledgement", step: 5,
                rows: [
                  ["Acknowledged", data.acknowledged ? "Yes" : "No"],
                  ["Electronic Signature", data.electronicSignature],
                  ["Signature Date", data.signatureDate],
                ],
              },
            ].map(section => (
              <div key={section.title} className="border border-white/10 rounded-lg overflow-hidden">
                <div className="px-5 py-3 bg-white/2 border-b border-white/8 flex items-center justify-between">
                  <h3 className="font-serif text-base text-foreground">{section.title}</h3>
                  <button onClick={() => editSection(section.step)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                </div>
                <div className="divide-y divide-white/5">
                  {section.rows.map(([label, value]) => (
                    <div key={label} className="px-5 py-3 flex flex-col md:flex-row gap-1 md:gap-4">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground md:w-44 shrink-0">{label}</span>
                      <span className="text-sm text-foreground whitespace-pre-wrap">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="border border-white/8 rounded-lg p-4 text-xs text-muted-foreground/60 leading-relaxed">
              Submission of this form does not create an attorney-client relationship, investigator-client relationship,
              or guarantee that Stonegate Intelligence Group will accept an engagement.
            </div>

            {/* Hidden honeypot */}
            <div aria-hidden="true" style={{ display: "none" }}>
              <input type="text" name="_honey" tabIndex={-1} autoComplete="off" />
            </div>
          </div>
        )}

        {/* ── Navigation buttons ──────────────────────────────────────────────── */}
        <div className={`flex mt-10 ${step > 1 ? "justify-between" : "justify-end"}`}>
          {step > 1 && (
            <button onClick={back}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors px-4 py-2">
              <ArrowLeft className="w-4 h-4" />
              {editFrom !== null ? "Cancel Edit" : "Back"}
            </button>
          )}
          {step < 6 ? (
            <button onClick={next}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-8 py-3 rounded transition-colors">
              {editFrom !== null ? "Save & Return to Review" : "Continue"}
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={submit} disabled={submitting}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-xs tracking-[0.15em] uppercase px-8 py-3 rounded transition-colors disabled:opacity-60 disabled:cursor-wait">
              {submitting ? "Submitting…" : "Submit Inquiry"}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-white/10 pb-4">
      <h2 className="font-serif text-xl text-foreground">{children}</h2>
    </div>
  );
}
