import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Search, Store, CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface CouponValidation {
  valid: boolean;
  error?: string;
  usedAt?: string;
  coupon?: {
    code: string;
    storeName: string;
    discountPercent: number;
    clientName: string;
    createdAt: string;
  };
}

export default function ValidarCupon() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<CouponValidation | null>(null);

  const validateMutation = useMutation({
    mutationFn: async (couponCode: string) => {
      const res = await fetch(`/api/ferreteria-coupons/validate/${encodeURIComponent(couponCode.trim().toUpperCase())}`, {
        credentials: "include",
      });
      return res.json() as Promise<CouponValidation>;
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: () => {
      setResult({ valid: false, error: "Error de conexión. Intente nuevamente." });
    },
  });

  const markUsedMutation = useMutation({
    mutationFn: async (couponCode: string) => {
      const res = await apiRequest("POST", `/api/ferreteria-coupons/use/${encodeURIComponent(couponCode)}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Cupón marcado como usado", description: "El descuento ha sido aplicado exitosamente" });
      setResult(prev => prev ? { ...prev, valid: false, error: "Este cupón ya fue utilizado" } : null);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo marcar el cupón", variant: "destructive" });
    },
  });

  const handleValidate = () => {
    if (!code.trim()) return;
    setResult(null);
    validateMutation.mutate(code);
  };

  return (
    <div className="min-h-screen bg-[#0a1628] flex flex-col">
      <div className="p-4 flex items-center gap-3 border-b border-zinc-800">
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-400"
          onClick={() => navigate("/")}
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-[#c77b3f]" />
          <h1 className="text-white font-bold text-lg">Validar Cupón Ferretería</h1>
        </div>
        <Badge className="bg-[#c77b3f]/15 text-[#c77b3f] border-[#c77b3f]/30 text-[10px] ml-auto">
          Bitcopper Network
        </Badge>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-md mx-auto w-full">
        <Card className="w-full bg-gradient-to-br from-[#1a2744] to-[#1f3058] border-[#c77b3f]/30">
          <CardHeader className="text-center pb-3">
            <div className="w-16 h-16 rounded-2xl bg-[#c77b3f]/15 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-8 h-8 text-[#c77b3f]" />
            </div>
            <CardTitle className="text-white text-xl">Verificación de Cupón</CardTitle>
            <p className="text-xs text-zinc-400 mt-1">Ingresa el código que el cliente muestra en su celular</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (result) setResult(null);
                }}
                placeholder="BTC-XXXXXXXX"
                className="bg-[#0f1729] border-zinc-700 text-white text-center text-lg tracking-widest font-mono uppercase"
                onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                data-testid="input-coupon-code"
              />
              <Button
                onClick={handleValidate}
                disabled={!code.trim() || validateMutation.isPending}
                className="bg-[#c77b3f] hover:bg-[#b06a30] text-white px-6"
                data-testid="button-validate-coupon"
              >
                {validateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>

            {result && result.valid && result.coupon && (
              <div className="p-5 bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 rounded-xl border-2 border-emerald-500/50 space-y-4" data-testid="result-coupon-valid">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
                  <h3 className="text-lg font-black text-emerald-400">CUPÓN VÁLIDO</h3>
                  <p className="text-white text-sm font-semibold mt-1">
                    Cliente Protegido Bitcopper
                  </p>
                </div>

                <div className="bg-[#0f1729]/60 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Cliente</span>
                    <span className="text-sm text-white font-medium" data-testid="text-client-name">{result.coupon.clientName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Ferretería</span>
                    <span className="text-sm text-white font-medium" data-testid="text-store-name">{result.coupon.storeName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Código</span>
                    <span className="text-sm text-white font-mono tracking-wider" data-testid="text-coupon-code">{result.coupon.code}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Generado</span>
                    <span className="text-xs text-zinc-300">{new Date(result.coupon.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>

                <div className="text-center p-4 bg-emerald-500/15 rounded-xl border border-emerald-500/30">
                  <p className="text-2xl font-black text-emerald-400" data-testid="text-discount-percent">
                    Aplicar {result.coupon.discountPercent}% Dcto
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">Descuento validado por Red Bitcopper</p>
                </div>

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3"
                  onClick={() => markUsedMutation.mutate(result.coupon!.code)}
                  disabled={markUsedMutation.isPending}
                  data-testid="button-mark-used"
                >
                  {markUsedMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Confirmar Descuento Aplicado
                </Button>
              </div>
            )}

            {result && !result.valid && (
              <div className="p-5 bg-gradient-to-br from-red-900/30 to-red-800/15 rounded-xl border-2 border-red-500/40 text-center space-y-2" data-testid="result-coupon-invalid">
                <XCircle className="w-12 h-12 text-red-400 mx-auto" />
                <h3 className="text-lg font-bold text-red-400">CUPÓN NO VÁLIDO</h3>
                <p className="text-sm text-zinc-300">{result.error}</p>
                {result.usedAt && (
                  <p className="text-xs text-zinc-500">
                    Usado el: {new Date(result.usedAt).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-[10px] text-zinc-600 mt-4 text-center">
          Red Bitcopper - Sistema de Validación de Cupones v1.0
        </p>
      </div>
    </div>
  );
}
