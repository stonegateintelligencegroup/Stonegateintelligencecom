import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';

import Shell from '@/components/layout/Shell';
import ScrollToTop from '@/components/ScrollToTop';
import { useGAPageTracking } from '@/hooks/useGAPageTracking';
import CookieBanner from '@/components/CookieBanner';
import { CookieConsentProvider } from '@/context/CookieConsentContext';
import Home from '@/pages/Home';
import About from '@/pages/About';
import Services from '@/pages/Services';
import Contact from '@/pages/Contact';
import Portal from '@/pages/Portal';

const queryClient = new QueryClient();

function Router() {
  useGAPageTracking();
  return (
    <Shell>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/services" component={Services} />
        <Route path="/contact" component={Contact} />
        <Route path="/portal" component={Portal} />
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
          <CookieBanner />
        </CookieConsentProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
