import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  FileSpreadsheet,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  DollarSign,
  Package,
} from "lucide-react";
import heroImage from "@/assets/images/hero-construction.png";
import bitcoperLogo from "@/assets/images/bitcoper-logo.png";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={bitcoperLogo} alt="Bitcoper Tech SpA" className="w-8 h-8 rounded-lg object-contain" />
            <span className="text-lg font-bold tracking-tight">SmartBuild APU</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#how" className="hover:text-foreground transition-colors">Cómo Funciona</a>
          </div>
          <a href="/api/login">
            <Button className="shadow-lg shadow-primary/20" data-testid="button-login-nav">
              Iniciar Sesión
            </Button>
          </a>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
              <DollarSign className="w-3.5 h-3.5" />
              Motor de Precios Sodimac & Easy en tiempo real
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold leading-tight tracking-tight">
              Presupuestos de
              <br />
              <span className="text-primary">Construcción</span>
              <br />
              Inteligentes
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
              Sube tu Excel, compara precios de mercado Sodimac y Easy automáticamente, y genera análisis financiero profesional con márgenes reales para PYMEs constructoras en Chile.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="/api/login">
                <Button size="lg" className="shadow-lg shadow-primary/25 text-base px-8" data-testid="button-login-hero">
                  Comenzar Gratis <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground pt-2">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Acceso seguro
              </span>
              <span className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-500" />
                35+ materiales
              </span>
            </div>
          </div>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity" />
            <img
              src={heroImage}
              alt="Construcción moderna"
              className="relative rounded-2xl shadow-2xl ring-1 ring-white/5 transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-6 border-t border-border/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-serif font-bold mb-4">Todo lo que necesitas</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              SmartBuild automatiza el análisis de precios unitarios para constructoras chilenas, ahorrando horas de cotización manual.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-card/50 hover:bg-card border-border/50 transition-colors duration-300 group">
              <CardContent className="p-8 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold">Importación Excel</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Sube tu presupuesto en Excel y el sistema extrae automáticamente los ítems, cantidades, unidades y precios unitarios.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 hover:bg-card border-border/50 transition-colors duration-300 group">
              <CardContent className="p-8 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Precios de Mercado</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Comparación automática con precios de Sodimac y Easy. Identifica el mejor precio, marca y disponibilidad de stock.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 hover:bg-card border-border/50 transition-colors duration-300 group">
              <CardContent className="p-8 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold">Análisis Financiero</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Cascada financiera completa: Costo Directo, Gastos Generales, Utilidad, IVA. Exporta reportes PDF profesionales con tu logo.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="how" className="py-20 px-6 border-t border-border/30">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-serif font-bold mb-4">Cómo Funciona</h2>
          <p className="text-muted-foreground mb-12 max-w-lg mx-auto">Tres pasos simples para optimizar tus presupuestos</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Sube tu Excel", desc: "Arrastra tu presupuesto y el sistema identifica los ítems automáticamente." },
              { step: "2", title: "Sincroniza Precios", desc: "Compara con Sodimac y Easy para encontrar el mejor precio por cada material." },
              { step: "3", title: "Exporta tu APU", desc: "Genera PDFs profesionales con desglose financiero y firma digital." },
            ].map((item) => (
              <div key={item.step} className="space-y-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/30 py-8 px-6 text-center text-sm text-muted-foreground">
        <p>&copy; 2026 SmartBuild APU Engine — Bitcoper Tech SpA. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
