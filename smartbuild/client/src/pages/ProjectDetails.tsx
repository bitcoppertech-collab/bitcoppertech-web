import { useRoute } from "wouter";
import { useProject, useUploadBudget, useAnalyzeProject, useProjectFinancials, useSyncPrices, useUpdateProject } from "@/hooks/use-projects";
import { useBudgetItems, useUpdateBudgetItem } from "@/hooks/use-items";
import { Sidebar } from "@/components/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Upload, 
  FileSpreadsheet, 
  BrainCircuit, 
  ShoppingCart, 
  AlertCircle,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  DollarSign,
  AlertTriangle,
  Download,
  RefreshCw,
  Store,
  Tag,
  PackageCheck
} from "lucide-react";
import { Link } from "wouter";
import { useCallback, useState, useEffect, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { exportPresupuestoPDF, exportAPUDetailPDF, exportGanttPDF, type PDFSettings } from "@/lib/pdf-export";
import { useQuery } from "@tanstack/react-query";
import type { CompanySettings } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

function formatCLP(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CL");
}

function EditablePrice({ value, itemId, quantity, onSave }: { value: number; itemId: number; quantity: number; onSave: (price: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (editing) {
    return (
      <input
        type="number"
        className="w-28 bg-secondary border border-border rounded px-2 py-1 text-right font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        value={draft}
        autoFocus
        data-testid={`input-price-${itemId}`}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const parsed = parseFloat(draft);
          if (!isNaN(parsed) && parsed >= 0 && parsed !== value) {
            onSave(parsed);
          }
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          } else if (e.key === "Escape") {
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      className={cn(
        "font-mono text-sm cursor-pointer hover:bg-secondary/50 px-2 py-1 rounded transition-colors text-right w-full",
        value > 0 ? "text-foreground" : "text-muted-foreground italic"
      )}
      onClick={() => {
        setDraft(value > 0 ? value.toString() : "");
        setEditing(true);
      }}
      title="Haz clic para editar el precio"
      data-testid={`button-edit-price-${itemId}`}
    >
      {value > 0 ? formatCLP(value) : "Ingresar..."}
    </button>
  );
}

export default function ProjectDetails() {
  const [, params] = useRoute("/projects/:id");
  const id = parseInt(params?.id || "0");
  
  const { data: project, isLoading: loadingProject } = useProject(id);
  const { data: items, isLoading: loadingItems, refetch: refetchItems } = useBudgetItems(id);
  const { data: financials, isLoading: loadingFinancials } = useProjectFinancials(id);
  const { data: companySettings } = useQuery<CompanySettings>({ queryKey: ["/api/settings"] });

  const pdfSettings: PDFSettings = {
    companyName: companySettings?.companyName,
    rut: companySettings?.rut,
    address: companySettings?.address,
    contact: companySettings?.contact,
    email: companySettings?.email,
    phone: companySettings?.phone,
    logoBase64: companySettings?.logoBase64,
    firmaBase64: companySettings?.firmaBase64,
  };
  
  const uploadBudget = useUploadBudget();
  const analyzeProject = useAnalyzeProject();
  const syncPrices = useSyncPrices();
  const updateItem = useUpdateBudgetItem(id);
  const updateProject = useUpdateProject();

  const { toast } = useToast();
  const [localGG, setLocalGG] = useState<number | null>(null);
  const [localUtil, setLocalUtil] = useState<number | null>(null);
  const [percentsDirty, setPercentsDirty] = useState(false);

  useEffect(() => {
    if (project && localGG === null && localUtil === null) {
      const projectGG = Number(project.gastosGeneralesPercent || 0);
      const projectUtil = Number(project.utilidadPercent || 0);
      const settingsGG = Number(companySettings?.defaultGGPercent || 15);
      const settingsUtil = Number(companySettings?.defaultUtilidadPercent || 10);
      setLocalGG(projectGG > 0 ? projectGG : settingsGG);
      setLocalUtil(projectUtil > 0 ? projectUtil : settingsUtil);
    }
  }, [project, companySettings, localGG, localUtil]);

  const effectiveGG = localGG ?? Number(project?.gastosGeneralesPercent || companySettings?.defaultGGPercent || 15);
  const effectiveUtil = localUtil ?? Number(project?.utilidadPercent || companySettings?.defaultUtilidadPercent || 10);

  const localFinancials = useMemo(() => {
    if (!financials) return null;
    const excelNeto = financials.excel.netoMateriales;
    const realNeto = financials.real.netoMateriales;
    const ivaPercent = financials.excel.ivaPercent;

    const excelGG = Math.round(excelNeto * (effectiveGG / 100));
    const excelUtilAmt = Math.round(excelNeto * (effectiveUtil / 100));
    const excelSub = excelNeto + excelGG + excelUtilAmt;
    const excelIVA = Math.round(excelSub * (ivaPercent / 100));
    const excelTotal = excelSub + excelIVA;

    const realGG = Math.round(realNeto * (effectiveGG / 100));
    const realUtilAmt = Math.round(realNeto * (effectiveUtil / 100));
    const realSub = realNeto + realGG + realUtilAmt;
    const realIVA = Math.round(realSub * (ivaPercent / 100));
    const realTotal = realSub + realIVA;

    const materialSavings = excelNeto - realNeto;
    const effectiveUtilAmount = excelUtilAmt + materialSavings;
    let utilidadRealPercent = effectiveUtil;
    if (excelNeto > 0 && financials.hasAnalysis) {
      utilidadRealPercent = Math.round((effectiveUtilAmount / excelNeto) * 10000) / 100;
    }
    const deltaAmount = financials.hasAnalysis ? Math.round(effectiveUtilAmount - excelUtilAmt) : 0;
    const deltaPercent = financials.hasAnalysis ? Math.round((utilidadRealPercent - effectiveUtil) * 100) / 100 : 0;
    let status: 'favorable' | 'riesgo' | 'neutro' = 'neutro';
    if (deltaPercent > 0.5) status = 'favorable';
    else if (deltaPercent < -0.5) status = 'riesgo';

    return {
      excel: { ...financials.excel, gastosGeneralesPercent: effectiveGG, gastosGeneralesAmount: excelGG, utilidadPercent: effectiveUtil, utilidadAmount: excelUtilAmt, ivaAmount: excelIVA, total: excelTotal },
      real: { ...financials.real, gastosGeneralesPercent: effectiveGG, gastosGeneralesAmount: realGG, utilidadPercent: effectiveUtil, utilidadAmount: realUtilAmt, ivaAmount: realIVA, total: realTotal },
      margenManiobra: { deltaAmount, deltaPercent, status, utilidadRealPercent },
      hasAnalysis: financials.hasAnalysis,
    };
  }, [financials, effectiveGG, effectiveUtil]);

  const saveProjectPercents = useCallback(() => {
    updateProject.mutate(
      { id, updates: { gastosGeneralesPercent: effectiveGG.toString(), utilidadPercent: effectiveUtil.toString() } },
      {
        onSuccess: () => {
          setPercentsDirty(false);
          toast({ title: "Porcentajes guardados", description: `GG: ${effectiveGG}% | Utilidad: ${effectiveUtil}%` });
        },
        onError: () => {
          toast({ title: "Error", description: "No se pudieron guardar los porcentajes", variant: "destructive" });
        },
      }
    );
  }, [id, effectiveGG, effectiveUtil, updateProject, toast]);

  const [paymentMethod, setPaymentMethod] = useState<"contado" | "debito" | "credito" | "orden_compra">("contado");
  const [creditInstallments, setCreditInstallments] = useState<number>(1);
  const [cartSodimac, setCartSodimac] = useState<{ itemId: number; description: string; quantity: number; basePrice: number }[]>([]);
  const [cartEasy, setCartEasy] = useState<{ itemId: number; description: string; quantity: number; basePrice: number }[]>([]);

  const getCreditSurcharge = (installments: number): number => {
    if (paymentMethod !== "credito" || installments <= 1) return 0;
    if (installments <= 3) return 0.0299;
    if (installments <= 6) return 0.0499;
    if (installments <= 12) return 0.0799;
    return 0.1199;
  };

  const applyPaymentAdjustment = (price: number): number => {
    if (paymentMethod === "credito" && creditInstallments > 1) {
      return Math.round(price * (1 + getCreditSurcharge(creditInstallments)));
    }
    return price;
  };

  const addToCart = (store: "sodimac" | "easy", item: { id: number; description: string; quantity: string; sodimacPrice?: string | null; easyPrice?: string | null }) => {
    const price = store === "sodimac" ? Number(item.sodimacPrice || 0) : Number(item.easyPrice || 0);
    if (price <= 0) return;
    const qty = Number(item.quantity || 0);
    const entry = { itemId: item.id, description: item.description, quantity: qty, basePrice: price };
    if (store === "sodimac") {
      setCartSodimac(prev => {
        const exists = prev.find(c => c.itemId === item.id);
        if (exists) return prev.map(c => c.itemId === item.id ? entry : c);
        return [...prev, entry];
      });
    } else {
      setCartEasy(prev => {
        const exists = prev.find(c => c.itemId === item.id);
        if (exists) return prev.map(c => c.itemId === item.id ? entry : c);
        return [...prev, entry];
      });
    }
    toast({
      title: `Agregado a Carrito ${store === "sodimac" ? "Sodimac" : "Easy"}`,
      description: `${item.description} (x${qty}) — ${formatCLP(applyPaymentAdjustment(price) * qty)}`,
    });
  };

  const cartSodimacTotal = cartSodimac.reduce((sum, c) => sum + applyPaymentAdjustment(c.basePrice) * c.quantity, 0);
  const cartEasyTotal = cartEasy.reduce((sum, c) => sum + applyPaymentAdjustment(c.basePrice) * c.quantity, 0);


  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      uploadBudget.mutate({ id, file: acceptedFiles[0] }, {
        onSuccess: () => {
          refetchItems();
        },
        onError: () => {
          refetchItems();
        }
      });
    }
  }, [id, uploadBudget, refetchItems]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  if (loadingProject) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 p-8 space-y-8">
          <Skeleton className="h-12 w-1/3 bg-card" />
          <Skeleton className="h-64 w-full bg-card" />
        </div>
      </div>
    );
  }

  if (!project) return <div>Project not found</div>;

  const matchedItems = items?.filter(i => i.status === 'matched') || [];
  const hasAnalysisData = matchedItems.length > 0;

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        <div className="mb-8">
          <Link href="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" /> Volver a Proyectos
          </Link>
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold tracking-tight text-foreground" data-testid="text-project-name">{project.name}</h1>
                <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
                  {project.status}
                </Badge>
              </div>
              <p className="text-muted-foreground max-w-2xl">{project.description || "Sin descripción."}</p>
              
              <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                    {project.client ? project.client.charAt(0) : "?"}
                  </div>
                  <span>{project.client || "Sin Cliente"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Creado {project.createdAt ? format(new Date(project.createdAt), "dd MMM yyyy") : ""}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-4">
              <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <span className="text-sm font-medium text-muted-foreground">Presupuesto Total</span>
                <div className="text-3xl font-mono font-bold text-primary" data-testid="text-total-budget">
                  {formatCLP(Number(project.totalBudget))}
                </div>
                {project.totalCost && Number(project.totalCost) > 0 && (
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Costo Mercado Est.: </span>
                    <span className={cn(
                      "font-medium",
                      Number(project.totalCost) > Number(project.totalBudget) ? "text-rose-500" : "text-emerald-500"
                    )}>
                      {formatCLP(Number(project.totalCost))}
                    </span>
                  </div>
                )}
              </div>

              {(items?.length || 0) > 0 && (
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (items && financials) {
                        exportPresupuestoPDF(project.name, items, financials, pdfSettings);
                      }
                    }}
                    disabled={!items || !financials}
                    data-testid="button-download-presupuesto"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Presupuesto (PDF)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (items) {
                        exportAPUDetailPDF(project.name, items, pdfSettings);
                      }
                    }}
                    disabled={!items}
                    data-testid="button-download-apu"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    APU (PDF)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (items) {
                        exportGanttPDF(project.name, items, pdfSettings);
                      }
                    }}
                    disabled={!items}
                    data-testid="button-download-gantt"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Carta Gantt (PDF)
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="items" className="space-y-6">
          <TabsList className="bg-secondary p-1 h-auto rounded-lg inline-flex">
            <TabsTrigger value="items" className="px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Partidas
            </TabsTrigger>
            <TabsTrigger value="comparison" className="px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Comparación
            </TabsTrigger>
            <TabsTrigger value="analysis" className="px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all">
              <BrainCircuit className="w-4 h-4 mr-2" />
              APU Intelligence
            </TabsTrigger>
            <TabsTrigger value="gantt" className="px-6 py-2.5 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-md transition-all">
              <Calendar className="w-4 h-4 mr-2" />
              Cronograma
            </TabsTrigger>
          </TabsList>

          {/* Budget Items Tab */}
          <TabsContent value="items" className="space-y-6">
            <Card className="bg-card border-border shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
                <div>
                  <CardTitle>Desglose de Presupuesto</CardTitle>
                  <CardDescription>
                    {items?.length || 0} partidas cargadas desde Excel.
                    {project.lastPriceSync && (
                      <span className="ml-2 text-xs text-emerald-500">
                        Última sincronización: {format(new Date(project.lastPriceSync), "dd/MM/yyyy HH:mm")}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="default" 
                    onClick={() => syncPrices.mutate(id)}
                    disabled={syncPrices.isPending || (items?.length || 0) === 0}
                    className="text-white font-bold"
                    style={{ backgroundColor: 'rgb(217, 119, 6)' }}
                    data-testid="button-sync-prices"
                  >
                    {syncPrices.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sincronizar Precios de Mercado
                  </Button>
                  <Button 
                    variant="default" 
                    onClick={() => analyzeProject.mutate(id)}
                    disabled={analyzeProject.isPending || (items?.length || 0) === 0}
                    className="text-white"
                    style={{ backgroundColor: 'rgb(5, 150, 105)' }}
                    data-testid="button-analyze"
                  >
                    {analyzeProject.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <BrainCircuit className="w-4 h-4 mr-2" />
                    )}
                    Analizar
                  </Button>
                </div>
              </CardHeader>
              <div className="px-6 py-3 border-b border-border/50 bg-secondary/10">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Medio de Pago:</span>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
                    className="flex items-center gap-3"
                  >
                    {([
                      { value: "contado", label: "Contado / Transferencia" },
                      { value: "debito", label: "Débito" },
                      { value: "credito", label: "Tarjeta de Crédito" },
                      { value: "orden_compra", label: "Orden de Compra" },
                    ]).map(opt => (
                      <div key={opt.value} className="flex items-center gap-1.5">
                        <RadioGroupItem value={opt.value} id={`pm-${opt.value}`} data-testid={`radio-payment-${opt.value}`} />
                        <Label htmlFor={`pm-${opt.value}`} className={cn("text-xs cursor-pointer", paymentMethod === opt.value ? "text-primary font-medium" : "text-muted-foreground")}>
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {paymentMethod === "credito" && (
                    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border">
                      <span className="text-xs text-muted-foreground">Cuotas:</span>
                      <Select
                        value={String(creditInstallments)}
                        onValueChange={(v) => setCreditInstallments(Number(v))}
                      >
                        <SelectTrigger className="w-[180px] h-7 text-xs" data-testid="select-installments">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 (Sin recargo)</SelectItem>
                          <SelectItem value="3">3 cuotas (+2.99%)</SelectItem>
                          <SelectItem value="6">6 cuotas (+4.99%)</SelectItem>
                          <SelectItem value="12">12 cuotas (+7.99%)</SelectItem>
                          <SelectItem value="18">18 cuotas (+11.99%)</SelectItem>
                        </SelectContent>
                      </Select>
                      {creditInstallments > 1 && (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-xs">
                          Recargo: +{(getCreditSurcharge(creditInstallments) * 100).toFixed(2)}%
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                {(cartSodimac.length > 0 || cartEasy.length > 0) && (
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    {cartSodimac.length > 0 && (
                      <Badge variant="outline" className="text-orange-400 border-orange-500/30" data-testid="text-cart-sodimac">
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Carrito Sodimac: {cartSodimac.length} ítems — {formatCLP(cartSodimacTotal)}
                      </Badge>
                    )}
                    {cartEasy.length > 0 && (
                      <Badge variant="outline" className="text-blue-400 border-blue-500/30" data-testid="text-cart-easy">
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Carrito Easy: {cartEasy.length} ítems — {formatCLP(cartEasyTotal)}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <CardContent className="p-0">
                {(items?.length || 0) === 0 ? (
                  <div 
                    {...getRootProps()} 
                    data-testid="upload-dropzone"
                    className={cn(
                      "m-8 border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-colors cursor-pointer",
                      isDragActive 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50 hover:bg-secondary/30",
                      uploadBudget.isPending && "pointer-events-none opacity-70"
                    )}
                  >
                    <input {...getInputProps()} data-testid="upload-input" />
                    <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                      {uploadBudget.isPending ? (
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      ) : (
                        <Upload className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <h3 className="text-lg font-medium mb-1" data-testid="text-upload-status">
                      {uploadBudget.isPending ? "Procesando archivo..." : "Subir Presupuesto Excel"}
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-sm">
                      {uploadBudget.isPending 
                        ? "Leyendo columnas ITEM, DESCRIPCION, UNIDAD, CANTIDAD..."
                        : "Arrastra tu archivo Excel (.xlsx, .xls) o APU aquí para cargar las partidas automáticamente."
                      }
                    </p>
                    {uploadBudget.isPending && (
                      <div className="mt-4 flex items-center gap-2 text-primary">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-medium">Importando ítems al sistema...</span>
                      </div>
                    )}
                  </div>
                ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left" data-testid="table-budget-items">
                        <thead className="text-xs text-muted-foreground uppercase bg-secondary/50 font-medium">
                          <tr>
                            <th className="px-6 py-3">Descripción</th>
                            <th className="px-6 py-3 w-24 text-center">Unidad</th>
                            <th className="px-6 py-3 w-32 text-right">Cantidad</th>
                            <th className="px-6 py-3 w-40 text-right">P. Unitario</th>
                            <th className="px-6 py-3 w-40 text-right">Total</th>
                            <th className="px-6 py-3 w-24 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {items?.map((item) => {
                            const qty = Number(item.quantity || 0);
                            const up = Number(item.unitPrice || 0);
                            const computedTotal = qty * up;
                            return (
                              <tr key={item.id} className="hover:bg-secondary/20 transition-colors" data-testid={`row-item-${item.id}`}>
                                <td className="px-6 py-4 font-medium text-foreground">{item.description}</td>
                                <td className="px-6 py-4 text-center text-muted-foreground">{item.unit}</td>
                                <td className="px-6 py-4 text-right font-mono">{qty.toLocaleString("es-CL")}</td>
                                <td className="px-6 py-3 text-right">
                                  <EditablePrice
                                    value={up}
                                    itemId={item.id}
                                    quantity={qty}
                                    onSave={(newPrice) => {
                                      const newTotal = qty * newPrice;
                                      updateItem.mutate({
                                        id: item.id,
                                        updates: {
                                          unitPrice: newPrice.toString(),
                                          totalPrice: newTotal.toString(),
                                        },
                                      });
                                    }}
                                  />
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-medium">
                                  {computedTotal > 0 ? formatCLP(computedTotal) : '-'}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {item.status === 'matched' ? (
                                    <span className="inline-flex w-2 h-2 rounded-full bg-emerald-500" title="Vinculado" />
                                  ) : (
                                    <span className="inline-flex w-2 h-2 rounded-full bg-zinc-600" title="Pendiente" />
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                )}

                {/* Breakdown Footer — always visible for editing percentages */}
                <div className="border-t border-border bg-secondary/20 px-6 py-5" data-testid="section-breakdown">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold text-muted-foreground uppercase flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Desglose Proyectado
                          </h4>
                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">% GG:</span>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                className="w-16 bg-secondary border border-border rounded px-1.5 py-0.5 text-right font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                value={effectiveGG}
                                data-testid="input-gg-percent"
                                onChange={(e) => { setLocalGG(Math.max(0, Math.min(100, Number(e.target.value) || 0))); setPercentsDirty(true); }}
                              />
                              <span className="text-muted-foreground">%</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">% Utilidad:</span>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                className="w-16 bg-secondary border border-border rounded px-1.5 py-0.5 text-right font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                value={effectiveUtil}
                                data-testid="input-util-percent"
                                onChange={(e) => { setLocalUtil(Math.max(0, Math.min(100, Number(e.target.value) || 0))); setPercentsDirty(true); }}
                              />
                              <span className="text-muted-foreground">%</span>
                            </div>
                            <Button
                              size="sm"
                              variant={percentsDirty ? "default" : "outline"}
                              className="h-6 px-3 text-xs"
                              onClick={saveProjectPercents}
                              disabled={updateProject.isPending}
                              data-testid="button-save-percents"
                            >
                              {updateProject.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar"}
                            </Button>
                          </div>
                        </div>
                        {localFinancials && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Excel (Licitado) Column */}
                          <div className="space-y-3">
                            <h5 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Presupuesto Licitado (Excel)</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Costo Directo Neto</span>
                                <span className="font-mono font-medium" data-testid="text-excel-neto">{formatCLP(localFinancials.excel.netoMateriales)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Gastos Generales ({localFinancials.excel.gastosGeneralesPercent}%)</span>
                                <span className="font-mono" data-testid="text-excel-gg">{formatCLP(localFinancials.excel.gastosGeneralesAmount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Utilidad ({localFinancials.excel.utilidadPercent}%)</span>
                                <span className="font-mono" data-testid="text-excel-util">{formatCLP(localFinancials.excel.utilidadAmount)}</span>
                              </div>
                              <div className="flex justify-between border-t border-dashed border-border/50 pt-1">
                                <span className="text-muted-foreground text-xs italic">Subtotal Neto Facturable</span>
                                <span className="font-mono text-xs">{formatCLP(localFinancials.excel.netoMateriales + localFinancials.excel.gastosGeneralesAmount + localFinancials.excel.utilidadAmount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">IVA ({localFinancials.excel.ivaPercent}%)</span>
                                <span className="font-mono" data-testid="text-excel-iva">{formatCLP(localFinancials.excel.ivaAmount)}</span>
                              </div>
                              <div className="flex justify-between border-t border-border pt-2">
                                <span className="font-bold text-foreground">TOTAL PROYECTO</span>
                                <span className="font-mono font-bold text-primary" data-testid="text-excel-total">{formatCLP(localFinancials.excel.total)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Real (Live) Column */}
                          <div className="space-y-3">
                            <h5 className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Presupuesto Real (Live)</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Costo Directo Neto</span>
                                <span className="font-mono font-medium" data-testid="text-real-neto">{formatCLP(localFinancials.real.netoMateriales)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Gastos Generales ({localFinancials.real.gastosGeneralesPercent}%)</span>
                                <span className="font-mono" data-testid="text-real-gg">{formatCLP(localFinancials.real.gastosGeneralesAmount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Utilidad ({localFinancials.real.utilidadPercent}%)</span>
                                <span className="font-mono" data-testid="text-real-util">{formatCLP(localFinancials.real.utilidadAmount)}</span>
                              </div>
                              <div className="flex justify-between border-t border-dashed border-border/50 pt-1">
                                <span className="text-muted-foreground text-xs italic">Subtotal Neto Facturable</span>
                                <span className="font-mono text-xs">{formatCLP(localFinancials.real.netoMateriales + localFinancials.real.gastosGeneralesAmount + localFinancials.real.utilidadAmount)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">IVA ({localFinancials.real.ivaPercent}%)</span>
                                <span className="font-mono" data-testid="text-real-iva">{formatCLP(localFinancials.real.ivaAmount)}</span>
                              </div>
                              <div className="flex justify-between border-t border-border pt-2">
                                <span className="font-bold text-foreground">TOTAL PROYECTO</span>
                                <span className="font-mono font-bold text-emerald-500" data-testid="text-real-total">{formatCLP(localFinancials.real.total)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6">
            {localFinancials ? (
              <>
                {/* Margen de Maniobra Card */}
                <Card className={cn(
                  "border shadow-md",
                  localFinancials.margenManiobra.status === 'favorable' 
                    ? "bg-emerald-950/20 border-emerald-900/50"
                    : localFinancials.margenManiobra.status === 'riesgo'
                    ? "bg-rose-950/20 border-rose-900/50"
                    : "bg-card border-border"
                )} data-testid="card-margen-maniobra">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {localFinancials.margenManiobra.status === 'favorable' ? (
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                      ) : localFinancials.margenManiobra.status === 'riesgo' ? (
                        <TrendingDown className="w-5 h-5 text-rose-500" />
                      ) : (
                        <ArrowRightLeft className="w-5 h-5 text-muted-foreground" />
                      )}
                      Margen de Maniobra
                    </CardTitle>
                    <CardDescription>
                      {localFinancials.margenManiobra.status === 'favorable'
                        ? "Los precios de mercado son menores al presupuesto. Tu utilidad real sube."
                        : localFinancials.margenManiobra.status === 'riesgo'
                        ? "Los precios de mercado superan lo presupuestado. Se está consumiendo tu utilidad."
                        : localFinancials.hasAnalysis 
                        ? "Los precios están alineados con el presupuesto original."
                        : "Ejecuta el análisis para comparar precios de mercado con tu presupuesto."
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-secondary/30 rounded-xl">
                        <p className="text-xs text-muted-foreground uppercase mb-1">Utilidad Original</p>
                        <p className="text-2xl font-bold font-mono text-foreground" data-testid="text-util-original">
                          {localFinancials.excel.utilidadPercent}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{formatCLP(localFinancials.excel.utilidadAmount)}</p>
                      </div>
                      <div className="text-center p-4 bg-secondary/30 rounded-xl">
                        <p className="text-xs text-muted-foreground uppercase mb-1">Utilidad Real</p>
                        <p className={cn(
                          "text-2xl font-bold font-mono",
                          localFinancials.margenManiobra.utilidadRealPercent > localFinancials.excel.utilidadPercent ? "text-emerald-500" :
                          localFinancials.margenManiobra.utilidadRealPercent < localFinancials.excel.utilidadPercent ? "text-rose-500" :
                          "text-foreground"
                        )} data-testid="text-util-real">
                          {localFinancials.margenManiobra.utilidadRealPercent}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {localFinancials.margenManiobra.deltaPercent > 0 ? "+" : ""}{localFinancials.margenManiobra.deltaPercent}% vs original
                        </p>
                      </div>
                      <div className="text-center p-4 bg-secondary/30 rounded-xl">
                        <p className="text-xs text-muted-foreground uppercase mb-1">Diferencia Neta</p>
                        <p className={cn(
                          "text-2xl font-bold font-mono",
                          localFinancials.margenManiobra.deltaAmount > 0 ? "text-emerald-500" :
                          localFinancials.margenManiobra.deltaAmount < 0 ? "text-rose-500" :
                          "text-foreground"
                        )} data-testid="text-delta-amount">
                          {localFinancials.margenManiobra.deltaAmount > 0 ? "+" : ""}{formatCLP(localFinancials.margenManiobra.deltaAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">en tu margen de utilidad</p>
                      </div>
                    </div>

                    {localFinancials.margenManiobra.status === 'riesgo' && (
                      <div className="mt-4 p-3 bg-rose-500/10 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-rose-300">
                          Los materiales en el mercado cuestan más de lo presupuestado. Se está consumiendo {Math.abs(localFinancials.margenManiobra.deltaPercent)}% de tu utilidad original.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Side-by-side Comparison Table */}
                <Card className="bg-card border-border shadow-md" data-testid="card-comparison-table">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowRightLeft className="w-5 h-5 text-primary" />
                      Panel de Comparación Dinámico
                    </CardTitle>
                    <CardDescription>
                      Presupuesto licitado (Excel) vs. presupuesto real basado en precios Sodimac/Easy.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" data-testid="table-comparison">
                        <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                          <tr>
                            <th className="px-6 py-3 text-left">Concepto</th>
                            <th className="px-6 py-3 text-right">
                              <span className="text-amber-500">Licitado (Excel)</span>
                            </th>
                            <th className="px-6 py-3 text-right">
                              <span className="text-emerald-500">Real (Live)</span>
                            </th>
                            <th className="px-6 py-3 text-right">Diferencia</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          <tr className="hover:bg-secondary/20">
                            <td className="px-6 py-4 font-medium">Neto de Materiales</td>
                            <td className="px-6 py-4 text-right font-mono">{formatCLP(localFinancials.excel.netoMateriales)}</td>
                            <td className="px-6 py-4 text-right font-mono">{formatCLP(localFinancials.real.netoMateriales)}</td>
                            <td className={cn("px-6 py-4 text-right font-mono font-medium",
                              localFinancials.real.netoMateriales < localFinancials.excel.netoMateriales ? "text-emerald-500" :
                              localFinancials.real.netoMateriales > localFinancials.excel.netoMateriales ? "text-rose-500" : ""
                            )}>
                              {formatCLP(localFinancials.real.netoMateriales - localFinancials.excel.netoMateriales)}
                            </td>
                          </tr>
                          <tr className="hover:bg-secondary/20">
                            <td className="px-6 py-4 font-medium">Gastos Generales ({localFinancials.excel.gastosGeneralesPercent}%)</td>
                            <td className="px-6 py-4 text-right font-mono">{formatCLP(localFinancials.excel.gastosGeneralesAmount)}</td>
                            <td className="px-6 py-4 text-right font-mono">{formatCLP(localFinancials.real.gastosGeneralesAmount)}</td>
                            <td className={cn("px-6 py-4 text-right font-mono font-medium",
                              localFinancials.real.gastosGeneralesAmount < localFinancials.excel.gastosGeneralesAmount ? "text-emerald-500" :
                              localFinancials.real.gastosGeneralesAmount > localFinancials.excel.gastosGeneralesAmount ? "text-rose-500" : ""
                            )}>
                              {formatCLP(localFinancials.real.gastosGeneralesAmount - localFinancials.excel.gastosGeneralesAmount)}
                            </td>
                          </tr>
                          <tr className="hover:bg-secondary/20">
                            <td className="px-6 py-4 font-medium">Utilidad ({localFinancials.excel.utilidadPercent}%)</td>
                            <td className="px-6 py-4 text-right font-mono">{formatCLP(localFinancials.excel.utilidadAmount)}</td>
                            <td className="px-6 py-4 text-right font-mono">{formatCLP(localFinancials.real.utilidadAmount)}</td>
                            <td className={cn("px-6 py-4 text-right font-mono font-medium",
                              localFinancials.real.utilidadAmount < localFinancials.excel.utilidadAmount ? "text-emerald-500" :
                              localFinancials.real.utilidadAmount > localFinancials.excel.utilidadAmount ? "text-rose-500" : ""
                            )}>
                              {formatCLP(localFinancials.real.utilidadAmount - localFinancials.excel.utilidadAmount)}
                            </td>
                          </tr>
                          <tr className="hover:bg-secondary/20">
                            <td className="px-6 py-4 font-medium">IVA ({localFinancials.excel.ivaPercent}%)</td>
                            <td className="px-6 py-4 text-right font-mono">{formatCLP(localFinancials.excel.ivaAmount)}</td>
                            <td className="px-6 py-4 text-right font-mono">{formatCLP(localFinancials.real.ivaAmount)}</td>
                            <td className={cn("px-6 py-4 text-right font-mono font-medium",
                              localFinancials.real.ivaAmount < localFinancials.excel.ivaAmount ? "text-emerald-500" :
                              localFinancials.real.ivaAmount > localFinancials.excel.ivaAmount ? "text-rose-500" : ""
                            )}>
                              {formatCLP(localFinancials.real.ivaAmount - localFinancials.excel.ivaAmount)}
                            </td>
                          </tr>
                          <tr className="bg-secondary/30 font-bold">
                            <td className="px-6 py-4">TOTAL</td>
                            <td className="px-6 py-4 text-right font-mono text-amber-500">{formatCLP(localFinancials.excel.total)}</td>
                            <td className="px-6 py-4 text-right font-mono text-emerald-500">{formatCLP(localFinancials.real.total)}</td>
                            <td className={cn("px-6 py-4 text-right font-mono",
                              localFinancials.real.total < localFinancials.excel.total ? "text-emerald-500" :
                              localFinancials.real.total > localFinancials.excel.total ? "text-rose-500" : ""
                            )}>
                              {formatCLP(localFinancials.real.total - localFinancials.excel.total)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : loadingFinancials ? (
              <div className="space-y-4">
                <Skeleton className="h-48 w-full bg-card" />
                <Skeleton className="h-64 w-full bg-card" />
              </div>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No hay datos financieros disponibles.</p>
                  <p className="text-sm text-muted-foreground mt-2">Sube un presupuesto Excel para ver la comparación.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* APU Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="col-span-1 lg:col-span-3 bg-card border-border shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="w-5 h-5 text-primary" />
                      Búsqueda de Precios Sodimac / Easy
                    </CardTitle>
                    <CardDescription>
                      Comparación automática de precios por material en sodimac.falabella.com y easy.cl
                      {project.lastPriceSync && (
                        <span className="ml-2 text-xs text-emerald-500">
                          Sincronizado: {format(new Date(project.lastPriceSync), "dd/MM/yyyy HH:mm")}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => syncPrices.mutate(id)}
                    disabled={syncPrices.isPending || (items?.length || 0) === 0}
                    className="text-white font-bold"
                    style={{ backgroundColor: 'rgb(217, 119, 6)' }}
                    data-testid="button-sync-prices-apu"
                  >
                    {syncPrices.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sincronizar Precios
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {items?.some(i => i.sodimacPrice || i.easyPrice) ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" data-testid="table-apu-comparison">
                        <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                          <tr>
                            <th className="px-4 py-3 text-left">Partida Presupuesto</th>
                            <th className="px-4 py-3 text-right">P. Presupuestado</th>
                            <th className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-orange-400">Sodimac</span>
                              </div>
                            </th>
                            <th className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-blue-400">Easy</span>
                              </div>
                            </th>
                            <th className="px-4 py-3 text-center">Mejor Precio</th>
                            <th className="px-4 py-3 text-center">Stock</th>
                            <th className="px-4 py-3 text-center">Carrito</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {items?.filter(i => i.sodimacPrice || i.easyPrice).map((item) => {
                            const sodP = Number(item.sodimacPrice || 0);
                            const easP = Number(item.easyPrice || 0);
                            const budgetP = Number(item.unitPrice || 0);
                            const best = sodP > 0 && easP > 0 ? (sodP <= easP ? 'Sodimac' : 'Easy') : (sodP > 0 ? 'Sodimac' : 'Easy');
                            const bestPrice = best === 'Sodimac' ? sodP : easP;
                            const delta = budgetP > 0 ? bestPrice - budgetP : 0;
                            return (
                              <tr key={item.id} className="hover:bg-secondary/20 transition-colors" data-testid={`row-apu-${item.id}`}>
                                <td className="px-4 py-3">
                                  <p className="font-medium text-foreground text-xs leading-tight">{item.description}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.commercialDescription && item.commercialDescription !== item.description ? item.commercialDescription : ''}</p>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className="font-mono text-muted-foreground">{budgetP > 0 ? formatCLP(budgetP) : '-'}</span>
                                </td>
                                <td className="px-4 py-3">
                                  {sodP > 0 ? (
                                    <div className={cn(
                                      "p-2 rounded-lg border text-center",
                                      best === 'Sodimac' ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card border-border"
                                    )}>
                                      <p className="font-mono font-bold text-sm" data-testid={`text-sodimac-${item.id}`}>
                                        {formatCLP(sodP)}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                                        <Tag className="w-2.5 h-2.5" />
                                        {item.sodimacBrand || '-'}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground text-center block">Sin datos</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {easP > 0 ? (
                                    <div className={cn(
                                      "p-2 rounded-lg border text-center",
                                      best === 'Easy' ? "bg-emerald-500/10 border-emerald-500/30" : "bg-card border-border"
                                    )}>
                                      <p className="font-mono font-bold text-sm" data-testid={`text-easy-${item.id}`}>
                                        {formatCLP(easP)}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                                        <Tag className="w-2.5 h-2.5" />
                                        {item.easyBrand || '-'}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground text-center block">Sin datos</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge className={cn(
                                    "font-bold",
                                    best === 'Sodimac' ? "bg-orange-500 text-white border-0" : "bg-blue-500 text-white border-0"
                                  )}>
                                    {formatCLP(bestPrice)}
                                  </Badge>
                                  <p className="text-[10px] mt-1 text-muted-foreground">{best}</p>
                                  {delta !== 0 && (
                                    <p className={cn("text-[10px] font-mono mt-0.5", delta < 0 ? "text-emerald-500" : "text-rose-500")}>
                                      {delta > 0 ? '+' : ''}{formatCLP(delta)}
                                    </p>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className={cn("text-[10px] flex items-center gap-1", item.sodimacStock ? "text-emerald-500" : "text-rose-400")}>
                                      <PackageCheck className="w-3 h-3" />
                                      S: {item.sodimacStock ? 'Sí' : 'No'}
                                    </span>
                                    <span className={cn("text-[10px] flex items-center gap-1", item.easyStock ? "text-emerald-500" : "text-rose-400")}>
                                      <PackageCheck className="w-3 h-3" />
                                      E: {item.easyStock ? 'Sí' : 'No'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col gap-1.5">
                                    {sodP > 0 && (
                                      <Button
                                        variant={cartSodimac.some(c => c.itemId === item.id) ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => addToCart("sodimac", item)}
                                        className={cn(
                                          "h-6 text-[10px] px-2",
                                          cartSodimac.some(c => c.itemId === item.id)
                                            ? "bg-orange-500 text-white border-orange-500"
                                            : "text-muted-foreground"
                                        )}
                                        data-testid={`button-cart-sodimac-${item.id}`}
                                      >
                                        <ShoppingCart className="w-3 h-3 mr-1" />
                                        {cartSodimac.some(c => c.itemId === item.id) ? "✓ Sodimac" : "+ Sodimac"}
                                      </Button>
                                    )}
                                    {easP > 0 && (
                                      <Button
                                        variant={cartEasy.some(c => c.itemId === item.id) ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => addToCart("easy", item)}
                                        className={cn(
                                          "h-6 text-[10px] px-2",
                                          cartEasy.some(c => c.itemId === item.id)
                                            ? "bg-blue-500 text-white border-blue-500"
                                            : "text-muted-foreground"
                                        )}
                                        data-testid={`button-cart-easy-${item.id}`}
                                      >
                                        <ShoppingCart className="w-3 h-3 mr-1" />
                                        {cartEasy.some(c => c.itemId === item.id) ? "✓ Easy" : "+ Easy"}
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium">No hay datos de precios de mercado aún.</p>
                      <p className="text-sm mt-1">Presiona "Sincronizar Precios de Mercado" para buscar precios en Sodimac y Easy.</p>
                      <Button 
                        onClick={() => syncPrices.mutate(id)}
                        disabled={syncPrices.isPending || (items?.length || 0) === 0}
                        className="mt-4 text-white font-bold"
                        style={{ backgroundColor: 'rgb(217, 119, 6)' }}
                        data-testid="button-sync-tab"
                      >
                        {syncPrices.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Sincronizar Precios de Mercado
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-emerald-950/20 border-emerald-900/50">
                <CardHeader>
                  <CardTitle className="text-emerald-500 text-lg">Oportunidades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-full">
                      <TrendingUp className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ahorro Potencial</p>
                      <h3 className="text-2xl font-bold text-foreground" data-testid="text-savings">
                        {localFinancials && localFinancials.margenManiobra.deltaAmount > 0 
                          ? formatCLP(localFinancials.margenManiobra.deltaAmount) 
                          : formatCLP(0)}
                      </h3>
                      <p className="text-xs text-emerald-400 mt-1">Comparando precios de mercado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-rose-950/20 border-rose-900/50">
                <CardHeader>
                  <CardTitle className="text-rose-500 text-lg">Riesgos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-rose-500/10 rounded-full">
                      <AlertCircle className="w-6 h-6 text-rose-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ítems sobre presupuesto</p>
                      <h3 className="text-2xl font-bold text-foreground" data-testid="text-over-budget-count">
                        {items?.filter(i => i.marketPrice && Number(i.marketPrice) > Number(i.unitPrice || 0)).length || 0} Ítems
                      </h3>
                      <p className="text-xs text-rose-400 mt-1">Precio mercado mayor al presupuestado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border shadow-md">
                <CardHeader>
                  <CardTitle className="text-primary text-lg">Cobertura</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Search className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ítems con precio de mercado</p>
                      <h3 className="text-2xl font-bold text-foreground" data-testid="text-coverage">
                        {items?.filter(i => i.sodimacPrice || i.easyPrice).length || 0} / {items?.length || 0}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">Partidas vinculadas a tiendas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Gantt / Schedule Tab */}
          <TabsContent value="gantt">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Cronograma de Obra (Gantt)</CardTitle>
                <CardDescription>
                  Duración estimada basada en rendimientos por cantidad. 
                  (Supuesto: 250 unidades/día para estimación rápida)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {items && items.length > 0 ? (
                  <div className="h-[500px] w-full pt-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={items.map((item, index) => {
                          const quantity = parseFloat(item.quantity);
                          const durationDays = Math.max(1, Math.ceil(quantity / 250));
                          
                          const previousItems = items.slice(0, index);
                          const startOffset = previousItems.reduce((acc, curr) => 
                            acc + Math.max(1, Math.ceil(parseFloat(curr.quantity) / 250)), 0
                          );

                          return {
                            name: item.description.length > 30 ? item.description.substring(0, 30) + "..." : item.description,
                            start: startOffset,
                            duration: durationDays,
                            display: [startOffset, startOffset + durationDays]
                          };
                        })}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                      >
                        <XAxis type="number" domain={[0, 'dataMax + 5']} hide />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={150}
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip 
                          cursor={{ fill: 'transparent' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-popover border border-border p-3 rounded-lg shadow-xl text-sm">
                                  <p className="font-bold text-foreground mb-1">{data.name}</p>
                                  <p className="text-muted-foreground">Inicio: Día {data.start}</p>
                                  <p className="text-primary font-medium">Duración: {data.duration} días</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar 
                          dataKey="display" 
                          fill="hsl(var(--primary))" 
                          radius={[0, 4, 4, 0]}
                          barSize={20}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[400px] flex items-center justify-center bg-secondary/20 rounded-lg m-6 border border-dashed border-border">
                    <div className="text-center text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium">Sin datos de presupuesto</h3>
                      <p>Sube un archivo Excel para generar el cronograma automáticamente.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
