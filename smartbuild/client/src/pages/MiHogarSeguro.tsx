import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Shield,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Coins,
  Lock,
  Wallet,
  Sparkles,
  Users,
  Share2,
  Copy,
  Download,
  Phone,
  Award,
  FileText,
  ShieldCheck,
  Wrench,
  Star,
  MessageCircle,
  Crown,
  Search,
  BadgeCheck,
  Hammer,
  Trophy,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

interface SubscriptionData {
  subscription: {
    id: number;
    planType: string;
    status: string;
    monthlyPrice: number;
    hasComplianceInsurance: boolean;
    priorityDispute: boolean;
    startedAt: string;
    expiresAt: string;
  } | null;
  plans: Record<string, { type: string; price: number; label: string; durationDays: number }>;
}

interface SimulationResult {
  tokenValue: number;
  monthlyReturnPercent: number;
  annualizedReturnPercent: number;
  totalReturn: number;
  guaranteeFundAmount: number;
  projectedReturns: { month: number; value: number; accumulated: number }[];
}

interface ReferralStats {
  referralCount: number;
  referralLink: string;
  referralCode: string;
  clientId: number;
}

interface CopperCreditData {
  balance: number;
  history: { id: number; amount: string; type: string; description: string; createdAt: string }[];
}

interface WalletData {
  wallets: {
    id: number;
    description: string;
    totalAmount: number;
    status: string;
    maestroName: string;
    createdAt: string;
  }[];
}

interface MaestroFama {
  id: number;
  displayName: string;
  specialty: string | null;
  city: string | null;
  avgRating: string;
  ratingCount: number;
  kycVerified: boolean;
  hasActiveBadge: boolean;
  trustLevel: number;
  obrasProtegidas: number;
  level: string;
}

