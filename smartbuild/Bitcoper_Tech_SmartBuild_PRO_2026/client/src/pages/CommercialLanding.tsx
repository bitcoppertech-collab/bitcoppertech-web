import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  RefreshCw,
  Calculator,
  FileSignature,
  ArrowRight,
  Check,
  Zap,
  Users,
  Building2,
  Shield,
  Star,
  Upload,
  Download,
  Send,
  MessageCircle,
  X,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import bitcoperLogo from "@/assets/images/bitcoper-logo.png";
import heroConstruction from "@/assets/images/hero-construction.png";

export default function CommercialLanding() {
  const [demoForm, setDemoForm] = useState({ name: "", email: "", company: "", phone: "", message: "" });
  const [demoSending, setDemoSending] = useState(false);
  const [demoSent, setDemoSent] = useState(false);
  const [registerPlan, setRegisterPlan] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoForm.name || !demoForm.email) return;
    setDemoSending(true);
    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demoForm),
      });
      if (res.ok) {
        setDemoSent(true);
        toast({ title: "Solicitud enviada", description: "Te contactaremos pronto para agendar tu demo." });
      } else {
        toast({ title: "Error", description: "No se pudo enviar la solicitud. Intenta nuevamente.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Error de conexión. Intenta nuevamente.", variant: "destructive" });
    }
    setDemoSending(false);
  };

  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 40%, #111111 100%)" }}>

      {registerPlan && (
        <RegisterModal plan={registerPlan} onClose={() => setRegisterPlan(null)} />
      )}

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5" style={{ background: "rgba(15,15,15,0.85)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={bitcoperLogo} alt="Bitcoper Tech SpA" className="w-9 h-9 rounded-md object-contain" />
            <span className="text-lg font-bold tracking-tight" data-testid="text-brand-name">SmartBuild APU</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-neutral-400">
            <a href="#como-funciona" className="hover:text-white transition-colors">Cómo Funciona</a>
            <a href="#beneficios" className="hover:text-white transition-colors">Beneficios</a>
            <a href="#precios" className="hover:text-white transition-colors">Precios</a>
            <a href="#demo" className="hover:text-white transition-colors">Demo</a>
          </div>
          <a href="/api/login">
            <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10" data-testid="button-login-commercial">
              Iniciar Sesión
            </Button>
          </a>
        </div>
      </nav>

      <section className="relative pt-32 pb-28 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-32 left-1/3 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)" }} />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm mb-10" style={{ borderColor: "rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.08)", color: "#f97316" }}>
            <Zap className="w-3.5 h-3.5" />
            Plataforma SaaS para Constructoras Chilenas
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-[1.15] tracking-tight mb-7" data-testid="text-hero-title">
            Presupuesta en minutos,
            <br />
            <span style={{ color: "#f97316" }}>no en días.</span>
          </h1>
          <p className="text-xl md:text-2xl text-neutral-400 font-light leading-relaxed mb-4 max-w-2xl mx-auto">
            Potenciado por IA y precios reales de Chile.
          </p>
          <p className="text-base text-neutral-500 max-w-xl mx-auto mb-10">
            De <span className="text-neutral-300 font-medium">Bitcoper Tech SpA</span> — Conecta tu Excel con Sodimac y Easy, calcula tu APU automáticamente y genera documentos con firma digital.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="text-base px-10 py-6 rounded-md shadow-xl text-white border-0"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 8px 32px rgba(249,115,22,0.3)" }}
              onClick={() => setRegisterPlan("Plan PYME")}
              data-testid="button-cta-hero"
            >
              Comenzar Prueba Gratuita <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <a href="#demo">
              <Button variant="outline" size="lg" className="text-base px-8 py-6 rounded-md border-white/10 bg-white/5 text-white hover:bg-white/10" data-testid="button-request-demo">
                Solicitar Demo
              </Button>
            </a>
          </div>
          <div className="flex items-center justify-center gap-8 text-sm text-neutral-500 mt-12">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-500" />
              Sin tarjeta de crédito
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500" />
              35+ materiales
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-blue-400" />
              Soporte incluido
            </span>
          </div>
          <div className="mt-16 relative">
            <div className="absolute -inset-4 rounded-2xl blur-2xl" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(59,130,246,0.08) 50%, transparent 80%)" }} />
            <div className="relative rounded-xl overflow-hidden shadow-2xl" style={{ border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(249,115,22,0.1)" }}>
              <img src={heroConstruction} alt="Tokenización de cada ladrillo — Edificio en construcción con circuitos digitales" className="w-full h-auto" data-testid="img-hero-construction" />
              <div className="absolute bottom-0 left-0 right-0 p-6" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: "rgba(249,115,22,0.2)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316" }}>
                    <Zap className="w-3 h-3" /> Tokenización de cada ladrillo
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa" }}>
                    Activos Digitales en Obra
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="py-28 px-6 relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-how-title">Cómo Funciona</h2>
            <p className="text-neutral-400 max-w-lg mx-auto text-lg">
              Tres pasos para transformar tu presupuesto de obra
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(249,115,22,0.3), transparent)" }} />

            <div className="text-center space-y-5 group">
              <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center relative" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.15), rgba(249,115,22,0.05))", border: "1px solid rgba(249,115,22,0.2)" }}>
                <Upload className="w-9 h-9" style={{ color: "#f97316" }} />
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>1</div>
              </div>
              <h3 className="text-xl font-bold" data-testid="text-step-1">Carga tu Excel de Kamac Mayu</h3>
              <p className="text-neutral-400 leading-relaxed max-w-xs mx-auto">
                Sube tu presupuesto en formato Excel. El sistema identifica automáticamente ítems, cantidades, precios unitarios y la estructura de tu obra.
              </p>
            </div>

            <div className="text-center space-y-5 group">
              <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center relative" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))", border: "1px solid rgba(59,130,246,0.2)" }}>
                <RefreshCw className="w-9 h-9 text-blue-400" />
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)" }}>2</div>
              </div>
              <h3 className="text-xl font-bold" data-testid="text-step-2">Sincroniza con Sodimac/Easy</h3>
              <p className="text-neutral-400 leading-relaxed max-w-xs mx-auto">
                Compara cada material con precios reales de Sodimac y Easy. Identifica el mejor precio, marca, stock disponible y ahorro potencial.
              </p>
            </div>

            <div className="text-center space-y-5 group">
              <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center relative" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))", border: "1px solid rgba(16,185,129,0.2)" }}>
                <Download className="w-9 h-9 text-emerald-400" />
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>3</div>
              </div>
              <h3 className="text-xl font-bold" data-testid="text-step-3">Descarga tu Presupuesto con Firma Digital</h3>
              <p className="text-neutral-400 leading-relaxed max-w-xs mx-auto">
                Exporta PDFs profesionales con desglose APU, cascada financiera, carta Gantt, logo de tu empresa y firma digital incluida.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" className="py-28 px-6 relative" style={{ background: "rgba(255,255,255,0.01)" }}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-benefits-title">
              Todo lo que tu constructora necesita
            </h2>
            <p className="text-neutral-400 max-w-2xl mx-auto text-lg">
              Tres pilares que transforman la forma en que presupuestas tus obras
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="rounded-xl p-8 space-y-4 relative group" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.15)" }}>
                <RefreshCw className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold" data-testid="text-benefit-sync">Sincronización Real</h3>
              <p className="text-neutral-400 leading-relaxed">
                Conexión directa con <span className="text-white font-medium">Sodimac</span> y <span className="text-white font-medium">Easy</span> para precios actualizados. Más de 35 categorías de materiales con comparación automática de precio, marca y stock.
              </p>
              <ul className="space-y-2 pt-2">
                {["Precios Sodimac y Easy en tiempo real", "Comparación automática de marcas", "Verificación de stock en tienda"].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-neutral-400">
                    <Check className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl p-8 space-y-4 relative group" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.15)" }}>
                <Calculator className="w-7 h-7" style={{ color: "#f97316" }} />
              </div>
              <h3 className="text-xl font-bold" data-testid="text-benefit-calc">Cálculo Inteligente</h3>
              <p className="text-neutral-400 leading-relaxed">
                Desglose automático de <span className="text-white font-medium">APU</span>, <span className="text-white font-medium">Gastos Generales</span> y <span className="text-white font-medium">Utilidad</span>. Cascada financiera completa con IVA y margen de maniobra real del mercado.
              </p>
              <ul className="space-y-2 pt-2">
                {["Cascada: Neto + GG% + Utilidad% + IVA", "Margen de maniobra vs. mercado", "Importación directa desde Excel"].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-neutral-400">
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#f97316" }} />{item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl p-8 space-y-4 relative group" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <FileSignature className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold" data-testid="text-benefit-legal">Legalidad y Firma</h3>
              <p className="text-neutral-400 leading-relaxed">
                Generación de <span className="text-white font-medium">PDFs profesionales</span> con firma digital y logo personalizado. Presupuestos, APUs detallados y cartas Gantt con la identidad de tu empresa.
              </p>
              <ul className="space-y-2 pt-2">
                {["PDFs con logo y firma digital", "Presupuesto, APU y Gantt exportables", "RUT y datos empresa personalizables"].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-neutral-400">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="precios" className="py-28 px-6 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.04) 0%, transparent 70%)" }} />
        </div>
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-pricing-title">Planes y Tarifas</h2>
            <p className="text-neutral-400 max-w-xl mx-auto text-lg">
              Elige el plan que mejor se adapte al tamaño de tu operación
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="rounded-xl p-8 relative" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }} data-testid="card-plan-pyme">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)" }}>
                    <Building2 className="w-5 h-5" style={{ color: "#f97316" }} />
                  </div>
                  <h3 className="text-2xl font-bold">Plan PYME</h3>
                </div>
                <p className="text-sm text-neutral-400">Para contratistas independientes</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$29.990</span>
                  <span className="text-neutral-500 text-sm">/mes</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">CLP + IVA | Suscripción mensual</p>
              </div>
              <ul className="space-y-3 mb-8">
                {["1 usuario", "Hasta 10 proyectos activos", "Importación Excel ilimitada", "Sincronización Sodimac y Easy", "Cascada financiera completa", "Exportación PDF con logo", "Soporte por email"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-neutral-300">
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#f97316" }} />{f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full rounded-md text-white border-0"
                style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 4px 16px rgba(249,115,22,0.25)" }}
                onClick={() => setRegisterPlan("Plan PYME")}
                data-testid="button-buy-pyme"
              >
                Comprar Ahora <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="rounded-xl p-8 relative" style={{ background: "rgba(249,115,22,0.03)", border: "1px solid rgba(249,115,22,0.15)" }} data-testid="card-plan-empresa">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-4 py-1 rounded-full text-xs font-semibold text-white shadow-lg" style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 4px 12px rgba(249,115,22,0.3)" }}>
                  <Star className="w-3 h-3" /> Más popular
                </span>
              </div>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background: "rgba(249,115,22,0.15)" }}>
                    <Users className="w-5 h-5" style={{ color: "#f97316" }} />
                  </div>
                  <h3 className="text-2xl font-bold">Plan Empresa</h3>
                </div>
                <p className="text-sm text-neutral-400">Con soporte y múltiples usuarios</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$249.990</span>
                  <span className="text-neutral-500 text-sm">/año</span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">CLP + IVA | Suscripción anual (ahorra 30%)</p>
              </div>
              <ul className="space-y-3 mb-8">
                {["Hasta 5 usuarios", "Proyectos ilimitados", "Importación Excel ilimitada", "Sincronización Sodimac y Easy", "Cascada financiera completa", "Exportación PDF con logo y firma", "Carta Gantt y programación", "Soporte prioritario telefónico", "Onboarding personalizado"].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-neutral-300">
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#f97316" }} />{f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full rounded-md text-white border-0"
                style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 4px 16px rgba(249,115,22,0.25)" }}
                onClick={() => setRegisterPlan("Plan Empresa")}
                data-testid="button-buy-empresa"
              >
                Comprar Ahora <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="demo" className="py-28 px-6 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[100px]" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)" }} />
        </div>
        <div className="max-w-2xl mx-auto relative z-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-demo-title">Solicitar Demo</h2>
            <p className="text-neutral-400 text-lg">
              Déjanos tus datos y te mostraremos cómo SmartBuild puede optimizar tus presupuestos
            </p>
          </div>

          <div className="rounded-xl p-8 md:p-10" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {demoSent ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold" data-testid="text-demo-success">Solicitud Recibida</h3>
                <p className="text-neutral-400">Te contactaremos pronto para agendar tu demostración personalizada.</p>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-medium text-neutral-300 mb-2 block">Nombre completo *</label>
                    <input
                      type="text"
                      required
                      value={demoForm.name}
                      onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                      className="w-full rounded-md px-4 py-3 text-sm text-white outline-none transition-colors"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      data-testid="input-demo-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-300 mb-2 block">Email *</label>
                    <input
                      type="email"
                      required
                      value={demoForm.email}
                      onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                      className="w-full rounded-md px-4 py-3 text-sm text-white outline-none transition-colors"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      data-testid="input-demo-email"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-medium text-neutral-300 mb-2 block">Empresa</label>
                    <input
                      type="text"
                      value={demoForm.company}
                      onChange={(e) => setDemoForm({ ...demoForm, company: e.target.value })}
                      className="w-full rounded-md px-4 py-3 text-sm text-white outline-none transition-colors"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      data-testid="input-demo-company"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-300 mb-2 block">Teléfono</label>
                    <input
                      type="tel"
                      value={demoForm.phone}
                      onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                      className="w-full rounded-md px-4 py-3 text-sm text-white outline-none transition-colors"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      data-testid="input-demo-phone"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-300 mb-2 block">Mensaje (opcional)</label>
                  <textarea
                    rows={3}
                    value={demoForm.message}
                    onChange={(e) => setDemoForm({ ...demoForm, message: e.target.value })}
                    className="w-full rounded-md px-4 py-3 text-sm text-white outline-none transition-colors resize-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    placeholder="Cuéntanos sobre tu proyecto o necesidades..."
                    data-testid="input-demo-message"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={demoSending}
                  className="w-full rounded-md text-white border-0 py-6 text-base"
                  style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 4px 20px rgba(249,115,22,0.3)" }}
                  data-testid="button-submit-demo"
                >
                  {demoSending ? "Enviando..." : (<>Solicitar Demo Gratuita <Send className="w-4 h-4 ml-2" /></>)}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      <SalesChatbot />

      <footer className="py-12 px-6 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={bitcoperLogo} alt="Bitcoper Tech SpA" className="w-7 h-7 rounded-md object-contain" />
            <span className="text-sm font-semibold">SmartBuild APU</span>
          </div>
          <p className="text-sm text-neutral-500 text-center" data-testid="text-footer-copyright">
            &copy; 2026 SmartBuild APU Engine — Bitcoper Tech SpA. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6 text-sm text-neutral-500">
            <a href="#como-funciona" className="hover:text-white transition-colors">Cómo Funciona</a>
            <a href="#beneficios" className="hover:text-white transition-colors">Beneficios</a>
            <a href="#precios" className="hover:text-white transition-colors">Precios</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function RegisterModal({ plan, onClose }: { plan: string; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", company: "", rut: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-xl shadow-2xl p-8" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)" }}>
          {submitted ? (
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white" data-testid="text-register-success">Registro Exitoso</h3>
              <p className="text-neutral-400 text-sm">
                Hemos recibido tu solicitud para el <span className="font-semibold text-white">{plan}</span>. Te contactaremos pronto.
              </p>
              <Button onClick={onClose} variant="outline" className="mt-4 border-white/10 bg-white/5 text-white hover:bg-white/10" data-testid="button-close-modal">Cerrar</Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white" data-testid="text-register-title">Comenzar Prueba — {plan}</h3>
                  <p className="text-sm text-neutral-400 mt-1">Completa tus datos para activar tu cuenta</p>
                </div>
                <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors" data-testid="button-close-register">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-neutral-300 mb-1 block">Nombre completo *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-md px-3 py-2.5 text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    data-testid="input-register-name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-300 mb-1 block">Empresa *</label>
                  <input
                    type="text"
                    required
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full rounded-md px-3 py-2.5 text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    data-testid="input-register-company"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-neutral-300 mb-1 block">RUT *</label>
                  <input
                    type="text"
                    required
                    placeholder="12.345.678-9"
                    value={form.rut}
                    onChange={(e) => setForm({ ...form, rut: e.target.value })}
                    className="w-full rounded-md px-3 py-2.5 text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    data-testid="input-register-rut"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full mt-2 rounded-md text-white border-0 py-5"
                  style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 4px 16px rgba(249,115,22,0.25)" }}
                  data-testid="button-submit-register"
                >
                  Activar Prueba Gratuita <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SalesChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ from: "bot" | "user"; text: string }[]>([
    { from: "bot", text: "¡Hola! Soy el asistente virtual de Bitcoper Tech SpA. ¿En qué puedo ayudarte?" }
  ]);
  const [input, setInput] = useState("");
  const [emailCollected, setEmailCollected] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { from: "user", text: userMsg }]);

    setTimeout(() => {
      if (emailCollected) {
        setMessages((prev) => [...prev, { from: "bot", text: "¡Gracias! Tu información ha sido registrada. Un ejecutivo se pondrá en contacto contigo pronto." }]);
      } else {
        const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
        if (emailRegex.test(userMsg)) {
          setEmailCollected(true);
          setMessages((prev) => [...prev, { from: "bot", text: "¡Perfecto! Hemos registrado tu correo. Un ejecutivo de Bitcoper Tech SpA te contactará para activar tu demo de SmartBuild APU. ¡Gracias!" }]);
        } else {
          setMessages((prev) => [...prev, { from: "bot", text: "Hola, soy el asistente de Bitcoper Tech SpA. Déjanos tu correo y un ejecutivo te contactará para activar tu demo de SmartBuild APU." }]);
        }
      }
    }, 500);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110"
          style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 4px 24px rgba(249,115,22,0.4)" }}
          data-testid="button-open-chatbot"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-[90] w-80 sm:w-96 rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", height: "420px" }} data-testid="chatbot-panel">
          <div className="flex items-center justify-between px-4 py-3" style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-white" />
              <span className="text-sm font-semibold text-white">Asistente Bitcoper</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition-colors" data-testid="button-close-chatbot">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.from === "user" ? "text-white" : "text-neutral-200"}`}
                  style={{
                    background: msg.from === "user" ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${msg.from === "user" ? "rgba(249,115,22,0.3)" : "rgba(255,255,255,0.06)"}`,
                  }}
                  data-testid={`chatbot-msg-${i}`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Escribe tu mensaje..."
              className="flex-1 rounded-md px-3 py-2 text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              data-testid="input-chatbot-message"
            />
            <button
              onClick={handleSend}
              className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
              data-testid="button-send-chatbot"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
