import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, CheckCircle2, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const REFERRAL_STORAGE_KEY = "smartbuild_ref_code";
const REFERRAL_DISMISSED_KEY = "smartbuild_ref_dismissed";

export function captureReferralFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref) {
    localStorage.setItem(REFERRAL_STORAGE_KEY, ref.toUpperCase());
    const url = new URL(window.location.href);
    url.searchParams.delete("ref");
    window.history.replaceState({}, "", url.toString());
  }
}

export function ReferralCodePrompt() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const { data: referralStatus } = useQuery<{ hasReferral: boolean; code: string | null }>({
    queryKey: ["/api/referral/status"],
  });

  useEffect(() => {
    if (referralStatus?.hasReferral) return;
    const dismissed = sessionStorage.getItem(REFERRAL_DISMISSED_KEY);
    if (dismissed) return;

    const storedCode = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (storedCode) {
      setCode(storedCode);
      setOpen(true);
    }
  }, [referralStatus]);

  const applyMutation = useMutation({
    mutationFn: async (referralCode: string) => {
      const res = await apiRequest("POST", "/api/referral/apply", { code: referralCode });
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      queryClient.invalidateQueries({ queryKey: ["/api/referral/status"] });
      toast({
        title: "Código aplicado",
        description: `Bienvenido, fuiste referido por ${data.companyName}`,
      });
      setOpen(false);
    },
    onError: (err: any) => {
      setValidationMessage(err.message || "Código inválido");
    },
  });

  const handleApply = () => {
    if (!code.trim()) return;
    setValidationMessage(null);
    applyMutation.mutate(code.trim().toUpperCase());
  };

  const handleDismiss = () => {
    sessionStorage.setItem(REFERRAL_DISMISSED_KEY, "true");
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    setOpen(false);
  };

  if (referralStatus?.hasReferral) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c77b3f] to-[#e8a563] flex items-center justify-center">
            <Gift className="w-7 h-7 text-white" />
          </div>
          <DialogTitle>Código de Referido</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Ingresa tu código de referido para obtener beneficios extendidos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Input
              placeholder="Ej: PARTNER-ABC12"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setValidationMessage(null);
              }}
              className="font-mono text-center tracking-wider uppercase"
              data-testid="input-referral-code"
            />
            {validationMessage && (
              <p className="text-xs text-destructive text-center">{validationMessage}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleApply}
              disabled={!code.trim() || applyMutation.isPending}
              className="w-full bg-[#c77b3f] hover:bg-[#b06a30] text-white"
              data-testid="button-apply-referral"
            >
              {applyMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Aplicar Código
            </Button>
            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={handleDismiss}
              data-testid="button-dismiss-referral"
            >
              No tengo código
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
