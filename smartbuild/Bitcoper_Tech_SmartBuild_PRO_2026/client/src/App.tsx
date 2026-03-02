import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import bitcoperLogo from "@/assets/images/bitcoper-logo.png";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Projects from "@/pages/Projects";
import ProjectDetails from "@/pages/ProjectDetails";
import Materials from "@/pages/Materials";
import Settings from "@/pages/Settings";
import Financing from "@/pages/Financing";
import LandingPage from "@/pages/LandingPage";
import CommercialLanding from "@/pages/CommercialLanding";

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id" component={ProjectDetails} />
      <Route path="/materials" component={Materials} />
      <Route path="/financing" component={Financing} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <img src={bitcoperLogo} alt="Bitcoper Tech SpA" className="w-16 h-16 mx-auto animate-pulse rounded-xl" />
          <p className="text-muted-foreground text-sm">Cargando SmartBuild...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/landing" component={CommercialLanding} />
        <Route><LandingPage /></Route>
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/landing" component={CommercialLanding} />
      <Route><AuthenticatedRouter /></Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
