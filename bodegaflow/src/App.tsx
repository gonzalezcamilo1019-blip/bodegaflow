import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import RequisitionsNewPage from "@/pages/requisitions-new";
import RequisitionsPage from "@/pages/requisitions";
import RequisitionDetailPage from "@/pages/requisition-detail";
import InventoryPage from "@/pages/inventory";
import MovementsPage from "@/pages/movements";
import PhysicalCountsPage from "@/pages/physical-counts";
import PhysicalCountDetailPage from "@/pages/physical-count-detail";
import InventoryDifferencesPage from "@/pages/inventory-differences";
import ProductsPage from "@/pages/products";
import SuppliersPage from "@/pages/suppliers";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30000,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sidebar">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user && location !== "/login") {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <AuthProvider>
      <AuthGuard>
        <Switch>
          <Route path="/login" component={LoginPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/requisitions/new" component={RequisitionsNewPage} />
          <Route path="/requisitions/:id" component={RequisitionDetailPage} />
          <Route path="/requisitions" component={RequisitionsPage} />
          <Route path="/inventory/movements" component={MovementsPage} />
          <Route path="/inventory/physical-counts/:id" component={PhysicalCountDetailPage} />
          <Route path="/inventory/physical-counts" component={PhysicalCountsPage} />
          <Route path="/inventory/differences" component={InventoryDifferencesPage} />
          <Route path="/inventory/products" component={ProductsPage} />
          <Route path="/inventory" component={InventoryPage} />
          <Route path="/suppliers" component={SuppliersPage} />
          <Route path="/">
            <Redirect to="/dashboard" />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </AuthGuard>
    </AuthProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
