import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { Plus, X, Users, Mail, CheckCircle } from "lucide-react";

export default function AdminPage() {
  const qc = useQueryClient();
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", name: "", companyName: "", role: "client" });

  const { data: demoRequests = [] } = useQuery({ queryKey: ["demo-requests"], queryFn: () => apiRequest("GET", "/admin/demo-requests") });
  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: () => apiRequest("GET", "/admin/users") });

  const createUser = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/admin/users", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); setShowNewUser(false); setNewUser({ email: "", password: "", name: "", companyName: "", role: "client" }); },
  });

  const toggleUser = useMutation({
    mutationFn: ({ id, isActive }: any) => apiRequest("PUT", `/admin/users/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const approveDemo = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/admin/demo-requests/${id}`, { estado: "aprobado" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demo-requests"] }),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest mb-1">Administración</div>
        <h1 className="text-4xl font-black text-white" style={{fontFamily:"'Bebas Neue',sans-serif"}}>Panel Admin</h1>
        <p className="text-[#6A7A8A] text-sm mt-1">Bitcopper Tech SpA</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px bg-[rgba(193,127,58,0.08)] border border-[rgba(193,127,58,0.08)] mb-8">
        {[
          { label: "Clientes activos", value: users.filter((u: any) => u.isActive && u.role === "client").length },
          { label: "Demo requests", value: demoRequests.filter((d: any) => d.estado === "pendiente").length },
          { label: "Total usuarios", value: users.length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#1C2B3A] p-5">
            <div className="text-[10px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-1.5">{label}</div>
            <div className="text-3xl font-black text-white" style={{fontFamily:"'Bebas Neue',sans-serif"}}>{value}</div>
          </div>
        ))}
      </div>

      {/* Demo requests */}
      <div className="mb-8">
        <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest mb-3">Solicitudes de Demo</div>
        {demoRequests.length === 0 ? (
          <div className="text-[#6A7A8A] text-sm py-6 border border-dashed border-[rgba(193,127,58,0.15)] text-center">Sin solicitudes pendientes</div>
        ) : (
          <div className="space-y-2">
            {demoRequests.map((d: any) => (
              <div key={d.id} className="flex items-center gap-4 bg-[#1C2B3A] border border-[rgba(255,255,255,0.04)] px-4 py-3">
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">{d.nombre} — {d.empresa}</div>
                  <div className="text-xs text-[#6A7A8A] font-mono">{d.email} · {d.plan ?? "Sin plan"}</div>
                </div>
                <div className="text-[10px] font-mono text-[#6A7A8A]">{new Date(d.createdAt).toLocaleDateString("es-CL")}</div>
                <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 border rounded-sm
                  ${d.estado === "aprobado" ? "text-[#2ECC71] border-[rgba(46,204,113,0.3)] bg-[rgba(46,204,113,0.08)]" : "text-[#E8A855] border-[rgba(193,127,58,0.3)] bg-[rgba(193,127,58,0.08)]"}`}>
                  {d.estado}
                </span>
                {d.estado === "pendiente" && (
                  <button onClick={() => approveDemo.mutate(d.id)}
                    className="text-xs text-[#6A7A8A] hover:text-[#2ECC71] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(46,204,113,0.3)] px-2 py-1 rounded-sm transition-colors">
                    Aprobar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest">Usuarios / Clientes</div>
          <button onClick={() => setShowNewUser(true)}
            className="flex items-center gap-1.5 bg-[#C17F3A] hover:bg-[#E8A855] text-[#0D1820] font-bold text-xs px-3 py-1.5 rounded-sm transition-colors">
            <Plus size={12} />Nuevo usuario
          </button>
        </div>

        {showNewUser && (
          <div className="mb-4 bg-[#1C2B3A] border border-[rgba(193,127,58,0.25)] p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-[#C17F3A] uppercase tracking-widest">Crear usuario Enterprise</span>
              <button onClick={() => setShowNewUser(false)}><X size={14} className="text-[#6A7A8A]" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { key: "name", label: "Nombre completo *", placeholder: "Juan Pérez" },
                { key: "email", label: "Correo *", placeholder: "juan@empresa.com", type: "email" },
                { key: "password", label: "Contraseña *", placeholder: "mínimo 8 caracteres", type: "password" },
                { key: "companyName", label: "Empresa", placeholder: "Constructora S.A." },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-[9px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-1">{label}</label>
                  <input type={type || "text"} placeholder={placeholder}
                    value={(newUser as any)[key]} onChange={e => setNewUser(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm rounded-sm outline-none focus:border-[#C17F3A]" />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-[9px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-1">Rol</label>
                <select value={newUser.role} onChange={e => setNewUser(f => ({ ...f, role: e.target.value }))}
                  className="bg-[rgba(255,255,255,0.04)] border border-[rgba(193,127,58,0.2)] text-white px-3 py-2 text-sm rounded-sm outline-none focus:border-[#C17F3A]">
                  <option value="client">Cliente Enterprise</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button onClick={() => createUser.mutate(newUser)} disabled={!newUser.email || !newUser.password || !newUser.name || createUser.isPending}
                className="mt-4 bg-[#C17F3A] hover:bg-[#E8A855] text-[#0D1820] font-bold text-sm px-5 py-2 rounded-sm transition-colors disabled:opacity-50">
                {createUser.isPending ? "Creando..." : "Crear usuario"}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          {users.map((u: any) => (
            <div key={u.id} className="flex items-center gap-4 bg-[#1C2B3A] border border-[rgba(255,255,255,0.04)] px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-[rgba(193,127,58,0.2)] flex items-center justify-center flex-shrink-0">
                <span className="text-[#C17F3A] text-xs font-bold">{u.name?.charAt(0) ?? "U"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm">{u.name}</div>
                <div className="text-xs text-[#6A7A8A] font-mono truncate">{u.email} · {u.companyName ?? "Sin empresa"}</div>
              </div>
              <span className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 border rounded-sm
                ${u.role === "admin" ? "text-[#E8A855] border-[rgba(193,127,58,0.3)] bg-[rgba(193,127,58,0.08)]" : "text-[#6A7A8A] border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]"}`}>
                {u.role}
              </span>
              <button onClick={() => toggleUser.mutate({ id: u.id, isActive: !u.isActive })}
                className={`text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 border rounded-sm transition-colors
                  ${u.isActive ? "text-[#2ECC71] border-[rgba(46,204,113,0.3)]" : "text-red-400 border-red-900/30"}`}>
                {u.isActive ? "Activo" : "Inactivo"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
