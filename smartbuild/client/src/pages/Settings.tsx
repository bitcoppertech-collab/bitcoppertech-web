import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useCallback, useRef } from "react";
import { Building2, Upload, Trash2, Image, PenTool, Save, Loader2 } from "lucide-react";
import type { CompanySettings } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const firmaInputRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading } = useQuery<CompanySettings>({
    queryKey: ["/api/settings"],
  });

  const updateSettings = useMutation({
    mutationFn: async (data: { companyName: string; rut: string; address: string; contact: string; email: string; phone: string; defaultGGPercent: string; defaultUtilidadPercent: string }) => {
      const res = await apiRequest("PUT", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Configuración guardada", description: "Los datos de la empresa se actualizaron." });
    },
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/settings/logo", { method: "POST", body: formData });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Logo actualizado", description: "El logo se cargó correctamente." });
    },
  });

  const uploadFirma = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("firma", file);
      const res = await fetch("/api/settings/firma", { method: "POST", body: formData });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Firma actualizada", description: "La firma digital se cargó correctamente." });
    },
  });

  const deleteLogo = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/settings/logo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Logo eliminado" });
    },
  });

  const deleteFirma = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/settings/firma");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Firma eliminada" });
    },
  });

  const handleSave = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateSettings.mutate({
      companyName: formData.get("companyName") as string,
      rut: formData.get("rut") as string,
      address: formData.get("address") as string,
      contact: formData.get("contact") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      defaultGGPercent: formData.get("defaultGGPercent") as string,
      defaultUtilidadPercent: formData.get("defaultUtilidadPercent") as string,
    });
  }, [updateSettings]);

  const handleLogoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadLogo.mutate(file);
  }, [uploadLogo]);

  const handleFirmaChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFirma.mutate(file);
  }, [uploadFirma]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 md:ml-64 p-8 space-y-6">
          <Skeleton className="h-12 w-1/3 bg-card" />
          <Skeleton className="h-64 w-full bg-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground" data-testid="text-settings-title">Configuración</h1>
          <p className="text-muted-foreground mt-2">Datos de la empresa, logo y firma digital para los reportes PDF.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Datos de la Empresa
              </CardTitle>
              <CardDescription>Esta información aparecerá en el pie de página de todos los PDFs generados.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la Empresa</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    defaultValue={settings?.companyName || ""}
                    placeholder="SmartBuild SpA"
                    data-testid="input-company-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rut">RUT</Label>
                  <Input
                    id="rut"
                    name="rut"
                    defaultValue={settings?.rut || ""}
                    placeholder="76.XXX.XXX-X"
                    data-testid="input-rut"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={settings?.address || ""}
                    placeholder="Av. Providencia 1234, Santiago"
                    data-testid="input-address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={settings?.email || ""}
                    placeholder="contacto@empresa.cl"
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={settings?.phone || ""}
                    placeholder="+56 9 1234 5678"
                    data-testid="input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">Contacto / Dirección</Label>
                  <Input
                    id="contact"
                    name="contact"
                    defaultValue={settings?.contact || ""}
                    placeholder="Av. Providencia 1234, Santiago"
                    data-testid="input-contact"
                  />
                </div>

                <div className="border-t border-border pt-4 mt-4">
                  <h4 className="text-sm font-bold text-muted-foreground uppercase mb-3">Porcentajes por Defecto para Presupuestos</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="defaultGGPercent">% Gastos Generales (GG)</Label>
                      <Input
                        id="defaultGGPercent"
                        name="defaultGGPercent"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        defaultValue={settings?.defaultGGPercent || "15"}
                        placeholder="15"
                        data-testid="input-default-gg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="defaultUtilidadPercent">% Utilidad</Label>
                      <Input
                        id="defaultUtilidadPercent"
                        name="defaultUtilidadPercent"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        defaultValue={settings?.defaultUtilidadPercent || "10"}
                        placeholder="10"
                        data-testid="input-default-utilidad"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Estos valores se usan como referencia cuando un proyecto no tiene % definidos desde el Excel.</p>
                </div>

                <Button
                  type="submit"
                  disabled={updateSettings.isPending}
                  data-testid="button-save-settings"
                >
                  {updateSettings.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Guardar Datos
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-card border-border shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-primary" />
                  Logo de la Empresa
                </CardTitle>
                <CardDescription>Sube tu logo (PNG/JPG). Se mostrará en el encabezado de los PDFs.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border bg-secondary/30 flex items-center justify-center overflow-hidden" data-testid="preview-logo">
                    {settings?.logoBase64 ? (
                      <img src={settings.logoBase64} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <div className="text-center">
                        <Image className="w-8 h-8 mx-auto text-muted-foreground opacity-40" />
                        <span className="text-[10px] text-muted-foreground mt-1 block">logo.png</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleLogoChange}
                      data-testid="input-logo-file"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadLogo.isPending}
                      data-testid="button-upload-logo"
                    >
                      {uploadLogo.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      Subir Logo
                    </Button>
                    {settings?.logoBase64 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteLogo.mutate()}
                        disabled={deleteLogo.isPending}
                        data-testid="button-delete-logo"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="w-5 h-5 text-primary" />
                  Firma Digital
                </CardTitle>
                <CardDescription>Sube tu firma (PNG transparente recomendado). Se estampará automáticamente en los PDFs.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-40 h-20 rounded-xl border-2 border-dashed border-border bg-secondary/30 flex items-center justify-center overflow-hidden" data-testid="preview-firma">
                    {settings?.firmaBase64 ? (
                      <img src={settings.firmaBase64} alt="Firma" className="w-full h-full object-contain p-1" />
                    ) : (
                      <div className="text-center">
                        <PenTool className="w-6 h-6 mx-auto text-muted-foreground opacity-40" />
                        <span className="text-[10px] text-muted-foreground mt-1 block">firma.png</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={firmaInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleFirmaChange}
                      data-testid="input-firma-file"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => firmaInputRef.current?.click()}
                      disabled={uploadFirma.isPending}
                      data-testid="button-upload-firma"
                    >
                      {uploadFirma.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      Subir Firma
                    </Button>
                    {settings?.firmaBase64 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteFirma.mutate()}
                        disabled={deleteFirma.isPending}
                        data-testid="button-delete-firma"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
