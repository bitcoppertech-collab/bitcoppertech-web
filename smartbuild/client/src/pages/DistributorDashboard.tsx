import { Sidebar } from "@/components/Sidebar";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Users,
  Copy,
  CheckCircle2,
  Store,
  Gift,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface DistributorData {
  isDistributor: boolean;
  code: string;
  companyName: string;
  contactName: string;
  referralCount: number;
  isActive: boolean;
  createdAt: string;
}

export default function DistributorDashboard() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery<DistributorData>({
    queryKey: ["/api/distributor/dashboard"],
  });

  const copyCode = () => {
    if (!data?.code) return;
    navigator.clipboard.writeText(data.code);
    setCopied(true);
    toast({ title: "Copiado", description: "Código copiado al portapapeles" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8 flex items-center justify-center">
          <Skeleton className="h-32 w-64 rounded-xl" />
        </main>
      </div>
    );
  }

  if (!data?.isDistributor) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8 flex items-center justify-center">
          <Card className="max-w-md w-full border-destructive/30">
            <CardContent className="p-8 text-center">
              <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-destructive/60" />
              <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
              <p className="text-muted-foreground text-sm">
                No tienes acceso de distribuidor. Si eres un partner, contacta al administrador.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#c77b3f]/10 rounded-xl">
              <Store className="w-6 h-6 text-[#c77b3f]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-distributor-title">
                Panel de Distribuidor
              </h1>
              <p className="text-sm text-muted-foreground">{data.companyName}</p>
            </div>
          </div>
          <Badge
            className={data.isActive
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "bg-red-500/15 text-red-400 border-red-500/30"
            }
            data-testid="badge-distributor-status"
          >
            {data.isActive ? "Activo" : "Inactivo"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-[#c77b3f]/20 bg-gradient-to-br from-[#c77b3f]/5 to-transparent" data-testid="card-referral-code">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gift className="w-5 h-5 text-[#c77b3f]" />
                Tu Código de Descuento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Comparte este código con tus clientes. Cuando lo usen al registrarse, quedarán vinculados a tu cuenta.
              </p>
              <div className="flex items-center gap-3">
                <Input
                  readOnly
                  value={data.code}
                  className="font-mono text-xl font-bold tracking-wider text-center bg-background border-2 border-[#c77b3f]/30"
                  data-testid="input-partner-code"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 border-[#c77b3f]/30 hover:bg-[#c77b3f]/10"
                  onClick={copyCode}
                  data-testid="button-copy-code"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent" data-testid="card-referral-count">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-blue-500" />
                Clientes Referidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Total de usuarios que se han registrado usando tu código.
              </p>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <span className="text-4xl font-bold font-mono text-blue-400" data-testid="text-referral-count">
                    {data.referralCount}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {data.referralCount === 0
                      ? "Aún no tienes referidos"
                      : data.referralCount === 1
                      ? "1 cliente referido"
                      : `${data.referralCount} clientes referidos`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.referralCount > 0
                      ? "Sigue compartiendo tu código para crecer"
                      : "Comparte tu código para empezar"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border" data-testid="card-how-it-works">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              ¿Cómo funciona?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#c77b3f]/10 flex items-center justify-center text-sm font-bold text-[#c77b3f] shrink-0">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium">Comparte tu código</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Entrega tu código PARTNER a tus clientes de ferretería o contactos del rubro.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-sm font-bold text-blue-500 shrink-0">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium">Ellos se registran</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Al ingresar a SmartBuild, escriben tu código y obtienen acceso extendido al plan Demo.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-sm font-bold text-emerald-500 shrink-0">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium">Tú ganas comisiones</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cada referido queda vinculado a tu cuenta. Bitcopper te contactará para coordinar beneficios.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
