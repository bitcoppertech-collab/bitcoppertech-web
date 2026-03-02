import { useState, useEffect, useRef } from "react";
import { COPPER_CREDIT_TYPES } from "@shared/models/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Gift,
  Share2,
  Copy,
  ShoppingCart,
  Wallet,
  Mail,
  ArrowRight,
  Tag,
  History,
  Loader2,
  MessageCircle,
  Trophy,
  Users,
  TrendingUp,
  Sparkles,
  Store,
  CheckCircle2,
  Clock,
  CreditCard,
  Shield,
  Camera,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Truck,
  Hammer,
  Bell,
  CircleDot,
  Lock,
  Download,
  Coins,
  HardHat,
  QrCode,
  Flag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import bitcoperLogo from "@/assets/images/bitcoper-logo.png";
import { jsPDF } from "jspdf";

interface ClientProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  referralCode: string | null;
  creditBalance: number;
  creditHistory: { id: number; amount: number; reason: string; createdAt: string }[];
  coupons: { id: number; code: string; discountPercent: number; status: string; createdAt: string }[];
  requests: { id: number; requestType: string; status: string; totalEstimate: string; createdAt: string; items: any }[];
  createdAt: string;
}

const DELIVERY_STEPS = [
  { key: "funded", label: "Fondeado", emoji: "💰", sublabel: "Dinero en custodia", icon: Wallet, color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30", activeBg: "bg-amber-500" },
  { key: "in_progress", label: "En Obra", emoji: "🏗️", sublabel: "Maestro trabajando", icon: HardHat, color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30", activeBg: "bg-blue-500" },
  { key: "validate", label: "Por Validar", emoji: "🏁", sublabel: "Esperando tu QR", icon: QrCode, color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/30", activeBg: "bg-purple-500" },
  { key: "delivered", label: "Entregado", emoji: "✅", sublabel: "Pago liberado", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", activeBg: "bg-emerald-500" },
];

function mapRequestStatusToDelivery(status: string): number {
  switch (status) {
    case "pending": return 0;
    case "funded":
    case "accepted": return 0;
    case "in_progress":
    case "working": return 1;
    case "submitted":
    case "validate": return 2;
    case "completed":
    case "pagado":
    case "delivered": return 3;
    default: return 0;
  }
}

function OrderStatusTracker({ status, compact }: { status: string; compact?: boolean }) {
  const currentIdx = mapRequestStatusToDelivery(status);

  if (compact) {
    const current = DELIVERY_STEPS[currentIdx];
    return (
      <div className="flex items-center gap-1.5" data-testid="order-status-compact">
        <span className="text-sm">{current.emoji}</span>
        <span className={`text-xs font-medium ${current.color}`}>{current.label}</span>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-zinc-700/30" data-testid="order-status-tracker">
      <div className="flex items-center justify-between relative">
        <div className="absolute top-[14px] left-[20px] right-[20px] h-[2px] bg-zinc-700/50 z-0" />
        <div
          className="absolute top-[14px] left-[20px] h-[2px] bg-gradient-to-r from-emerald-500 to-emerald-400 z-0 transition-all duration-500"
          style={{ width: `${(currentIdx / (DELIVERY_STEPS.length - 1)) * (100 - 10)}%` }}
        />
        {DELIVERY_STEPS.map((step, idx) => {
          const isActive = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          const StepIcon = step.icon;
          return (
            <div key={step.key} className="flex flex-col items-center z-10 relative" data-testid={`order-step-${step.key}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                isCurrent
                  ? `${step.activeBg} border-white/20 shadow-lg shadow-${step.key === "funded" ? "amber" : step.key === "in_progress" ? "blue" : step.key === "validate" ? "purple" : "emerald"}-500/30`
                  : isActive
                    ? "bg-emerald-500/80 border-emerald-400/30"
                    : "bg-zinc-800 border-zinc-700"
              }`}>
                {isActive && !isCurrent ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                ) : (
                  <span className="text-xs">{step.emoji}</span>
                )}
              </div>
              <p className={`text-[9px] mt-1 text-center leading-tight font-medium ${
                isCurrent ? step.color : isActive ? "text-emerald-400/70" : "text-zinc-600"
              }`}>
                {step.label}
              </p>
              {isCurrent && (
                <p className="text-[8px] text-zinc-500 text-center">{step.sublabel}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WithdrawalConfirmation({ qrToken }: { qrToken: string }) {
  const { toast } = useToast();
  const { data: withdrawal, isLoading } = useQuery<{
    id: number; amount: number; status: string; qrToken: string;
    maestroId: number; clientLeadId: number; projectWalletId: number;
    maestroScannedAt: string | null; clientConfirmedAt: string | null;
  }>({
    queryKey: ["/api/withdrawals/token", qrToken],
    queryFn: async () => {
      const res = await fetch(`/api/withdrawals/token/${qrToken}`);
      if (!res.ok) throw new Error("No encontrado");
      return res.json();
    },
    staleTime: 10_000,
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      if (!withdrawal) return;
      return apiRequest("POST", `/api/withdrawals/${withdrawal.id}/scan`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals/token", qrToken] });
    },
  });

  const hasAutoScanned = useRef(false);
  useEffect(() => {
    if (withdrawal && withdrawal.status === "PENDING" && !hasAutoScanned.current) {
      hasAutoScanned.current = true;
      scanMutation.mutate();
    }
  }, [withdrawal]);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!withdrawal) return;
      return apiRequest("POST", `/api/withdrawals/${withdrawal.id}/confirm`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals/token", qrToken] });
      toast({ title: "Retiro confirmado", description: "Los fondos han sido liberados al maestro." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo confirmar el retiro", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!withdrawal) return;
      return apiRequest("POST", `/api/withdrawals/${withdrawal.id}/reject`, { reason: "Rechazado por cliente" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals/token", qrToken] });
      toast({ title: "Retiro rechazado", description: "La solicitud ha sido rechazada." });
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-[#1a2744] border-zinc-700/50">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#c77b3f] mx-auto" />
          <p className="text-zinc-400 mt-2">Verificando solicitud...</p>
        </CardContent>
      </Card>
    );
  }

  if (!withdrawal) {
    return (
      <Card className="bg-[#1a2744] border-red-500/30">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-white font-medium">Solicitud no encontrada</p>
          <p className="text-zinc-400 text-sm">El código QR no es válido o ha expirado.</p>
        </CardContent>
      </Card>
    );
  }

  if (withdrawal.status === "RELEASED") {
    return (
      <Card className="bg-[#1a2744] border-emerald-500/30">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <p className="text-white font-bold text-lg">Retiro Completado</p>
          <p className="text-emerald-400 text-2xl font-bold mt-2">${withdrawal.amount.toLocaleString("es-CL")}</p>
          <p className="text-zinc-400 text-sm mt-1">Los fondos fueron liberados exitosamente.</p>
        </CardContent>
      </Card>
    );
  }

  if (withdrawal.status === "REJECTED") {
    return (
      <Card className="bg-[#1a2744] border-red-500/30">
        <CardContent className="p-8 text-center">
          <ThumbsDown className="w-10 h-10 text-red-400 mx-auto mb-2" />
          <p className="text-white font-bold text-lg">Retiro Rechazado</p>
          <p className="text-red-400 text-2xl font-bold mt-2">${withdrawal.amount.toLocaleString("es-CL")}</p>
        </CardContent>
      </Card>
    );
  }

  const needsScan = withdrawal.status === "PENDING";

  return (
    <Card className="bg-[#1a2744] border-[#c77b3f]/30">
      <CardContent className="p-6 space-y-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#c77b3f]/10 flex items-center justify-center mb-3">
            <Wallet className="w-8 h-8 text-[#c77b3f]" />
          </div>
          <h3 className="text-lg font-bold text-white">Solicitud de Retiro</h3>
          <p className="text-zinc-400 text-sm">Un maestro solicita retirar fondos de tu proyecto</p>
        </div>

        <div className="p-4 bg-[#0f1729] rounded-xl text-center">
          <p className="text-zinc-400 text-xs mb-1">Monto solicitado</p>
          <p className="text-3xl font-bold text-[#c77b3f]" data-testid="text-withdrawal-amount">${withdrawal.amount.toLocaleString("es-CL")}</p>
          <p className="text-zinc-500 text-xs mt-1">Código: {withdrawal.qrToken}</p>
        </div>

        {needsScan && (
          <div className="text-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#c77b3f] mx-auto" />
            <p className="text-zinc-400 text-sm">Verificando solicitud...</p>
          </div>
        )}

        {withdrawal.status === "QR_SCANNED" && (
          <div className="space-y-3">
            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-sm text-emerald-400 font-medium">QR escaneado por el maestro</p>
              <p className="text-xs text-zinc-400 mt-1">Confirma para liberar los fondos</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending}
                data-testid="button-reject-withdrawal"
              >
                {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4 mr-1" />}
                Rechazar
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                data-testid="button-confirm-withdrawal"
              >
                {confirmMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4 mr-1" />}
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClientDashboard() {
  const [email, setEmail] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"wallet" | "coupons" | "requests" | "referral" | "escrow" | "obra" | "seguro" | "inversion" | "comercios">("wallet");
  const [, navigate] = useLocation();

  const urlParams = new URLSearchParams(window.location.search);
  const withdrawalToken = urlParams.get("withdrawal");

  const { data: profile, isLoading, error } = useQuery<ClientProfile>({
    queryKey: ["/api/client/profile", searchEmail],
    queryFn: async () => {
      const res = await fetch(`/api/client/profile?email=${encodeURIComponent(searchEmail)}`);
      if (!res.ok) throw new Error("No encontrado");
      return res.json();
    },
    enabled: !!searchEmail,
    retry: false,
    staleTime: 60_000,
  });

  const referralLink = profile ? `${window.location.origin}/marketplace?ref=${profile.id}` : "";

  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareWhatsApp = () => {
    if (referralLink) {
      const text = `¡Materiales de construcción a precios mayoristas! 🏗️ Usa mi enlace y ambos ganamos $5.000 en créditos: ${referralLink}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1729]">
      <header className="bg-[#1a2744] border-b border-zinc-700/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={bitcoperLogo} alt="SmartBuild" className="w-8 h-8 rounded-lg" />
            <div>
              <h1 className="text-lg font-bold text-white">Mi Cuenta</h1>
              <p className="text-xs text-zinc-400">SmartBuild · Billetera Virtual</p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-[#c77b3f] hover:bg-[#b06a30] text-white"
            onClick={() => navigate("/marketplace")}
            data-testid="button-go-marketplace"
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Marketplace</span>
          </Button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {withdrawalToken && (
          <WithdrawalConfirmation qrToken={withdrawalToken} />
        )}

        {!profile && !withdrawalToken && (
          <div className="space-y-5">
            <Card className="bg-gradient-to-br from-[#1a2744] to-[#1f3058] border-emerald-500/30 shadow-xl shadow-emerald-500/5 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#c77b3f]/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <CardContent className="p-8 relative space-y-5">
                <div className="text-center">
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-[#c77b3f]/20 flex items-center justify-center mb-4 ring-2 ring-emerald-500/30">
                    <Wallet className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white" data-testid="text-register-hero">Accede a tu Billetera</h2>
                  <p className="text-base text-zinc-300 mt-2">Ingresa tu correo y accede a tus creditos, cupones y compras</p>
                </div>

                <div className="max-w-sm mx-auto space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tucorreo@ejemplo.com"
                      type="email"
                      className="bg-[#0f1729] border-zinc-700 text-white pl-11 h-14 text-base rounded-xl"
                      data-testid="input-client-email-login"
                      onKeyDown={(e) => e.key === "Enter" && setSearchEmail(email)}
                    />
                  </div>
                  <Button
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20 rounded-xl"
                    onClick={() => setSearchEmail(email)}
                    disabled={!email.includes("@") || isLoading}
                    data-testid="button-client-login"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowRight className="w-5 h-5 mr-2" />}
                    {isLoading ? "Buscando..." : "Entrar a Mi Cuenta"}
                  </Button>
                </div>

                {error && (
                  <div className="max-w-sm mx-auto p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
                    <p className="text-sm text-red-400">No se encontro una cuenta con ese correo.</p>
                    <p className="text-xs text-zinc-400 mt-1">Escanea el QR de un maestro para registrarte.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-[#1a2744] rounded-xl border border-zinc-700/30">
                <div className="w-10 h-10 mx-auto rounded-xl bg-[#c77b3f]/10 flex items-center justify-center mb-2">
                  <span className="text-lg font-bold text-[#c77b3f]">1</span>
                </div>
                <p className="text-xs text-zinc-400 font-medium">Escanea el QR de tu maestro</p>
              </div>
              <div className="p-3 bg-[#1a2744] rounded-xl border border-zinc-700/30">
                <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-500/10 flex items-center justify-center mb-2">
                  <span className="text-lg font-bold text-emerald-400">2</span>
                </div>
                <p className="text-xs text-zinc-400 font-medium">Califica y recibe tu cupon</p>
              </div>
              <div className="p-3 bg-[#1a2744] rounded-xl border border-zinc-700/30">
                <div className="w-10 h-10 mx-auto rounded-xl bg-green-500/10 flex items-center justify-center mb-2">
                  <span className="text-lg font-bold text-green-400">3</span>
                </div>
                <p className="text-xs text-zinc-400 font-medium">Compra y refiere vecinos</p>
              </div>
            </div>

            <Card className="bg-[#1a2744] border-[#c77b3f]/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#c77b3f]/10 flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5 text-[#c77b3f]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">Materiales a precio mayorista</p>
                    <p className="text-xs text-zinc-400">Compra directo desde el Marketplace</p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-[#c77b3f] hover:bg-[#b06a30] text-white"
                    onClick={() => navigate("/marketplace")}
                    data-testid="button-go-marketplace-hero"
                  >
                    Comprar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {profile && (
          <>
            <Card className="bg-gradient-to-br from-[#1a2744] to-[#1f3058] border-[#c77b3f]/30">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-zinc-400">Hola,</p>
                    <h2 className="text-xl font-bold text-white">{profile.name}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">Billetera Virtual</p>
                    <div className="flex items-center gap-1 justify-end">
                      <Wallet className="w-5 h-5 text-emerald-400" />
                      <p className="text-2xl font-bold text-emerald-400" data-testid="text-credit-balance">${profile.creditBalance.toLocaleString("es-CL")}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-2 bg-[#0f1729]/50 rounded-lg text-center">
                    <Tag className="w-5 h-5 mx-auto text-[#c77b3f] mb-1" />
                    <p className="text-lg font-bold text-white">{profile.coupons.filter(c => c.status === "active").length}</p>
                    <p className="text-[9px] text-zinc-400">Cupones</p>
                  </div>
                  <div className="p-2 bg-[#0f1729]/50 rounded-lg text-center">
                    <ShoppingCart className="w-5 h-5 mx-auto text-blue-400 mb-1" />
                    <p className="text-lg font-bold text-white">{profile.requests.length}</p>
                    <p className="text-[9px] text-zinc-400">Compras</p>
                  </div>
                  <div className="p-2 bg-[#0f1729]/50 rounded-lg text-center">
                    <Users className="w-5 h-5 mx-auto text-green-400 mb-1" />
                    <p className="text-lg font-bold text-white">{profile.creditHistory.filter(c => c.reason.includes("Referido")).length}</p>
                    <p className="text-[9px] text-zinc-400">Referidos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a2744] border-green-500/20">
              <CardContent className="p-5 space-y-3" data-testid="section-referral-share">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Recomienda y Gana $5.000</h3>
                    <p className="text-xs text-zinc-400">Comparte con vecinos que estén remodelando</p>
                  </div>
                </div>

                <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-medium" onClick={shareWhatsApp} data-testid="button-share-whatsapp">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Recomienda a un Maestro y Gana $5.000
                </Button>

                <div className="flex gap-2">
                  <Input readOnly value={referralLink} className="bg-[#0f1729] border-zinc-700 text-zinc-300 text-xs flex-1" data-testid="input-referral-link" />
                  <Button size="sm" variant="outline" className="border-zinc-600 text-zinc-300 hover:bg-zinc-700 shrink-0" onClick={copyReferralLink} data-testid="button-copy-referral-link">
                    <Copy className="w-3 h-3 mr-1" />
                    {copied ? "¡Copiado!" : "Copiar"}
                  </Button>
                </div>

                <p className="text-[10px] text-zinc-500 text-center">
                  Cuando tu vecino se registre y compre materiales, ambos reciben $5.000 de crédito en su billetera.
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-1 bg-[#1a2744] rounded-xl p-1 border border-zinc-700/50">
              {[
                { id: "wallet" as const, icon: Wallet, label: "Billetera" },
                { id: "obra" as const, icon: Lock, label: "Mi Obra" },
                { id: "escrow" as const, icon: Shield, label: "Proyectos" },
                { id: "coupons" as const, icon: Tag, label: "Cupones" },
                { id: "requests" as const, icon: ShoppingCart, label: "Compras" },
                { id: "referral" as const, icon: Users, label: "Referidos" },
                { id: "comercios" as const, icon: Store, label: "Comercios" },
                { id: "seguro" as const, icon: Shield, label: "Seguro" },
                { id: "inversion" as const, icon: TrendingUp, label: "Inversión" },
              ].map(tab => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  size="sm"
                  className={`flex-1 text-xs ${activeTab === tab.id ? "bg-[#c77b3f]/10 text-[#c77b3f]" : "text-zinc-400 hover:text-zinc-300"}`}
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon className="w-3.5 h-3.5 mr-1" />
                  {tab.label}
                </Button>
              ))}
            </div>

            {activeTab === "wallet" && (
              <Card className="bg-[#1a2744] border-zinc-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-emerald-400" />
                    Historial de Billetera
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {profile.creditHistory.length > 0 ? profile.creditHistory.map(credit => (
                    <div key={credit.id} className="flex items-center justify-between p-3 bg-[#0f1729] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${credit.amount > 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                          {credit.amount > 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <CreditCard className="w-4 h-4 text-red-400" />}
                        </div>
                        <div>
                          <p className="text-sm text-white">{credit.reason}</p>
                          <p className="text-xs text-zinc-400">{new Date(credit.createdAt).toLocaleDateString("es-CL")}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${credit.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {credit.amount > 0 ? "+" : ""}${Math.abs(credit.amount).toLocaleString("es-CL")}
                      </span>
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <Wallet className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                      <p className="text-sm text-zinc-400">Sin movimientos aún</p>
                      <p className="text-xs text-zinc-500 mt-1">Refiere vecinos para ganar créditos</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "coupons" && (
              <Card className="bg-[#1a2744] border-zinc-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Gift className="w-5 h-5 text-emerald-400" />
                    Mis Cupones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {profile.coupons.length > 0 ? profile.coupons.map(coupon => (
                    <div key={coupon.id} className={`p-3 rounded-lg border ${coupon.status === "active" ? "bg-gradient-to-r from-emerald-500/5 to-[#c77b3f]/5 border-emerald-500/20" : "bg-[#0f1729] border-zinc-700/30"}`} data-testid={`coupon-${coupon.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${coupon.status === "active" ? "bg-emerald-500/10" : "bg-zinc-500/10"}`}>
                            <Tag className={`w-5 h-5 ${coupon.status === "active" ? "text-emerald-400" : "text-zinc-500"}`} />
                          </div>
                          <div>
                            <p className="text-base font-mono font-bold text-white">{coupon.code}</p>
                            <p className="text-xs text-zinc-400">{coupon.discountPercent}% descuento · {new Date(coupon.createdAt).toLocaleDateString("es-CL")}</p>
                          </div>
                        </div>
                        <Badge className={coupon.status === "active" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"}>
                          {coupon.status === "active" ? "Activo" : coupon.status === "used" ? "Usado" : "Expirado"}
                        </Badge>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <Gift className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                      <p className="text-sm text-zinc-400">Sin cupones aún</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "requests" && (
              <Card className="bg-[#1a2744] border-zinc-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-400" />
                    Mis Compras y Solicitudes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {profile.requests.length > 0 ? profile.requests.map(req => (
                    <div key={req.id} className="p-4 bg-[#0f1729] rounded-xl border border-zinc-700/30" data-testid={`request-${req.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${req.requestType === "direct_purchase" ? "bg-[#c77b3f]/10" : "bg-blue-500/10"}`}>
                            {req.requestType === "direct_purchase" ? <ShoppingCart className="w-4 h-4 text-[#c77b3f]" /> : <Store className="w-4 h-4 text-blue-400" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{req.requestType === "direct_purchase" ? "Compra Directa" : "Presupuesto Maestro"}</p>
                            <p className="text-xs text-zinc-500">{new Date(req.createdAt).toLocaleDateString("es-CL")}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="text-sm font-bold text-white">${Number(req.totalEstimate || 0).toLocaleString("es-CL")}</p>
                          <OrderStatusTracker status={req.status} compact />
                        </div>
                      </div>
                      <OrderStatusTracker status={req.status} />
                    </div>
                  )) : (
                    <div className="text-center py-8">
                      <ShoppingCart className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                      <p className="text-sm text-zinc-400">Sin compras aún</p>
                      <Button size="sm" className="mt-3 bg-[#c77b3f] hover:bg-[#b06a30] text-white" onClick={() => navigate("/marketplace")}>
                        Ir al Marketplace
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "obra" && profile && (
              <ClientObraResguardadaTab clientId={profile.id} clientName={profile.name} />
            )}

            {activeTab === "escrow" && profile && (
              <ClientEscrowTab clientId={profile.id} />
            )}

            {activeTab === "seguro" && profile && (
              <ClientSeguroTab profileId={profile.id} />
            )}

            {activeTab === "comercios" && profile && (
              <ComerciosAmigosTab clientId={profile.id} />
            )}

            {activeTab === "inversion" && profile && (
              <ClientInversionTab />
            )}

            {activeTab === "referral" && (
              <Card className="bg-[#1a2744] border-zinc-700/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    Mis Referidos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-4 bg-gradient-to-r from-green-500/5 to-emerald-500/5 rounded-xl border border-green-500/20 text-center">
                    <Sparkles className="w-8 h-8 mx-auto text-green-400 mb-2" />
                    <p className="text-sm font-bold text-white">Programa de Referidos</p>
                    <p className="text-xs text-zinc-400 mt-1">Cada vecino que se registre con tu enlace te da <strong className="text-emerald-400">$5.000</strong> de crédito</p>
                  </div>

                  {profile.creditHistory.filter(c => c.reason.includes("Referido")).length > 0 ? (
                    profile.creditHistory.filter(c => c.reason.includes("Referido")).map(credit => (
                      <div key={credit.id} className="flex items-center justify-between p-3 bg-[#0f1729] rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Users className="w-4 h-4 text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm text-white">{credit.reason}</p>
                            <p className="text-xs text-zinc-400">{new Date(credit.createdAt).toLocaleDateString("es-CL")}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-emerald-400">+${Math.abs(credit.amount).toLocaleString("es-CL")}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <Users className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                      <p className="text-sm text-zinc-400">Aún no tienes referidos</p>
                      <p className="text-xs text-zinc-500 mt-1">¡Comparte tu enlace para empezar a ganar!</p>
                    </div>
                  )}

                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-11" onClick={shareWhatsApp} data-testid="button-share-whatsapp-referral">
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Invitar Vecinos por WhatsApp
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface ClientEscrowWallet {
  id: number;
  description: string;
  totalAmount: number;
  materialsAmount: number;
  laborAmount: number;
  guaranteeAmount: number;
  status: string;
  maestroAvailable: number;
  maestroBlocked: number;
  ferreteriaAllocated: number;
  guaranteeFund: number;
  maestroName?: string;
  milestones: {
    id: number;
    name: string;
    description: string | null;
    releasePercent: number;
    releaseAmount: number;
    status: string;
    photoUrl: string | null;
    maestroNote: string | null;
    submittedAt: string | null;
    approvedAt: string | null;
    rejectedReason: string | null;
  }[];
  createdAt: string;
}

function ClientTrustTracker({ status }: { status: string }) {
  const steps = [
    { key: "WAITING", label: "Esperando Deposito", icon: CircleDot, color: "text-red-400", bg: "bg-red-500/15 border-red-500/30" },
    { key: "HELD_IN_ESCROW", label: "En Custodia", icon: Shield, color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" },
    { key: "SPLIT_ALLOCATED", label: "Materiales Pagados", icon: Truck, color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30" },
    { key: "IN_PROGRESS", label: "En Progreso", icon: Hammer, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
    { key: "COMPLETED", label: "Proyecto Completo", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/15 border-green-500/30" },
  ];
  const statusOrder = ["WAITING", "HELD_IN_ESCROW", "SPLIT_ALLOCATED", "IN_PROGRESS", "COMPLETED"];
  const currentIdx = statusOrder.indexOf(status);

  return (
    <div className="space-y-1" data-testid="client-trust-tracker">
      <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-[#c77b3f]" />
        Trust Tracker — Tu dinero, paso a paso
      </p>
      <div className="flex items-center gap-0">
        {steps.map((step, idx) => {
          const isActive = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          const StepIcon = step.icon;
          return (
            <div key={step.key} className="flex items-center flex-1" data-testid={`client-step-${step.key}`}>
              <div className={`flex flex-col items-center flex-1 ${isActive ? "" : "opacity-30"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${isCurrent ? step.bg : isActive ? "bg-zinc-700/80 border-zinc-600" : "bg-zinc-800/30 border-zinc-700"} transition-all`}>
                  <StepIcon className={`w-3.5 h-3.5 ${isCurrent ? step.color : isActive ? "text-white" : "text-zinc-500"}`} />
                </div>
                <p className={`text-[9px] mt-1 text-center leading-tight ${isCurrent ? step.color + " font-medium" : "text-zinc-500"}`}>
                  {step.label}
                </p>
              </div>
              {idx < steps.length - 1 && (
                <div className={`h-0.5 w-full -mt-4 ${idx < currentIdx ? "bg-emerald-500/40" : "bg-zinc-700"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClientEscrowTab({ clientId }: { clientId: number }) {
  const { toast } = useToast();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<ClientEscrowWallet["milestones"][0] | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  const { data, isLoading } = useQuery<{
    wallets: ClientEscrowWallet[];
    notifications?: { id: number; type: string; title: string; message: string; read: boolean; createdAt: string }[];
    unreadCount?: number;
  }>({
    queryKey: ["/api/escrow/client", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/escrow/client/${clientId}`);
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: async (milestoneId: number) => {
      const res = await fetch(`/api/milestones/${milestoneId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Hito aprobado", description: "Los fondos fueron liberados al maestro" });
      setReviewDialogOpen(false);
      setSelectedMilestone(null);
      queryClient.invalidateQueries({ queryKey: ["/api/escrow/client", clientId] });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo aprobar el hito", variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ milestoneId, reason }: { milestoneId: number; reason: string }) => {
      const res = await fetch(`/api/milestones/${milestoneId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Hito rechazado", description: "El maestro puede corregir y reenviar" });
      setReviewDialogOpen(false);
      setSelectedMilestone(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/escrow/client", clientId] });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo rechazar el hito", variant: "destructive" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/notifications/client/${clientId}/mark-read`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/escrow/client", clientId] });
    },
  });

  const wallets = data?.wallets || [];
  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  if (isLoading) {
    return (
      <Card className="bg-[#1a2744] border-zinc-700/50">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#c77b3f]" />
        </CardContent>
      </Card>
    );
  }

  const milestoneStatusLabel = (s: string) => {
    switch (s) {
      case "PENDING": return { text: "Pendiente", color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
      case "SUBMITTED": return { text: "Para Revisar", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
      case "APPROVED": return { text: "Aprobado", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
      case "REJECTED": return { text: "Rechazado", color: "bg-red-500/15 text-red-400 border-red-500/30" };
      default: return { text: s, color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
    }
  };

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <Card className="bg-[#1a2744] border-[#c77b3f]/30" data-testid="card-client-notifications">
          <CardContent className="p-3">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) markReadMutation.mutate();
              }}
              className="w-full flex items-center justify-between text-left"
              data-testid="button-toggle-client-notifications"
            >
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Bell className="w-5 h-5 text-[#c77b3f]" />
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold" data-testid="badge-client-unread">
                    {unreadCount}
                  </span>
                </div>
                <span className="text-sm text-white font-medium">Alertas de Transparencia</span>
              </div>
              <span className="text-xs text-[#c77b3f]">{showNotifications ? "Ocultar" : "Ver alertas"}</span>
            </button>
            {showNotifications && (
              <div className="mt-3 space-y-2">
                {notifications.slice(0, 5).map(n => (
                  <div key={n.id} className={`p-2.5 rounded-lg border text-xs ${n.read ? "bg-[#0f1729] border-zinc-700/30" : "bg-[#c77b3f]/5 border-[#c77b3f]/20"}`}>
                    <p className="font-medium text-white">{n.title}</p>
                    <p className="text-zinc-400 mt-0.5">{n.message}</p>
                    <p className="text-[9px] text-zinc-500 mt-1">{new Date(n.createdAt).toLocaleString("es-CL")}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {wallets.length === 0 ? (
        <Card className="bg-[#1a2744] border-zinc-700/50">
          <CardContent className="p-8 text-center">
            <Shield className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-400">Sin proyectos con Escrow activo</p>
            <p className="text-xs text-zinc-500 mt-1">Cuando aceptes un presupuesto de un maestro, el proyecto aparecera aqui</p>
          </CardContent>
        </Card>
      ) : (
        wallets.map(wallet => (
          <Card key={wallet.id} className="bg-[#1a2744] border-zinc-700/50" data-testid={`card-client-escrow-${wallet.id}`}>
            <CardHeader className="pb-3">
              <div>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#c77b3f]" />
                  {wallet.description}
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-1">
                  Maestro: {wallet.maestroName || "—"} · Total: ${wallet.totalAmount.toLocaleString("es-CL")}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ClientTrustTracker status={wallet.status} />

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-[#0f1729] rounded-lg">
                  <Truck className="w-3.5 h-3.5 mx-auto text-blue-400 mb-0.5" />
                  <p className="font-bold text-white">${wallet.materialsAmount.toLocaleString("es-CL")}</p>
                  <p className="text-zinc-400">Materiales</p>
                </div>
                <div className="p-2 bg-[#0f1729] rounded-lg">
                  <Hammer className="w-3.5 h-3.5 mx-auto text-emerald-400 mb-0.5" />
                  <p className="font-bold text-white">${wallet.laborAmount.toLocaleString("es-CL")}</p>
                  <p className="text-zinc-400">Mano de Obra</p>
                </div>
                <div className="p-2 bg-[#0f1729] rounded-lg">
                  <Shield className="w-3.5 h-3.5 mx-auto text-blue-400 mb-0.5" />
                  <p className="font-bold text-blue-400">${wallet.guaranteeFund.toLocaleString("es-CL")}</p>
                  <p className="text-zinc-400">Fondo Garantia</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#c77b3f]" />
                  Hitos del Proyecto
                </p>
                {wallet.milestones.map((milestone) => (
                  <div key={milestone.id} className="p-3 bg-[#0f1729] rounded-lg border border-zinc-700/30" data-testid={`client-milestone-${milestone.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          {milestone.status === "PENDING" && <Lock className="w-3 h-3 text-zinc-500" />}
                          {milestone.status === "APPROVED" && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                          <p className="text-sm font-medium text-white">{milestone.name}</p>
                        </div>
                        <p className="text-xs text-zinc-400">
                          {milestone.releasePercent}% · ${milestone.releaseAmount.toLocaleString("es-CL")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={milestoneStatusLabel(milestone.status).color}>
                          {milestoneStatusLabel(milestone.status).text}
                        </Badge>
                        {milestone.status === "SUBMITTED" && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            onClick={() => {
                              setSelectedMilestone(milestone);
                              setReviewDialogOpen(true);
                            }}
                            data-testid={`button-review-milestone-${milestone.id}`}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Revisar
                          </Button>
                        )}
                        {milestone.status === "APPROVED" && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-md bg-[#1a2744] border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#c77b3f]" />
              Revisar Avance: {selectedMilestone?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Revisa la evidencia del maestro. Si apruebas, se liberan ${selectedMilestone?.releaseAmount.toLocaleString("es-CL")} de tu escrow.
            </p>
            {selectedMilestone?.photoUrl && (
              <div className="rounded-lg overflow-hidden border border-zinc-700">
                <img src={selectedMilestone.photoUrl} alt="Evidencia de avance" className="w-full max-h-64 object-cover" />
              </div>
            )}
            {selectedMilestone?.maestroNote && (
              <div className="p-3 bg-[#0f1729] rounded-lg">
                <p className="text-xs text-zinc-400 mb-1">Nota del maestro:</p>
                <p className="text-sm text-white">{selectedMilestone.maestroNote}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={approveMutation.isPending || rejectMutation.isPending}
                onClick={() => selectedMilestone && approveMutation.mutate(selectedMilestone.id)}
                data-testid="button-approve-milestone"
              >
                {approveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                Aprobar
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                disabled={approveMutation.isPending || rejectMutation.isPending}
                onClick={() => {
                  if (selectedMilestone) {
                    if (!rejectionReason.trim()) {
                      toast({ title: "Ingresa un motivo de rechazo", variant: "destructive" });
                      return;
                    }
                    rejectMutation.mutate({ milestoneId: selectedMilestone.id, reason: rejectionReason });
                  }
                }}
                data-testid="button-reject-milestone"
              >
                {rejectMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ThumbsDown className="w-4 h-4 mr-2" />}
                Rechazar
              </Button>
            </div>
            <div className="space-y-1">
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Motivo de rechazo (requerido para rechazar)..."
                className="bg-[#0f1729] border-zinc-700 text-white text-sm"
                rows={2}
                data-testid="input-rejection-reason"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// === Mi Obra Resguardada ===

interface ObraTimelineItem {
  id: string;
  date: string | null;
  type: "transaction" | "withdrawal";
  amount: number;
  description: string;
  transactionType: string;
  fromAccount: string;
  toAccount: string;
  validated: boolean;
  status?: string;
}

interface ObraWallet {
  id: number;
  description: string;
  totalAmount: number;
  materialsAmount: number;
  laborAmount: number;
  guaranteeAmount: number;
  status: string;
  maestroAvailable: number;
  maestroBlocked: number;
  ferreteriaAllocated: number;
  guaranteeFund: number;
  protectedBalance: number;
  executedCost: number;
  maestroName: string;
  milestones: { id: number; name: string; releasePercent: number; releaseAmount: number; status: string }[];
  timeline: ObraTimelineItem[];
  createdAt: string;
}

function MilestoneProgressBar({ milestones }: { milestones: ObraWallet["milestones"] }) {
  if (!milestones || milestones.length === 0) return null;

  const total = milestones.length;
  const approved = milestones.filter(m => m.status === "APPROVED").length;
  const submitted = milestones.filter(m => m.status === "SUBMITTED").length;
  const pending = milestones.filter(m => m.status === "PENDING" || m.status === "REJECTED").length;

  const approvedPct = (approved / total) * 100;
  const submittedPct = (submitted / total) * 100;
  const pendingPct = (pending / total) * 100;

  return (
    <div className="space-y-2" data-testid="widget-milestone-progress">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#c77b3f]" />
          Progreso por Hitos
        </p>
        <span className="text-[10px] text-zinc-400">{approved}/{total} completados</span>
      </div>
      <div className="h-4 bg-[#0f1729] rounded-full overflow-hidden border border-zinc-700/30 flex" data-testid="bar-milestone-progress">
        <div
          className="h-full rounded-l-full"
          style={{
            width: `${approvedPct}%`,
            backgroundColor: "#22c55e",
            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s ease",
          }}
          data-testid="bar-segment-pagado"
        />
        <div
          className="h-full"
          style={{
            width: `${submittedPct}%`,
            backgroundColor: "#eab308",
            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s ease",
          }}
          data-testid="bar-segment-resguardado"
        />
        <div
          className="h-full"
          style={{
            width: `${pendingPct}%`,
            backgroundColor: "#e5e7eb",
            transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s ease",
          }}
          data-testid="bar-segment-pendiente"
        />
      </div>
      <div className="flex items-center justify-between text-[10px] flex-wrap gap-x-3 gap-y-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#22c55e" }} />
          <span className="text-zinc-400">Pagado ({approved})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#eab308" }} />
          <span className="text-zinc-400">Resguardado ({submitted})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#e5e7eb" }} />
          <span className="text-zinc-400">Pendiente ({pending})</span>
        </div>
      </div>
      <div className="grid gap-1 mt-1">
        {milestones.map((m) => {
          const color = m.status === "APPROVED" ? "#22c55e" : m.status === "SUBMITTED" ? "#eab308" : "#e5e7eb";
          const label = m.status === "APPROVED" ? "Pagado" : m.status === "SUBMITTED" ? "Resguardado" : "Pendiente";
          return (
            <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 bg-[#0f1729]/50 rounded-lg" data-testid={`milestone-row-${m.id}`}>
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: color, transition: "background-color 0.5s ease" }}
              />
              <span className="text-[11px] text-zinc-300 flex-1 truncate">{m.name}</span>
              <span className="text-[10px] font-medium" style={{ color, transition: "color 0.5s ease" }}>{label}</span>
              <span className="text-[10px] text-zinc-500">{m.releasePercent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaymentConfirmationModal({
  open,
  onClose,
  milestone,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  milestone: { id: number; name: string; releaseAmount: number; releasePercent: number } | null;
  onConfirm: () => void;
  isPending: boolean;
}) {
  if (!milestone) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#1a2744] border-zinc-700/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Confirmación de Pago
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-[#0f1729] rounded-xl border border-zinc-700/30">
            <p className="text-sm text-zinc-400 mb-1">Hito a aprobar</p>
            <p className="text-base font-bold text-white" data-testid="text-confirm-milestone-name">{milestone.name}</p>
            <p className="text-2xl font-bold text-emerald-400 mt-2" data-testid="text-confirm-release-amount">
              ${milestone.releaseAmount.toLocaleString("es-CL")}
            </p>
            <p className="text-xs text-zinc-500 mt-1">{milestone.releasePercent}% del total de mano de obra</p>
          </div>

          <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20">
            <p className="text-[11px] font-medium text-amber-400 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Cláusulas de Resguardo Bitcopper Tech
            </p>
            <div className="text-[10px] text-zinc-400 space-y-1" data-testid="text-legal-clauses">
              <p>1. Los fondos liberados serán transferidos al saldo disponible del maestro de forma irreversible.</p>
              <p>2. El cliente declara haber verificado el avance de obra correspondiente a este hito.</p>
              <p>3. Bitcopper Tech actúa como custodio y no como parte en el contrato de obra entre cliente y maestro.</p>
              <p>4. La liberación de fondos no implica garantía sobre la calidad final de la obra, la cual queda sujeta a los acuerdos entre las partes.</p>
              <p>5. En caso de disputa posterior, Bitcopper Tech podrá mediar conforme a los términos del servicio vigentes.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-zinc-600 text-zinc-300 hover:bg-zinc-700"
              onClick={onClose}
              disabled={isPending}
              data-testid="button-cancel-payment-confirm"
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onConfirm}
              disabled={isPending}
              data-testid="button-approve-payment-confirm"
            >
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Aprobar y Liberar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BitcopperBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-medium text-emerald-400" data-testid="badge-pago-protegido">
      <Shield className="w-3 h-3" />
      Pago Protegido por Bitcopper
    </span>
  );
}

function transactionTypeLabel(type: string): { label: string; icon: typeof Shield; color: string } {
  switch (type) {
    case "DEPOSIT": return { label: "Depósito", icon: Wallet, color: "text-emerald-400" };
    case "MATERIAL_ALLOCATION": return { label: "Pago Materiales", icon: Truck, color: "text-blue-400" };
    case "GUARANTEE_HOLD": return { label: "Fondo Garantía", icon: Shield, color: "text-amber-400" };
    case "LABOR_BLOCK": return { label: "Bloqueo Mano de Obra", icon: Hammer, color: "text-purple-400" };
    case "MILESTONE_RELEASE": return { label: "Liberación de Hito", icon: CheckCircle2, color: "text-emerald-400" };
    case "GUARANTEE_RELEASE": return { label: "Liberación Garantía", icon: Shield, color: "text-green-400" };
    case "WITHDRAWAL": return { label: "Retiro por QR", icon: CreditCard, color: "text-[#c77b3f]" };
    default: return { label: type, icon: CircleDot, color: "text-zinc-400" };
  }
}

function ClientObraResguardadaTab({ clientId, clientName }: { clientId: number; clientName: string }) {
  const { toast } = useToast();
  const [confirmMilestone, setConfirmMilestone] = useState<{ id: number; name: string; releaseAmount: number; releasePercent: number } | null>(null);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [lastBonus, setLastBonus] = useState(0);

  const approveMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: number) => {
      const res = await apiRequest("POST", `/api/milestones/${milestoneId}/approve`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      setConfirmMilestone(null);
      queryClient.invalidateQueries({ queryKey: ["/api/obra-resguardada", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/copper-credits", clientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards/client", clientId] });
      if (data.milestoneBonus) {
        setLastBonus(data.milestoneBonus);
        setShowRewardAnimation(true);
        setTimeout(() => setShowRewardAnimation(false), 3500);
      }
      toast({ title: "Hito aprobado", description: data.message || "Los fondos han sido liberados al maestro." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo aprobar el hito", variant: "destructive" });
    },
  });

  const { data, isLoading } = useQuery<{ wallets: ObraWallet[] }>({
    queryKey: ["/api/obra-resguardada", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/obra-resguardada/${clientId}`);
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 30_000,
  });

  const { data: rewardsData } = useQuery<{ rewards: any[]; totalTokens: number }>({
    queryKey: ["/api/rewards/client", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/rewards/client/${clientId}`);
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });

  const { data: copperData } = useQuery<{ balance: number; history: any[] }>({
    queryKey: ["/api/copper-credits", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/copper-credits/${clientId}`);
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 60_000,
  });

  const calculateYieldMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/rewards/calculate-yield", { clientLeadId: clientId });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rewards/client", clientId] });
      if (data.createdRewards?.length > 0) {
        toast({ title: "Rendimiento calculado", description: `Se generaron ${data.createdRewards.length} recompensa(s) de custodia.` });
      } else {
        toast({ title: "Sin cambios", description: "El rendimiento de hoy ya fue calculado." });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo calcular el rendimiento", variant: "destructive" });
    },
  });

  const downloadCertificate = async (wallet: ObraWallet) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 20;

    doc.setFillColor(15, 23, 41);
    doc.rect(0, 0, pageW, pageH, "F");

    doc.setDrawColor(199, 123, 63);
    doc.setLineWidth(1.5);
    doc.roundedRect(10, 10, pageW - 20, pageH - 20, 5, 5, "S");
    doc.setLineWidth(0.5);
    doc.roundedRect(13, 13, pageW - 26, pageH - 26, 4, 4, "S");

    doc.setTextColor(199, 123, 63);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    for (let x = 30; x < pageW - 30; x += 50) {
      for (let y = 60; y < pageH - 40; y += 40) {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.06 }));
        doc.text("RESPALDADO POR BITCOPPER TECH", x, y, { angle: 35 });
        doc.restoreGraphicsState();
      }
    }

    try {
      const logoBase64 = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          } else { reject(new Error("no ctx")); }
        };
        img.onerror = reject;
        img.src = bitcoperLogo;
      });
      doc.addImage(logoBase64, "PNG", pageW / 2 - 15, 22, 30, 30);
    } catch { /* logo optional — continue without it */ }

    let y = 58;

    doc.setTextColor(199, 123, 63);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("CERTIFICADO", pageW / 2, y, { align: "center" });
    y += 9;
    doc.setFontSize(14);
    doc.text("DE OBRA PROTEGIDA", pageW / 2, y, { align: "center" });
    y += 7;

    doc.setDrawColor(199, 123, 63);
    doc.setLineWidth(0.8);
    doc.line(margin + 30, y, pageW - margin - 30, y);
    y += 10;

    doc.setTextColor(200, 200, 210);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Bitcopper Tech S.A. certifica que los fondos del siguiente proyecto", pageW / 2, y, { align: "center" });
    y += 5;
    doc.text("se encuentran bajo custodia protegida en nuestra plataforma.", pageW / 2, y, { align: "center" });
    y += 14;

    const fieldStartX = margin + 8;
    const valueStartX = margin + 60;

    const addField = (label: string, value: string) => {
      doc.setTextColor(160, 160, 170);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(label, fieldStartX, y);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(value, valueStartX, y);
      y += 9;
    };

    const profileName = clientName || "Cliente";

    addField("Cliente:", profileName);
    addField("Maestro:", wallet.maestroName || "No asignado");
    addField("Descripción:", wallet.description || "Proyecto de Obra");
    addField("Presupuesto Total:", `$${wallet.totalAmount.toLocaleString("es-CL")} CLP`);
    addField("Saldo Protegido:", `$${wallet.protectedBalance.toLocaleString("es-CL")} CLP`);
    addField("Fondo Garantía:", `$${wallet.guaranteeFund.toLocaleString("es-CL")} CLP`);
    addField("Fecha Inicio:", new Date(wallet.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" }));
    addField("Estado:", wallet.status === "active" ? "Activo - En Custodia" : wallet.status);
    y += 6;

    if (wallet.milestones && wallet.milestones.length > 0) {
      doc.setDrawColor(50, 60, 80);
      doc.setLineWidth(0.3);
      doc.line(margin + 8, y, pageW - margin - 8, y);
      y += 8;

      doc.setTextColor(199, 123, 63);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Progreso por Hitos", pageW / 2, y, { align: "center" });
      y += 8;

      wallet.milestones.forEach((m) => {
        const statusLabel = m.status === "APPROVED" ? "✓ Pagado" : m.status === "SUBMITTED" ? "⏳ En Revisión" : "○ Pendiente";
        const statusColor: [number, number, number] = m.status === "APPROVED" ? [34, 197, 94] : m.status === "SUBMITTED" ? [234, 179, 8] : [160, 160, 170];
        doc.setTextColor(...statusColor);
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`${statusLabel}`, fieldStartX, y);
        doc.setTextColor(220, 220, 230);
        doc.text(`${m.name} — ${m.releasePercent}% ($${m.releaseAmount.toLocaleString("es-CL")})`, fieldStartX + 28, y);
        y += 7;
      });
      y += 4;
    }

    doc.setDrawColor(50, 60, 80);
    doc.setLineWidth(0.3);
    doc.line(margin + 8, y, pageW - margin - 8, y);
    y += 10;

    doc.setTextColor(160, 160, 170);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const legalText = [
      "1. Los fondos permanecen en custodia protegida hasta la aprobación de cada hito por el cliente.",
      "2. Bitcopper Tech actúa como custodio neutral y no como parte contractual entre cliente y maestro.",
      "3. La liberación parcial o total de fondos requiere validación explícita del propietario del proyecto.",
      "4. Este certificado es un comprobante digital generado por la plataforma SmartBuild de Bitcopper Tech.",
    ];
    legalText.forEach(line => {
      doc.text(line, fieldStartX, y);
      y += 5;
    });

    y += 8;
    doc.setTextColor(199, 123, 63);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Bitcopper Tech S.A.", pageW / 2, y, { align: "center" });
    y += 5;
    doc.setTextColor(140, 140, 150);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("www.bitcopper.tech — Plataforma de Custodia para Construcción", pageW / 2, y, { align: "center" });
    y += 5;
    doc.text(`Generado el ${new Date().toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })} a las ${new Date().toLocaleTimeString("es-CL")}`, pageW / 2, y, { align: "center" });

    doc.setTextColor(60, 60, 70);
    doc.setFontSize(7);
    doc.text(`ID: CERT-${wallet.id}-${Date.now().toString(36).toUpperCase()}`, pageW / 2, pageH - 16, { align: "center" });

    doc.save(`Certificado_Obra_Protegida_${wallet.id}.pdf`);
  };

  if (isLoading) {
    return (
      <Card className="bg-[#1a2744] border-zinc-700/50">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#c77b3f]" />
        </CardContent>
      </Card>
    );
  }

  const wallets = data?.wallets || [];

  if (wallets.length === 0) {
    return (
      <Card className="bg-[#1a2744] border-zinc-700/50">
        <CardContent className="p-8 text-center">
          <Lock className="w-10 h-10 mx-auto text-zinc-500 mb-3" />
          <p className="text-white font-medium">Sin obras activas</p>
          <p className="text-zinc-400 text-sm mt-1">Cuando contrates a un maestro y se inicie el escrow, verás tu obra resguardada aquí.</p>
        </CardContent>
      </Card>
    );
  }

  const totals = wallets.reduce((acc, w) => ({
    totalBudget: acc.totalBudget + w.totalAmount,
    protectedBalance: acc.protectedBalance + w.protectedBalance,
    executedCost: acc.executedCost + w.executedCost,
    guarantee: acc.guarantee + w.guaranteeFund,
  }), { totalBudget: 0, protectedBalance: 0, executedCost: 0, guarantee: 0 });

  const protectedPercent = totals.totalBudget > 0 ? Math.round((totals.protectedBalance / totals.totalBudget) * 100) : 0;
  const executedPercent = totals.totalBudget > 0 ? Math.round((totals.executedCost / totals.totalBudget) * 100) : 0;

  return (
    <div className="space-y-4" data-testid="section-obra-resguardada">
      <Card className="bg-gradient-to-br from-[#1a2744] to-[#1f3058] border-[#c77b3f]/30" data-testid="card-budget-monitor">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#c77b3f]" />
            Monitor de Presupuesto
          </CardTitle>
          <p className="text-xs text-zinc-400">Tu dinero está protegido en custodia hasta que valides cada etapa</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#0f1729]/70 rounded-xl text-center border border-zinc-700/30">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Presupuesto Total</p>
              <p className="text-xl font-bold text-white" data-testid="text-total-budget">${totals.totalBudget.toLocaleString("es-CL")}</p>
            </div>
            <div className="p-3 bg-emerald-500/5 rounded-xl text-center border border-emerald-500/20">
              <p className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">Saldo Protegido</p>
              <p className="text-xl font-bold text-emerald-400" data-testid="text-protected-balance">${totals.protectedBalance.toLocaleString("es-CL")}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Progreso de ejecución</span>
              <span className="text-white font-medium">{executedPercent}%</span>
            </div>
            <div className="h-3 bg-[#0f1729] rounded-full overflow-hidden border border-zinc-700/30" data-testid="bar-budget-progress">
              <div className="h-full rounded-full flex">
                <div
                  className="bg-[#c77b3f] transition-all duration-500"
                  style={{ width: `${executedPercent}%` }}
                />
                <div
                  className="bg-emerald-500/30 transition-all duration-500"
                  style={{ width: `${protectedPercent}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#c77b3f]" />
                <span className="text-zinc-400">Ejecutado: ${totals.executedCost.toLocaleString("es-CL")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30" />
                <span className="text-zinc-400">Protegido: ${totals.protectedBalance.toLocaleString("es-CL")}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 bg-[#0f1729]/50 rounded-lg text-center">
              <Shield className="w-4 h-4 mx-auto text-amber-400 mb-0.5" />
              <p className="text-sm font-bold text-amber-400">${totals.guarantee.toLocaleString("es-CL")}</p>
              <p className="text-[9px] text-zinc-500">Fondo Garantía</p>
            </div>
            <div className="p-2.5 bg-[#0f1729]/50 rounded-lg text-center">
              <Hammer className="w-4 h-4 mx-auto text-blue-400 mb-0.5" />
              <p className="text-sm font-bold text-blue-400">{wallets.length}</p>
              <p className="text-[9px] text-zinc-500">{wallets.length === 1 ? "Obra Activa" : "Obras Activas"}</p>
            </div>
            <div className="p-2.5 bg-[#0f1729]/50 rounded-lg text-center">
              <Coins className="w-4 h-4 mx-auto text-[#c77b3f] mb-0.5" />
              <p className="text-sm font-bold text-[#c77b3f]" data-testid="text-total-tokens">
                {(rewardsData?.totalTokens || 0).toFixed(2)}
              </p>
              <p className="text-[9px] text-zinc-500">Tokens Custodia</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-[#1a2744] to-[#1f3058] border-[#c77b3f]/20" data-testid="card-ahorro-custodia">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#c77b3f]" />
            Ahorro por Custodia
          </CardTitle>
          <p className="text-xs text-zinc-400">Gana tokens diarios por mantener tu saldo en custodia (0.015% diario ~ 5.5% anual)</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-[#0f1729]/70 rounded-xl text-center border border-zinc-700/30">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Tokens Acumulados</p>
              <p className="text-xl font-bold text-[#c77b3f]" data-testid="text-custody-tokens">
                {(rewardsData?.totalTokens || 0).toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-[#0f1729]/70 rounded-xl text-center border border-zinc-700/30">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Rendimiento Diario</p>
              <p className="text-xl font-bold text-emerald-400">0.015%</p>
            </div>
          </div>

          {(rewardsData?.rewards?.length || 0) > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              <p className="text-xs text-zinc-400 font-medium">Últimos rendimientos</p>
              {rewardsData!.rewards.slice(0, 5).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-2 bg-[#0f1729] rounded-lg" data-testid={`reward-${r.id}`}>
                  <div className="flex items-center gap-2">
                    <Coins className="w-3.5 h-3.5 text-[#c77b3f]" />
                    <div>
                      <p className="text-xs text-white">+{parseFloat(r.tokenAmount).toFixed(2)} tokens</p>
                      <p className="text-[10px] text-zinc-500">{new Date(r.date).toLocaleDateString("es-CL")}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-400">Saldo: ${parseInt(r.frozenBalance).toLocaleString("es-CL")}</span>
                </div>
              ))}
            </div>
          )}

          <Button
            className="w-full bg-[#c77b3f] hover:bg-[#b06a30] text-white"
            onClick={() => calculateYieldMutation.mutate()}
            disabled={calculateYieldMutation.isPending}
            data-testid="button-calculate-yield"
          >
            {calculateYieldMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
            Calcular Rendimiento de Hoy
          </Button>
        </CardContent>
      </Card>

      {showRewardAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" data-testid="reward-animation-overlay">
          <div className="animate-bounce bg-gradient-to-br from-[#c77b3f] to-amber-500 rounded-2xl p-6 shadow-2xl shadow-amber-500/30 text-center pointer-events-auto"
            style={{ animation: "bounceIn 0.6s ease-out, pulse 1s ease-in-out 0.6s 2, fadeOut 0.5s ease-in 3s forwards" }}>
            <Sparkles className="w-10 h-10 text-white mx-auto mb-2" />
            <p className="text-white font-bold text-lg">¡Recompensa!</p>
            <p className="text-3xl font-black text-white mt-1">+{lastBonus} CC</p>
            <p className="text-white/80 text-xs mt-1">Copper Credits ganados</p>
          </div>
        </div>
      )}

      <Card className="bg-gradient-to-br from-[#1a2744] to-[#2a1f44] border-[#c77b3f]/30" data-testid="card-bitcopper-wallet">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#c77b3f]" />
            Bitcopper Wallet
          </CardTitle>
          <p className="text-xs text-zinc-400">Tus Copper Credits ganados por custodia y aprobación de hitos</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 bg-gradient-to-r from-[#c77b3f]/10 to-amber-500/5 rounded-xl border border-[#c77b3f]/30 text-center">
            <p className="text-[10px] text-[#c77b3f] uppercase tracking-wider mb-1">Balance Copper Credits</p>
            <p className="text-3xl font-black text-[#c77b3f]" data-testid="text-copper-balance">
              {(copperData?.balance || 0).toFixed(2)} CC
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-[#0f1729]/70 rounded-xl border border-emerald-500/20 text-center">
              <Shield className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
              <p className="text-[10px] text-zinc-400">Fee de Seguridad</p>
              <p className="text-[9px] text-emerald-400">Canjeable</p>
            </div>
            <div className="p-3 bg-[#0f1729]/70 rounded-xl border border-blue-500/20 text-center">
              <Store className="w-4 h-4 mx-auto text-blue-400 mb-1" />
              <p className="text-[10px] text-zinc-400">Ferreterías</p>
              <p className="text-[9px] text-blue-400">Descuento</p>
            </div>
          </div>

          {(copperData?.history?.length || 0) > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              <p className="text-xs text-zinc-400 font-medium">Últimos movimientos</p>
              {copperData!.history.slice(0, 5).map((h: any) => {
                const isPositive = parseFloat(h.amount) > 0;
                return (
                  <div key={h.id} className="flex items-center justify-between p-2 bg-[#0f1729] rounded-lg" data-testid={`copper-tx-${h.id}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isPositive ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                        {isPositive ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <CreditCard className="w-3 h-3 text-red-400" />}
                      </div>
                      <div>
                        <p className="text-[11px] text-white truncate max-w-[180px]">{h.description}</p>
                        <p className="text-[9px] text-zinc-500">{new Date(h.createdAt).toLocaleDateString("es-CL")}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                      {isPositive ? "+" : ""}{parseFloat(h.amount).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {wallets.map(wallet => (
        <Card key={wallet.id} className="bg-[#1a2744] border-zinc-700/50" data-testid={`card-obra-${wallet.id}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Hammer className="w-4 h-4 text-[#c77b3f]" />
                {wallet.description}
              </CardTitle>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                {wallet.maestroName}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-[10px] text-zinc-500">Total: ${wallet.totalAmount.toLocaleString("es-CL")}</p>
              <p className="text-[10px] text-emerald-400">Protegido: ${wallet.protectedBalance.toLocaleString("es-CL")}</p>
              <p className="text-[10px] text-[#c77b3f]">Ejecutado: ${wallet.executedCost.toLocaleString("es-CL")}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <MilestoneProgressBar milestones={wallet.milestones} />

            {wallet.milestones.filter(m => m.status === "SUBMITTED").length > 0 && (
              <div className="space-y-1.5" data-testid={`section-pending-approvals-${wallet.id}`}>
                <p className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Hitos pendientes de aprobación
                </p>
                {wallet.milestones.filter(m => m.status === "SUBMITTED").map(m => (
                  <div key={m.id} className="flex items-center justify-between p-2 bg-amber-500/5 rounded-lg border border-amber-500/20" data-testid={`milestone-approve-row-${m.id}`}>
                    <div>
                      <p className="text-xs text-white font-medium">{m.name}</p>
                      <p className="text-[10px] text-zinc-400">${m.releaseAmount.toLocaleString("es-CL")} · {m.releasePercent}%</p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3"
                      onClick={() => setConfirmMilestone({ id: m.id, name: m.name, releaseAmount: m.releaseAmount, releasePercent: m.releasePercent })}
                      data-testid={`button-approve-milestone-${m.id}`}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Aprobar
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {wallet.protectedBalance > 0 && (
              <Button
                size="sm"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mb-3"
                onClick={() => downloadCertificate(wallet)}
                data-testid={`button-download-certificate-${wallet.id}`}
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Certificado de Garantía
              </Button>
            )}

            {wallet.timeline.length > 0 ? (
              <div className="space-y-0">
                <p className="text-xs font-medium text-zinc-300 mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#c77b3f]" />
                  Línea de Tiempo — Adelantos y Pagos
                </p>
                {wallet.timeline.map((item, idx) => {
                  const txMeta = transactionTypeLabel(item.transactionType);
                  const TxIcon = txMeta.icon;
                  const isLast = idx === wallet.timeline.length - 1;

                  return (
                    <div key={item.id} className="relative flex gap-3" data-testid={`timeline-item-${item.id}`}>
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          item.validated ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-zinc-700/30 border border-zinc-600/30"
                        }`}>
                          <TxIcon className={`w-4 h-4 ${item.validated ? txMeta.color : "text-zinc-500"}`} />
                        </div>
                        {!isLast && <div className="w-px h-full min-h-[24px] bg-zinc-700/50 my-1" />}
                      </div>
                      <div className={`flex-1 pb-3 ${!isLast ? "" : ""}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-white">{txMeta.label}</p>
                            {item.validated && <BitcopperBadge />}
                          </div>
                          <span className={`text-sm font-bold ${
                            item.transactionType === "DEPOSIT" ? "text-emerald-400" : "text-[#c77b3f]"
                          }`}>
                            {item.transactionType === "DEPOSIT" ? "+" : "-"}${item.amount.toLocaleString("es-CL")}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">{item.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {item.date && (
                            <span className="text-[10px] text-zinc-500">
                              {new Date(item.date).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          )}
                          {item.status && (
                            <Badge className={`text-[9px] ${
                              item.status === "RELEASED" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                              item.status === "REJECTED" ? "bg-red-500/15 text-red-400 border-red-500/30" :
                              "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            }`}>
                              {item.status === "RELEASED" ? "Validado" : item.status === "REJECTED" ? "Rechazado" : "Pendiente"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <Clock className="w-6 h-6 mx-auto text-zinc-500 mb-2" />
                <p className="text-xs text-zinc-400">Sin movimientos registrados aún</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Card className="bg-gradient-to-r from-emerald-500/5 to-[#1a2744] border-emerald-500/20" data-testid="card-bitcopper-guarantee">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Tu obra está resguardada</p>
            <p className="text-xs text-zinc-400">Cada pago validado queda registrado y protegido por el sistema de custodia Bitcopper. Los fondos solo se liberan cuando tú apruebas cada etapa.</p>
          </div>
        </CardContent>
      </Card>

      <PaymentConfirmationModal
        open={!!confirmMilestone}
        onClose={() => setConfirmMilestone(null)}
        milestone={confirmMilestone}
        onConfirm={() => {
          if (confirmMilestone) approveMilestoneMutation.mutate(confirmMilestone.id);
        }}
        isPending={approveMilestoneMutation.isPending}
      />
    </div>
  );
}

interface SubscriptionData {
  id: number;
  planType: string;
  status: string;
  monthlyPrice: number;
  expiresAt: string;
}

function ClientSeguroTab({ profileId }: { profileId: number }) {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string>("MONTHLY");

  const { data: subscription, isLoading } = useQuery<SubscriptionData | null>({
    queryKey: ["/api/subscriptions/me", profileId],
    queryFn: async () => {
      const res = await fetch(`/api/subscriptions/me?clientLeadId=${profileId}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Error");
      }
      return res.json();
    },
    enabled: !!profileId,
    staleTime: 60_000,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (planType: string) => {
      return apiRequest("POST", "/api/subscriptions", { clientLeadId: profileId, planType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/me", profileId] });
      toast({ title: "¡Suscripción activada!", description: "Tu plan Hogar Seguro está activo" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo activar la suscripción", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (subId: number) => {
      return apiRequest("POST", `/api/subscriptions/${subId}/cancel`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/me", profileId] });
      toast({ title: "Suscripción cancelada", description: "Tu plan ha sido cancelado" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo cancelar la suscripción", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-[#1a2744] border-zinc-700/50">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#c77b3f]" />
        </CardContent>
      </Card>
    );
  }

  if (subscription && subscription.status === "ACTIVE") {
    return (
      <Card className="bg-[#1a2744] border-emerald-500/30" data-testid="card-subscription-active">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Hogar Seguro
            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30" data-testid="badge-subscription-status">
              Activa
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 bg-[#0f1729] rounded-lg space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-sm text-zinc-400">Plan</span>
              <span className="text-sm font-medium text-white" data-testid="text-subscription-plan">
                {subscription.planType === "MONTHLY" ? "Mensual" : "Anual"}
              </span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-sm text-zinc-400">Precio mensual</span>
              <span className="text-sm font-medium text-white" data-testid="text-subscription-price">
                ${subscription.monthlyPrice.toLocaleString("es-CL")}/mes
              </span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-sm text-zinc-400">Expira</span>
              <span className="text-sm font-medium text-white" data-testid="text-subscription-expiry">
                {new Date(subscription.expiresAt).toLocaleDateString("es-CL")}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full border-red-500/30 text-red-400"
            onClick={() => cancelMutation.mutate(subscription.id)}
            disabled={cancelMutation.isPending}
            data-testid="button-cancel-subscription"
          >
            {cancelMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Cancelar Suscripción
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1a2744] border-zinc-700/50" data-testid="card-subscription-promo">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-base flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#c77b3f]" />
          Hogar Seguro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-[#c77b3f]/5 to-emerald-500/5 rounded-lg border border-[#c77b3f]/20">
          <p className="text-sm text-white font-medium mb-3">Beneficios incluidos:</p>
          <div className="space-y-2">
            {["Seguro de cumplimiento incluido", "Resolución prioritaria de disputas", "Garantía extendida"].map((benefit) => (
              <div key={benefit} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-sm text-zinc-300">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedPlan("MONTHLY")}
            className={`p-4 rounded-lg border text-left transition-all ${selectedPlan === "MONTHLY" ? "border-[#c77b3f] bg-[#c77b3f]/10" : "border-zinc-700/50 bg-[#0f1729]"}`}
            data-testid="button-plan-monthly"
          >
            <p className="text-sm font-bold text-white">Mensual</p>
            <p className="text-lg font-bold text-[#c77b3f]">$9.990<span className="text-xs text-zinc-400">/mes</span></p>
          </button>
          <button
            onClick={() => setSelectedPlan("ANNUAL")}
            className={`p-4 rounded-lg border text-left transition-all ${selectedPlan === "ANNUAL" ? "border-[#c77b3f] bg-[#c77b3f]/10" : "border-zinc-700/50 bg-[#0f1729]"}`}
            data-testid="button-plan-annual"
          >
            <p className="text-sm font-bold text-white">Anual</p>
            <p className="text-lg font-bold text-[#c77b3f]">$89.900<span className="text-xs text-zinc-400">/año</span></p>
            <p className="text-[10px] text-zinc-400">= $7.492/mes</p>
          </button>
        </div>

        <Button
          className="w-full bg-[#c77b3f] hover:bg-[#b06a30] text-white"
          onClick={() => subscribeMutation.mutate(selectedPlan)}
          disabled={subscribeMutation.isPending}
          data-testid="button-subscribe"
        >
          {subscribeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
          Suscribirse al Plan {selectedPlan === "MONTHLY" ? "Mensual" : "Anual"}
        </Button>
      </CardContent>
    </Card>
  );
}

interface SimulationResult {
  tokenValue: number;
  monthlyReturnPercent: number;
  annualizedReturnPercent: number;
  totalProjectedReturn: number;
  guaranteeFundAmount: number;
  projectedReturns: { month: number; amount: number }[];
}

const FERRETERIAS_CALAMA = [
  {
    id: "sodimac-calama",
    name: "Sodimac Calama",
    address: "Av. Balmaceda 3550, Calama",
    phone: "+56 55 234 5678",
    discount: "5% de descuento adicional pagando con Bitcopper",
    discountPercent: 5,
    ccCost: 50,
    categories: ["Materiales de construcción", "Herramientas", "Terminaciones"],
    hours: "Lun-Sáb 8:30 - 21:00 | Dom 10:00 - 20:00",
    color: "from-green-600/20 to-emerald-600/10",
    borderColor: "border-green-500/30",
    accentColor: "text-green-400",
  },
  {
    id: "easy-calama",
    name: "Easy Calama",
    address: "Av. Granaderos 2900, Calama",
    phone: "+56 55 245 6789",
    discount: "7% de descuento en materiales gruesos con Bitcopper",
    discountPercent: 7,
    ccCost: 70,
    categories: ["Cemento", "Fierro", "Áridos", "Pinturas"],
    hours: "Lun-Sáb 9:00 - 21:00 | Dom 10:00 - 19:00",
    color: "from-blue-600/20 to-sky-600/10",
    borderColor: "border-blue-500/30",
    accentColor: "text-blue-400",
  },
  {
    id: "ferreteria-el-cobre",
    name: "Ferretería El Cobre",
    address: "Calle Ramírez 1820, Calama Centro",
    phone: "+56 55 212 3456",
    discount: "10% en gasfitería y electricidad con Bitcopper",
    discountPercent: 10,
    ccCost: 40,
    categories: ["Gasfitería", "Electricidad", "Plomería"],
    hours: "Lun-Vie 8:00 - 19:00 | Sáb 9:00 - 14:00",
    color: "from-[#c77b3f]/20 to-amber-600/10",
    borderColor: "border-[#c77b3f]/30",
    accentColor: "text-[#c77b3f]",
  },
  {
    id: "materiales-atacama",
    name: "Materiales Atacama",
    address: "Av. O'Higgins 4210, Calama",
    phone: "+56 55 256 7890",
    discount: "8% en todo pagando con Bitcopper + envío gratis",
    discountPercent: 8,
    ccCost: 60,
    categories: ["Materiales completos", "Ferretería general", "Envío a obra"],
    hours: "Lun-Sáb 8:00 - 20:00",
    color: "from-purple-600/20 to-violet-600/10",
    borderColor: "border-purple-500/30",
    accentColor: "text-purple-400",
  },
  {
    id: "construmarket-calama",
    name: "ConstruMarket Calama",
    address: "Calle Latorre 980, Calama",
    phone: "+56 55 223 4567",
    discount: "6% de descuento + doble Copper Credits",
    discountPercent: 6,
    ccCost: 45,
    categories: ["Revestimientos", "Cerámicas", "Terminaciones"],
    hours: "Lun-Vie 9:00 - 19:30 | Sáb 9:00 - 15:00",
    color: "from-teal-600/20 to-cyan-600/10",
    borderColor: "border-teal-500/30",
    accentColor: "text-teal-400",
  },
];

function ComerciosAmigosTab({ clientId }: { clientId: number }) {
  const { toast } = useToast();
  const [selectedStore, setSelectedStore] = useState<typeof FERRETERIAS_CALAMA[0] | null>(null);
  const [generatedCoupon, setGeneratedCoupon] = useState<string | null>(null);
  const [couponStore, setCouponStore] = useState<string>("");

  const { data: copperData } = useQuery<{ balance: number; history: any[] }>({
    queryKey: ["/api/copper-credits", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/copper-credits/${clientId}`);
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    enabled: !!clientId,
    staleTime: 30_000,
  });

  const redeemMutation = useMutation({
    mutationFn: async ({ storeName, discountPercent, ccCost }: { storeName: string; discountPercent: number; ccCost: number }) => {
      const res = await apiRequest("POST", "/api/ferreteria-coupons/generate", {
        clientLeadId: clientId,
        storeName,
        discountPercent,
        ccCost,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedCoupon(data.coupon.code);
      setCouponStore(data.coupon.storeName);
      queryClient.invalidateQueries({ queryKey: ["/api/copper-credits", clientId] });
      toast({ title: "¡Cupón generado!", description: `Código: ${data.coupon.code}` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "No se pudo generar el cupón", variant: "destructive" });
    },
  });

  const balance = copperData?.balance || 0;

  return (
    <div className="space-y-4" data-testid="section-comercios-amigos">
      <Card className="bg-gradient-to-br from-[#1a2744] to-[#1f3058] border-[#c77b3f]/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Store className="w-5 h-5 text-[#c77b3f]" />
            Red de Ferreterías Bitcopper
          </CardTitle>
          <p className="text-xs text-zinc-400">Ferreterías en Calama que aceptan tus Copper Credits como descuento</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-gradient-to-r from-[#c77b3f]/10 to-amber-500/5 rounded-xl border border-[#c77b3f]/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#c77b3f]" />
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Tu Saldo</p>
                <p className="text-lg font-bold text-[#c77b3f]" data-testid="text-comercios-copper-balance">{balance.toFixed(2)} CC</p>
              </div>
            </div>
            <Badge className="bg-[#c77b3f]/15 text-[#c77b3f] border-[#c77b3f]/30 text-[10px]">
              Copper Credits
            </Badge>
          </div>
        </CardContent>
      </Card>

      {generatedCoupon && (
        <Card className="bg-gradient-to-br from-emerald-900/30 to-[#1a2744] border-emerald-500/30" data-testid="card-generated-coupon">
          <CardContent className="p-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
              <Tag className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-emerald-400 uppercase tracking-wider">Cupón Activo</p>
              <p className="text-2xl font-black text-white tracking-widest mt-1" data-testid="text-coupon-code">{generatedCoupon}</p>
              <p className="text-xs text-zinc-400 mt-1">Para: {couponStore}</p>
            </div>
            <p className="text-[10px] text-zinc-500">Muestra este código al vendedor de la ferretería para aplicar tu descuento</p>
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
              onClick={() => {
                navigator.clipboard.writeText(generatedCoupon);
                toast({ title: "Copiado", description: "Código copiado al portapapeles" });
              }}
              data-testid="button-copy-coupon"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copiar Código
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {FERRETERIAS_CALAMA.map(store => {
          const canAfford = balance >= store.ccCost;
          return (
            <Card
              key={store.id}
              className={`bg-gradient-to-br ${store.color} border ${store.borderColor} cursor-pointer transition-colors`}
              onClick={() => setSelectedStore(selectedStore?.id === store.id ? null : store)}
              data-testid={`card-store-${store.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-[#0f1729]/70 flex items-center justify-center shrink-0 border ${store.borderColor}`}>
                    <Store className={`w-6 h-6 ${store.accentColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-white truncate" data-testid={`text-store-name-${store.id}`}>{store.name}</h3>
                      <Badge className={`${store.borderColor} ${store.accentColor} bg-transparent text-[9px] shrink-0`}>
                        {store.discountPercent}% OFF
                      </Badge>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1">
                      <Flag className="w-3 h-3 shrink-0" />
                      {store.address}
                    </p>
                    <p className={`text-[11px] ${store.accentColor} mt-1 font-medium`}>{store.discount}</p>
                  </div>
                </div>

                {selectedStore?.id === store.id && (
                  <div className="mt-3 pt-3 border-t border-zinc-700/30 space-y-3" data-testid={`store-detail-${store.id}`}>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-[#0f1729]/50 rounded-lg">
                        <p className="text-[9px] text-zinc-500 uppercase">Teléfono</p>
                        <p className="text-xs text-white">{store.phone}</p>
                      </div>
                      <div className="p-2 bg-[#0f1729]/50 rounded-lg">
                        <p className="text-[9px] text-zinc-500 uppercase">Horario</p>
                        <p className="text-[10px] text-white">{store.hours}</p>
                      </div>
                    </div>
                    <div className="p-2 bg-[#0f1729]/50 rounded-lg">
                      <p className="text-[9px] text-zinc-500 uppercase mb-1">Categorías</p>
                      <div className="flex flex-wrap gap-1">
                        {store.categories.map(cat => (
                          <span key={cat} className={`px-2 py-0.5 rounded-full text-[9px] ${store.borderColor} border ${store.accentColor} bg-transparent`}>
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 bg-[#0f1729]/70 rounded-xl border border-zinc-700/30 text-center">
                      <p className="text-[10px] text-zinc-400 mb-1">Costo del cupón</p>
                      <p className={`text-lg font-bold ${store.accentColor}`}>{store.ccCost} CC</p>
                      <p className="text-[10px] text-zinc-500">= {store.discountPercent}% de descuento en tu compra</p>
                    </div>
                    <Button
                      className={`w-full ${canAfford ? "bg-[#c77b3f] hover:bg-[#b06a30] text-white" : "bg-zinc-700 text-zinc-400 cursor-not-allowed"}`}
                      disabled={!canAfford || redeemMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        redeemMutation.mutate({ storeName: store.name, discountPercent: store.discountPercent, ccCost: store.ccCost });
                      }}
                      data-testid={`button-generate-coupon-${store.id}`}
                    >
                      {redeemMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Tag className="w-4 h-4 mr-2" />
                      )}
                      {canAfford ? "Generar Cupón de Descuento" : `Necesitas ${store.ccCost} CC (tienes ${balance.toFixed(0)})`}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-[#1a2744] border-zinc-700/30">
        <CardContent className="p-4 text-center">
          <p className="text-[10px] text-zinc-500">
            ¿Eres dueño de una ferretería en Calama? Contáctanos para unirte a la Red Bitcopper y atraer más clientes.
          </p>
          <p className="text-[10px] text-[#c77b3f] mt-1 font-medium">contacto@bitcopper.tech</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ClientInversionTab() {
  const { toast } = useToast();
  const [projectValue, setProjectValue] = useState(10000000);
  const [tokenCount, setTokenCount] = useState(100);
  const [termMonths, setTermMonths] = useState(12);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const simulateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/simulator/investment", { projectValue, tokenCount, termMonths });
      return res.json();
    },
    onSuccess: (data: SimulationResult) => {
      setResult(data);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo simular la inversión", variant: "destructive" });
    },
  });

  const maxReturn = result ? Math.max(...result.projectedReturns.map(r => r.amount)) : 0;

  return (
    <div className="space-y-4">
      <Card className="bg-[#1a2744] border-zinc-700/50" data-testid="card-investment-simulator">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#c77b3f]" />
            Simulador de Inversión y Tokenización
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-sm text-zinc-400">Valor del Proyecto</label>
                <span className="text-sm font-medium text-white" data-testid="text-project-value">
                  ${projectValue.toLocaleString("es-CL")}
                </span>
              </div>
              <input
                type="range"
                min={1000000}
                max={100000000}
                step={500000}
                value={projectValue}
                onChange={(e) => setProjectValue(Number(e.target.value))}
                className="w-full accent-[#c77b3f]"
                data-testid="slider-project-value"
              />
              <div className="flex items-center justify-between flex-wrap gap-1 text-[10px] text-zinc-500">
                <span>$1.000.000</span>
                <span>$100.000.000</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-sm text-zinc-400">Cantidad de Tokens</label>
                <span className="text-sm font-medium text-white" data-testid="text-token-count">
                  {tokenCount}
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={1000}
                step={10}
                value={tokenCount}
                onChange={(e) => setTokenCount(Number(e.target.value))}
                className="w-full accent-[#c77b3f]"
                data-testid="slider-token-count"
              />
              <div className="flex items-center justify-between flex-wrap gap-1 text-[10px] text-zinc-500">
                <span>10</span>
                <span>1.000</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-sm text-zinc-400">Plazo (meses)</label>
                <span className="text-sm font-medium text-white" data-testid="text-term-months">
                  {termMonths} meses
                </span>
              </div>
              <input
                type="range"
                min={6}
                max={36}
                step={1}
                value={termMonths}
                onChange={(e) => setTermMonths(Number(e.target.value))}
                className="w-full accent-[#c77b3f]"
                data-testid="slider-term-months"
              />
              <div className="flex items-center justify-between flex-wrap gap-1 text-[10px] text-zinc-500">
                <span>6 meses</span>
                <span>36 meses</span>
              </div>
            </div>
          </div>

          <Button
            className="w-full bg-[#c77b3f] hover:bg-[#b06a30] text-white"
            onClick={() => simulateMutation.mutate()}
            disabled={simulateMutation.isPending}
            data-testid="button-simulate"
          >
            {simulateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
            Simular
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card className="bg-[#1a2744] border-zinc-700/50" data-testid="card-simulation-results">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Resultados de la Simulación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#0f1729] rounded-lg text-center">
                <p className="text-[10px] text-zinc-400 mb-1">Valor por Token</p>
                <p className="text-lg font-bold text-white" data-testid="text-token-value">
                  ${result.tokenValue.toLocaleString("es-CL")}
                </p>
              </div>
              <div className="p-3 bg-[#0f1729] rounded-lg text-center">
                <p className="text-[10px] text-zinc-400 mb-1">Retorno Mensual</p>
                <p className="text-lg font-bold text-emerald-400" data-testid="text-monthly-return">
                  {result.monthlyReturnPercent.toFixed(2)}%
                </p>
              </div>
              <div className="p-3 bg-[#0f1729] rounded-lg text-center">
                <p className="text-[10px] text-zinc-400 mb-1">Retorno Anualizado</p>
                <p className="text-lg font-bold text-[#c77b3f]" data-testid="text-annual-return">
                  {result.annualizedReturnPercent.toFixed(2)}%
                </p>
              </div>
              <div className="p-3 bg-[#0f1729] rounded-lg text-center">
                <p className="text-[10px] text-zinc-400 mb-1">Retorno Total Proyectado</p>
                <p className="text-lg font-bold text-white" data-testid="text-total-return">
                  ${result.totalProjectedReturn.toLocaleString("es-CL")}
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#0f1729] rounded-lg text-center">
              <p className="text-[10px] text-zinc-400 mb-1">Fondo de Garantía</p>
              <p className="text-lg font-bold text-blue-400" data-testid="text-guarantee-fund">
                ${result.guaranteeFundAmount.toLocaleString("es-CL")}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-white">Retornos Mensuales Proyectados</p>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {result.projectedReturns.map((ret) => (
                  <div key={ret.month} className="flex items-center gap-2" data-testid={`bar-month-${ret.month}`}>
                    <span className="text-[10px] text-zinc-400 w-12 shrink-0">Mes {ret.month}</span>
                    <div className="flex-1 bg-[#0f1729] rounded-full h-4 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#c77b3f] to-emerald-500 rounded-full transition-all"
                        style={{ width: `${maxReturn > 0 ? (ret.amount / maxReturn) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-white font-medium w-20 text-right shrink-0">
                      ${ret.amount.toLocaleString("es-CL")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
