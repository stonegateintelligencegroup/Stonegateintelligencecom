import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import Shell from '@/components/layout/Shell';
import ScrollToTop from '@/components/ScrollToTop';
import { CookieConsentProvider } from '@/context/CookieConsentContext';

import Home from '@/pages/Home';
import About from '@/pages/About';
import Services from '@/pages/Services';
import Contact from '@/pages/Contact';
import Privacy from '@/pages/Privacy';
import UnderConstruction from '@/pages/UnderConstruction';

const queryClient = new QueryClient();

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
        <Route path="/under-construction" component={UnderConstruction} />

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
            <Router />
          </WouterRouter>
          <Toaster />
        </CookieConsentProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
