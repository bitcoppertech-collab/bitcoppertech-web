import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  CreditCard,
  Banknote,
  CheckCircle2,
  Loader2,
  Star,
  Lock,
  AlertTriangle,
  ArrowRight,
  User,
  Mail,
  Phone,
  Wallet,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import bitcoperLogo from "@/assets/images/bitcoper-logo.png";
import { fc } from "@/lib/i18n";

interface PaymentLinkData {
  id: number;
  token: string;
  type: string;
  amount: number;
  description: string;
  countryCode: string;
  status: string;
  expiresAt: string | null;
  maestroInfo?: {
    id: number;
    displayName: string;
    specialty: string;
    city: string;
    avgRating: string;
    kycVerified: boolean;
  } | null;
}

export default function QuickPay() {
  const [, params] = useRoute("/pagar/:token");
  const token = params?.token || "";
  const { toast } = useToast();

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedGateway, setSelectedGateway] = useState("mercadopago");
  const [step, setStep] = useState<"register" | "pay" | "success">("register");
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const { data: linkData, isLoading, error } = useQuery<PaymentLinkData>({
    queryKey: ["/api/payment-links", token],
    queryFn: async () => {
      const res = await fetch(`/api/payment-links/${token}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Enlace no encontrado");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/payment-links/${token}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientEmail,
          clientPhone,
          gatewayId: selectedGateway,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error al procesar pago");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setPaymentResult(data);
      setStep("success");
      toast({ title: "Pago procesado", description: "Tu pago ha sido registrado exitosamente." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isFormValid = clientName.trim().length >= 2 && clientEmail.includes("@") && clientPhone.trim().length >= 8;

  const typeLabels: Record<string, string> = {
    SUBSCRIPTION: "Suscripcion Hogar Seguro",
    SECURITY_FEE: "Fee de Seguridad",
    ESCROW_DEPOSIT: "Deposito en Custodia",
    CUSTOM: "Pago",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f1729] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-[#c77b3f] mx-auto" />
          <p className="text-zinc-400 text-sm">Cargando enlace de pago...</p>
        </div>
      </div>
    );
  }

  if (error || !linkData) {
    return (
      <div className="min-h-screen bg-[#0f1729] flex items-center justify-center p-4">
        <Card className="bg-[#1a2744] border-red-500/30 max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Enlace no disponible</h2>
            <p className="text-zinc-400 text-sm">
              {(error as Error)?.message || "Este enlace de pago no existe, ha expirado o ya fue utilizado."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-[#0f1729] flex items-center justify-center p-4">
        <Card className="bg-[#1a2744] border-emerald-500/30 max-w-md w-full">
          <CardContent className="p-8 text-center space-y-5">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white" data-testid="text-payment-success">Pago Registrado</h2>
            <p className="text-zinc-400">Tu pago ha sido procesado exitosamente.</p>
            <div className="p-4 bg-[#0f1729] rounded-xl">
              <p className="text-xs text-zinc-500 mb-1">Monto pagado</p>
              <p className="text-3xl font-bold text-emerald-400" data-testid="text-amount-paid">{fc(linkData.amount)}</p>
              <p className="text-xs text-zinc-500 mt-2">ID: {paymentResult?.payment?.paymentId}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="flex items-center gap-2 justify-center">
                <Shield className="w-4 h-4 text-emerald-400" />
                <p className="text-sm text-emerald-400 font-medium">Pago Protegido por Bitcopper</p>
              </div>
            </div>
            <Button
              className="w-full bg-[#c77b3f] hover:bg-[#b06a30] text-white"
              onClick={() => window.location.href = `/mi-cuenta`}
              data-testid="button-go-account"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Ver Mi Cuenta
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1729]">
      <header className="bg-[#1a2744] border-b border-zinc-700/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <img src={bitcoperLogo} alt="SmartBuild" className="w-8 h-8 rounded-lg" />
          <div>
            <h1 className="text-sm font-bold text-white">SmartBuild</h1>
            <p className="text-[10px] text-zinc-400">Pago Seguro</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-medium">Protegido</span>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <Card className="bg-gradient-to-br from-[#1a2744] to-[#1f3058] border-[#c77b3f]/40 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#c77b3f]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-6 relative">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-[#c77b3f]/20 text-[#c77b3f] border-[#c77b3f]/30 text-xs">
                {typeLabels[linkData.type] || "Pago"}
              </Badge>
              {linkData.expiresAt && (
                <Badge variant="outline" className="text-zinc-400 border-zinc-600 text-[10px]">
                  <Clock className="w-3 h-3 mr-1" />
                  Expira en {Math.max(0, Math.ceil((new Date(linkData.expiresAt).getTime() - Date.now()) / 3600000))}h
                </Badge>
              )}
            </div>
            <p className="text-zinc-400 text-sm mb-1">{linkData.description}</p>
            <p className="text-4xl font-bold text-white" data-testid="text-link-amount">{fc(linkData.amount)}</p>

            {linkData.maestroInfo && (
              <div className="mt-4 p-3 bg-[#0f1729]/60 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#c77b3f]/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-[#c77b3f]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{linkData.maestroInfo.displayName}</p>
                  <p className="text-xs text-zinc-400">{linkData.maestroInfo.specialty} - {linkData.maestroInfo.city}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs text-yellow-400">{parseFloat(linkData.maestroInfo.avgRating || "0").toFixed(1)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {step === "register" && (
          <Card className="bg-[#1a2744] border-emerald-500/30 shadow-lg shadow-emerald-500/5">
            <CardContent className="p-6 space-y-5">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/20 to-[#c77b3f]/20 flex items-center justify-center mb-3 ring-2 ring-emerald-500/30">
                  <CreditCard className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white" data-testid="text-register-heading">Registrate y Paga</h2>
                <p className="text-sm text-zinc-400 mt-1">Ingresa tus datos para completar el pago</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="bg-[#0f1729] border-zinc-700 text-white pl-10 h-12 text-base"
                    data-testid="input-pay-name"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    type="email"
                    className="bg-[#0f1729] border-zinc-700 text-white pl-10 h-12 text-base"
                    data-testid="input-pay-email"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+56 9 1234 5678"
                    type="tel"
                    className="bg-[#0f1729] border-zinc-700 text-white pl-10 h-12 text-base"
                    data-testid="input-pay-phone"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-zinc-400 font-medium">Metodo de pago</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedGateway === "mercadopago"
                        ? "border-[#c77b3f] bg-[#c77b3f]/10"
                        : "border-zinc-700 bg-[#0f1729]"
                    }`}
                    onClick={() => setSelectedGateway("mercadopago")}
                    data-testid="button-gateway-mercadopago"
                  >
                    <CreditCard className={`w-5 h-5 mb-1 ${selectedGateway === "mercadopago" ? "text-[#c77b3f]" : "text-zinc-500"}`} />
                    <p className={`text-xs font-medium ${selectedGateway === "mercadopago" ? "text-white" : "text-zinc-400"}`}>Tarjeta / Cuotas</p>
                    <p className="text-[10px] text-zinc-500">MercadoPago</p>
                  </button>
                  <button
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedGateway === "fintoc"
                        ? "border-[#c77b3f] bg-[#c77b3f]/10"
                        : "border-zinc-700 bg-[#0f1729]"
                    }`}
                    onClick={() => setSelectedGateway("fintoc")}
                    data-testid="button-gateway-fintoc"
                  >
                    <Banknote className={`w-5 h-5 mb-1 ${selectedGateway === "fintoc" ? "text-[#c77b3f]" : "text-zinc-500"}`} />
                    <p className={`text-xs font-medium ${selectedGateway === "fintoc" ? "text-white" : "text-zinc-400"}`}>Transferencia</p>
                    <p className="text-[10px] text-zinc-500">Fintoc</p>
                  </button>
                </div>
              </div>

              <Button
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20 rounded-xl"
                onClick={() => payMutation.mutate()}
                disabled={!isFormValid || payMutation.isPending}
                data-testid="button-submit-payment"
              >
                {payMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Lock className="w-5 h-5 mr-2" />
                )}
                {payMutation.isPending ? "Procesando..." : `Pagar ${fc(linkData.amount)}`}
              </Button>

              <div className="flex items-center gap-2 justify-center text-[10px] text-zinc-500">
                <Shield className="w-3 h-3" />
                <span>Pago seguro protegido por Bitcopper Tech</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-[#1a2744] rounded-xl border border-zinc-700/30">
            <Shield className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-[10px] text-zinc-400">Fondos en custodia segura</p>
          </div>
          <div className="p-3 bg-[#1a2744] rounded-xl border border-zinc-700/30">
            <CheckCircle2 className="w-5 h-5 text-[#c77b3f] mx-auto mb-1" />
            <p className="text-[10px] text-zinc-400">Maestros verificados</p>
          </div>
          <div className="p-3 bg-[#1a2744] rounded-xl border border-zinc-700/30">
            <Lock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-[10px] text-zinc-400">Datos encriptados</p>
          </div>
        </div>
      </div>
    </div>
  );
}
