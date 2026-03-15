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
import Partners from "@/pages/Partners";
import Demo from "@/pages/Demo";
import Admin from "@/pages/Admin";
import DistributorDashboard from "@/pages/DistributorDashboard";
import MaestroDashboard from "@/pages/MaestroDashboard";
import RateMaestro from "@/pages/RateMaestro";
import Marketplace from "@/pages/Marketplace";
import ClientDashboard from "@/pages/ClientDashboard";
import MiHogarSeguro from "@/pages/MiHogarSeguro";
import QuickPay from "@/pages/QuickPay";
import CapturaLanding from "@/pages/CapturaLanding";
import ValidarCupon from "@/pages/ValidarCupon";
import ChatWidget from "@/components/ChatWidget";
import { ReferralCodePrompt, captureReferralFromUrl } from "@/components/ReferralCodePrompt";
import LoginPage from "@/pages/LoginPage";
import { useEffect } from "react";

captureReferralFromUrl();

function AuthenticatedRouter() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/projects" component={Projects} />
      <Route path="/projects/:id" component={ProjectDetails} />
      <Route path="/materials" component={Materials} />
      <Route path="/financing" component={Financing} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={Admin} />
      <Route path="/distributor" component={DistributorDashboard} />
      <Route path="/maestro" component={MaestroDashboard} />
      <Route path="/mi-hogar-seguro" component={MiHogarSeguro} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    captureReferralFromUrl();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <img src={bitcoperLogo} alt="Bitcopper Tech SpA" className="w-16 h-16 mx-auto animate-pulse rounded-xl" />
          <p className="text-muted-foreground text-sm">Cargando SmartBuild...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/rate/:token" component={RateMaestro} />
        <Route path="/pagar/:token" component={QuickPay} />
        <Route path="/marketplace" component={Marketplace} />
        <Route path="/mi-cuenta" component={ClientDashboard} />
        <Route path="/validar-cupon" component={ValidarCupon} />
        <Route path="/registro" component={CapturaLanding} />
        <Route path="/partners" component={Partners} />
        <Route path="/login" component={LoginPage} />
        <Route path="/demo" component={Demo} />
        <Route path="/info" component={LandingPage} />
        <Route><CommercialLanding /></Route>
      </Switch>
    );
  }

  return (
    <>
      <Switch>
        <Route path="/rate/:token" component={RateMaestro} />
        <Route path="/pagar/:token" component={QuickPay} />
        <Route path="/marketplace" component={Marketplace} />
        <Route path="/mi-cuenta" component={ClientDashboard} />
        <Route path="/validar-cupon" component={ValidarCupon} />
        <Route path="/registro" component={CapturaLanding} />
        <Route path="/partners" component={Partners} />
        <Route path="/login" component={LoginPage} />
        <Route path="/demo" component={Demo} />
        <Route><AuthenticatedRouter /></Route>
      </Switch>
      <ReferralCodePrompt />
      <ChatWidget />
    </>
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
