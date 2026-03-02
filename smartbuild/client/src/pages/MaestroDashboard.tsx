import { Sidebar } from "@/components/Sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Star,
  QrCode,
  Wallet,
  Trophy,
  TrendingUp,
  Copy,
  CheckCircle2,
  Plus,
  Clock,
  Loader2,
  UserCircle,
  Hammer,
  Users,
  Camera,
  Award,
  CalendarCheck,
  Trash2,
  ImageIcon,
  Shield,
  Flame,
  FileCheck,
  Upload,
  BadgeCheck,
  AlertTriangle,
  Lock,
  Truck,
  Bell,
  CircleDot,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  X,
  Banknote,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const TUTORIAL_STORAGE_KEY = "maestro_tutorial_seen";

interface TutorialStep {
  icon: typeof QrCode;
  title: string;
  description: string;
  color: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    icon: QrCode,
    title: "1. Genera tu QR de Cobro",
    description: "Cuando termines un trabajo, presiona el boton grande para crear un codigo QR. El cliente lo escanea desde su celular para confirmar el pago.",
    color: "text-[#c77b3f]",
  },
  {
    icon: Shield,
    title: "2. Tu dinero esta protegido",
    description: "Cuando el cliente deposita, veras una etiqueta verde que dice 'DINERO DISPONIBLE EN CUSTODIA'. Eso significa que la plata ya esta guardada y puedes trabajar tranquilo.",
    color: "text-emerald-400",
  },
  {
    icon: Wallet,
    title: "3. Cobra cuando quieras",
    description: "En tu historial de pagos puedes ver cuanto has cobrado y que tienes pendiente. Solicita retiros directamente desde tu panel con un QR.",
    color: "text-blue-400",
  },
];

function MaestroTutorial({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const Icon = current.icon;

  return (
    <Card className="border-[#c77b3f]/30 bg-gradient-to-br from-[#c77b3f]/10 to-amber-900/5 overflow-hidden" data-testid="card-tutorial">
      <CardContent className="p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-close-tutorial"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#c77b3f]/15 flex items-center justify-center">
            <Icon className={`w-8 h-8 ${current.color}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold" data-testid="text-tutorial-title">{current.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              {current.description}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {TUTORIAL_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${i === step ? "bg-[#c77b3f]" : "bg-muted-foreground/30"}`}
                data-testid={`dot-tutorial-${i}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-3 w-full max-w-xs">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="flex-1"
              data-testid="button-tutorial-prev"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            {step < TUTORIAL_STEPS.length - 1 ? (
              <Button
                size="sm"
                className="flex-1 bg-[#c77b3f] text-white"
                onClick={() => setStep(step + 1)}
                data-testid="button-tutorial-next"
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="flex-1 bg-emerald-600 text-white"
                onClick={onClose}
                data-testid="button-tutorial-finish"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Entendido
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MaestroProfile {
  id: number;
  displayName: string;
  specialty: string | null;
  bio: string | null;
  phone: string | null;
  city: string | null;
  avgRating: string;
  ratingCount: number;
  creditScore: number;
  creditBalance: number;
  activeStreak: number;
  hasActiveBadge: boolean;
  trustLevel: number;
  lastActiveDate: string | null;
  documentoOrigen: string | null;
  tipoDocumentoOrigen: string | null;
  rutChileno: string | null;
  estadoRut: string | null;
  docPhotoUrl: string | null;
  kycVerified: boolean;
  level: string;
}

interface WorkCompletion {
  id: number;
  projectDescription: string;
  clientName: string | null;
  token: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface ReviewItem {
  stars: number;
  comment: string | null;
  clientName: string | null;
  createdAt: string;
}

interface CrewMemberItem {
  id: number;
  name: string;
  role: string;
  phone: string | null;
  isActive: boolean;
}

interface AttendanceItem {
  id: number;
  crewMemberId: number;
  date: string;
  present: boolean;
}

interface DailyLogItem {
  id: number;
  date: string;
  photoUrl: string;
  photoUrl2: string | null;
  note: string | null;
  createdAt: string;
}

function getLevelColor(level: string) {
  switch (level) {
    case "Master": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "Experto": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    default: return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
  }
}

function getLevelIcon(level: string) {
  switch (level) {
    case "Master": return "🏆";
    case "Experto": return "⭐";
    default: return "🔨";
  }
}

function StarDisplay({ rating, size = "md" }: { rating: number; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${sz} ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-zinc-600"}`}
        />
      ))}
    </div>
  );
}

function getWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    startDate: monday.toISOString().split("T")[0],
    endDate: sunday.toISOString().split("T")[0],
  };
}

