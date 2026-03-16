import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { Toaster } from "./components/ui/toaster";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ControlObraPage from "./pages/ControlObraPage";
import BIMPage from "./pages/BIMPage";
import AdminPage from "./pages/AdminPage";
import ImportPresupuesto from "./pages/ImportPresupuesto";
import PresupuestoPage from "./pages/PresupuestoPage";
import Layout from "./components/Layout";
import AnaliticasPage from "./pages/AnaliticasPage";
import LastPlannerPage from "./pages/LastPlannerPage";
import IFCViewer from "./pages/IFCViewer";
import LibroObraPage from "./pages/LibroObraPage";
import MineriaPage from "./pages/MineriaPage";
import CodelcoPage from "./pages/CodelcoPage";
import BHPPage from "./pages/BHPPage";

function ProtectedRoute({ component: Component, adminOnly = false }: { component: React.ComponentType<any>, adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#0D1820] flex items-center justify-center"><div className="text-[#C17F3A] font-mono text-sm animate-pulse">Cargando...</div></div>;
  if (!user) return <Redirect to="/login" />;
  if (adminOnly && user.role !== "admin") return <Redirect to="/dashboard" />;
  return <Layout><Component /></Layout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/projects" component={() => <ProtectedRoute component={ProjectsPage} />} />
      <Route path="/projects/:id" component={() => <ProtectedRoute component={ProjectDetailPage} />} />
      <Route path="/projects/:id/presupuesto" component={() => <ProtectedRoute component={PresupuestoPage} />} />
      <Route path="/projects/:id/obra" component={() => <ProtectedRoute component={ControlObraPage} />} />
      <Route path="/projects/:id/bim" component={() => <ProtectedRoute component={BIMPage} />} />
      <Route path="/projects/:id/import" component={() => <ProtectedRoute component={ImportPresupuesto} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={AdminPage} adminOnly />} />
      <Route path="/">{user ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}</Route>
      <Route path="/projects/:id/analiticas" component={() => <ProtectedRoute component={AnaliticasPage} />} />
      <Route path="/projects/:id/lps" component={() => <ProtectedRoute component={LastPlannerPage} />} />
      <Route path="/projects/:id/ifc" component={() => <ProtectedRoute component={IFCViewer} />} />
      <Route path="/projects/:id/libro-obra" component={() => <ProtectedRoute component={LibroObraPage} />} />
      <Route path="/mineria" component={() => <ProtectedRoute component={MineriaPage} />} />
      <Route path="/mineria/codelco" component={() => <ProtectedRoute component={CodelcoPage} />} />
      <Route path="/mineria/bhp" component={() => <ProtectedRoute component={BHPPage} />} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
