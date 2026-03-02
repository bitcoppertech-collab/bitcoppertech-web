import { useState } from "react";
import { useRoute, useSearch, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Star,
  CheckCircle2,
  Loader2,
  Hammer,
  AlertCircle,
  Clock,
  PartyPopper,
  BadgeCheck,
  Shield,
  Flame,
  Gift,
  Share2,
  Phone,
  Mail,
  User,
  Copy,
  ShoppingCart,
  ArrowRight,
  Sparkles,
  Crown,
  Store,
  Percent,
  MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import bitcoperLogo from "@/assets/images/bitcoper-logo.png";

interface DocumentStatus {
  label: string;
  status: "verified" | "pending" | "none";
}

interface TokenInfo {
  projectDescription: string;
  maestroName: string;
  maestroSpecialty: string | null;
  kycVerified: boolean;
  documentStatus: DocumentStatus[];
  hasActiveBadge: boolean;
}

interface ReviewResponse {
  success: boolean;
  message: string;
  couponCode?: string;
  clientLeadId?: number;
  maestroName?: string;
  maestroLevel?: string;
  maestroRating?: string;
  maestroRatingCount?: number;
  maestroSpecialty?: string;
  maestroId?: number;
}

export default function RateMaestro() {
  const [, params] = useRoute("/rate/:token");
  const token = params?.token || "";
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const refParam = urlParams.get("ref") || "";
  const [, navigate] = useLocation();

  const [stars, setStars] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [comment, setComment] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery<TokenInfo>({
    queryKey: ["/api/review", token],
    queryFn: async () => {
      const res = await fetch(`/api/review/${token}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Enlace inválido");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/review/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stars,
          comment: comment || undefined,
          clientName,
          clientPhone,
          clientEmail,
          referralCode: refParam || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al enviar");
      }
      return res.json();
    },
    onSuccess: (data: ReviewResponse) => {
      setSubmitted(true);
      setReviewResult(data);
    },
  });

  const goToPersonalizedStore = () => {
    const params = new URLSearchParams();
    if (reviewResult?.clientLeadId) params.set("ref", reviewResult.clientLeadId.toString());
    if (reviewResult?.maestroId) params.set("maestro", reviewResult.maestroId.toString());
    if (reviewResult?.maestroName) params.set("maestroName", reviewResult.maestroName);
    if (reviewResult?.maestroLevel) params.set("level", reviewResult.maestroLevel);
    if (reviewResult?.couponCode) params.set("coupon", reviewResult.couponCode);
    navigate(`/marketplace?${params.toString()}`);
  };

  const shareWhatsApp = () => {
    if (reviewResult?.clientLeadId) {
      const link = `${window.location.origin}/marketplace?ref=${reviewResult.clientLeadId}`;
      const maestroName = reviewResult.maestroName || "un Maestro";
      const text = `¡Acabo de calificar a ${maestroName} en SmartBuild! 🏗️ Tiene precios mayoristas en materiales de construcción. Usa mi enlace y ambos ganamos $5.000 en créditos: ${link}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const copyReferralLink = () => {
    if (reviewResult?.clientLeadId) {
      const link = `${window.location.origin}/marketplace?ref=${reviewResult.clientLeadId}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const errorMessage = error instanceof Error ? error.message : null;
  const isUsed = errorMessage?.includes("utilizado");
  const isExpired = errorMessage?.includes("expirado");
  const isFormValid = stars > 0 && clientName.trim() && clientPhone.trim().length >= 8 && clientEmail.includes("@");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f1729] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#c77b3f]" />
          <p className="text-sm text-zinc-400">Validando enlace...</p>
        </div>
      </div>
    );
  }

  if (submitted && reviewResult) {
    const levelBadgeColor = reviewResult.maestroLevel === "Master"
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : reviewResult.maestroLevel === "Experto"
        ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
        : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";

    return (
      <div className="min-h-screen bg-[#0f1729] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Card className="bg-[#1a2744] border-emerald-500/20">
            <CardContent className="p-6 text-center space-y-3">
              <div className="mx-auto mb-2 w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <PartyPopper className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-white" data-testid="text-review-success">¡Calificación Enviada!</h2>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={`w-5 h-5 ${i <= stars ? "fill-amber-400 text-amber-400" : "text-zinc-600"}`} />
                ))}
              </div>

              {reviewResult.couponCode && (
                <div className="p-3 bg-gradient-to-r from-emerald-500/10 to-[#c77b3f]/10 rounded-xl border border-emerald-500/20" data-testid="card-coupon">
                  <Gift className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                  <p className="text-xs text-emerald-400 font-medium">Tu Cupón de Bienvenida</p>
                  <p className="text-xl font-bold text-white mt-1 font-mono tracking-wider" data-testid="text-coupon-code">{reviewResult.couponCode}</p>
                  <p className="text-[10px] text-zinc-400 mt-1">10% de descuento en tu primera compra</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2744] to-[#1f3058] border-[#c77b3f]/30 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#c77b3f]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-6 space-y-4 relative" data-testid="section-tienda-oportunidades">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#c77b3f]/10 flex items-center justify-center shrink-0">
                  <Store className="w-6 h-6 text-[#c77b3f]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Tienda de Oportunidades
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </h3>
                  <p className="text-xs text-zinc-400">Precios exclusivos para ti</p>
                </div>
              </div>

              <div className="p-3 bg-[#0f1729]/60 rounded-xl border border-zinc-700/30 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#c77b3f]/10 flex items-center justify-center">
                    <Hammer className="w-4 h-4 text-[#c77b3f]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{reviewResult.maestroName || "Tu Maestro"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {reviewResult.maestroRating && (
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs text-amber-400">{Number(reviewResult.maestroRating).toFixed(1)}</span>
                        </div>
                      )}
                      <Badge className={`text-[9px] ${levelBadgeColor}`}>
                        <Crown className="w-2.5 h-2.5 mr-0.5" />
                        {reviewResult.maestroLevel || "Novato"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-emerald-400 leading-relaxed">
                  Tu maestro <strong>{reviewResult.maestroName}</strong> tiene calificación de <strong>{reviewResult.maestroLevel || "experto"}</strong>. Por ser su cliente, tienes acceso a <strong>precios mayoristas</strong> en nuestras ferreterías aliadas.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-[#0f1729]/40 rounded-lg">
                  <p className="text-lg font-bold text-[#c77b3f]">35+</p>
                  <p className="text-[9px] text-zinc-400">Productos</p>
                </div>
                <div className="p-2 bg-[#0f1729]/40 rounded-lg">
                  <p className="text-lg font-bold text-emerald-400">-15%</p>
                  <p className="text-[9px] text-zinc-400">vs Retail</p>
                </div>
                <div className="p-2 bg-[#0f1729]/40 rounded-lg">
                  <p className="text-lg font-bold text-blue-400">2</p>
                  <p className="text-[9px] text-zinc-400">Ferreterías</p>
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-[#c77b3f] to-[#e8a563] hover:from-[#b06a30] hover:to-[#c77b3f] text-white font-medium h-12 text-base"
                onClick={goToPersonalizedStore}
                data-testid="button-go-tienda"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Ver Materiales con Descuento
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-[#1a2744] border-green-500/20">
            <CardContent className="p-5 space-y-3" data-testid="section-referral-viral">
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <Share2 className="w-5 h-5 text-green-400" />
                  <h3 className="text-base font-bold text-white">Recomienda y Gana</h3>
                </div>
                <p className="text-sm text-emerald-400 font-medium">$5.000 en materiales para ti y tu vecino</p>
              </div>

              <p className="text-xs text-zinc-400 text-center leading-relaxed">
                Comparte tu enlace con vecinos. Cuando se registren o compren materiales, ambos reciben <strong className="text-white">$5.000 de crédito</strong> para usar en la tienda.
              </p>

              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium h-12 text-base"
                onClick={shareWhatsApp}
                data-testid="button-whatsapp-share"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Recomienda a este Maestro y Gana $5.000
              </Button>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-zinc-600 text-zinc-300 hover:bg-zinc-700 text-xs"
                  onClick={copyReferralLink}
                  data-testid="button-copy-referral"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  {copied ? "¡Copiado!" : "Copiar Enlace"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-zinc-600 text-zinc-300 hover:bg-zinc-700 text-xs"
                  onClick={() => navigate("/mi-cuenta")}
                  data-testid="button-go-mi-cuenta"
                >
                  <User className="w-3 h-3 mr-1" />
                  Mi Cuenta
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[#0f1729] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#1a2744] border-red-500/20">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
              {isUsed ? <CheckCircle2 className="w-8 h-8 text-zinc-400" /> :
               isExpired ? <Clock className="w-8 h-8 text-zinc-400" /> :
               <AlertCircle className="w-8 h-8 text-red-400" />}
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {isUsed ? "Ya Calificado" : isExpired ? "Enlace Expirado" : "Enlace Inválido"}
            </h2>
            <p className="text-sm text-zinc-400">{errorMessage}</p>
            <Button
              className="mt-4 bg-[#c77b3f] hover:bg-[#b06a30] text-white"
              onClick={() => navigate("/marketplace")}
              data-testid="button-go-marketplace-error"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Ir al Marketplace
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#0f1729] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#1a2744] border-[#c77b3f]/20">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={bitcoperLogo} alt="SmartBuild" className="w-8 h-8 rounded-lg" />
            <span className="text-sm font-medium text-zinc-400">SmartBuild</span>
          </div>
          <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-[#c77b3f]/10 flex items-center justify-center">
            <Hammer className="w-7 h-7 text-[#c77b3f]" />
          </div>
          <CardTitle className="text-white">Califica el Servicio</CardTitle>
          <div className="mt-3 space-y-2">
            <p className="text-sm text-zinc-300 font-medium">{data.maestroName}</p>
            {data.maestroSpecialty && (
              <p className="text-xs text-zinc-500">{data.maestroSpecialty}</p>
            )}

            {data.documentStatus && data.documentStatus.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mt-2" data-testid="section-qr-doc-status">
                {data.documentStatus.map((doc, idx) => (
                  <Badge
                    key={idx}
                    className={`text-[10px] ${doc.status === "verified" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"}`}
                    data-testid={`badge-qr-doc-${idx}`}
                  >
                    {doc.status === "verified" ? <BadgeCheck className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                    {doc.label}
                  </Badge>
                ))}
              </div>
            )}

            {data.hasActiveBadge && (
              <div className="flex justify-center mt-1">
                <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[10px]" data-testid="badge-qr-active">
                  <Flame className="w-3 h-3 mr-1" />
                  Trabajador Activo
                </Badge>
              </div>
            )}

            {data.kycVerified && (
              <div className="flex justify-center mt-1">
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]" data-testid="badge-qr-verified">
                  <Shield className="w-3 h-3 mr-1" />
                  Identidad Verificada
                </Badge>
              </div>
            )}

            <p className="text-xs text-zinc-400 mt-2 bg-[#0f1729] rounded-lg p-2">
              {data.projectDescription}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="text-center">
            <p className="text-sm text-zinc-400 mb-3">¿Cómo fue tu experiencia?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  onMouseEnter={() => setHoverStar(i)}
                  onMouseLeave={() => setHoverStar(0)}
                  onClick={() => setStars(i)}
                  className="transition-transform hover:scale-110 active:scale-95"
                  data-testid={`star-${i}`}
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      i <= (hoverStar || stars)
                        ? "fill-amber-400 text-amber-400"
                        : "text-zinc-600 hover:text-zinc-500"
                    }`}
                  />
                </button>
              ))}
            </div>
            {stars > 0 && (
              <p className="text-xs text-amber-400 mt-2">
                {stars === 5 ? "¡Excelente!" : stars === 4 ? "Muy Bueno" : stars === 3 ? "Regular" : stars === 2 ? "Malo" : "Muy Malo"}
              </p>
            )}
          </div>

          <div className="space-y-3 p-3 bg-[#0f1729] rounded-xl border border-zinc-700/50">
            <p className="text-xs text-[#c77b3f] font-medium flex items-center gap-1">
              <Gift className="w-3 h-3" />
              Regístrate y recibe cupón 10% + acceso a precios mayoristas
            </p>
            <div className="space-y-2">
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Tu nombre completo *" className="bg-[#1a2744] border-zinc-700 text-white pl-9" data-testid="input-client-name" />
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Teléfono (ej: +56912345678) *" className="bg-[#1a2744] border-zinc-700 text-white pl-9" data-testid="input-client-phone" />
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Correo electrónico *" type="email" className="bg-[#1a2744] border-zinc-700 text-white pl-9" data-testid="input-client-email" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-400">Reseña (opcional)</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Cuéntanos cómo fue tu experiencia..." rows={3} className="bg-[#0f1729] border-zinc-700 text-white" data-testid="input-review-comment" />
          </div>

          {submitMutation.error && (
            <p className="text-xs text-red-400 text-center">
              {submitMutation.error instanceof Error ? submitMutation.error.message : "Error al enviar"}
            </p>
          )}

          <Button
            className="w-full bg-gradient-to-r from-[#c77b3f] to-[#e8a563] hover:from-[#b06a30] hover:to-[#c77b3f] text-white font-medium"
            onClick={() => submitMutation.mutate()}
            disabled={!isFormValid || submitMutation.isPending}
            data-testid="button-submit-review"
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Enviar Calificación y Registrarme
          </Button>

          <p className="text-[10px] text-zinc-600 text-center">
            Al enviar, aceptas recibir tu cupón de descuento, acceso a precios mayoristas y notificaciones de ofertas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