export default function MaestroDashboard() {
  const { toast } = useToast();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [newWorkDialogOpen, setNewWorkDialogOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [addCrewDialogOpen, setAddCrewDialogOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    specialty: "",
    bio: "",
    phone: "",
    city: "",
  });
  const [workForm, setWorkForm] = useState({
    projectDescription: "",
    clientName: "",
  });
  const [crewForm, setCrewForm] = useState({ name: "", role: "Ayudante", phone: "" });
  const [logNote, setLogNote] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const photo2Ref = useRef<HTMLInputElement>(null);
  const docPhotoRef = useRef<HTMLInputElement>(null);
  const [kycForm, setKycForm] = useState({
    documentoOrigen: "",
    tipoDocumentoOrigen: "dni_extranjero" as string,
    rutChileno: "",
    estadoRut: "sin_rut" as string,
  });

  const [showTutorial, setShowTutorial] = useState(() => {
    try {
      return !localStorage.getItem(TUTORIAL_STORAGE_KEY);
    } catch {
      return true;
    }
  });

  const dismissTutorial = useCallback(() => {
    setShowTutorial(false);
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    } catch {}
  }, []);

  const [heroWithdrawQROpen, setHeroWithdrawQROpen] = useState(false);
  const [heroWithdrawQRToken, setHeroWithdrawQRToken] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];
  const { startDate: weekStart, endDate: weekEnd } = getWeekDates();

  const { data: maestroData, isLoading } = useQuery<{ isMaestro: boolean; maestro: MaestroProfile | null }>({
    queryKey: ["/api/maestro/me"],
    staleTime: 60_000,
  });

  const { data: completions } = useQuery<WorkCompletion[]>({
    queryKey: ["/api/maestro/work-completions"],
    enabled: maestroData?.isMaestro === true,
    staleTime: 60_000,
  });

  const { data: publicProfile } = useQuery<{ reviews: ReviewItem[] }>({
    queryKey: ["/api/maestro/public", maestroData?.maestro?.id],
    enabled: !!maestroData?.maestro?.id,
    staleTime: 60_000,
  });

  const { data: crewMembers } = useQuery<CrewMemberItem[]>({
    queryKey: ["/api/maestro/crew"],
    enabled: maestroData?.isMaestro === true,
    staleTime: 60_000,
  });

  const { data: todayAttendance } = useQuery<AttendanceItem[]>({
    queryKey: ["/api/maestro/attendance", todayStr],
    enabled: maestroData?.isMaestro === true,
    staleTime: 30_000,
  });

  const { data: weekAttendance } = useQuery<AttendanceItem[]>({
    queryKey: ["/api/maestro/attendance/summary", weekStart, weekEnd],
    enabled: maestroData?.isMaestro === true,
    staleTime: 60_000,
  });

  const { data: dailyLogs } = useQuery<DailyLogItem[]>({
    queryKey: ["/api/maestro/daily-logs"],
    enabled: maestroData?.isMaestro === true,
    staleTime: 60_000,
  });

  const { data: heroEscrowData } = useQuery<{
    wallets: EscrowWallet[];
    summary: { totalAvailable: number; totalBlocked: number; totalProjects: number };
  }>({
    queryKey: ["/api/escrow/maestro", maestroData?.maestro?.id],
    queryFn: async () => {
      const res = await fetch(`/api/escrow/maestro/${maestroData?.maestro?.id}`);
      if (!res.ok) return { wallets: [], summary: { totalAvailable: 0, totalBlocked: 0, totalProjects: 0 } };
      return res.json();
    },
    enabled: !!maestroData?.maestro?.id,
    staleTime: 30_000,
  });

  const { data: heroWithdrawals } = useQuery<WithdrawalItem[]>({
    queryKey: ["/api/withdrawals/maestro", maestroData?.maestro?.id],
    queryFn: async () => {
      const res = await fetch(`/api/withdrawals/maestro/${maestroData?.maestro?.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!maestroData?.maestro?.id,
    staleTime: 30_000,
  });

  const heroWithdrawMutation = useMutation({
    mutationFn: async ({ projectWalletId, amount, clientLeadId }: { projectWalletId: number; amount: number; clientLeadId?: number }) => {
      const res = await apiRequest("POST", "/api/withdrawals", {
        projectWalletId,
        maestroId: maestroData?.maestro?.id,
        clientLeadId,
        amount,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setHeroWithdrawQRToken(data.qrToken);
      setHeroWithdrawQROpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/escrow/maestro", maestroData?.maestro?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals/maestro", maestroData?.maestro?.id] });
      toast({ title: "QR Generado", description: "Muestra el codigo QR al cliente para confirmar el cobro." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo generar el QR de cobro.", variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const res = await apiRequest("POST", "/api/maestro/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maestro/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maestro/check"] });
      setProfileDialogOpen(false);
      toast({ title: "Perfil Guardado", description: "Tu perfil de Maestro ha sido actualizado." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo guardar el perfil.", variant: "destructive" });
    },
  });

  const createWorkMutation = useMutation({
    mutationFn: async (data: typeof workForm) => {
      const res = await apiRequest("POST", "/api/maestro/work-completions", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/maestro/work-completions"] });
      setNewWorkDialogOpen(false);
      setWorkForm({ projectDescription: "", clientName: "" });
      setSelectedToken(data.token);
      setQrDialogOpen(true);
      toast({ title: "Obra Finalizada", description: "Se generó el código QR para que tu cliente te califique." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear la finalización.", variant: "destructive" });
    },
  });

  const addCrewMutation = useMutation({
    mutationFn: async (data: typeof crewForm) => {
      const res = await apiRequest("POST", "/api/maestro/crew", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maestro/crew"] });
      setAddCrewDialogOpen(false);
      setCrewForm({ name: "", role: "Ayudante", phone: "" });
      toast({ title: "Trabajador Agregado", description: "Se agregó un nuevo miembro a tu cuadrilla." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo agregar al trabajador.", variant: "destructive" });
    },
  });

  const deleteCrewMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/maestro/crew/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maestro/crew"] });
      toast({ title: "Eliminado", description: "Trabajador removido de tu cuadrilla." });
    },
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async (records: { crewMemberId: number; present: boolean }[]) => {
      const res = await apiRequest("POST", "/api/maestro/attendance", { records, date: todayStr });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maestro/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maestro/me"] });
      toast({ title: "Asistencia Guardada", description: "Pase de lista del día registrado." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo guardar la asistencia.", variant: "destructive" });
    },
  });

  const uploadLogMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/maestro/daily-log", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error" }));
        throw new Error(err.error || "Error al subir avance");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maestro/daily-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maestro/me"] });
      setLogNote("");
      if (photoRef.current) photoRef.current.value = "";
      if (photo2Ref.current) photo2Ref.current.value = "";
      toast({ title: "Avance Registrado", description: "Tu foto de avance ha sido guardada. ¡Tu nivel de confianza sube!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const saveKycMutation = useMutation({
    mutationFn: async (data: typeof kycForm) => {
      const body: Record<string, string> = {};
      if (data.documentoOrigen) {
        body.documentoOrigen = data.documentoOrigen;
        body.tipoDocumentoOrigen = data.tipoDocumentoOrigen;
      }
      if (data.rutChileno) {
        body.rutChileno = data.rutChileno;
        body.estadoRut = data.estadoRut;
      }
      const res = await apiRequest("POST", "/api/maestro/kyc", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maestro/me"] });
      toast({ title: "Documentos Actualizados", description: "Tu información documental ha sido guardada." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo guardar la información documental.", variant: "destructive" });
    },
  });

  const uploadDocPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("docPhoto", file);
      const res = await fetch("/api/maestro/kyc/photo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error" }));
        throw new Error(err.error || "Error al subir foto");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maestro/me"] });
      if (docPhotoRef.current) docPhotoRef.current.value = "";
      toast({ title: "Foto Verificada", description: "Tu documento ha sido registrado. Cuenta verificada." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const maestro = maestroData?.maestro;
  const reviewsList = publicProfile?.reviews || [];
  const rating = Number(maestro?.avgRating || 0);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const trustPercent = Math.min((maestro?.trustLevel ?? 0) * 5, 100);
  const todayHasLog = dailyLogs?.some(l => l.date === todayStr);

  useEffect(() => {
    if (maestro) {
      setKycForm({
        documentoOrigen: maestro.documentoOrigen || "",
        tipoDocumentoOrigen: maestro.tipoDocumentoOrigen || "dni_extranjero",
        rutChileno: maestro.rutChileno || "",
        estadoRut: maestro.estadoRut || "sin_rut",
      });
    }
  }, [maestro?.documentoOrigen, maestro?.rutChileno, maestro?.tipoDocumentoOrigen, maestro?.estadoRut]);

  const [attendanceState, setAttendanceState] = useState<Record<number, boolean>>({});

  function getAttendanceForMember(memberId: number): boolean {
    if (attendanceState[memberId] !== undefined) return attendanceState[memberId];
    const record = todayAttendance?.find(a => a.crewMemberId === memberId);
    return record?.present ?? false;
  }

  function toggleAttendance(memberId: number) {
    setAttendanceState(prev => ({
      ...prev,
      [memberId]: !getAttendanceForMember(memberId),
    }));
  }

  function handleSaveAttendance() {
    if (!crewMembers || crewMembers.length === 0) return;
    const records = crewMembers.map(m => ({
      crewMemberId: m.id,
      present: getAttendanceForMember(m.id),
    }));
    saveAttendanceMutation.mutate(records);
  }

  function handleUploadLog() {
    const file1 = photoRef.current?.files?.[0];
    if (!file1) {
      toast({ title: "Sin Foto", description: "Selecciona al menos una foto del avance.", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("photo", file1);
    const file2 = photo2Ref.current?.files?.[0];
    if (file2) formData.append("photo2", file2);
    if (logNote) formData.append("note", logNote);
    formData.append("date", todayStr);
    uploadLogMutation.mutate(formData);
  }

  function getWeekdaySummary() {
    if (!crewMembers || !weekAttendance) return [];
    return crewMembers.map(member => {
      const daysPresent = weekAttendance.filter(a => a.crewMemberId === member.id && a.present).length;
      return { ...member, daysPresent };
    });
  }

  function handleOpenProfileDialog() {
    if (maestro) {
      setProfileForm({
        displayName: maestro.displayName || "",
        specialty: maestro.specialty || "",
        bio: maestro.bio || "",
        phone: maestro.phone || "",
        city: maestro.city || "",
      });
    }
    setProfileDialogOpen(true);
  }

  function handleCopyQrUrl(token: string) {
    navigator.clipboard.writeText(`${baseUrl}/rate/${token}`);
    toast({ title: "Enlace copiado", description: "El enlace de calificación ha sido copiado al portapapeles." });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <main className="flex-1 p-6 md:ml-64">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto md:ml-64">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Hammer className="w-6 h-6 text-[#c77b3f]" />
                Panel del Maestro
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Tu herramienta diaria de gestión y crédito
              </p>
            </div>
            {!maestro && (
              <Button
                onClick={handleOpenProfileDialog}
                className="bg-[#c77b3f] hover:bg-[#b06a30] text-white"
                data-testid="button-register-maestro"
              >
                <Plus className="w-4 h-4 mr-2" />
                Registrarme como Maestro
              </Button>
            )}
          </div>

          {!maestro ? (
            <Card className="border-dashed border-2 border-[#c77b3f]/30 bg-[#c77b3f]/5">
              <CardContent className="p-8 text-center">
                <UserCircle className="w-16 h-16 mx-auto mb-4 text-[#c77b3f]/40" />
                <h2 className="text-lg font-semibold mb-2">Registrate como Maestro</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                  Crea tu perfil de trabajador para acumular reputacion, gestionar tu cuadrilla
                  y acceder a credito en ferreterias aliadas.
                </p>
                <Button
                  onClick={handleOpenProfileDialog}
                  className="bg-[#c77b3f] text-white"
                  data-testid="button-create-maestro"
                >
                  Crear mi Perfil
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Tutorial Slider (first visit) */}
              {showTutorial && <MaestroTutorial onClose={dismissTutorial} />}

              {/* HERO: Giant QR Button + Custody Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="section-hero">
                {/* Giant QR Button */}
                <Card className="border-[#c77b3f]/30 bg-gradient-to-br from-[#c77b3f]/10 to-amber-900/5" data-testid="card-hero-qr">
                  <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-20 h-20 rounded-2xl bg-[#c77b3f]/20 flex items-center justify-center">
                      <QrCode className="w-10 h-10 text-[#c77b3f]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Cobrar por QR</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Genera un codigo QR para que tu cliente confirme el pago
                      </p>
                    </div>
                    {(() => {
                      const walletsWithFunds = (heroEscrowData?.wallets || []).filter(w => w.maestroAvailable > 0);
                      if (walletsWithFunds.length === 0) {
                        return (
                          <Button
                            className="w-full py-6 text-lg bg-[#c77b3f] text-white"
                            onClick={() => {
                              const el = document.querySelector('[data-testid="tab-obras"]');
                              if (el instanceof HTMLElement) el.click();
                            }}
                            data-testid="button-hero-qr-empty"
                          >
                            <QrCode className="w-6 h-6 mr-3" />
                            Generar QR de Cobro
                          </Button>
                        );
                      }
                      if (walletsWithFunds.length === 1) {
                        const w = walletsWithFunds[0];
                        return (
                          <Button
                            className="w-full py-6 text-lg bg-[#c77b3f] text-white"
                            onClick={() => {
                              heroWithdrawMutation.mutate({
                                projectWalletId: w.id,
                                amount: w.maestroAvailable,
                                clientLeadId: w.clientLeadId,
                              });
                            }}
                            disabled={heroWithdrawMutation.isPending}
                            data-testid="button-hero-qr-single"
                          >
                            {heroWithdrawMutation.isPending ? (
                              <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                            ) : (
                              <QrCode className="w-6 h-6 mr-3" />
                            )}
                            Generar QR de Cobro (${w.maestroAvailable.toLocaleString("es-CL")})
                          </Button>
                        );
                      }
                      return (
                        <div className="w-full space-y-2">
                          <p className="text-xs text-muted-foreground">Selecciona el proyecto para cobrar:</p>
                          {walletsWithFunds.map(w => (
                            <Button
                              key={w.id}
                              className="w-full py-4 bg-[#c77b3f] text-white text-sm"
                              onClick={() => {
                                heroWithdrawMutation.mutate({
                                  projectWalletId: w.id,
                                  amount: w.maestroAvailable,
                                  clientLeadId: w.clientLeadId,
                                });
                              }}
                              disabled={heroWithdrawMutation.isPending}
                              data-testid={`button-hero-qr-${w.id}`}
                            >
                              {heroWithdrawMutation.isPending ? (
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              ) : (
                                <QrCode className="w-5 h-5 mr-2" />
                              )}
                              {w.description} — ${w.maestroAvailable.toLocaleString("es-CL")}
                            </Button>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Custody Status + Payment History */}
                <div className="space-y-4">
                  {/* Green Custody Label */}
                  {(heroEscrowData?.summary?.totalAvailable ?? 0) > 0 ? (
                    <Card className="border-emerald-500/30 bg-emerald-500/10" data-testid="card-custody-available">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <Shield className="w-7 h-7 text-emerald-400" />
                        </div>
                        <div>
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-sm font-bold px-3 py-1" data-testid="badge-custody-status">
                            DINERO DISPONIBLE EN CUSTODIA
                          </Badge>
                          <p className="text-2xl font-bold text-emerald-400 mt-1" data-testid="text-custody-amount">
                            ${(heroEscrowData?.summary?.totalAvailable ?? 0).toLocaleString("es-CL")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            El cliente ya deposito. Puedes trabajar con confianza.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-border bg-muted/30" data-testid="card-custody-empty">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                          <Shield className="w-7 h-7 text-muted-foreground/50" />
                        </div>
                        <div>
                          <Badge className="bg-muted/50 text-muted-foreground border-border text-sm px-3 py-1" data-testid="badge-custody-empty">
                            SIN FONDOS EN CUSTODIA
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            Cuando un cliente deposite en tu proyecto, veras aqui el dinero disponible.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Payment History Summary */}
                  <Card className="border-border" data-testid="card-payment-history">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Banknote className="w-4 h-4 text-[#c77b3f]" />
                        Historial de Pagos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(() => {
                        const wds = heroWithdrawals || [];
                        const released = wds.filter(w => w.status === "RELEASED" || w.status === "CONFIRMED" || w.status === "CLIENT_CONFIRMED");
                        const pending = wds.filter(w => w.status === "PENDING" || w.status === "QR_SCANNED");
                        const totalCobrado = released.reduce((sum, w) => sum + w.amount, 0);
                        const totalPendiente = pending.reduce((sum, w) => sum + w.amount, 0);

                        return (
                          <>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center" data-testid="stat-total-cobrado">
                                <ArrowDownToLine className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
                                <p className="text-lg font-bold text-emerald-400">${totalCobrado.toLocaleString("es-CL")}</p>
                                <p className="text-[10px] text-muted-foreground">Total Cobrado</p>
                              </div>
                              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-center" data-testid="stat-total-pendiente">
                                <ArrowUpFromLine className="w-4 h-4 mx-auto text-amber-400 mb-1" />
                                <p className="text-lg font-bold text-amber-400">${totalPendiente.toLocaleString("es-CL")}</p>
                                <p className="text-[10px] text-muted-foreground">Pendiente</p>
                              </div>
                            </div>

                            {wds.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2">
                                Aun no tienes cobros registrados.
                              </p>
                            ) : (
                              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                                {wds.slice(0, 10).map(w => {
                                  const isReleased = w.status === "RELEASED" || w.status === "CONFIRMED" || w.status === "CLIENT_CONFIRMED";
                                  return (
                                    <div
                                      key={w.id}
                                      className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-card/50 text-sm"
                                      data-testid={`payment-row-${w.id}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {isReleased ? (
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        ) : (
                                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        )}
                                        <span className={`font-mono font-medium ${isReleased ? "text-emerald-400" : "text-amber-400"}`}>
                                          ${w.amount.toLocaleString("es-CL")}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge className={`text-[10px] ${isReleased ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"}`}>
                                          {isReleased ? "Cobrado" : "Pendiente"}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground">
                                          {w.createdAt && format(new Date(w.createdAt), "dd/MM", { locale: es })}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* KPI Cards Row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="border-amber-500/20 bg-amber-500/5" data-testid="card-maestro-level">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getLevelIcon(maestro.level)}</span>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Nivel</p>
                        <Badge className={`${getLevelColor(maestro.level)} text-xs`} data-testid="text-maestro-level">
                          {maestro.level}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-[#c77b3f]/20 bg-[#c77b3f]/5" data-testid="card-maestro-rating">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-[#c77b3f]" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Rating</p>
                        <span className="text-lg font-bold font-mono" data-testid="text-avg-rating">{rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-emerald-500/20 bg-emerald-500/5" data-testid="card-credit-score">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Crédito</p>
                        <span className="text-lg font-bold font-mono text-emerald-400" data-testid="text-credit-score">{maestro.creditScore}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`border-orange-500/20 ${maestro.hasActiveBadge ? "bg-orange-500/10 ring-1 ring-orange-500/30" : "bg-orange-500/5"}`} data-testid="card-streak">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Flame className={`w-4 h-4 ${maestro.activeStreak >= 5 ? "text-orange-400" : "text-orange-500/50"}`} />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Racha</p>
                        <span className="text-lg font-bold font-mono" data-testid="text-streak">{maestro.activeStreak} días</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-cyan-500/20 bg-cyan-500/5" data-testid="card-trust">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground">Confianza</p>
                        <div className="flex items-center gap-2">
                          <Progress value={trustPercent} className="h-2 flex-1" />
                          <span className="text-xs font-mono" data-testid="text-trust-level">{trustPercent}%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* KYC Onboarding Banner */}
              {!maestro.kycVerified && (
                <Card className="border-amber-500/30 bg-amber-500/5" data-testid="card-kyc-onboarding">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-amber-500/20 rounded-xl">
                      <AlertTriangle className="w-8 h-8 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-amber-400 flex items-center gap-2">
                        Verificacion Documental Pendiente
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Sube una foto de tu documento de identidad para activar tu cuenta y generar confianza con las ferreterias.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      onClick={() => {
                        const el = document.querySelector('[data-testid="tab-perfil"]');
                        if (el instanceof HTMLElement) el.click();
                      }}
                      data-testid="button-kyc-go-to-profile"
                    >
                      <FileCheck className="w-4 h-4 mr-1" />
                      Verificar
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Active Badge Banner */}
              {maestro.hasActiveBadge && (
                <Card className="border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-amber-500/10" data-testid="card-active-badge">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-orange-500/20 rounded-xl">
                      <Award className="w-8 h-8 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-orange-400 flex items-center gap-2">
                        🏅 Insignia de Trabajador Activo
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        ¡Llevas {maestro.activeStreak} días consecutivos de actividad! Las ferreterías te ven como un cliente confiable y activo.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tabs */}
              <Tabs defaultValue="cuadrilla" className="w-full">
                <TabsList className="grid w-full grid-cols-5 bg-card border border-border">
                  <TabsTrigger value="cuadrilla" className="flex items-center gap-1.5 text-xs sm:text-sm" data-testid="tab-cuadrilla">
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">Cuadrilla</span>
                    <span className="sm:hidden">Crew</span>
                  </TabsTrigger>
                  <TabsTrigger value="bitacora" className="flex items-center gap-1.5 text-xs sm:text-sm" data-testid="tab-bitacora">
                    <Camera className="w-4 h-4" />
                    <span className="hidden sm:inline">Bitácora</span>
                    <span className="sm:hidden">Fotos</span>
                  </TabsTrigger>
                  <TabsTrigger value="billetera" className="flex items-center gap-1.5 text-xs sm:text-sm" data-testid="tab-billetera">
                    <Wallet className="w-4 h-4" />
                    <span className="hidden sm:inline">Billetera</span>
                    <span className="sm:hidden">$</span>
                  </TabsTrigger>
                  <TabsTrigger value="obras" className="flex items-center gap-1.5 text-xs sm:text-sm" data-testid="tab-obras">
                    <QrCode className="w-4 h-4" />
                    <span className="hidden sm:inline">Obras/QR</span>
                    <span className="sm:hidden">QR</span>
                  </TabsTrigger>
                  <TabsTrigger value="perfil" className="flex items-center gap-1.5 text-xs sm:text-sm" data-testid="tab-perfil">
                    <UserCircle className="w-4 h-4" />
                    Perfil
                  </TabsTrigger>
                </TabsList>

                {/* TAB: MI CUADRILLA */}
                <TabsContent value="cuadrilla" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Crew List */}
                    <Card className="border-border">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#c77b3f]" />
                            Mi Cuadrilla
                          </CardTitle>
                          <Dialog open={addCrewDialogOpen} onOpenChange={setAddCrewDialogOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="bg-[#c77b3f] hover:bg-[#b06a30] text-white" data-testid="button-add-crew">
                                <Plus className="w-4 h-4 mr-1" />
                                Agregar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[400px]">
                              <DialogHeader>
                                <DialogTitle>Agregar Trabajador</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                  <Label>Nombre</Label>
                                  <Input
                                    value={crewForm.name}
                                    onChange={(e) => setCrewForm({ ...crewForm, name: e.target.value })}
                                    placeholder="Ej: Juan Pérez"
                                    data-testid="input-crew-name"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Rol</Label>
                                  <Select value={crewForm.role} onValueChange={(v) => setCrewForm({ ...crewForm, role: v })}>
                                    <SelectTrigger data-testid="select-crew-role">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Ayudante">Ayudante</SelectItem>
                                      <SelectItem value="Jornal">Jornal</SelectItem>
                                      <SelectItem value="Maestro 2do">Maestro 2do</SelectItem>
                                      <SelectItem value="Especialista">Especialista</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Teléfono (opcional)</Label>
                                  <Input
                                    value={crewForm.phone}
                                    onChange={(e) => setCrewForm({ ...crewForm, phone: e.target.value })}
                                    placeholder="+56 9 ..."
                                    data-testid="input-crew-phone"
                                  />
                                </div>
                                <Button
                                  className="w-full bg-[#c77b3f] hover:bg-[#b06a30] text-white"
                                  onClick={() => addCrewMutation.mutate(crewForm)}
                                  disabled={!crewForm.name.trim() || addCrewMutation.isPending}
                                  data-testid="button-save-crew"
                                >
                                  {addCrewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                                  Agregar a la Cuadrilla
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {!crewMembers || crewMembers.length === 0 ? (
                          <div className="text-center p-6 text-muted-foreground">
                            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Aún no tienes trabajadores.</p>
                            <p className="text-xs mt-1">Agrega a tu cuadrilla para llevar el control de asistencia.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {crewMembers.map(member => (
                              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50" data-testid={`crew-member-${member.id}`}>
                                <div>
                                  <p className="text-sm font-medium">{member.name}</p>
                                  <Badge variant="outline" className="text-[10px]">{member.role}</Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteCrewMutation.mutate(member.id)}
                                  className="text-red-400 hover:text-red-300"
                                  data-testid={`button-delete-crew-${member.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Attendance / Pase de Lista */}
                    <Card className="border-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CalendarCheck className="w-4 h-4 text-[#c77b3f]" />
                          Pase de Lista — Hoy
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                      </CardHeader>
                      <CardContent>
                        {!crewMembers || crewMembers.length === 0 ? (
                          <div className="text-center p-6 text-muted-foreground">
                            <CalendarCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Agrega trabajadores primero.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {crewMembers.map(member => (
                              <div
                                key={member.id}
                                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50 cursor-pointer hover:bg-card/80 transition-colors"
                                onClick={() => toggleAttendance(member.id)}
                                data-testid={`attendance-toggle-${member.id}`}
                              >
                                <Checkbox
                                  checked={getAttendanceForMember(member.id)}
                                  onCheckedChange={() => toggleAttendance(member.id)}
                                  data-testid={`checkbox-attendance-${member.id}`}
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{member.name}</p>
                                  <p className="text-xs text-muted-foreground">{member.role}</p>
                                </div>
                                {getAttendanceForMember(member.id) && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                )}
                              </div>
                            ))}
                            <Button
                              className="w-full bg-[#c77b3f] hover:bg-[#b06a30] text-white mt-2"
                              onClick={handleSaveAttendance}
                              disabled={saveAttendanceMutation.isPending}
                              data-testid="button-save-attendance"
                            >
                              {saveAttendanceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CalendarCheck className="w-4 h-4 mr-2" />}
                              Guardar Asistencia de Hoy
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Weekly Summary */}
                  {crewMembers && crewMembers.length > 0 && (
                    <Card className="border-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-[#c77b3f]" />
                          Resumen Semanal de Asistencia
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">Semana del {weekStart} al {weekEnd}</p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {getWeekdaySummary().map(member => (
                            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50" data-testid={`summary-${member.id}`}>
                              <div>
                                <p className="text-sm font-medium">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.role}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold font-mono text-[#c77b3f]" data-testid={`days-worked-${member.id}`}>{member.daysPresent}</p>
                                <p className="text-[10px] text-muted-foreground">días trabajados</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* TAB: BITÁCORA DE OBRA */}
                <TabsContent value="bitacora" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Upload Card */}
                    <Card className={`border-border ${todayHasLog ? "opacity-60" : ""}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Camera className="w-4 h-4 text-[#c77b3f]" />
                          Avance de Hoy
                        </CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {todayHasLog ? "✅ Ya subiste tu avance de hoy" : "Sube una foto rápida del progreso de la obra"}
                        </p>
                      </CardHeader>
                      <CardContent>
                        {todayHasLog ? (
                          <div className="text-center p-4">
                            <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                            <p className="text-sm font-medium text-emerald-400">Avance del día registrado</p>
                            <p className="text-xs text-muted-foreground mt-1">Vuelve mañana para seguir subiendo tu nivel de confianza</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label className="text-sm">Foto principal *</Label>
                              <Input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                ref={photoRef}
                                className="cursor-pointer"
                                data-testid="input-photo-1"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Segunda foto (opcional)</Label>
                              <Input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                ref={photo2Ref}
                                className="cursor-pointer"
                                data-testid="input-photo-2"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm">Nota rápida (opcional)</Label>
                              <Input
                                value={logNote}
                                onChange={(e) => setLogNote(e.target.value)}
                                placeholder="Ej: Terminamos el segundo piso"
                                data-testid="input-log-note"
                              />
                            </div>
                            <Button
                              className="w-full bg-gradient-to-r from-[#c77b3f] to-[#e8a563] hover:from-[#b06a30] hover:to-[#c77b3f] text-white"
                              onClick={handleUploadLog}
                              disabled={uploadLogMutation.isPending}
                              data-testid="button-upload-log"
                            >
                              {uploadLogMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Camera className="w-4 h-4 mr-2" />
                              )}
                              Subir Avance del Día
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Trust Level & Streak Card */}
                    <Card className="border-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Shield className="w-4 h-4 text-cyan-500" />
                          Nivel de Confianza
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progreso</span>
                            <span className="font-mono font-bold text-cyan-400" data-testid="text-trust-percent">{trustPercent}%</span>
                          </div>
                          <Progress value={trustPercent} className="h-3" />
                          <p className="text-xs text-muted-foreground">
                            {maestro.trustLevel} fotos de avance subidas en total
                          </p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Flame className="w-4 h-4 text-orange-400" />
                              Racha Activa
                            </span>
                            <span className="font-mono font-bold" data-testid="text-streak-display">{maestro.activeStreak} / 5 días</span>
                          </div>
                          <Progress value={Math.min((maestro.activeStreak / 5) * 100, 100)} className="h-3" />
                          <p className="text-xs text-muted-foreground">
                            {maestro.activeStreak >= 5
                              ? "🏅 ¡Insignia de Trabajador Activo desbloqueada!"
                              : `Registra asistencia + foto por ${5 - maestro.activeStreak} días más para desbloquear la insignia`}
                          </p>
                        </div>

                        {maestro.hasActiveBadge && (
                          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center gap-3">
                            <Award className="w-6 h-6 text-orange-400" />
                            <div>
                              <p className="text-sm font-bold text-orange-400">Trabajador Activo</p>
                              <p className="text-xs text-muted-foreground">Las ferreterías ven esta insignia en tu perfil</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Logs */}
                  <Card className="border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-[#c77b3f]" />
                        Historial de Avances
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!dailyLogs || dailyLogs.length === 0 ? (
                        <div className="text-center p-6 text-muted-foreground">
                          <Camera className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Aún no has subido fotos de avance.</p>
                          <p className="text-xs mt-1">Sube tu primera foto para comenzar a construir tu nivel de confianza.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {dailyLogs.map(log => (
                            <div key={log.id} className="rounded-lg border border-border/50 overflow-hidden bg-card/50" data-testid={`daily-log-${log.id}`}>
                              <div className="aspect-video relative">
                                <img
                                  src={log.photoUrl}
                                  alt={`Avance ${log.date}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              {log.photoUrl2 && (
                                <div className="aspect-video relative border-t border-border/50">
                                  <img
                                    src={log.photoUrl2}
                                    alt={`Avance 2 ${log.date}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="p-3">
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(log.date + "T12:00:00"), "EEEE d MMM yyyy", { locale: es })}
                                </p>
                                {log.note && <p className="text-sm mt-1">{log.note}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB: BILLETERA (ESCROW WALLET) */}
                <TabsContent value="billetera" className="space-y-4">
                  <MaestroBilleteraTab maestroId={maestro?.id} />
                </TabsContent>

                {/* TAB: OBRAS Y QR */}
                <TabsContent value="obras" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="border-border lg:col-span-3" data-testid="card-work-completions">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <QrCode className="w-4 h-4 text-[#c77b3f]" />
                            Obras Finalizadas
                          </CardTitle>
                          <Dialog open={newWorkDialogOpen} onOpenChange={setNewWorkDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-[#c77b3f] to-[#e8a563] hover:from-[#b06a30] hover:to-[#c77b3f] text-white"
                                data-testid="button-finalize-work"
                              >
                                <Trophy className="w-4 h-4 mr-1" />
                                Finalizar Obra y Cobrar Reputación
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Trophy className="w-5 h-5 text-[#c77b3f]" />
                                  Finalizar Obra
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                  <Label>Descripción del Trabajo</Label>
                                  <Textarea
                                    value={workForm.projectDescription}
                                    onChange={(e) => setWorkForm({ ...workForm, projectDescription: e.target.value })}
                                    placeholder="Ej: Instalación de cerámica en baño principal, 15m2"
                                    rows={3}
                                    data-testid="input-work-description"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Nombre del Cliente (opcional)</Label>
                                  <Input
                                    value={workForm.clientName}
                                    onChange={(e) => setWorkForm({ ...workForm, clientName: e.target.value })}
                                    placeholder="Ej: María González"
                                    data-testid="input-client-name"
                                  />
                                </div>
                                <Button
                                  className="w-full bg-[#c77b3f] hover:bg-[#b06a30] text-white"
                                  onClick={() => createWorkMutation.mutate(workForm)}
                                  disabled={!workForm.projectDescription.trim() || createWorkMutation.isPending}
                                  data-testid="button-submit-work"
                                >
                                  {createWorkMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <QrCode className="w-4 h-4 mr-2" />
                                  )}
                                  Generar QR para Calificación
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {!completions || completions.length === 0 ? (
                          <div className="text-center p-6 text-muted-foreground">
                            <QrCode className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Aún no has finalizado ninguna obra.</p>
                            <p className="text-xs mt-1">Usa el botón para generar un QR cuando termines un trabajo.</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                            {completions.map((wc) => (
                              <div
                                key={wc.id}
                                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50"
                                data-testid={`row-work-${wc.id}`}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{wc.projectDescription}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {wc.clientName && <span className="text-xs text-muted-foreground">{wc.clientName}</span>}
                                    <span className="text-xs text-muted-foreground">
                                      {wc.createdAt && format(new Date(wc.createdAt), "dd MMM yyyy", { locale: es })}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 ml-3">
                                  <Badge className={wc.status === "used" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs" : "bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs"}>
                                    {wc.status === "used" ? (<><CheckCircle2 className="w-3 h-3 mr-1" />Calificado</>) : (<><Clock className="w-3 h-3 mr-1" />Pendiente</>)}
                                  </Badge>
                                  {wc.status === "pending" && (
                                    <Button variant="ghost" size="sm" onClick={() => { setSelectedToken(wc.token); setQrDialogOpen(true); }} data-testid={`button-show-qr-${wc.id}`}>
                                      <QrCode className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Reviews */}
                  <Card className="border-border" data-testid="card-reviews">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-400" />
                        Comentarios de Clientes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {reviewsList.length === 0 ? (
                        <div className="text-center p-6 text-muted-foreground">
                          <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Aún no tienes calificaciones.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {reviewsList.map((review, idx) => (
                            <div key={idx} className="p-4 rounded-lg border border-border/50 bg-card/50" data-testid={`review-item-${idx}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <StarDisplay rating={review.stars} size="sm" />
                                  <span className="text-sm font-medium">{review.stars}/5</span>
                                </div>
                                {review.clientName && <span className="text-xs text-muted-foreground">{review.clientName}</span>}
                              </div>
                              {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                              <p className="text-xs text-muted-foreground mt-2">
                                {review.createdAt && format(new Date(review.createdAt), "dd MMM yyyy", { locale: es })}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* TAB: PERFIL */}
                <TabsContent value="perfil" className="space-y-4">
                  <Card className="border-border" data-testid="card-maestro-profile">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <UserCircle className="w-4 h-4 text-[#c77b3f]" />
                        Mi Perfil
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-[#c77b3f]/10 rounded-xl">
                          <Hammer className="w-8 h-8 text-[#c77b3f]" />
                        </div>
                        <div>
                          <p className="text-lg font-bold">{maestro.displayName}</p>
                          {maestro.specialty && <p className="text-sm text-muted-foreground">{maestro.specialty}</p>}
                          {maestro.city && <p className="text-xs text-muted-foreground">{maestro.city}</p>}
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          {maestro.kycVerified && (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs" data-testid="badge-kyc-verified">
                              <BadgeCheck className="w-3 h-3 mr-1" />
                              Verificado
                            </Badge>
                          )}
                          <Badge className={`${getLevelColor(maestro.level)}`}>{maestro.level}</Badge>
                        </div>
                      </div>

                      {/* Document Status Badges */}
                      {(maestro.documentoOrigen || maestro.rutChileno) && (
                        <div className="flex flex-wrap gap-2 border-t border-border/50 pt-3" data-testid="section-doc-status">
                          {maestro.documentoOrigen && maestro.tipoDocumentoOrigen && (
                            <Badge className={`text-xs ${maestro.docPhotoUrl ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"}`} data-testid="badge-doc-origen">
                              {maestro.docPhotoUrl ? <BadgeCheck className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                              {maestro.tipoDocumentoOrigen === "pasaporte" ? "Pasaporte" : "DNI Extranjero"} {maestro.docPhotoUrl ? "Validado" : "Pendiente"}
                            </Badge>
                          )}
                          {maestro.rutChileno && (
                            <Badge className={`text-xs ${maestro.estadoRut === "definitivo" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"}`} data-testid="badge-rut-status">
                              {maestro.estadoRut === "definitivo" ? <BadgeCheck className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                              {maestro.estadoRut === "definitivo" ? "RUT Definitivo" : maestro.estadoRut === "provisorio" ? "RUT Provisorio" : "RUT"} {maestro.rutChileno}
                            </Badge>
                          )}
                        </div>
                      )}

                      {maestro.bio && <p className="text-sm text-muted-foreground border-t border-border/50 pt-3">{maestro.bio}</p>}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-border/50 pt-3">
                        <div className="text-center p-2 rounded-lg bg-muted/30">
                          <p className="text-lg font-bold font-mono">{rating.toFixed(1)}</p>
                          <p className="text-[10px] text-muted-foreground">Rating</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/30">
                          <p className="text-lg font-bold font-mono">{maestro.ratingCount}</p>
                          <p className="text-[10px] text-muted-foreground">Calificaciones</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/30">
                          <p className="text-lg font-bold font-mono text-emerald-400">{maestro.creditScore}</p>
                          <p className="text-[10px] text-muted-foreground">Score</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/30">
                          <p className="text-lg font-bold font-mono text-blue-400">{maestro.creditBalance} pts</p>
                          <p className="text-[10px] text-muted-foreground">Billetera</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleOpenProfileDialog}
                        className="w-full"
                        data-testid="button-edit-profile"
                      >
                        Editar Perfil
                      </Button>
                    </CardContent>
                  </Card>

                  {/* KYC / Document Verification Card */}
                  <Card className="border-border" data-testid="card-kyc-verification">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-[#c77b3f]" />
                        Verificacion Documental (KYC)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Registra tus documentos para construir confianza con las ferreterias y acceder a credito desde el dia 1.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Foreign Document */}
                        <div className="space-y-3 p-4 rounded-lg border border-border/50 bg-card/50">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            Documento de Origen
                          </h4>
                          <div className="space-y-2">
                            <Label className="text-xs">Tipo de Documento</Label>
                            <Select
                              value={kycForm.tipoDocumentoOrigen}
                              onValueChange={(v) => setKycForm({ ...kycForm, tipoDocumentoOrigen: v })}
                            >
                              <SelectTrigger data-testid="select-tipo-doc">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="dni_extranjero">DNI / Cedula Extranjera</SelectItem>
                                <SelectItem value="pasaporte">Pasaporte</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Numero de Documento</Label>
                            <Input
                              value={kycForm.documentoOrigen}
                              onChange={(e) => setKycForm({ ...kycForm, documentoOrigen: e.target.value })}
                              placeholder="Ej: V-12345678"
                              data-testid="input-documento-origen"
                            />
                          </div>
                        </div>

                        {/* Chilean RUT */}
                        <div className="space-y-3 p-4 rounded-lg border border-border/50 bg-card/50">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-400" />
                            RUT Chileno
                          </h4>
                          <div className="space-y-2">
                            <Label className="text-xs">Estado del RUT</Label>
                            <Select
                              value={kycForm.estadoRut}
                              onValueChange={(v) => setKycForm({ ...kycForm, estadoRut: v })}
                            >
                              <SelectTrigger data-testid="select-estado-rut">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sin_rut">Sin RUT (en tramite)</SelectItem>
                                <SelectItem value="provisorio">RUT Provisorio</SelectItem>
                                <SelectItem value="definitivo">RUT Definitivo</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Numero de RUT</Label>
                            <Input
                              value={kycForm.rutChileno}
                              onChange={(e) => setKycForm({ ...kycForm, rutChileno: e.target.value })}
                              placeholder="Ej: 12.345.678-9"
                              disabled={kycForm.estadoRut === "sin_rut"}
                              data-testid="input-rut-chileno"
                            />
                          </div>
                        </div>
                      </div>

                      <Button
                        className="w-full bg-[#c77b3f] text-white"
                        onClick={() => saveKycMutation.mutate(kycForm)}
                        disabled={saveKycMutation.isPending || (!kycForm.documentoOrigen && !kycForm.rutChileno)}
                        data-testid="button-save-kyc"
                      >
                        {saveKycMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Guardar Documentos
                      </Button>

                      {/* Document Photo Upload */}
                      <div className="border-t border-border/50 pt-4 space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Camera className="w-4 h-4 text-[#c77b3f]" />
                          Foto del Documento (Obligatoria)
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Sube una foto de tu cedula o pasaporte. Esta foto se guarda de forma privada para validar tu identidad ante las ferreterias.
                        </p>
                        {maestro.docPhotoUrl ? (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20" data-testid="doc-photo-verified">
                            <BadgeCheck className="w-5 h-5 text-emerald-400" />
                            <div>
                              <p className="text-sm font-medium text-emerald-400">Documento Verificado</p>
                              <p className="text-xs text-muted-foreground">Tu foto de documento ha sido registrada y tu cuenta esta verificada.</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              ref={docPhotoRef}
                              className="hidden"
                              data-testid="input-doc-photo"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadDocPhotoMutation.mutate(file);
                              }}
                            />
                            <Button
                              variant="outline"
                              className="w-full border-dashed border-2"
                              onClick={() => docPhotoRef.current?.click()}
                              disabled={uploadDocPhotoMutation.isPending}
                              data-testid="button-upload-doc-photo"
                            >
                              {uploadDocPhotoMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4 mr-2" />
                              )}
                              Subir Foto del Documento
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>

        {/* Profile Dialog */}
        <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Hammer className="w-5 h-5 text-[#c77b3f]" />
                {maestro ? "Editar Perfil de Maestro" : "Registrarme como Maestro"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nombre / Alias</Label>
                <Input
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                  placeholder="Ej: Pedro Constructor"
                  data-testid="input-maestro-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Especialidad</Label>
                <Input
                  value={profileForm.specialty}
                  onChange={(e) => setProfileForm({ ...profileForm, specialty: e.target.value })}
                  placeholder="Ej: Gasfitería, Albañilería"
                  data-testid="input-maestro-specialty"
                />
              </div>
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Input
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  placeholder="Ej: Santiago"
                  data-testid="input-maestro-city"
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+56 9 1234 5678"
                  data-testid="input-maestro-phone"
                />
              </div>
              <div className="space-y-2">
                <Label>Sobre ti</Label>
                <Textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  placeholder="Cuéntanos sobre tu experiencia..."
                  rows={3}
                  data-testid="input-maestro-bio"
                />
              </div>
              <Button
                className="w-full bg-[#c77b3f] hover:bg-[#b06a30] text-white"
                onClick={() => saveMutation.mutate(profileForm)}
                disabled={!profileForm.displayName.trim() || saveMutation.isPending}
                data-testid="button-save-profile"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                {maestro ? "Guardar Cambios" : "Crear Perfil de Maestro"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* QR Dialog (Rating) */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#c77b3f]" />
                Codigo QR para Calificacion
              </DialogTitle>
            </DialogHeader>
            {selectedToken && (
              <div className="space-y-4 pt-4">
                <div className="bg-white p-6 rounded-xl flex justify-center">
                  <QRCodeSVG value={`${baseUrl}/rate/${selectedToken}`} size={200} />
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Tu cliente puede escanear este codigo con su celular para calificarte
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${baseUrl}/rate/${selectedToken}`}
                    className="text-xs"
                    data-testid="input-qr-url"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyQrUrl(selectedToken)}
                    data-testid="button-copy-qr"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Withdrawal QR Dialog (Hero) */}
        <Dialog open={heroWithdrawQROpen} onOpenChange={setHeroWithdrawQROpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                QR de Cobro
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Muestra este codigo QR al cliente para que confirme el pago desde su cuenta.
              </p>
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG
                  value={`${baseUrl}/mi-cuenta?withdrawal=${heroWithdrawQRToken}`}
                  size={200}
                  level="H"
                  data-testid="qr-hero-withdraw-code"
                />
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(`${baseUrl}/mi-cuenta?withdrawal=${heroWithdrawQRToken}`);
                  toast({ title: "Enlace copiado", description: "El enlace de cobro ha sido copiado al portapapeles." });
                }}
                data-testid="button-copy-hero-withdraw-link"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Enlace
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

interface EscrowWallet {
  id: number;
  description: string;
  totalAmount: number;
  materialsAmount: number;
  laborAmount: number;
  guaranteeAmount: number;
  guaranteePercent: number;
  status: string;
  maestroAvailable: number;
  maestroBlocked: number;
  ferreteriaAllocated: number;
  guaranteeFund: number;
  clientName?: string;
  clientLeadId?: number;
  milestones: EscrowMilestone[];
  createdAt: string;
}

interface WithdrawalItem {
  id: number;
  amount: number;
  status: string;
  qrToken: string;
  createdAt: string;
  confirmedAt: string | null;
  walletDescription?: string;
}

interface EscrowMilestone {
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
}

function TrustTrackerStepper({ status, variant }: { status: string; variant: "maestro" | "client" }) {
  const steps = [
    { key: "WAITING", label: "Esperando Deposito", icon: CircleDot, color: "text-red-400", bg: "bg-red-500/15 border-red-500/30" },
    { key: "HELD_IN_ESCROW", label: "En Custodia (Escrow)", icon: Shield, color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30" },
    { key: "SPLIT_ALLOCATED", label: "Materiales Pagados", icon: Truck, color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30" },
    { key: "IN_PROGRESS", label: "En Progreso", icon: Hammer, color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
    { key: "COMPLETED", label: "Pago Liberado", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/15 border-green-500/30" },
  ];
  const statusOrder = ["WAITING", "HELD_IN_ESCROW", "SPLIT_ALLOCATED", "IN_PROGRESS", "COMPLETED"];
  const currentIdx = statusOrder.indexOf(status);

  return (
    <div className="space-y-1" data-testid="trust-tracker-stepper">
      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-[#c77b3f]" />
        Trust Tracker — Flujo de Fondos
      </p>
      <div className="flex items-center gap-0">
        {steps.map((step, idx) => {
          const isActive = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          const StepIcon = step.icon;
          return (
            <div key={step.key} className="flex items-center flex-1" data-testid={`step-${step.key}`}>
              <div className={`flex flex-col items-center flex-1 ${isActive ? "" : "opacity-30"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${isCurrent ? step.bg : isActive ? "bg-muted/80 border-border" : "bg-muted/30 border-border"} transition-all`}>
                  <StepIcon className={`w-3.5 h-3.5 ${isCurrent ? step.color : isActive ? "text-foreground" : "text-muted-foreground"}`} />
                </div>
                <p className={`text-[9px] mt-1 text-center leading-tight ${isCurrent ? step.color + " font-medium" : "text-muted-foreground"}`}>
                  {step.label}
                </p>
              </div>
              {idx < steps.length - 1 && (
                <div className={`h-0.5 w-full -mt-4 ${idx < currentIdx ? "bg-emerald-500/40" : "bg-border"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface EscrowNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

function PaymentLinkGenerator({ maestroId }: { maestroId: number }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [linkType, setLinkType] = useState("SECURITY_FEE");
  const [linkAmount, setLinkAmount] = useState("9990");
  const [linkDescription, setLinkDescription] = useState("Fee de Seguridad SmartBuild");
  const [generatedLink, setGeneratedLink] = useState("");

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: linkType,
          amount: Number(linkAmount),
          description: linkDescription,
          maestroId,
          countryCode: "CL",
          expiresInHours: 72,
        }),
      });
      if (!res.ok) throw new Error("Error al generar enlace");
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedLink(data.payUrl);
      toast({ title: "Enlace generado", description: "Comparte el enlace con tu cliente por WhatsApp." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo generar el enlace", variant: "destructive" });
    },
  });

  const shareWhatsApp = () => {
    if (!generatedLink) return;
    const text = `Hola! Paga tu ${linkDescription} de forma segura aqui: ${generatedLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const copyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    toast({ title: "Copiado", description: "Enlace copiado al portapapeles" });
  };

  const presets = [
    { type: "SECURITY_FEE", label: "Fee de Seguridad", amount: "9990", desc: "Fee de Seguridad SmartBuild" },
    { type: "SUBSCRIPTION", label: "Suscripcion Mensual", amount: "9990", desc: "Suscripcion Hogar Seguro - Mensual" },
    { type: "SUBSCRIPTION", label: "Suscripcion Anual", amount: "89900", desc: "Suscripcion Hogar Seguro - Anual" },
    { type: "CUSTOM", label: "Monto Personalizado", amount: "", desc: "" },
  ];

  if (!showForm && !generatedLink) {
    return (
      <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Enlace de Pago Rapido</p>
              <p className="text-xs text-muted-foreground">Genera un link para que tu cliente pague por WhatsApp</p>
            </div>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setShowForm(true)}
              data-testid="button-generate-pay-link"
            >
              Generar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (generatedLink) {
    return (
      <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-transparent">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <p className="text-sm font-medium text-foreground">Enlace Listo</p>
          </div>
          <div className="p-2 bg-background rounded-lg border border-border text-xs text-muted-foreground break-all" data-testid="text-generated-link">
            {generatedLink}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              onClick={shareWhatsApp}
              data-testid="button-share-whatsapp"
            >
              <ArrowUpFromLine className="w-3 h-3 mr-1" />
              Enviar por WhatsApp
            </Button>
            <Button
              variant="outline"
              className="text-xs"
              onClick={copyLink}
              data-testid="button-copy-pay-link"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copiar Enlace
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => { setGeneratedLink(""); setShowForm(true); }}
            data-testid="button-new-pay-link"
          >
            Generar otro enlace
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 to-transparent">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Enlace de Pago Rapido</p>
          <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="h-6 w-6 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((p, i) => (
            <button
              key={i}
              className={`p-2 rounded-lg border text-left text-xs transition-all ${
                linkType === p.type && linkAmount === p.amount
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-border bg-background"
              }`}
              onClick={() => {
                setLinkType(p.type);
                setLinkAmount(p.amount);
                setLinkDescription(p.desc);
              }}
              data-testid={`preset-${p.type.toLowerCase()}-${i}`}
            >
              <p className={`font-medium ${linkType === p.type && linkAmount === p.amount ? "text-emerald-400" : "text-foreground"}`}>{p.label}</p>
              {p.amount && <p className="text-muted-foreground text-[10px]">${Number(p.amount).toLocaleString("es-CL")}</p>}
            </button>
          ))}
        </div>
        {linkType === "CUSTOM" && (
          <div className="space-y-2">
            <Input
              value={linkAmount}
              onChange={(e) => setLinkAmount(e.target.value)}
              placeholder="Monto en CLP"
              type="number"
              className="bg-background border-border h-9 text-sm"
              data-testid="input-custom-amount"
            />
            <Input
              value={linkDescription}
              onChange={(e) => setLinkDescription(e.target.value)}
              placeholder="Descripcion del pago"
              className="bg-background border-border h-9 text-sm"
              data-testid="input-custom-description"
            />
          </div>
        )}
        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
          onClick={() => generateMutation.mutate()}
          disabled={!linkAmount || Number(linkAmount) < 100 || generateMutation.isPending}
          data-testid="button-create-pay-link"
        >
          {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <DollarSign className="w-4 h-4 mr-1" />}
          {generateMutation.isPending ? "Generando..." : "Crear Enlace de Pago"}
        </Button>
      </CardContent>
    </Card>
  );
}

function MaestroBilleteraTab({ maestroId }: { maestroId?: number }) {
  const { toast } = useToast();
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<EscrowMilestone | null>(null);
  const [milestonePhotoUrl, setMilestonePhotoUrl] = useState("");
  const [milestoneNote, setMilestoneNote] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [selectedWalletForWithdraw, setSelectedWalletForWithdraw] = useState<EscrowWallet | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showWithdrawQR, setShowWithdrawQR] = useState(false);
  const [withdrawQRToken, setWithdrawQRToken] = useState("");

  const { data, isLoading } = useQuery<{
    wallets: EscrowWallet[];
    summary: { totalAvailable: number; totalBlocked: number; totalProjects: number };
    notifications: EscrowNotification[];
    unreadCount: number;
  }>({
    queryKey: ["/api/escrow/maestro", maestroId],
    queryFn: async () => {
      const res = await fetch(`/api/escrow/maestro/${maestroId}`);
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    enabled: !!maestroId,
    staleTime: 30_000,
  });

  const submitMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, photoUrl, maestroNote }: { milestoneId: number; photoUrl: string; maestroNote?: string }) => {
      const res = await fetch(`/api/milestones/${milestoneId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl, maestroNote }),
      });
      if (!res.ok) throw new Error("Error al enviar avance");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Avance enviado", description: "Esperando aprobacion del cliente" });
      setSubmitDialogOpen(false);
      setSelectedMilestone(null);
      setMilestonePhotoUrl("");
      setMilestoneNote("");
      queryClient.invalidateQueries({ queryKey: ["/api/escrow/maestro", maestroId] });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo enviar el avance", variant: "destructive" });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/notifications/maestro/${maestroId}/mark-read`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/escrow/maestro", maestroId] });
    },
  });

  const { data: withdrawalsData } = useQuery<WithdrawalItem[]>({
    queryKey: ["/api/withdrawals/maestro", maestroId],
    queryFn: async () => {
      const res = await fetch(`/api/withdrawals/maestro/${maestroId}`);
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    enabled: !!maestroId,
    staleTime: 30_000,
  });

  const withdrawMutation = useMutation({
    mutationFn: async ({ projectWalletId, amount, clientLeadId }: { projectWalletId: number; amount: number; clientLeadId?: number }) => {
      const res = await apiRequest("POST", "/api/withdrawals", {
        projectWalletId,
        maestroId,
        clientLeadId,
        amount,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setWithdrawDialogOpen(false);
      setSelectedWalletForWithdraw(null);
      setWithdrawAmount("");
      setWithdrawQRToken(data.qrToken);
      setShowWithdrawQR(true);
      queryClient.invalidateQueries({ queryKey: ["/api/escrow/maestro", maestroId] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals/maestro", maestroId] });
      toast({ title: "Retiro Solicitado", description: "Muestra el codigo QR al cliente para confirmar." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear la solicitud de retiro.", variant: "destructive" });
    },
  });

  const withdrawals = withdrawalsData || [];

  const withdrawalStatusLabel = (s: string) => {
    switch (s) {
      case "PENDING": return { text: "Pendiente", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
      case "CONFIRMED": return { text: "Confirmado", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
      case "REJECTED": return { text: "Rechazado", color: "bg-red-500/15 text-red-400 border-red-500/30" };
      case "EXPIRED": return { text: "Expirado", color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
      default: return { text: s, color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
    }
  };

  const summary = data?.summary || { totalAvailable: 0, totalBlocked: 0, totalProjects: 0 };
  const wallets = data?.wallets || [];
  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  if (!maestroId) return null;

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#c77b3f]" />
        </CardContent>
      </Card>
    );
  }

  const milestoneStatusLabel = (s: string) => {
    switch (s) {
      case "PENDING": return { text: "Pendiente", color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
      case "SUBMITTED": return { text: "Enviado", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
      case "APPROVED": return { text: "Aprobado", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
      case "REJECTED": return { text: "Rechazado", color: "bg-red-500/15 text-red-400 border-red-500/30" };
      default: return { text: s, color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
    }
  };

  const nextPendingMilestone = (milestones: EscrowMilestone[]) => milestones.find(m => m.status === "PENDING");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border bg-gradient-to-br from-emerald-500/5 to-transparent" data-testid="card-maestro-available">
          <CardContent className="p-4 text-center">
            <Wallet className="w-6 h-6 mx-auto text-emerald-400 mb-1" />
            <p className="text-2xl font-bold text-emerald-400" data-testid="text-available-balance">${summary.totalAvailable.toLocaleString("es-CL")}</p>
            <p className="text-xs text-muted-foreground">Disponible para Retiro</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-gradient-to-br from-amber-500/5 to-transparent" data-testid="card-maestro-blocked">
          <CardContent className="p-4 text-center">
            <Lock className="w-6 h-6 mx-auto text-amber-400 mb-1" />
            <p className="text-2xl font-bold text-amber-400" data-testid="text-blocked-balance">${summary.totalBlocked.toLocaleString("es-CL")}</p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" /> Bloqueado hasta aprobar hitos
            </p>
          </CardContent>
        </Card>
        <Card className="border-border relative" data-testid="card-maestro-notifications">
          <CardContent className="p-4 text-center">
            <div className="relative inline-block">
              <Bell className="w-6 h-6 mx-auto text-[#c77b3f] mb-1" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold" data-testid="badge-unread-count">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">{summary.totalProjects}</p>
            <p className="text-xs text-muted-foreground">Proyectos Activos</p>
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-1 text-[10px] text-[#c77b3f] h-6"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) markReadMutation.mutate();
                }}
                data-testid="button-toggle-notifications"
              >
                {showNotifications ? "Ocultar" : `Ver ${unreadCount} alertas`}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {showNotifications && notifications.length > 0 && (
        <Card className="border-[#c77b3f]/30 bg-gradient-to-r from-[#c77b3f]/5 to-transparent" data-testid="card-notifications">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#c77b3f]" />
              Notificaciones de Transparencia
            </p>
            {notifications.slice(0, 5).map(n => (
              <div key={n.id} className={`p-2.5 rounded-lg border text-xs ${n.read ? "bg-muted/20 border-border" : "bg-[#c77b3f]/5 border-[#c77b3f]/20"}`}>
                <p className="font-medium text-foreground">{n.title}</p>
                <p className="text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-[9px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString("es-CL")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <PaymentLinkGenerator maestroId={maestroId} />

      {wallets.length === 0 ? (
        <Card className="border-border">
          <CardContent className="p-8 text-center">
            <Wallet className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Sin proyectos con Escrow activo</p>
            <p className="text-xs text-muted-foreground mt-1">Cuando un cliente acepte un presupuesto, los fondos apareceran aqui</p>
          </CardContent>
        </Card>
      ) : (
        wallets.map(wallet => {
          const nextMilestone = nextPendingMilestone(wallet.milestones);
          return (
            <Card key={wallet.id} className="border-border" data-testid={`card-escrow-${wallet.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-[#c77b3f]" />
                      {wallet.description}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cliente: {wallet.clientName || "—"} · Total: ${wallet.totalAmount.toLocaleString("es-CL")}
                    </p>
                  </div>
                  {wallet.maestroAvailable > 0 && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shrink-0"
                      onClick={() => {
                        setSelectedWalletForWithdraw(wallet);
                        setWithdrawAmount("");
                        setWithdrawDialogOpen(true);
                      }}
                      data-testid={`button-withdraw-${wallet.id}`}
                    >
                      <QrCode className="w-3 h-3 mr-1" />
                      Solicitar Retiro
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <TrustTrackerStepper status={wallet.status} variant="maestro" />

                {wallet.maestroBlocked > 0 && nextMilestone && (
                  <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20" data-testid="cta-unlock-funds">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Lock className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          ${wallet.maestroBlocked.toLocaleString("es-CL")} bloqueados
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Completa el hito "{nextMilestone.name}" y sube fotos para desbloquear ${nextMilestone.releaseAmount.toLocaleString("es-CL")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-[#c77b3f] hover:bg-[#b06a30] text-white text-xs shrink-0"
                        onClick={() => {
                          setSelectedMilestone(nextMilestone);
                          setSubmitDialogOpen(true);
                        }}
                        data-testid="button-unlock-cta"
                      >
                        <Camera className="w-3 h-3 mr-1" />
                        Desbloquear
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <Truck className="w-3.5 h-3.5 mx-auto text-blue-400 mb-0.5" />
                    <p className="font-bold text-foreground">${wallet.materialsAmount.toLocaleString("es-CL")}</p>
                    <p className="text-muted-foreground">Materiales</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <DollarSign className="w-3.5 h-3.5 mx-auto text-emerald-400 mb-0.5" />
                    <p className="font-bold text-emerald-400">${wallet.maestroAvailable.toLocaleString("es-CL")}</p>
                    <p className="text-muted-foreground">Disponible</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <Lock className="w-3.5 h-3.5 mx-auto text-amber-400 mb-0.5" />
                    <p className="font-bold text-amber-400">${wallet.maestroBlocked.toLocaleString("es-CL")}</p>
                    <p className="text-muted-foreground">Bloqueado</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <Shield className="w-3.5 h-3.5 mx-auto text-blue-400 mb-0.5" />
                    <p className="font-bold text-blue-400">${wallet.guaranteeFund.toLocaleString("es-CL")}</p>
                    <p className="text-muted-foreground">Garantia</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#c77b3f]" />
                    Hitos de Avance
                  </p>
                  {wallet.milestones.map((milestone) => (
                    <div key={milestone.id} className="p-3 bg-muted/30 rounded-lg border border-border" data-testid={`milestone-${milestone.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            {milestone.status === "PENDING" && <Lock className="w-3 h-3 text-amber-400" />}
                            {milestone.status === "APPROVED" && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                            <p className="text-sm font-medium text-foreground">{milestone.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {milestone.releasePercent}% · ${milestone.releaseAmount.toLocaleString("es-CL")}
                          </p>
                          {milestone.rejectedReason && (
                            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Rechazado: {milestone.rejectedReason}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={milestoneStatusLabel(milestone.status).color}>
                            {milestoneStatusLabel(milestone.status).text}
                          </Badge>
                          {milestone.status === "PENDING" && wallet.status !== "HELD_IN_ESCROW" && (
                            <Button
                              size="sm"
                              className="bg-[#c77b3f] hover:bg-[#b06a30] text-white text-xs"
                              onClick={() => {
                                setSelectedMilestone(milestone);
                                setSubmitDialogOpen(true);
                              }}
                              data-testid={`button-submit-milestone-${milestone.id}`}
                            >
                              <Camera className="w-3 h-3 mr-1" />
                              Subir Avance
                            </Button>
                          )}
                          {milestone.status === "SUBMITTED" && (
                            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
                              <Clock className="w-3 h-3 mr-1" />
                              Esperando
                            </Badge>
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
          );
        })
      )}

      {withdrawals.length > 0 && (
        <Card className="border-border" data-testid="card-withdrawals-list">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#c77b3f]" />
              Mis Solicitudes de Retiro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {withdrawals.map((w) => {
              const statusInfo = withdrawalStatusLabel(w.status);
              return (
                <div key={w.id} className="p-3 bg-muted/30 rounded-lg border border-border flex items-center justify-between gap-2 flex-wrap" data-testid={`withdrawal-${w.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      ${w.amount.toLocaleString("es-CL")}
                    </p>
                    {w.walletDescription && (
                      <p className="text-xs text-muted-foreground truncate">{w.walletDescription}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(w.createdAt).toLocaleString("es-CL")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusInfo.color} data-testid={`badge-withdrawal-status-${w.id}`}>
                      {statusInfo.text}
                    </Badge>
                    {w.status === "PENDING" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => {
                          setWithdrawQRToken(w.qrToken);
                          setShowWithdrawQR(true);
                        }}
                        data-testid={`button-show-qr-${w.id}`}
                      >
                        <QrCode className="w-3 h-3 mr-1" />
                        Ver QR
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-500" />
              Solicitar Retiro
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ingresa el monto que deseas retirar de "{selectedWalletForWithdraw?.description}".
              Disponible: <span className="font-bold text-emerald-400">${selectedWalletForWithdraw?.maestroAvailable.toLocaleString("es-CL")}</span>
            </p>
            <div className="space-y-2">
              <Label>Monto a Retirar *</Label>
              <Input
                type="number"
                min={1}
                max={selectedWalletForWithdraw?.maestroAvailable || 0}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder={`Max: $${selectedWalletForWithdraw?.maestroAvailable.toLocaleString("es-CL")}`}
                data-testid="input-withdraw-amount"
              />
              {withdrawAmount && Number(withdrawAmount) > (selectedWalletForWithdraw?.maestroAvailable || 0) && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  El monto excede el disponible
                </p>
              )}
            </div>
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={
                !withdrawAmount ||
                Number(withdrawAmount) <= 0 ||
                Number(withdrawAmount) > (selectedWalletForWithdraw?.maestroAvailable || 0) ||
                withdrawMutation.isPending
              }
              onClick={() => {
                if (selectedWalletForWithdraw) {
                  withdrawMutation.mutate({
                    projectWalletId: selectedWalletForWithdraw.id,
                    amount: Number(withdrawAmount),
                    clientLeadId: selectedWalletForWithdraw.clientLeadId,
                  });
                }
              }}
              data-testid="button-confirm-withdraw"
            >
              {withdrawMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <QrCode className="w-4 h-4 mr-2" />
              )}
              Generar QR de Retiro
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showWithdrawQR} onOpenChange={setShowWithdrawQR}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#c77b3f]" />
              QR de Retiro
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Muestra este codigo QR al cliente para que confirme el retiro desde su cuenta.
            </p>
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCodeSVG
                value={`${window.location.origin}/mi-cuenta?withdrawal=${withdrawQRToken}`}
                size={200}
                level="H"
                data-testid="qr-withdraw-code"
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/mi-cuenta?withdrawal=${withdrawQRToken}`);
                toast({ title: "Enlace copiado", description: "El enlace de retiro ha sido copiado al portapapeles." });
              }}
              data-testid="button-copy-withdraw-link"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Enlace
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#c77b3f]" />
              Subir Avance: {selectedMilestone?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sube una foto del avance de obra para que el cliente pueda aprobar este hito y liberar ${selectedMilestone?.releaseAmount.toLocaleString("es-CL")} a tu billetera.
            </p>
            <div className="space-y-2">
              <Label>URL de la Foto del Avance *</Label>
              <Input
                value={milestonePhotoUrl}
                onChange={(e) => setMilestonePhotoUrl(e.target.value)}
                placeholder="https://ejemplo.com/foto-avance.jpg"
                data-testid="input-milestone-photo"
              />
              <p className="text-[10px] text-muted-foreground">Usa la bitacora para subir fotos primero, luego pega el enlace aqui</p>
            </div>
            <div className="space-y-2">
              <Label>Nota (opcional)</Label>
              <Textarea
                value={milestoneNote}
                onChange={(e) => setMilestoneNote(e.target.value)}
                placeholder="Describe el avance realizado..."
                rows={2}
                data-testid="input-milestone-note"
              />
            </div>
            <Button
              className="w-full bg-[#c77b3f] hover:bg-[#b06a30] text-white"
              disabled={!milestonePhotoUrl.trim() || submitMilestoneMutation.isPending}
              onClick={() => {
                if (selectedMilestone) {
                  submitMilestoneMutation.mutate({
                    milestoneId: selectedMilestone.id,
                    photoUrl: milestonePhotoUrl,
                    maestroNote: milestoneNote || undefined,
                  });
                }
              }}
              data-testid="button-confirm-milestone-submit"
            >
              {submitMilestoneMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Enviar Avance al Cliente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
