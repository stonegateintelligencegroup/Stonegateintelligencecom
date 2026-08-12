import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import Shell from '@/components/layout/Shell';
import ScrollToTop from '@/components/ScrollToTop';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CookieConsentProvider } from '@/context/CookieConsentContext';

import Home from '@/pages/Home';
import About from '@/pages/About';
import Services from '@/pages/Services';
import Contact from '@/pages/Contact';
import Privacy from '@/pages/Privacy';
import Portal from '@/pages/Portal';

// Portal pages
import Login from '@/pages/portal/Login';
import SetPassword from '@/pages/portal/SetPassword';
import ForgotPassword from '@/pages/portal/ForgotPassword';
import ResetPassword from '@/pages/portal/ResetPassword';
import ClientDashboard from '@/pages/portal/ClientDashboard';
import ClientDocuments from '@/pages/portal/ClientDocuments';
import ClientMessages from '@/pages/portal/ClientMessages';
import AdminDashboard from '@/pages/portal/admin/AdminDashboard';
import AdminClientNew from '@/pages/portal/admin/AdminClientNew';
import AdminNewCase from '@/pages/portal/admin/AdminNewCase';
import AdminCaseDetail from '@/pages/portal/admin/AdminCaseDetail';
import AdminInquiries from '@/pages/portal/admin/AdminInquiries';
import BillingDashboard from '@/pages/portal/admin/billing/BillingDashboard';
import BillingClients from '@/pages/portal/admin/billing/BillingClients';
import BillingEngagements from '@/pages/portal/admin/billing/BillingEngagements';
import BillingTimeEntries from '@/pages/portal/admin/billing/BillingTimeEntries';
import Intake from '@/pages/Intake';

const queryClient = new QueryClient();

function PortalGuard({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  const [, setLocation] = (window as any).__wouterSetLocation || [null, () => {}];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) {
    // Redirect handled in Portal.tsx / Login page via useEffect
    window.location.replace(import.meta.env.BASE_URL.replace(/\/$/, '') + '/portal/login');
    return null;
  }

  if (adminOnly && user.role !== 'admin') {
    window.location.replace(import.meta.env.BASE_URL.replace(/\/$/, '') + '/portal/dashboard');
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Shell>
      <ScrollToTop />
      <Switch>
        {/* Public pages */}
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/services" component={Services} />
        <Route path="/contact" component={Contact} />
        <Route path="/privacy" component={Privacy} />

        {/* Portal auth */}
        <Route path="/portal/login" component={Login} />
        <Route path="/portal/invite/:token" component={SetPassword} />
        <Route path="/portal/forgot-password" component={ForgotPassword} />
        <Route path="/portal/reset-password/:token" component={ResetPassword} />

        {/* Portal root redirect */}
        <Route path="/portal" component={Portal} />

        {/* Client portal */}
        <Route path="/portal/intake">
          <PortalGuard><Intake /></PortalGuard>
        </Route>
        <Route path="/portal/dashboard">
          <PortalGuard><ClientDashboard /></PortalGuard>
        </Route>
        <Route path="/portal/documents">
          <PortalGuard><ClientDocuments /></PortalGuard>
        </Route>
        <Route path="/portal/messages">
          <PortalGuard><ClientMessages /></PortalGuard>
        </Route>

        {/* Admin portal */}
        <Route path="/portal/admin">
          <PortalGuard adminOnly><AdminDashboard /></PortalGuard>
        </Route>
        <Route path="/portal/admin/clients/new">
          <PortalGuard adminOnly><AdminClientNew /></PortalGuard>
        </Route>
        <Route path="/portal/admin/cases/new">
          <PortalGuard adminOnly><AdminNewCase /></PortalGuard>
        </Route>
        <Route path="/portal/admin/cases/:id">
          <PortalGuard adminOnly><AdminCaseDetail /></PortalGuard>
        </Route>
        <Route path="/portal/admin/inquiries">
          <PortalGuard adminOnly><AdminInquiries /></PortalGuard>
        </Route>

        {/* Billing */}
        <Route path="/portal/admin/billing/clients">
          <PortalGuard adminOnly><BillingClients /></PortalGuard>
        </Route>
        <Route path="/portal/admin/billing/engagements">
          <PortalGuard adminOnly><BillingEngagements /></PortalGuard>
        </Route>
        <Route path="/portal/admin/billing/time">
          <PortalGuard adminOnly><BillingTimeEntries /></PortalGuard>
        </Route>
        <Route path="/portal/admin/billing">
          <PortalGuard adminOnly><BillingDashboard /></PortalGuard>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CookieConsentProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </CookieConsentProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
