import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck,
  Receipt,
  UserPlus,
  Plus,
  Clock,
  CheckCircle2,
  Building2,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  ArrowUpDown,
  Users,
  Briefcase,
  Search,
  ShieldAlert,
  Store,
  Copy,
  Home,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AdminTransaction {
  id: number;
  empresa: string;
  montoTotal: string;
  pagoRetail: string;
  comisionBitcopper: string;
  estado: string;
  createdAt: string;
}

interface RegisteredCustomer {
  id: number;
  name: string;
  email: string;
  rut: string | null;
  company: string | null;
  phone: string | null;
  plan: string | null;
  paymentStatus: string | null;
  amountPaid: string | null;
  isActive: boolean | null;
  createdAt: string | null;
}

interface DemoRequest {
  id: number;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  message: string | null;
  createdAt: string | null;
}

interface PlatformUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: string | null;
  projectCount: number;
  plan: string;
}

interface DistributorWithStats {
  id: number;
  code: string;
  companyName: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean | null;
  createdAt: string | null;
  referralCount: number;
}

function formatCLP(n: number): string {
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

interface HomeownerSub {
  id: number;
  clientLeadId: number | null;
  userId: string | null;
  planType: string;
  status: string;
  hasComplianceInsurance: boolean;
  priorityDispute: boolean;
  monthlyPrice: number;
  startedAt: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
  createdAt: string | null;
  clientName: string;
  clientEmail: string;
}

type AdminTab = "ventas" | "transacciones" | "registros" | "distribuidores" | "suscripciones";

export default function Admin() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<AdminTab>("ventas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [distDialogOpen, setDistDialogOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [newTx, setNewTx] = useState({
    empresa: "",
    montoTotal: "",
    pagoRetail: "",
    comisionBitcopper: "",
  });
  const [newDist, setNewDist] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
  });

  const { data: adminCheck, isLoading: adminCheckLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
  });

  const { data: platformUsers, isLoading: usersLoading } = useQuery<PlatformUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: adminCheck?.isAdmin === true,
  });

  const { data: transactions, isLoading: txLoading } = useQuery<AdminTransaction[]>({
    queryKey: ["/api/admin/transactions"],
    enabled: adminCheck?.isAdmin === true,
  });

  const { data: registrations, isLoading: regLoading } = useQuery<{
    customers: RegisteredCustomer[];
    demoRequests: DemoRequest[];
  }>({
    queryKey: ["/api/admin/registrations"],
    enabled: adminCheck?.isAdmin === true,
  });

  const { data: distributorsList, isLoading: distLoading } = useQuery<DistributorWithStats[]>({
    queryKey: ["/api/admin/distributors"],
    enabled: adminCheck?.isAdmin === true,
  });

  const { data: subscriptionsList } = useQuery<HomeownerSub[]>({
    queryKey: ["/api/admin/subscriptions"],
    enabled: adminCheck?.isAdmin === true,
  });

  const createDistMutation = useMutation({
    mutationFn: async (data: typeof newDist) => {
      const res = await apiRequest("POST", "/api/admin/distributors", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/distributors"] });
      setNewDist({ companyName: "", contactName: "", email: "", phone: "" });
      setDistDialogOpen(false);
      toast({ title: "Distribuidor Creado", description: "El código PARTNER ha sido generado automáticamente." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear el distribuidor.", variant: "destructive" });
    },
  });

  const createTxMutation = useMutation({
    mutationFn: async (data: typeof newTx) => {
      const res = await apiRequest("POST", "/api/admin/transactions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
      setNewTx({ empresa: "", montoTotal: "", pagoRetail: "", comisionBitcopper: "" });
      setDialogOpen(false);
      toast({ title: "Transacción Creada", description: "La transacción ha sido registrada." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear la transacción.", variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: number; estado: string }) => {
      const newEstado = estado === "Pendiente" ? "Pagado" : "Pendiente";
      const res = await apiRequest("PATCH", `/api/admin/transactions/${id}/status`, { estado: newEstado });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/transactions"] });
    },
  });

  if (adminCheckLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8 flex items-center justify-center">
          <Skeleton className="h-32 w-64 rounded-xl" />
        </main>
      </div>
    );
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-8 flex items-center justify-center">
          <Card className="max-w-md w-full border-destructive/30">
            <CardContent className="p-8 text-center">
              <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-destructive/60" />
              <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
              <p className="text-muted-foreground text-sm">
                Esta sección es exclusiva para administradores. Si crees que deberías tener acceso, contacta al soporte.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const allTransactions = transactions || [];
  const totalComision = allTransactions.reduce((s, t) => s + Number(t.comisionBitcopper || 0), 0);
  const totalMonto = allTransactions.reduce((s, t) => s + Number(t.montoTotal || 0), 0);
  const pendingCount = allTransactions.filter((t) => t.estado === "Pendiente").length;

  const customers = registrations?.customers || [];
  const demoReqs = registrations?.demoRequests || [];

  const allUsers = platformUsers || [];
  const filteredUsers = allUsers.filter(u =>
    (u.email || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.firstName || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.lastName || "").toLowerCase().includes(userSearch.toLowerCase())
  );

  const freeUsers = allUsers.filter(u => u.plan === "Gratis").length;
  const activeUsers = allUsers.filter(u => u.projectCount > 0).length;

  const allRegistrations = [
    ...customers.map((c) => ({
      type: "customer" as const,
      name: c.name,
      email: c.email,
      company: c.company,
      phone: c.phone,
      plan: c.plan,
      createdAt: c.createdAt,
    })),
    ...demoReqs.map((d) => ({
      type: "demo" as const,
      name: d.name,
      email: d.email,
      company: d.company,
      phone: d.phone,
      plan: null as string | null,
      createdAt: d.createdAt,
    })),
  ].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

  function handleCreateTx() {
    if (!newTx.empresa || !newTx.montoTotal || !newTx.pagoRetail || !newTx.comisionBitcopper) {
      toast({ title: "Error", description: "Completa todos los campos.", variant: "destructive" });
      return;
    }
    createTxMutation.mutate(newTx);
  }

  function handleCreateDist() {
    if (!newDist.companyName || !newDist.contactName) {
      toast({ title: "Error", description: "Nombre de empresa y contacto son requeridos.", variant: "destructive" });
      return;
    }
    createDistMutation.mutate(newDist);
  }

  const allDistributors = distributorsList || [];
  const totalReferrals = allDistributors.reduce((s, d) => s + d.referralCount, 0);
  const activeDistributors = allDistributors.filter(d => d.isActive).length;

  const allSubs = subscriptionsList || [];
  const activeSubs = allSubs.filter(s => s.status === "ACTIVE").length;
  const totalSubRevenue = allSubs.filter(s => s.status === "ACTIVE").reduce((s, sub) => s + sub.monthlyPrice, 0);

  const tabs: { id: AdminTab; label: string; icon: typeof Users }[] = [
    { id: "ventas", label: "Dashboard de Ventas", icon: Users },
    { id: "transacciones", label: "Transacciones", icon: Receipt },
    { id: "suscripciones", label: "Suscripciones Hogar", icon: Home },
    { id: "distribuidores", label: "Distribuidores", icon: Store },
    { id: "registros", label: "Registros", icon: UserPlus },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#c77b3f]/10 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-[#c77b3f]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-admin-title">
                Panel Administrador
              </h1>
              <p className="text-sm text-muted-foreground">Bitcopper Tech SpA — Control de Gestión</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-border pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-[#c77b3f]/15 text-[#c77b3f] border border-[#c77b3f]/30"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "ventas" && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-[#c77b3f]/20 bg-[#c77b3f]/5" data-testid="card-total-users">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#c77b3f]/10 rounded-lg">
                      <Users className="w-4 h-4 text-[#c77b3f]" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Usuarios</p>
                      <p className="text-xl font-bold font-mono" data-testid="text-total-users">
                        {allUsers.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-500/20 bg-blue-500/5" data-testid="card-free-users">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <UserPlus className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Plan Gratis</p>
                      <p className="text-xl font-bold font-mono text-blue-400" data-testid="text-free-users">
                        {freeUsers}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-emerald-500/20 bg-emerald-500/5" data-testid="card-active-users">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <Briefcase className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Con Proyectos</p>
                      <p className="text-xl font-bold font-mono text-emerald-400" data-testid="text-active-users">
                        {activeUsers}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-amber-500/20 bg-amber-500/5" data-testid="card-leads">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <Mail className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Leads (Registros)</p>
                      <p className="text-xl font-bold font-mono text-amber-400" data-testid="text-leads-count">
                        {customers.length + demoReqs.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border" data-testid="card-users-table">
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-4 h-4 text-[#c77b3f]" />
                    Usuarios de la Plataforma
                  </CardTitle>
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 max-w-xs w-full">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuario..."
                      className="border-none bg-transparent shadow-none focus-visible:ring-0 p-0 text-sm h-7"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      data-testid="input-search-users"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {usersLoading ? (
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No hay usuarios registrados.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50 hover:bg-transparent">
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Nombre</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Email</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">Proyectos</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">Plan</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Registro</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id} className="border-border/30" data-testid={`row-user-${user.id}`}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {user.profileImageUrl ? (
                                  <img src={user.profileImageUrl} alt="" className="w-7 h-7 rounded-full" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                    {(user.firstName || user.email || "U").charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span data-testid={`text-user-name-${user.id}`}>
                                  {user.firstName
                                    ? `${user.firstName} ${user.lastName || ""}`.trim()
                                    : "Sin nombre"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground" data-testid={`text-user-email-${user.id}`}>
                              {user.email || "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="font-mono text-xs" data-testid={`text-user-projects-${user.id}`}>
                                {user.projectCount}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs"
                                data-testid={`text-user-plan-${user.id}`}
                              >
                                {user.plan}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground" data-testid={`text-user-date-${user.id}`}>
                              {user.createdAt
                                ? format(new Date(user.createdAt), "dd MMM yyyy", { locale: es })
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "transacciones" && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="border-[#c77b3f]/20 bg-[#c77b3f]/5" data-testid="card-total-monto">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#c77b3f]/10 rounded-lg">
                      <DollarSign className="w-4 h-4 text-[#c77b3f]" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Monto Total Transacciones</p>
                      <p className="text-xl font-bold font-mono" data-testid="text-total-monto">
                        {formatCLP(totalMonto)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-emerald-500/20 bg-emerald-500/5" data-testid="card-total-comision">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <Receipt className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Comisión Bitcopper Acumulada</p>
                      <p className="text-xl font-bold font-mono text-emerald-400" data-testid="text-total-comision">
                        {formatCLP(totalComision)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-amber-500/20 bg-amber-500/5" data-testid="card-pending-count">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg">
                      <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Transacciones Pendientes</p>
                      <p className="text-xl font-bold font-mono text-amber-400" data-testid="text-pending-count">
                        {pendingCount}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border" data-testid="card-transactions-table">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ArrowUpDown className="w-4 h-4 text-[#c77b3f]" />
                    Transacciones
                  </CardTitle>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-[#c77b3f] hover:bg-[#b06a30] text-white" data-testid="button-new-transaction">
                        <Plus className="w-4 h-4 mr-1" />
                        Nueva Transacción
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Registrar Transacción</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Empresa</Label>
                          <Input
                            value={newTx.empresa}
                            onChange={(e) => setNewTx({ ...newTx, empresa: e.target.value })}
                            placeholder="Nombre de la empresa"
                            data-testid="input-tx-empresa"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Monto Total (CLP)</Label>
                          <Input
                            type="number"
                            value={newTx.montoTotal}
                            onChange={(e) => setNewTx({ ...newTx, montoTotal: e.target.value })}
                            placeholder="0"
                            data-testid="input-tx-monto"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Pago al Retail (CLP)</Label>
                          <Input
                            type="number"
                            value={newTx.pagoRetail}
                            onChange={(e) => setNewTx({ ...newTx, pagoRetail: e.target.value })}
                            placeholder="0"
                            data-testid="input-tx-retail"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Comisión Bitcopper (CLP)</Label>
                          <Input
                            type="number"
                            value={newTx.comisionBitcopper}
                            onChange={(e) => setNewTx({ ...newTx, comisionBitcopper: e.target.value })}
                            placeholder="0"
                            data-testid="input-tx-comision"
                          />
                        </div>
                        <Button
                          className="w-full bg-[#c77b3f] hover:bg-[#b06a30] text-white"
                          onClick={handleCreateTx}
                          disabled={createTxMutation.isPending}
                          data-testid="button-submit-transaction"
                        >
                          {createTxMutation.isPending ? "Guardando..." : "Registrar Transacción"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {txLoading ? (
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : allTransactions.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No hay transacciones registradas.</p>
                    <p className="text-xs mt-1">Usa el botón "Nueva Transacción" para comenzar.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50 hover:bg-transparent">
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Empresa</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Monto Total</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Pago Retail</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Comisión</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">Estado</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allTransactions.map((tx) => (
                          <TableRow key={tx.id} className="border-border/30" data-testid={`row-transaction-${tx.id}`}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                {tx.empresa}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatCLP(Number(tx.montoTotal))}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatCLP(Number(tx.pagoRetail))}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-emerald-400">
                              {formatCLP(Number(tx.comisionBitcopper))}
                            </TableCell>
                            <TableCell className="text-center">
                              <button
                                onClick={() => toggleStatusMutation.mutate({ id: tx.id, estado: tx.estado || "Pendiente" })}
                                data-testid={`button-toggle-status-${tx.id}`}
                              >
                                <Badge
                                  className={
                                    tx.estado === "Pagado"
                                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 cursor-pointer"
                                      : "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25 cursor-pointer"
                                  }
                                >
                                  {tx.estado === "Pagado" ? (
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                  ) : (
                                    <Clock className="w-3 h-3 mr-1" />
                                  )}
                                  {tx.estado || "Pendiente"}
                                </Badge>
                              </button>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {tx.createdAt
                                ? format(new Date(tx.createdAt), "dd MMM yyyy", { locale: es })
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "distribuidores" && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="border-[#c77b3f]/20 bg-[#c77b3f]/5" data-testid="card-total-distributors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#c77b3f]/10 rounded-lg">
                      <Store className="w-4 h-4 text-[#c77b3f]" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Distribuidores</p>
                      <p className="text-xl font-bold font-mono" data-testid="text-total-distributors">
                        {allDistributors.length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-emerald-500/20 bg-emerald-500/5" data-testid="card-active-distributors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Activos</p>
                      <p className="text-xl font-bold font-mono text-emerald-400" data-testid="text-active-distributors">
                        {activeDistributors}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-500/20 bg-blue-500/5" data-testid="card-total-referrals">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Users className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Referidos</p>
                      <p className="text-xl font-bold font-mono text-blue-400" data-testid="text-total-referrals">
                        {totalReferrals}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border" data-testid="card-distributors-table">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Store className="w-4 h-4 text-[#c77b3f]" />
                    Distribuidores y Partners
                  </CardTitle>
                  <Dialog open={distDialogOpen} onOpenChange={setDistDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-[#c77b3f] hover:bg-[#b06a30] text-white" data-testid="button-new-distributor">
                        <Plus className="w-4 h-4 mr-1" />
                        Nuevo Distribuidor
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Registrar Distribuidor</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Empresa / Ferretería</Label>
                          <Input
                            value={newDist.companyName}
                            onChange={(e) => setNewDist({ ...newDist, companyName: e.target.value })}
                            placeholder="Ej: Ferretería Central"
                            data-testid="input-dist-company"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nombre de Contacto</Label>
                          <Input
                            value={newDist.contactName}
                            onChange={(e) => setNewDist({ ...newDist, contactName: e.target.value })}
                            placeholder="Ej: Juan Pérez"
                            data-testid="input-dist-contact"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={newDist.email}
                            onChange={(e) => setNewDist({ ...newDist, email: e.target.value })}
                            placeholder="contacto@ferreteria.cl"
                            data-testid="input-dist-email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Teléfono</Label>
                          <Input
                            value={newDist.phone}
                            onChange={(e) => setNewDist({ ...newDist, phone: e.target.value })}
                            placeholder="+56 9 1234 5678"
                            data-testid="input-dist-phone"
                          />
                        </div>
                        <Button
                          className="w-full bg-[#c77b3f] hover:bg-[#b06a30] text-white"
                          onClick={handleCreateDist}
                          disabled={createDistMutation.isPending}
                          data-testid="button-submit-distributor"
                        >
                          {createDistMutation.isPending ? "Creando..." : "Crear Distribuidor"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {distLoading ? (
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : allDistributors.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Store className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No hay distribuidores registrados.</p>
                    <p className="text-xs mt-1">Usa el botón "Nuevo Distribuidor" para crear el primero.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50 hover:bg-transparent">
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Empresa</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Contacto</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Código</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">Total Referidos</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">Estado</TableHead>
                          <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allDistributors.map((dist) => (
                          <TableRow key={dist.id} className="border-border/30" data-testid={`row-distributor-${dist.id}`}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Store className="w-3.5 h-3.5 text-muted-foreground" />
                                <div>
                                  <span>{dist.companyName}</span>
                                  {dist.email && (
                                    <p className="text-xs text-muted-foreground">{dist.email}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <span>{dist.contactName}</span>
                              {dist.phone && (
                                <p className="text-xs text-muted-foreground">{dist.phone}</p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs tracking-wider" data-testid={`text-dist-code-${dist.id}`}>
                                {dist.code}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-lg font-bold font-mono text-blue-400" data-testid={`text-dist-referrals-${dist.id}`}>
                                {dist.referralCount}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                className={
                                  dist.isActive
                                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs"
                                    : "bg-red-500/15 text-red-400 border-red-500/30 text-xs"
                                }
                              >
                                {dist.isActive ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {dist.createdAt
                                ? format(new Date(dist.createdAt), "dd MMM yyyy", { locale: es })
                                : "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "registros" && (
          <Card className="border-border" data-testid="card-registrations-panel">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="w-4 h-4 text-[#c77b3f]" />
                Nuevos Registros y Solicitudes de Demo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {regLoading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : allRegistrations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Sin registros recientes.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Nombre</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Email</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Empresa</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Teléfono</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Plan</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allRegistrations.map((reg, i) => (
                        <TableRow key={`${reg.email}-${i}`} className="border-border/30" data-testid={`row-registration-${i}`}>
                          <TableCell>
                            <Badge
                              className={
                                reg.type === "customer"
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]"
                                  : "bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]"
                              }
                            >
                              {reg.type === "customer" ? "Cliente" : "Demo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-sm">{reg.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{reg.email}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{reg.company || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{reg.phone || "—"}</TableCell>
                          <TableCell>
                            {reg.plan ? (
                              <Badge variant="outline" className="text-xs">{reg.plan}</Badge>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {reg.createdAt
                              ? format(new Date(reg.createdAt), "dd MMM yyyy", { locale: es })
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "suscripciones" && (
          <Card className="border-border/50" data-testid="card-subscriptions-tab">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Home className="w-5 h-5 text-[#c77b3f]" />
                Suscripciones Hogar Seguro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <Card className="border-[#c77b3f]/20 bg-[#c77b3f]/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#c77b3f]/10 rounded-lg">
                        <Home className="w-4 h-4 text-[#c77b3f]" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Suscripciones</p>
                        <p className="text-xl font-bold font-mono" data-testid="text-total-subs">{allSubs.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-emerald-500/20 bg-emerald-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Activas</p>
                        <p className="text-xl font-bold font-mono text-emerald-400" data-testid="text-active-subs">{activeSubs}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-blue-500/20 bg-blue-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <DollarSign className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ingreso Mensual</p>
                        <p className="text-xl font-bold font-mono text-blue-400" data-testid="text-sub-revenue">{formatCLP(totalSubRevenue)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {allSubs.length === 0 ? (
                <div className="text-center py-12">
                  <Home className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground text-sm">Sin suscripciones aún</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Los clientes pueden suscribirse desde su panel "Mi Hogar Seguro"</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Cliente</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Email</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Plan</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Precio</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Estado</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Seguro</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Inicio</TableHead>
                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Expira</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allSubs.map(sub => (
                        <TableRow key={sub.id} className="border-border/30" data-testid={`row-sub-${sub.id}`}>
                          <TableCell className="font-medium text-sm">
                            <div className="flex items-center gap-2">
                              <Home className="w-3.5 h-3.5 text-muted-foreground" />
                              {sub.clientName}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{sub.clientEmail}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {sub.planType === "MONTHLY" ? "Mensual" : "Anual"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{formatCLP(sub.monthlyPrice)}/mes</TableCell>
                          <TableCell>
                            <Badge className={
                              sub.status === "ACTIVE"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]"
                                : sub.status === "CANCELLED"
                                ? "bg-red-500/15 text-red-400 border-red-500/30 text-[10px]"
                                : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30 text-[10px]"
                            }>
                              {sub.status === "ACTIVE" ? "Activa" : sub.status === "CANCELLED" ? "Cancelada" : "Expirada"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {sub.hasComplianceInsurance ? (
                              <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]">
                                <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                                Seguro
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {sub.startedAt ? format(new Date(sub.startedAt), "dd MMM yyyy", { locale: es }) : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {sub.expiresAt ? format(new Date(sub.expiresAt), "dd MMM yyyy", { locale: es }) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