export default function MiHogarSeguro() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string>("MONTHLY");
  const [fundAmount, setFundAmount] = useState<string>("1000000");
  const [tokenCount, setTokenCount] = useState(100);
  const [termMonths, setTermMonths] = useState(12);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [famaSpecialty, setFamaSpecialty] = useState<string>("all");
  const [famaRating, setFamaRating] = useState<string>("0");
  const [famaCity, setFamaCity] = useState<string>("Calama");

  const userEmail = user?.email || user?.username || "";

  const { data: subData, isLoading: subLoading } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscriptions/me", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/subscriptions/me?userId=${user?.id}`);
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: referralStats } = useQuery<ReferralStats>({
    queryKey: ["/api/client/referral-stats", userEmail],
    queryFn: async () => {
      const res = await fetch(`/api/client/referral-stats?email=${encodeURIComponent(userEmail)}`);
      if (!res.ok) return { referralCount: 0, referralLink: "", referralCode: "", clientId: 0 };
      return res.json();
    },
    enabled: !!userEmail,
  });

  const { data: copperData } = useQuery<CopperCreditData>({
    queryKey: ["/api/copper-credits", referralStats?.clientId],
    queryFn: async () => {
      const res = await fetch(`/api/copper-credits/${referralStats!.clientId}`);
      if (!res.ok) return { balance: 0, history: [] };
      return res.json();
    },
    enabled: !!referralStats?.clientId && referralStats.clientId > 0,
  });

  const { data: escrowData } = useQuery<WalletData>({
    queryKey: ["/api/escrow/client", referralStats?.clientId],
    queryFn: async () => {
      const res = await fetch(`/api/escrow/client/${referralStats!.clientId}`);
      if (!res.ok) return { wallets: [] };
      return res.json();
    },
    enabled: !!referralStats?.clientId && referralStats.clientId > 0,
  });

  const famaQueryParams = new URLSearchParams();
  if (famaCity) famaQueryParams.set("city", famaCity);
  if (famaSpecialty && famaSpecialty !== "all") famaQueryParams.set("specialty", famaSpecialty);
  if (famaRating && famaRating !== "0") famaQueryParams.set("minRating", famaRating);

  const { data: famaMaestros, isLoading: famaLoading } = useQuery<MaestroFama[]>({
    queryKey: ["/api/fama/maestros", famaCity, famaSpecialty, famaRating],
    queryFn: async () => {
      const res = await fetch(`/api/fama/maestros?${famaQueryParams.toString()}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: async (planType: string) => {
      return apiRequest("POST", "/api/subscriptions", { userId: user?.id, planType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/me", user?.id] });
      toast({ title: "Suscripción activada", description: "Tu plan Hogar Seguro está activo." });
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
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/me", user?.id] });
      toast({ title: "Suscripción cancelada" });
    },
  });

  const simulateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/simulator/investment", {
        projectValue: Number(fundAmount),
        tokenCount,
        termMonths,
      });
      return res.json();
    },
    onSuccess: (data: SimulationResult) => setSimResult(data),
    onError: () => toast({ title: "Error", description: "No se pudo simular", variant: "destructive" }),
  });

  const sub = subData?.subscription;
  const isSubscribed = sub && sub.status === "ACTIVE";
  const wallets = escrowData?.wallets || [];
  const completedWallets = wallets.filter(w => w.status === "COMPLETED" || w.status === "IN_PROGRESS" || w.status === "SPLIT_ALLOCATED");
  const copperBalance = copperData?.balance ?? 0;
  const copperHistory = copperData?.history ?? [];

  const referralCount = referralStats?.referralCount ?? 0;
  const LEVELS = [
    { name: "Bronce", min: 0, max: 5, color: "text-amber-600", bgColor: "bg-amber-600", borderColor: "border-amber-600/30", bgLight: "bg-amber-600/10" },
    { name: "Plata", min: 5, max: 15, color: "text-zinc-300", bgColor: "bg-zinc-300", borderColor: "border-zinc-300/30", bgLight: "bg-zinc-300/10" },
    { name: "Oro", min: 15, max: Infinity, color: "text-yellow-400", bgColor: "bg-yellow-400", borderColor: "border-yellow-400/30", bgLight: "bg-yellow-400/10" },
  ];
  const currentLevel = LEVELS.find(l => referralCount >= l.min && referralCount < l.max) || LEVELS[0];
  const currentLevelIndex = LEVELS.indexOf(currentLevel);
  const isGold = currentLevel.name === "Oro";
  const nextLevel = isGold ? null : LEVELS[currentLevelIndex + 1];
  const progressInLevel = isGold
    ? 100
    : Math.min(100, ((referralCount - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100);
  const referralsToNext = isGold ? 0 : currentLevel.max - referralCount;
  const totalEarnings = referralCount * 500;

  const copyReferralLink = () => {
    if (referralStats?.referralLink) {
      navigator.clipboard.writeText(referralStats.referralLink);
      toast({ title: "Enlace copiado" });
    }
  };

  const shareAseguraVecino = () => {
    const code = referralStats?.referralCode || "---";
    const text = `Hola, estoy usando la app Bitcopper para mi obra y es super segura. Te paso mi codigo ${code} para que tu tambien protejas tu dinero y te den un descuento`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (subLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#c77b3f]" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-[#c77b3f]/10 rounded-xl">
            <Home className="w-6 h-6 text-[#c77b3f]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-hogar-title">
                Mi Hogar Seguro
              </h1>
              {isGold && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-yellow-400/20 to-amber-500/20 rounded-full border border-yellow-400/30" data-testid="badge-header-embajador-oro">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-400">Embajador Oro</span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Protege tu proyecto de construcción mediante tokenización</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {!isSubscribed ? (
            <Card className="border-[#c77b3f]/20 lg:col-span-2" data-testid="card-subscribe-promo">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#c77b3f]" />
                  Suscríbete a Hogar Seguro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Activa tu suscripción para acceder a todas las funcionalidades de protección y fondeo de proyectos.
                </p>
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium mb-3">Beneficios incluidos:</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { icon: Shield, label: "Seguro de cumplimiento", desc: "Tu obra protegida ante incumplimiento del maestro" },
                      { icon: Lock, label: "Fondos en custodia", desc: "Tu dinero resguardado con rendimiento diario" },
                      { icon: Sparkles, label: "Resolución prioritaria", desc: "Disputas resueltas en 48 horas" },
                    ].map(b => (
                      <div key={b.label} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                        <b.icon className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">{b.label}</p>
                          <p className="text-xs text-muted-foreground">{b.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedPlan("MONTHLY")}
                    className={`p-5 rounded-xl border text-left transition-all ${selectedPlan === "MONTHLY" ? "border-[#c77b3f] bg-[#c77b3f]/10 shadow-lg shadow-[#c77b3f]/10" : "border-border bg-card"}`}
                    data-testid="button-plan-monthly"
                  >
                    <p className="text-sm font-bold">Mensual</p>
                    <p className="text-2xl font-bold text-[#c77b3f] mt-1">$9.990<span className="text-xs text-muted-foreground font-normal">/mes</span></p>
                  </button>
                  <button
                    onClick={() => setSelectedPlan("ANNUAL")}
                    className={`p-5 rounded-xl border text-left transition-all relative ${selectedPlan === "ANNUAL" ? "border-[#c77b3f] bg-[#c77b3f]/10 shadow-lg shadow-[#c77b3f]/10" : "border-border bg-card"}`}
                    data-testid="button-plan-annual"
                  >
                    <Badge className="absolute -top-2 right-3 bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Ahorra 25%</Badge>
                    <p className="text-sm font-bold">Anual</p>
                    <p className="text-2xl font-bold text-[#c77b3f] mt-1">$89.900<span className="text-xs text-muted-foreground font-normal">/año</span></p>
                    <p className="text-xs text-muted-foreground">= $7.492/mes</p>
                  </button>
                </div>

                <Button
                  className="w-full bg-[#c77b3f] hover:bg-[#b06a30] text-white h-12 text-base"
                  onClick={() => subscribeMutation.mutate(selectedPlan)}
                  disabled={subscribeMutation.isPending}
                  data-testid="button-subscribe"
                >
                  {subscribeMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Shield className="w-5 h-5 mr-2" />}
                  Activar Hogar Seguro — {selectedPlan === "MONTHLY" ? "$9.990/mes" : "$89.900/año"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-emerald-500/20" data-testid="card-subscription-active">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    Tu Suscripción
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30" data-testid="badge-sub-active">Activa</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-4 bg-card rounded-lg border border-border/50 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Plan</span>
                      <span className="text-sm font-medium" data-testid="text-sub-plan">{sub.planType === "MONTHLY" ? "Mensual" : "Anual"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Precio</span>
                      <span className="text-sm font-medium">${sub.monthlyPrice.toLocaleString("es-CL")}/mes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Expira</span>
                      <span className="text-sm font-medium">{new Date(sub.expiresAt).toLocaleDateString("es-CL")}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {sub.hasComplianceInsurance && (
                      <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs">
                        <Shield className="w-3 h-3 mr-1" /> Seguro Incluido
                      </Badge>
                    )}
                    {sub.priorityDispute && (
                      <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-xs">
                        <Sparkles className="w-3 h-3 mr-1" /> Disputa Prioritaria
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-red-500/30 text-red-400 mt-2"
                    onClick={() => cancelMutation.mutate(sub.id)}
                    disabled={cancelMutation.isPending}
                    data-testid="button-cancel-sub"
                  >
                    Cancelar Suscripción
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-[#c77b3f]/20" data-testid="card-fund-project">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Coins className="w-5 h-5 text-[#c77b3f]" />
                    Fondear Proyecto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Deposita fondos para tu proyecto de construcción. Tu dinero queda protegido en custodia y genera rendimiento diario.
                  </p>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Monto a fondear (CLP)</label>
                    <Input
                      type="number"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="1000000"
                      className="font-mono"
                      data-testid="input-fund-amount"
                    />
                    <p className="text-xs text-muted-foreground">
                      Rendimiento estimado: ${(Number(fundAmount) * 0.00015).toFixed(0)}/día · ${(Number(fundAmount) * 0.00015 * 30).toFixed(0)}/mes
                    </p>
                  </div>
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Monto</span>
                      <span className="font-mono font-medium">${Number(fundAmount).toLocaleString("es-CL")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Garantía (2%)</span>
                      <span className="font-mono font-medium">${Math.round(Number(fundAmount) * 0.02).toLocaleString("es-CL")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Materiales (50%)</span>
                      <span className="font-mono font-medium">${Math.round(Number(fundAmount) * 0.5).toLocaleString("es-CL")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Mano de obra (48%)</span>
                      <span className="font-mono font-medium">${Math.round(Number(fundAmount) * 0.48).toLocaleString("es-CL")}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-[#c77b3f] hover:bg-[#b06a30] text-white"
                    disabled={!fundAmount || Number(fundAmount) < 100000}
                    data-testid="button-fund-project"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Fondear Proyecto — ${Number(fundAmount).toLocaleString("es-CL")}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    El fondeo crea un wallet escrow protegido por Bitcopper. Los fondos se liberan según hitos aprobados.
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {/* ========== SECTION 1: Referidos con Niveles de Embajador ========== */}
          <Card className="border-blue-500/20 lg:col-span-2" data-testid="card-referidos">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Mis Referidos
                {isGold && (
                  <Badge className="bg-yellow-400/15 text-yellow-400 border-yellow-400/30 text-[10px] ml-auto" data-testid="badge-embajador-oro">
                    <Crown className="w-3 h-3 mr-1" /> Cliente Embajador Oro
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">

              <div className="p-4 rounded-xl border border-border/50 space-y-3" data-testid="panel-ambassador-progress">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${currentLevel.bgLight}`}>
                      <Star className={`w-4 h-4 ${currentLevel.color}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${currentLevel.color}`} data-testid="text-current-level">Nivel {currentLevel.name}</p>
                      <p className="text-[10px] text-muted-foreground">{referralCount} referidos</p>
                    </div>
                  </div>
                  {nextLevel && (
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Siguiente nivel</p>
                      <p className={`text-xs font-bold ${nextLevel.color}`}>{nextLevel.name}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    {LEVELS.map((level, i) => (
                      <div key={level.name} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`w-full h-2.5 rounded-full overflow-hidden ${i <= currentLevelIndex ? "bg-muted" : "bg-muted/30"}`}>
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              i < currentLevelIndex ? level.bgColor : i === currentLevelIndex ? currentLevel.bgColor : ""
                            }`}
                            style={{ width: i < currentLevelIndex ? "100%" : i === currentLevelIndex ? `${progressInLevel}%` : "0%" }}
                            data-testid={`progress-bar-${level.name.toLowerCase()}`}
                          />
                        </div>
                        <span className={`text-[9px] font-medium ${i <= currentLevelIndex ? level.color : "text-muted-foreground/40"}`}>{level.name}</span>
                      </div>
                    ))}
                  </div>
                  {!isGold && (
                    <p className="text-xs text-muted-foreground text-center" data-testid="text-referrals-to-next">
                      Te faltan <span className="font-bold text-foreground">{referralsToNext}</span> referidos para llegar a <span className={`font-bold ${nextLevel!.color}`}>{nextLevel!.name}</span>
                    </p>
                  )}
                  {isGold && (
                    <p className="text-xs text-yellow-400 text-center font-medium" data-testid="text-max-level">
                      Has alcanzado el nivel maximo de Embajador
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/20 text-center">
                  <p className="text-[10px] text-muted-foreground">Referidos</p>
                  <p className="text-2xl font-bold font-mono text-blue-400" data-testid="text-referral-count">
                    {referralCount}
                  </p>
                </div>
                <div className="p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/20 text-center" data-testid="panel-earnings">
                  <p className="text-[10px] text-muted-foreground">Ganado por referidos</p>
                  <p className="text-2xl font-bold font-mono text-emerald-400" data-testid="text-referral-credits">
                    ${totalEarnings.toLocaleString("es-CL")}
                  </p>
                  <p className="text-[9px] text-muted-foreground">$500 por cada referido</p>
                </div>
                <div className={`p-4 rounded-lg border text-center ${currentLevel.bgLight} ${currentLevel.borderColor}`} data-testid="panel-level-badge">
                  <p className="text-[10px] text-muted-foreground">Tu nivel</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Star className={`w-4 h-4 ${currentLevel.color}`} />
                    <p className={`text-sm font-bold ${currentLevel.color}`}>{currentLevel.name}</p>
                  </div>
                  {isGold && <p className="text-[9px] text-yellow-400 mt-0.5">Embajador</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-11"
                  onClick={shareAseguraVecino}
                  data-testid="button-asegura-vecino"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Asegura a un Vecino
                </Button>

                {referralStats?.referralLink ? (
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={referralStats.referralLink}
                      className="text-xs font-mono bg-card h-11"
                      data-testid="input-referral-link"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 h-11 w-11"
                      onClick={copyReferralLink}
                      data-testid="button-copy-referral"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center p-3 bg-muted/50 rounded-lg flex items-center justify-center">
                    Tu enlace se genera al completar tu perfil de cliente.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ========== SECTION 2: Billetera de Beneficios (Copper Credits) ========== */}
          <Card className="border-[#c77b3f]/20" data-testid="card-copper-wallet">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#c77b3f]" />
                Billetera de Beneficios
                <Badge className="bg-[#c77b3f]/15 text-[#c77b3f] border-[#c77b3f]/30 text-[10px] ml-auto">Copper Credits</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-5 bg-gradient-to-br from-[#c77b3f]/10 to-[#c77b3f]/5 rounded-xl border border-[#c77b3f]/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">Saldo disponible</p>
                <p className="text-4xl font-bold font-mono text-[#c77b3f]" data-testid="text-copper-balance">
                  {copperBalance.toFixed(2)} <span className="text-lg">CC</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Acumulados por rendimiento de custodia + hitos aprobados</p>
              </div>

              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Dónde usar tus créditos:</p>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-xs">Fee de seguridad en proyectos nuevos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-xs">Descuentos en ferreterías asociadas</span>
                </div>
              </div>

              {copperHistory.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Últimos movimientos</p>
                  {copperHistory.slice(0, 5).map(h => (
                    <div key={h.id} className="flex items-center justify-between p-2 bg-card rounded border border-border/30" data-testid={`row-copper-${h.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{h.description}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(h.createdAt).toLocaleDateString("es-CL")}</p>
                      </div>
                      <span className={`text-xs font-mono font-bold ${parseFloat(h.amount) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {parseFloat(h.amount) >= 0 ? "+" : ""}{parseFloat(h.amount).toFixed(2)} CC
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {copperHistory.length === 0 && (
                <p className="text-xs text-muted-foreground text-center p-3 bg-muted/50 rounded-lg">
                  Tus Copper Credits se acumularán automáticamente cuando tengas fondos en custodia (0.015% diario).
                </p>
              )}
            </CardContent>
          </Card>

          {/* ========== SECTION 3: Estado de Cliente Protegido ========== */}
          <Card className={`border-border/50 ${isSubscribed ? "border-emerald-500/30 bg-emerald-500/[0.02]" : ""}`} data-testid="card-cliente-protegido">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Estado de Cliente Protegido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSubscribed ? (
                <>
                  <div className="flex items-center gap-4 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <div className="p-3 bg-emerald-500/20 rounded-full">
                      <ShieldCheck className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold text-emerald-400">Cliente Protegido</p>
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]" data-testid="badge-protegido">Verificado</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Tienes acceso a servicios técnicos de emergencia con precio preferencial.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { icon: Wrench, label: "Servicio técnico de emergencia", desc: "Gasfíter, electricista, cerrajero — 20% descuento", color: "text-blue-400" },
                      { icon: Phone, label: "Línea de atención prioritaria", desc: "Respuesta en menos de 2 horas", color: "text-purple-400" },
                      { icon: Shield, label: "Seguro de cumplimiento", desc: "Obra protegida ante incumplimiento del maestro", color: "text-emerald-400" },
                      { icon: Award, label: "Garantía extendida", desc: "12 meses de garantía post-obra", color: "text-[#c77b3f]" },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border/30">
                        <s.icon className={`w-4 h-4 ${s.color} shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{s.label}</p>
                          <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                        </div>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <div className="p-3 bg-muted/50 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">No eres Cliente Protegido aún</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Suscríbete a Hogar Seguro para acceder a servicios técnicos de emergencia con precio preferencial y más beneficios exclusivos.
                  </p>
                  <Badge className="bg-zinc-500/15 text-zinc-400 border-zinc-500/30 text-xs" data-testid="badge-no-protegido">
                    <Lock className="w-3 h-3 mr-1" /> Requiere suscripción
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ========== SECTION 4: Historial de Garantía ========== */}
          <Card className="border-border/50" data-testid="card-historial-garantia">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#c77b3f]" />
                Historial de Garantía
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Descarga certificados de tus obras pasadas. Estos documentos validan que tu propiedad fue construida bajo estándares de calidad certificados, lo que agrega valor comercial si decides vender.
              </p>

              {completedWallets.length > 0 ? (
                <div className="space-y-2">
                  {completedWallets.map(w => (
                    <div key={w.id} className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border/30" data-testid={`row-wallet-cert-${w.id}`}>
                      <div className="p-2 bg-[#c77b3f]/10 rounded-lg">
                        <FileText className="w-4 h-4 text-[#c77b3f]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{w.description || `Proyecto #${w.id}`}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>${(w.totalAmount ?? 0).toLocaleString("es-CL")}</span>
                          <span>·</span>
                          <span>{w.maestroName}</span>
                          <span>·</span>
                          <Badge className={
                            w.status === "COMPLETED"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px] px-1"
                              : "bg-blue-500/15 text-blue-400 border-blue-500/30 text-[9px] px-1"
                          }>
                            {w.status === "COMPLETED" ? "Completado" : w.status === "IN_PROGRESS" ? "En progreso" : "Asignado"}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 border-[#c77b3f]/30 text-[#c77b3f]"
                        onClick={() => {
                          window.open(`/api/certificate/${w.id}`, "_blank");
                        }}
                        data-testid={`button-download-cert-${w.id}`}
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        PDF
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="p-3 bg-muted/50 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">Sin certificados disponibles aún</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Cuando tengas proyectos con fondos en custodia podrás descargar certificados de resguardo aquí.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ========== SECTION 5: Muro de la Fama ========== */}
          <Card className="border-[#c77b3f]/20 lg:col-span-2" data-testid="card-muro-fama">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#c77b3f]" />
                Muro de la Fama — Maestros Elite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Encuentra los mejores maestros verificados. Filtra por especialidad, calificacion y ciudad para encontrar al profesional ideal para tu proyecto.
              </p>

              <div className="flex flex-col sm:flex-row gap-3" data-testid="panel-fama-filters">
                <div className="flex items-center gap-2 flex-1">
                  <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Select value={famaSpecialty} onValueChange={setFamaSpecialty}>
                    <SelectTrigger data-testid="select-fama-specialty">
                      <SelectValue placeholder="Especialidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las especialidades</SelectItem>
                      <SelectItem value="Gasfiter">Gasfiter</SelectItem>
                      <SelectItem value="Electricista">Electricista</SelectItem>
                      <SelectItem value="Albañil">Albanil</SelectItem>
                      <SelectItem value="Pintor">Pintor</SelectItem>
                      <SelectItem value="Carpintero">Carpintero</SelectItem>
                      <SelectItem value="Soldador">Soldador</SelectItem>
                      <SelectItem value="Ceramista">Ceramista</SelectItem>
                      <SelectItem value="Maestro General">Maestro General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <Star className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Select value={famaRating} onValueChange={setFamaRating}>
                    <SelectTrigger data-testid="select-fama-rating">
                      <SelectValue placeholder="Calificacion" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Todas las calificaciones</SelectItem>
                      <SelectItem value="3">3+ estrellas</SelectItem>
                      <SelectItem value="4">4+ estrellas</SelectItem>
                      <SelectItem value="4.5">4.5+ estrellas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Select value={famaCity} onValueChange={setFamaCity}>
                    <SelectTrigger data-testid="select-fama-city">
                      <SelectValue placeholder="Ciudad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Calama">Calama</SelectItem>
                      <SelectItem value="Antofagasta">Antofagasta</SelectItem>
                      <SelectItem value="Santiago">Santiago</SelectItem>
                      <SelectItem value="Valparaiso">Valparaiso</SelectItem>
                      <SelectItem value="Concepcion">Concepcion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {famaLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#c77b3f]" />
                </div>
              ) : (famaMaestros && famaMaestros.length > 0) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {famaMaestros.map(m => {
                    const rating = parseFloat(m.avgRating) || 0;
                    const fullStars = Math.floor(rating);
                    return (
                      <div
                        key={m.id}
                        className="p-4 bg-card rounded-xl border border-border/50 space-y-3 hover:border-[#c77b3f]/40 transition-colors"
                        data-testid={`card-maestro-${m.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#c77b3f]/30 to-[#c77b3f]/10 flex items-center justify-center shrink-0">
                            <Hammer className="w-6 h-6 text-[#c77b3f]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold truncate" data-testid={`text-maestro-name-${m.id}`}>{m.displayName}</p>
                              {m.kycVerified && (
                                <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[9px] px-1.5 shrink-0" data-testid={`badge-verified-${m.id}`}>
                                  <BadgeCheck className="w-3 h-3 mr-0.5" /> Identidad Verificada
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{m.specialty || "General"} · {m.city || "Calama"}</p>
                            <div className="flex items-center gap-1 mt-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${i < fullStars ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/20"}`}
                                />
                              ))}
                              <span className="text-xs font-mono text-muted-foreground ml-1">{rating.toFixed(1)}</span>
                              <span className="text-[10px] text-muted-foreground">({m.ratingCount})</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 flex items-center gap-2 p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/15">
                            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Obras Protegidas</p>
                              <p className="text-sm font-bold font-mono text-emerald-400" data-testid={`text-obras-${m.id}`}>{m.obrasProtegidas}</p>
                            </div>
                          </div>
                          <div className="flex-1 flex items-center gap-2 p-2 bg-[#c77b3f]/5 rounded-lg border border-[#c77b3f]/15">
                            <Award className="w-3.5 h-3.5 text-[#c77b3f] shrink-0" />
                            <div>
                              <p className="text-[10px] text-muted-foreground">Nivel</p>
                              <p className="text-sm font-bold text-[#c77b3f]">{m.level}</p>
                            </div>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          className="w-full bg-[#c77b3f] text-white"
                          onClick={() => {
                            toast({
                              title: "Solicitud enviada",
                              description: `Tu solicitud de presupuesto fue enviada a ${m.displayName}. Se vinculara al sistema de garantia Bitcopper.`,
                            });
                          }}
                          data-testid={`button-solicitar-${m.id}`}
                        >
                          <Shield className="w-3.5 h-3.5 mr-1.5" />
                          Solicitar Presupuesto Protegido
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="p-3 bg-muted/50 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
                    <Search className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground" data-testid="text-no-maestros">No se encontraron maestros con estos filtros</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Intenta ajustar los filtros de busqueda.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ========== TOKENIZATION SIMULATOR ========== */}
          <Card className="border-border/50 lg:col-span-2" data-testid="card-tokenization-simulator">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#c77b3f]" />
                Simulador de Tokenización
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Simula el rendimiento de tus fondos en custodia. El rendimiento de 0.015% diario (~5.5% anualizado) se acumula como Copper Credits.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor del proyecto</label>
                  <Input
                    type="number"
                    value={Number(fundAmount)}
                    onChange={(e) => setFundAmount(e.target.value)}
                    className="font-mono"
                    data-testid="input-sim-project-value"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tokens</label>
                  <Input
                    type="number"
                    value={tokenCount}
                    onChange={(e) => setTokenCount(Number(e.target.value))}
                    className="font-mono"
                    data-testid="input-sim-tokens"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plazo (meses)</label>
                  <Input
                    type="number"
                    value={termMonths}
                    onChange={(e) => setTermMonths(Number(e.target.value))}
                    className="font-mono"
                    data-testid="input-sim-term"
                  />
                </div>
              </div>

              <Button
                className="bg-[#c77b3f] hover:bg-[#b06a30] text-white"
                onClick={() => simulateMutation.mutate()}
                disabled={simulateMutation.isPending}
                data-testid="button-simulate"
              >
                {simulateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                Simular Rendimiento
              </Button>

              {simResult && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-card rounded-lg border border-border/50 text-center">
                      <p className="text-xs text-muted-foreground">Valor Token</p>
                      <p className="text-lg font-bold font-mono text-[#c77b3f]" data-testid="text-sim-token-value">
                        ${(simResult.tokenValue ?? 0).toLocaleString("es-CL")}
                      </p>
                    </div>
                    <div className="p-3 bg-card rounded-lg border border-border/50 text-center">
                      <p className="text-xs text-muted-foreground">Retorno Mensual</p>
                      <p className="text-lg font-bold font-mono text-emerald-400" data-testid="text-sim-monthly">
                        {(simResult.monthlyReturnPercent ?? 0).toFixed(2)}%
                      </p>
                    </div>
                    <div className="p-3 bg-card rounded-lg border border-border/50 text-center">
                      <p className="text-xs text-muted-foreground">Retorno Anualizado</p>
                      <p className="text-lg font-bold font-mono text-emerald-400" data-testid="text-sim-annual">
                        {(simResult.annualizedReturnPercent ?? 0).toFixed(2)}%
                      </p>
                    </div>
                    <div className="p-3 bg-card rounded-lg border border-border/50 text-center">
                      <p className="text-xs text-muted-foreground">Retorno Total</p>
                      <p className="text-lg font-bold font-mono text-[#c77b3f]" data-testid="text-sim-total-return">
                        ${(simResult.totalReturn ?? 0).toLocaleString("es-CL")}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-card rounded-lg border border-border/50">
                    <p className="text-sm font-medium mb-2">Proyección mensual</p>
                    <div className="space-y-1">
                      {(simResult.projectedReturns || []).map(r => {
                        const maxR = Math.max(...(simResult.projectedReturns || []).map(x => x.accumulated || x.value || 0));
                        const val = r.accumulated || r.value || 0;
                        return (
                          <div key={r.month} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-14 shrink-0">Mes {r.month}</span>
                            <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-[#c77b3f] to-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${maxR > 0 ? (val / maxR) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground w-20 text-right">
                              ${val.toLocaleString("es-CL")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
