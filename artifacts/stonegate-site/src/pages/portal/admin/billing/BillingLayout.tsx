import { useLocation } from "wouter";
import { LayoutDashboard, Users, Briefcase, Clock } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const tabs = [
  { href: `${BASE}/portal/admin/billing`,             label: "Dashboard",   icon: LayoutDashboard, exact: true },
  { href: `${BASE}/portal/admin/billing/clients`,     label: "Clients",     icon: Users },
  { href: `${BASE}/portal/admin/billing/engagements`, label: "Engagements", icon: Briefcase },
  { href: `${BASE}/portal/admin/billing/time`,        label: "Time Entries", icon: Clock },
];

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const full = BASE + location;

  return (
    <div className="min-h-screen bg-black">
      {/* Billing sub-nav */}
      <div className="border-b border-white/8 bg-black/60">
        <div className="container mx-auto px-4 md:px-8">
          <nav className="flex items-center gap-1 overflow-x-auto">
            {tabs.map(t => {
              const active = t.exact ? (full === t.href || location === "/portal/admin/billing")
                                     : full.startsWith(t.href);
              return (
                <a
                  key={t.href}
                  href={t.href}
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
