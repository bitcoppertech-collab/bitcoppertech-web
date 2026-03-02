import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Briefcase, 
  Package, 
  Settings, 
  Menu,
  X,
  LogOut,
  Banknote,
  ShieldCheck,
  Store,
  Hammer,
  Home,
} from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import bitcoperLogo from "@/assets/images/bitcoper-logo.png";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Projects", icon: Briefcase, href: "/projects" },
  { label: "Materials", icon: Package, href: "/materials" },
  { label: "Financiamiento", icon: Banknote, href: "/financing" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
    enabled: !!user,
  });
  const { data: distributorCheck } = useQuery<{ isDistributor: boolean }>({
    queryKey: ["/api/distributor/check"],
    enabled: !!user,
  });
  const { data: maestroCheck } = useQuery<{ isMaestro: boolean }>({
    queryKey: ["/api/maestro/check"],
    enabled: !!user,
  });

  const isAdmin = adminCheck?.isAdmin === true;
  const isDistributor = distributorCheck?.isDistributor === true;
  const isMaestro = maestroCheck?.isMaestro === true;

  const navItems = [
    ...NAV_ITEMS,
    { label: "Mi Hogar Seguro", icon: Home, href: "/mi-hogar-seguro" },
    { label: "Maestro", icon: Hammer, href: "/maestro" },
    ...(isDistributor ? [{ label: "Distribuidor", icon: Store, href: "/distributor" }] : []),
    ...(isAdmin ? [{ label: "Admin", icon: ShieldCheck, href: "/admin" }] : []),
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="p-6 flex items-center gap-3 border-b border-border/50">
        <img src={bitcoperLogo} alt="Bitcopper Tech SpA" className="w-10 h-10 rounded-lg object-contain" />
        <div>
          <h1 className="font-bold text-lg tracking-tight">SmartBuild</h1>
          <p className="text-xs text-muted-foreground font-mono">APU ENGINE v1.0</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "animate-pulse" : "group-hover:scale-110 transition-transform")} />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50 space-y-3">
        {user && (
          <div className="flex items-center gap-3 px-2">
            {user.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="" className="w-8 h-8 rounded-full ring-2 ring-primary/20" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {(user.firstName || user.email || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid="text-user-name">
                {user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user.email || "Usuario"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}
        <a href="/api/logout" className="block">
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" data-testid="button-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 fixed inset-y-0 left-0 z-50">
        <NavContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-card border-border">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r border-border bg-card">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
