import { useState } from "react";
import { Redirect } from "wouter";
import { useAuth } from "../hooks/use-auth";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) return <Redirect to="/dashboard" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Credenciales incorrectas");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1820] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 pointer-events-none"
        style={{backgroundImage:"linear-gradient(rgba(193,127,58,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(193,127,58,0.04) 1px,transparent 1px)",backgroundSize:"60px 60px"}} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded bg-[#C17F3A] mb-4">
            <span className="text-[#0D1820] font-black text-xl">SB</span>
          </div>
          <h1 className="text-white font-black text-3xl tracking-widest" style={{fontFamily:"'Bebas Neue',sans-serif"}}>SMARTBUILD</h1>
          <p className="text-[10px] font-mono text-[#C17F3A] tracking-[3px] uppercase mt-1">Enterprise · Control de Obra</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-[#1C2B3A] border border-[rgba(193,127,58,0.2)] rounded-sm p-8">
          <div className="mb-5">
            <label className="block text-[10px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-2">Correo</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(193,127,58,0.2)] text-white px-4 py-3 text-sm rounded-sm outline-none focus:border-[#C17F3A] transition-colors"
              placeholder="tu@empresa.com"
            />
          </div>
          <div className="mb-6">
            <label className="block text-[10px] font-mono text-[#6A7A8A] uppercase tracking-widest mb-2">Contraseña</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)} required
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(193,127,58,0.2)] text-white px-4 py-3 text-sm rounded-sm outline-none focus:border-[#C17F3A] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-900/20 border border-red-900/40 px-4 py-3 rounded-sm">
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting}
            className="w-full bg-[#C17F3A] hover:bg-[#E8A855] text-[#0D1820] font-bold py-3 text-sm tracking-widest uppercase rounded-sm transition-colors disabled:opacity-60">
            {submitting ? "Ingresando..." : "Ingresar →"}
          </button>
        </form>

        <p className="text-center text-[11px] text-[#3A4A5A] mt-6 font-mono">
          Bitcopper Tech SpA · Plan Enterprise
        </p>
      </div>
    </div>
  );
}
