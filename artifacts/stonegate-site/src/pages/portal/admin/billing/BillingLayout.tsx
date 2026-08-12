import { useLocation } from "wouter";
import { LayoutDashboard, Users, Briefcase, Clock, ArrowLeft, ChevronRight, FileText } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const TABS = [
  { href: `${BASE}/portal/admin/billing`,               label: "Dashboard",    icon: LayoutDashboard, exact: true },
  { href: `${BASE}/portal/admin/billing/clients`,       label: "Clients",      icon: Users },
  { href: `${BASE}/portal/admin/billing/engagements`,   label: "Engagements",  icon: Briefcase },
  { href: `${BASE}/portal/admin/billing/time`,          label: "Time Entries", icon: Clock },
  { href: `${BASE}/portal/admin/billing/statements`,    label: "Statements",   icon: FileText },
];

interface BillingLayoutProps {
  children: React.ReactNode;
}

/** Read URL search params safely (works during SSR/pre-render). */
function useSearchParams(): URLSearchParams {
  return new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
}

export default function BillingLayout({ children }: BillingLayoutProps) {
  const [location] = useLocation();
  const params = useSearchParams();

  // Context from URL params
  const from = params.get("from"); // "portal" | "client" | "case"
  const fromId = params.get("fromId");
  const fromName = params.get("fromName");
  const fromClientId = params.get("fromClientId");
  const fromClientName = params.get("fromClientName");

  // Build back button
  let backLabel = "← Back to Client Portal";
  let backHref = `${BASE}/portal/admin`;
  if (from === "client" && fromId) {
    backLabel = `← ${fromName ?? "Client"}`;
    backHref = `${BASE}/portal/admin/clients/${fromId}`;
  } else if (from === "case" && fromId) {
    backLabel = `← ${fromName ?? "Case"}`;
    backHref = `${BASE}/portal/admin/cases/${fromId}`;
  }

  // Build breadcrumbs
  type Crumb = { label: string; href?: string };
  const crumbs: Crumb[] = [{ label: "Client Portal", href: `${BASE}/portal/admin` }];
  if (from === "client" && fromId) {
    crumbs.push({ label: fromName ?? "Client", href: `${BASE}/portal/admin/clients/${fromId}` });
    crumbs.push({ label: "Billing & Time" });
  } else if (from === "case" && fromId) {
    if (fromClientId) {
      crumbs.push({ label: fromClientName ?? "Client", href: `${BASE}/portal/admin/clients/${fromClientId}` });
    }
    crumbs.push({ label: fromName ?? "Case", href: `${BASE}/portal/admin/cases/${fromId}` });
    crumbs.push({ label: "Time & Billing" });
  } else {
    crumbs.push({ label: "Billable Hours" });
  }

  // Determine active tab
  const full = BASE + location;
  const activeHref = TABS.find(t =>
    t.exact ? (full === t.href || location === "/portal/admin/billing") : full.startsWith(t.href)
  )?.href;

  // Forward context params to sub-tabs
  const ctxParams = new URLSearchParams();
  if (params.get("clientId")) ctxParams.set("clientId", params.get("clientId")!);
  if (from) ctxParams.set("from", from);
  if (fromId) ctxParams.set("fromId", fromId);
  if (fromName) ctxParams.set("fromName", fromName);
  if (fromClientId) ctxParams.set("fromClientId", fromClientId);
  if (fromClientName) ctxParams.set("fromClientName", fromClientName);
  const ctxSuffix = ctxParams.toString() ? `?${ctxParams}` : "";

  return (
    <div className="min-h-screen bg-black">
      {/* Top bar: back button + breadcrumbs */}
      <div className="border-b border-white/8 bg-black/80 sticky top-20 z-40">
        <div className="container mx-auto px-4 md:px-8">
          {/* Breadcrumb row */}
          <div className="h-11 flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto">
            <a href={backHref} className="flex items-center gap-1 hover:text-foreground transition-colors shrink-0 text-primary/80 hover:text-primary">
              <ArrowLeft className="w-3 h-3" />
              <span>{backLabel}</span>
            </a>
            <span className="text-white/15 mx-1">|</span>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1.5 shrink-0">
                {i > 0 && <ChevronRight className="w-3 h-3 text-white/20" />}
                {c.href && i < crumbs.length - 1 ? (
                  <a href={c.href} className="hover:text-foreground transition-colors">{c.label}</a>
                ) : (
                  <span className={i === crumbs.length - 1 ? "text-foreground" : ""}>{c.label}</span>
                )}
              </span>
            ))}
          </div>

          {/* Sub-nav tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto">
            {TABS.map(t => {
              const href = t.href + ctxSuffix;
              const active = t.href === activeHref;
              return (
                <a
                  key={t.href}
                  href={href}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs tracking-[0.1em] uppercase whitespace-nowrap border-b-2 transition-colors ${
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </a>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-8 py-10">
        {children}
      </div>
    </div>
  );
}
