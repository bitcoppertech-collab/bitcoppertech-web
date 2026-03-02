import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { HardHat, Home, ArrowLeft, ArrowRight, CheckCircle2, Phone, User, Wrench, Store } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import bitcoperLogo from "@/assets/images/bitcoper-logo.png";

const TIPOS_OBRA = [
  "Construccion completa",
  "Remodelacion",
  "Ampliacion",
  "Terminaciones",
  "Obra gruesa",
  "Instalaciones (electrica/sanitaria)",
  "Otro",
];

export default function CapturaLanding() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialRole = urlParams.get("role") as "maestro" | "homeowner" | null;
  const [selectedRole, setSelectedRole] = useState<"maestro" | "homeowner" | null>(initialRole);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tipoObra, setTipoObra] = useState("");

  const submitMutation = useMutation({
    mutationFn: async (data: { name: string; phone: string; tipoObra: string; role: string }) => {
      const res = await apiRequest("POST", "/api/landing-leads", data);
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !tipoObra || !selectedRole) return;
    submitMutation.mutate({ name, phone, tipoObra, role: selectedRole });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1729] via-[#1a2744] to-[#0f1729] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 bg-[#1a2744]/80 backdrop-blur-sm shadow-2xl">
          <CardContent className="pt-10 pb-10 text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white" data-testid="text-success-heading">
              Listo, te contactaremos pronto
            </h2>
            <p className="text-gray-300 text-lg">
              {selectedRole === "maestro"
                ? "Un ejecutivo SmartBuild te llamara para activar tu cuenta y empezar a cobrar de forma segura."
                : "Un asesor te contactara para proteger tu inversion y asegurar tu obra."}
            </p>
            <Button
              onClick={() => {
                setSubmitted(false);
                setSelectedRole(null);
                setName("");
                setPhone("");
                setTipoObra("");
              }}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-white/10"
              data-testid="button-back-home"
            >
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f1729] via-[#1a2744] to-[#0f1729] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 bg-[#1a2744]/80 backdrop-blur-sm shadow-2xl">
          <CardContent className="pt-8 pb-8 space-y-6">
            <button
              onClick={() => setSelectedRole(null)}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              data-testid="button-go-back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Volver</span>
            </button>

            <div className="text-center space-y-2">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${
                selectedRole === "maestro" ? "bg-orange-500/20" : "bg-blue-500/20"
              }`}>
                {selectedRole === "maestro"
                  ? <HardHat className="w-8 h-8 text-orange-400" />
                  : <Home className="w-8 h-8 text-blue-400" />
                }
              </div>
              <h2 className="text-xl font-bold text-white" data-testid="text-form-heading">
                {selectedRole === "maestro"
                  ? "Quiero cobrar seguro"
                  : "Quiero proteger mi obra"}
              </h2>
              <p className="text-gray-400 text-sm">
                Dejanos tus datos y te contactamos
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-11 h-14 text-lg bg-[#0f1729]/60 border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500"
                    required
                    data-testid="input-lead-name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input
                    placeholder="+56 9 XXXX XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-11 h-14 text-lg bg-[#0f1729]/60 border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500"
                    required
                    data-testid="input-lead-phone"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Wrench className="absolute left-3 top-3 w-5 h-5 text-gray-500 z-10" />
                  <Select value={tipoObra} onValueChange={setTipoObra} required>
                    <SelectTrigger
                      className="pl-11 h-14 text-lg bg-[#0f1729]/60 border-gray-700 text-white [&>span]:text-gray-500 data-[state=open]:border-emerald-500"
                      data-testid="select-tipo-obra"
                    >
                      <SelectValue placeholder="Tipo de obra" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2744] border-gray-700">
                      {TIPOS_OBRA.map((tipo) => (
                        <SelectItem
                          key={tipo}
                          value={tipo}
                          className="text-white hover:bg-white/10 focus:bg-white/10"
                          data-testid={`option-tipo-${tipo.toLowerCase().replace(/\s/g, "-")}`}
                        >
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!name || !phone || !tipoObra || submitMutation.isPending}
                className={`w-full h-16 text-xl font-bold rounded-2xl shadow-lg transition-all ${
                  selectedRole === "maestro"
                    ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                    : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                }`}
                data-testid="button-submit-lead"
              >
                {submitMutation.isPending ? "Enviando..." : "Contactenme"}
              </Button>

              {submitMutation.isError && (
                <p className="text-red-400 text-center text-sm" data-testid="text-error">
                  Ocurrio un error. Intenta de nuevo.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1729] via-[#1a2744] to-[#0f1729] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-4">
          <img src={bitcoperLogo} alt="SmartBuild" className="w-14 h-14 mx-auto rounded-xl" />
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight" data-testid="text-landing-title">
            Construye con confianza
          </h1>
          <p className="text-gray-400 text-lg">
            Pagos protegidos para maestros y dueños de casa
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setSelectedRole("maestro")}
            className="w-full group"
            data-testid="button-role-maestro"
          >
            <Card className="border-0 bg-gradient-to-r from-orange-500/10 to-orange-600/5 hover:from-orange-500/20 hover:to-orange-600/10 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-orange-500/10">
              <CardContent className="p-6 sm:p-8 flex items-center gap-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-500/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/30 transition-colors">
                  <HardHat className="w-8 h-8 sm:w-10 sm:h-10 text-orange-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    Soy Maestro y quiero cobrar seguro
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Recibe pagos protegidos por cada avance de obra
                  </p>
                </div>
              </CardContent>
            </Card>
          </button>

          <button
            onClick={() => setSelectedRole("homeowner")}
            className="w-full group"
            data-testid="button-role-homeowner"
          >
            <Card className="border-0 bg-gradient-to-r from-blue-500/10 to-blue-600/5 hover:from-blue-500/20 hover:to-blue-600/10 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-blue-500/10">
              <CardContent className="p-6 sm:p-8 flex items-center gap-5">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/30 transition-colors">
                  <Home className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    Soy Dueno de Casa y quiero proteger mi obra
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Asegura tu inversion con pagos por hitos verificados
                  </p>
                </div>
              </CardContent>
            </Card>
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <a
            href="/"
            className="flex items-center justify-center gap-2 text-orange-400/80 hover:text-orange-400 text-sm font-medium transition-colors"
            data-testid="link-ver-planes"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Ver planes y precios
          </a>
          <a
            href="/validar-cupon"
            className="flex items-center justify-center gap-2 text-[#c77b3f]/70 hover:text-[#c77b3f] text-xs transition-colors"
            data-testid="link-validar-cupon"
          >
            <Store className="w-3.5 h-3.5" />
            Soy Ferretería — Validar Cupón
          </a>
        </div>

        <p className="text-center text-gray-500 text-xs">
          SmartBuild by Bitcopper Tech SpA
        </p>
      </div>
    </div>
  );
}
