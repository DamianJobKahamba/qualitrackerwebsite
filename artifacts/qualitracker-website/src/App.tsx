import { lazy, Suspense, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

// Route-based code splitting: each page ships only its own code on first
// load, instead of one bundle carrying the Docs sidebar, the RAG diagram,
// and Framer Motion for a visitor who only ever opens /waitlist. See
// docs/website/15_PERFORMANCE_AUDIT.md for the bundle-size finding this fixes.
const LandingPage = lazy(() => import('@/pages/landing-page'));
const ProductPage = lazy(() => import('@/pages/product-page'));
const SolutionsPage = lazy(() => import('@/pages/solutions-page'));
const DocsPage = lazy(() => import('@/pages/docs-page'));
const CompanyPage = lazy(() => import('@/pages/company-page'));
const SecurityPage = lazy(() => import('@/pages/security-page'));
const WaitlistPage = lazy(() => import('@/pages/waitlist-page'));
const TalkToTeamPage = lazy(() => import('@/pages/talk-to-team-page'));
const BookDemoPage = lazy(() => import('@/pages/book-demo-page'));
const PrivacyPage = lazy(() => import('@/pages/privacy-page'));
const NotFound = lazy(() => import('@/pages/not-found'));

const queryClient = new QueryClient();

function RouteFallback() {
  // Deliberately minimal — this only shows for the brief window a route
  // chunk takes to fetch, and PageShell (nav/footer) is inside the lazy
  // chunk itself, so there's no shell to keep visible underneath it.
  return (
    <div className="flex min-h-dvh items-center justify-center" style={{ background: 'var(--qt-clinical-white)' }}>
      <span className="qt-thinking h-3 w-3 rounded-full" style={{ background: 'var(--qt-deep-teal)' }} />
    </div>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Switch>
          <Route path="/" component={LandingPage} />
          <Route path="/product" component={ProductPage} />
          <Route path="/solutions" component={SolutionsPage} />
          <Route path="/docs" component={DocsPage} />
          <Route path="/company" component={CompanyPage} />
          <Route path="/security" component={SecurityPage} />
          <Route path="/waitlist" component={WaitlistPage} />
          <Route path="/talk-to-team" component={TalkToTeamPage} />
          <Route path="/book-demo" component={BookDemoPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
