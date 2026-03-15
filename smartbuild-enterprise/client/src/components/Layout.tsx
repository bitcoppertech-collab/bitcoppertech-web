import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../hooks/use-auth";
import {
  LayoutDashboard, FolderOpen, HardHat, Box, ShieldAlert,
  LogOut, Menu, X, ChevronRight, Settings, Users
} from "lucide-react";

const NAV = [
  { href: "/dashboard",   label: "Dashboard",      icon: LayoutDashboard },
  { href: "/projects",    label: "Proyectos",       icon: FolderOpen },
];

const PROJECT_NAV = [
  { suffix: "",       label: "Presupuesto",     icon: FolderOpen },
  { suffix: "/obra",  label: "Control de Obra", icon: HardHat },
  { suffix: "/bim",   label: "BIM 4D",          icon: Box },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  // Extract project id from URL if in project context
  const projectMatch = location.match(/^\/projects\/(\d+)/);
  const projectId = projectMatch?.[1];

  return (
    <div className="flex min-h-screen bg-[#0D1820] text-white font-sans">
      {/* Mobile overlay */}
      {open && <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-[#0D1820] border-r border-[rgba(193,127,58,0.15)]
        flex flex-col transition-transform duration-200
        ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:flex
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[rgba(193,127,58,0.12)]">
          <div className="w-8 h-8 rounded bg-[#C17F3A] flex items-center justify-center flex-shrink-0">
            <span className="text-[#0D1820] font-black text-xs">SB</span>
          </div>
          <div>
            <div className="font-black text-sm tracking-wider text-white" style={{fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"2px",fontSize:"16px"}}>SmartBuild</div>
            <div className="text-[10px] font-mono tracking-widest text-[#C17F3A] uppercase">Enterprise</div>
          </div>
          <button className="ml-auto lg:hidden text-[#6A7A8A]" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="px-3 mb-2">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <a className={`flex items-center gap-3 px-3 py-2.5 rounded-md mb-1 text-sm transition-colors
                  ${location === href || location.startsWith(href + "/")
                    ? "bg-[rgba(193,127,58,0.15)] text-[#E8A855] font-medium"
                    : "text-[#6A7A8A] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"}`}>
                  <Icon size={16} />
                  {label}
                </a>
              </Link>
            ))}
          </div>

          {/* Project sub-nav when inside a project */}
          {projectId && (
            <div className="px-3 mt-3 pt-3 border-t border-[rgba(193,127,58,0.1)]">
              <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest px-3 mb-2">Proyecto #{projectId}</div>
              {PROJECT_NAV.map(({ suffix, label, icon: Icon }) => {
                const href = `/projects/${projectId}${suffix}`;
                const active = location === href;
                return (
                  <Link key={href} href={href}>
                    <a className={`flex items-center gap-3 px-3 py-2.5 rounded-md mb-1 text-sm transition-colors
                      ${active
                        ? "bg-[rgba(193,127,58,0.15)] text-[#E8A855] font-medium border-l-2 border-[#C17F3A]"
                        : "text-[#6A7A8A] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"}`}>
                      <Icon size={16} />
                      {label}
                      {active && <ChevronRight size={12} className="ml-auto" />}
                    </a>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Admin only */}
          {user?.role === "admin" && (
            <div className="px-3 mt-3 pt-3 border-t border-[rgba(193,127,58,0.1)]">
              <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest px-3 mb-2">Admin</div>
              <Link href="/admin">
                <a className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors
                  ${location === "/admin" ? "bg-[rgba(193,127,58,0.15)] text-[#E8A855] font-medium" : "text-[#6A7A8A] hover:text-white hover:bg-[rgba(255,255,255,0.04)]"}`}>
                  <Users size={16} />Panel Admin
                </a>
              </Link>
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-[rgba(193,127,58,0.12)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[rgba(193,127,58,0.2)] flex items-center justify-center flex-shrink-0">
              <span className="text-[#C17F3A] text-xs font-bold">{user?.name?.charAt(0) ?? "U"}</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-[11px] text-[#6A7A8A] truncate">{user?.companyName ?? user?.email}</div>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 text-[#6A7A8A] hover:text-white text-sm py-1.5 transition-colors">
            <LogOut size={14} />Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="fixed top-0 left-0 right-0 z-10 lg:hidden flex items-center gap-3 px-4 py-3 bg-[#0D1820] border-b border-[rgba(193,127,58,0.12)]">
        <button onClick={() => setOpen(true)} className="text-[#6A7A8A]"><Menu size={20} /></button>
        <span className="font-black text-sm tracking-widest text-[#C17F3A]" style={{fontFamily:"'Bebas Neue',sans-serif"}}>SMARTBUILD</span>
      </div>

      {/* Main content */}
      <main className="flex-1 min-h-screen overflow-y-auto lg:ml-0 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
