import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProjectSchema } from "@shared/schema";
import { useCreateProject, useUploadBudget, PlanLimitError } from "@/hooks/use-projects";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Plus, Loader2, Upload, FileSpreadsheet, Rocket, Crown, CheckCircle2, DollarSign, Percent } from "lucide-react";
import { useState, useCallback } from "react";
import { z } from "zod";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

const formSchema = insertProjectSchema.pick({
  name: true,
  description: true,
  client: true,
  totalBudget: true,
  gastosGeneralesPercent: true,
  utilidadPercent: true,
});

type FormValues = z.infer<typeof formSchema>;

function UpsellModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-card border-border shadow-2xl">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-3 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#c77b3f] to-[#e8a563] flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-xl">
            Actualiza a SmartBuild PRO
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            Te ha gustado la Demo! Para crear tus propios proyectos ilimitados y usar herramientas profesionales, actualiza a PRO ahora.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Proyectos ilimitados</p>
              <p className="text-xs text-muted-foreground">Crea y gestiona todos los proyectos que necesites</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Comparación de precios en tiempo real</p>
              <p className="text-xs text-muted-foreground">Sodimac vs Easy con precios actualizados diariamente</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-[#c77b3f]/5 border border-[#c77b3f]/20">
            <CheckCircle2 className="w-5 h-5 text-[#c77b3f] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Análisis financiero completo</p>
              <p className="text-xs text-muted-foreground">GG, utilidad, IVA, margen de maniobra y simulación de financiamiento</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <a href="mailto:contacto@bitcopper.cl?subject=Actualizar%20a%20SmartBuild%20PRO" className="block">
            <Button className="w-full bg-gradient-to-r from-[#c77b3f] to-[#e8a563] hover:from-[#b06a30] hover:to-[#d4944e] text-white shadow-lg" data-testid="button-upgrade-pro">
              <Rocket className="w-4 h-4 mr-2" />
              Contactar para Actualizar
            </Button>
          </a>
          <Button variant="ghost" className="text-muted-foreground" onClick={onClose} data-testid="button-close-upsell">
            Seguir con plan gratuito
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const createProject = useCreateProject();
  const uploadBudget = useUploadBudget();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      client: "",
      totalBudget: "",
      gastosGeneralesPercent: "",
      utilidadPercent: "",
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  async function onSubmit(values: FormValues) {
    createProject.mutate(values, {
      onSuccess: (project) => {
        if (file) {
          uploadBudget.mutate({ id: project.id, file }, {
            onSuccess: () => {
              setOpen(false);
              setFile(null);
              form.reset();
            }
          });
        } else {
          setOpen(false);
          form.reset();
        }
      },
      onError: (err) => {
        if (err instanceof PlanLimitError) {
          setOpen(false);
          setShowUpsell(true);
        }
      },
    });
  }

  const isPending = createProject.isPending || uploadBudget.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setFile(null);
          form.reset();
        }
      }}>
        <DialogTrigger asChild>
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20" data-testid="button-new-project">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Proyecto
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] bg-card border-border shadow-2xl p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
            <DialogDescription>
              Ingresa los detalles del proyecto y adjunta el presupuesto.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Proyecto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Reparaciones Kamac Mayu" {...field} className="bg-background" data-testid="input-project-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Municipalidad de Calama" {...field} value={field.value || ''} className="bg-background" data-testid="input-project-client" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalBudget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presupuesto Total (CLP)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="number"
                            inputMode="numeric"
                            placeholder="Ej: 15000000"
                            {...field}
                            value={field.value || ''}
                            className="bg-background pl-9"
                            data-testid="input-project-budget"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="gastosGeneralesPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gastos Generales (%)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              placeholder="Ej: 15"
                              {...field}
                              value={field.value || ''}
                              className="bg-background pl-9"
                              data-testid="input-project-gg"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="utilidadPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Utilidad (%)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              placeholder="Ej: 10"
                              {...field}
                              value={field.value || ''}
                              className="bg-background pl-9"
                              data-testid="input-project-utilidad"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <FormLabel>Presupuesto (Excel)</FormLabel>
                  <div
                    {...getRootProps()}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer",
                      isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-secondary/30",
                      file && "border-emerald-500/50 bg-emerald-500/5"
                    )}
                  >
                    <input {...getInputProps()} />
                    {file ? (
                      <div className="flex flex-col items-center">
                        <FileSpreadsheet className="w-8 h-8 text-emerald-500 mb-2" />
                        <p className="text-sm font-medium text-emerald-500">{file.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">Archivo listo para procesar</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Arrastra tu archivo aqui</p>
                        <p className="text-xs text-muted-foreground mt-1">Soporta .xlsx y .csv</p>
                      </div>
                    )}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripcion</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Breve descripcion del alcance..." 
                          className="resize-none bg-background min-h-[80px]" 
                          {...field} 
                          value={field.value || ''}
                          data-testid="input-project-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="sticky bottom-0 flex justify-end gap-3 px-6 py-4 border-t border-border bg-card">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending} className="shadow-lg" data-testid="button-submit-project">
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-4 w-4" />
                      Publicar Proyecto
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <UpsellModal open={showUpsell} onClose={() => setShowUpsell(false)} />
    </>
  );
}
