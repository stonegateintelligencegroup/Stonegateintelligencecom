import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import Shell from '@/components/layout/Shell';
import ScrollToTop from '@/components/ScrollToTop';
import { AuthProvider, useAuth } from '@/lib/auth';

import Home from '@/pages/Home';
import About from '@/pages/About';
import Services from '@/pages/Services';
import Contact from '@/pages/Contact';
import Portal from '@/pages/Portal';

// Portal pages
import Login from '@/pages/portal/Login';
import SetPassword from '@/pages/portal/SetPassword';
import ClientDashboard from '@/pages/portal/ClientDashboard';
import ClientDocuments from '@/pages/portal/ClientDocuments';
import ClientMessages from '@/pages/portal/ClientMessages';
import AdminDashboard from '@/pages/portal/admin/AdminDashboard';
import AdminClientNew from '@/pages/portal/admin/AdminClientNew';
import AdminNewCase from '@/pages/portal/admin/AdminNewCase';
import AdminCaseDetail from '@/pages/portal/admin/AdminCaseDetail';

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

        {/* Portal auth */}
        <Route path="/portal/login" component={Login} />
        <Route path="/portal/invite/:token" component={SetPassword} />

        {/* Portal root redirect */}
        <Route path="/portal" component={Portal} />

        {/* Client portal */}
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

        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
