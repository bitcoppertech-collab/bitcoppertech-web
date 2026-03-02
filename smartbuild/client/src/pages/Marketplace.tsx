import { useState, useEffect } from "react";
import { useSearch, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCart,
  Hammer,
  Star,
  Search,
  Package,
  Phone,
  Mail,
  User,
  Send,
  CheckCircle2,
  Loader2,
  Shield,
  Flame,
  Crown,
  Store,
  Sparkles,
  Tag,
  ArrowRight,
  Share2,
  Copy,
  Gift,
  MessageCircle,
  Percent,
  Building2,
  Wallet,
  X,
  Plus,
  Minus,
  CreditCard,
  Banknote,
} from "lucide-react";
import bitcoperLogo from "@/assets/images/bitcoper-logo.png";
import { fc, activeConfig } from "@/lib/i18n";

interface CatalogItem {
  id: string;
  category: string;
  keywords: string[];
  sodimac: { name: string; brand: string; sku: string; price: number; unit: string; stock: boolean };
  easy: { name: string; brand: string; sku: string; price: number; unit: string; stock: boolean };
  bestPrice: number;
  bestSupplier: string;
}

interface MaestroPublic {
  id: number;
  displayName: string;
  specialty: string;
  city: string;
  avgRating: string;
  ratingCount: number;
  kycVerified: boolean;
  hasActiveBadge: boolean;
  level: string;
}

interface CartItem {
  name: string;
  price: number;
  quantity: number;
  supplier: string;
  unit: string;
}

export default function Marketplace() {
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const refParam = urlParams.get("ref") || "";
  const maestroParam = urlParams.get("maestro") || "";
  const maestroNameParam = urlParams.get("maestroName") || "";
  const maestroLevelParam = urlParams.get("level") || "";
  const couponParam = urlParams.get("coupon") || "";
  const [, navigate] = useLocation();

  const isFromMaestro = !!maestroParam || !!maestroNameParam;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutType, setCheckoutType] = useState<"direct_purchase" | "budget_request">("direct_purchase");
  const [selectedMaestro, setSelectedMaestro] = useState<number | null>(maestroParam ? parseInt(maestroParam) : null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [cityFilter, setCityFilter] = useState("");
  const [showMaestroDialog, setShowMaestroDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const { data: catalog, isLoading: catalogLoading } = useQuery<CatalogItem[]>({
    queryKey: ["/api/marketplace/catalog"],
  });

  const { data: maestros } = useQuery<MaestroPublic[]>({
    queryKey: ["/api/marketplace/maestros", cityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (cityFilter) params.set("city", cityFilter);
      params.set("minRating", "3");
      const res = await fetch(`/api/marketplace/maestros?${params}`);
      return res.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/marketplace/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientPhone,
          clientEmail,
          requestType: checkoutType,
          items: cart.map(item => ({ name: item.name, price: item.price, quantity: item.quantity, supplier: item.supplier })),
          maestroId: checkoutType === "budget_request" ? selectedMaestro : null,
          referringMaestroId: maestroParam ? parseInt(maestroParam) : null,
          notes: notes || undefined,
          referralCode: refParam || undefined,
          paymentGateway: selectedGateway || undefined,
          countryCode: activeConfig().code,
        }),
      });
      if (!res.ok) throw new Error("Error al enviar solicitud");
      return res.json();
    },
    onSuccess: (data) => {
      setSubmitSuccess(true);
      setSuccessData(data);
    },
  });

  const categories = catalog ? Array.from(new Set(catalog.map(item => item.category))) : [];

  const filteredCatalog = catalog?.filter(item => {
    if (!searchTerm && selectedCategory === "all") return true;
    const term = searchTerm.toLowerCase();
    const itemName = (item.sodimac?.name || item.easy?.name || "").toLowerCase();
    const cat = (item.category || "").toLowerCase();
    const keywordsMatch = item.keywords?.some(k => k.toLowerCase().includes(term)) || false;
    const matchesSearch = !searchTerm || itemName.includes(term) || cat.includes(term) || keywordsMatch;
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const addToCart = (item: CatalogItem) => {
    const targetName = item.bestSupplier === "Sodimac" ? item.sodimac.name : item.easy.name;
    const existing = cart.find(c => c.name === targetName);
    if (existing) {
      setCart(cart.map(c => c.name === existing.name ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      const bestItem = item.bestSupplier === "Easy" ? item.easy : item.sodimac;
      setCart([...cart, { name: bestItem.name, price: item.bestPrice, quantity: 1, supplier: item.bestSupplier || "Sodimac", unit: bestItem.unit }]);
    }
  };

  const removeFromCart = (index: number) => setCart(cart.filter((_, i) => i !== index));
  const updateQuantity = (index: number, qty: number) => {
    if (qty <= 0) return removeFromCart(index);
    setCart(cart.map((item, i) => i === index ? { ...item, quantity: qty } : item));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const isFormValid = clientName.trim() && clientPhone.trim().length >= 8 && clientEmail.includes("@");
  const cities = Array.from(new Set(maestros?.map(m => m.city).filter(Boolean) || []));

  const shareWhatsApp = () => {
    const link = `${window.location.origin}/marketplace${refParam ? `?ref=${refParam}` : ""}`;
    const text = `Materiales de construccion a precios mayoristas! Compra directo o pide presupuesto a un Maestro certificado. Usa mi enlace y ambos ganamos ${fc(5000)}: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const copyLink = () => {
    const link = `${window.location.origin}/marketplace${refParam ? `?ref=${refParam}` : ""}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (submitSuccess && successData) {
    return (
      <div className="min-h-screen bg-[#0f1729] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Card className="bg-[#1a2744] border-emerald-500/20">
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-white" data-testid="text-request-success">¡Solicitud Enviada!</h2>
              <p className="text-sm text-zinc-400">{successData.message}</p>

              {successData.splitDetails && (
                <div className="p-3 bg-[#0f1729] rounded-xl border border-zinc-700/30 space-y-2" data-testid="section-split-details">
                  <p className="text-xs text-[#c77b3f] font-medium flex items-center justify-center gap-1">
                    <Percent className="w-3 h-3" />
                    Distribución del Pago
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-[#1a2744] rounded-lg">
                      <Building2 className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                      <p className="text-xs font-bold text-white">{fc(Number(successData.splitDetails.ferreteria))}</p>
                      <p className="text-[9px] text-zinc-500">Ferretería (85%)</p>
                    </div>
                    <div className="p-2 bg-[#1a2744] rounded-lg">
                      <Store className="w-4 h-4 mx-auto text-[#c77b3f] mb-1" />
                      <p className="text-xs font-bold text-white">{fc(Number(successData.splitDetails.bitcopper))}</p>
                      <p className="text-[9px] text-zinc-500">Bitcopper (12%)</p>
                    </div>
                    <div className="p-2 bg-[#1a2744] rounded-lg">
                      <Hammer className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
                      <p className="text-xs font-bold text-white">{fc(Number(successData.splitDetails.cashbackMaestro))}</p>
                      <p className="text-[9px] text-zinc-500">Maestro (3%)</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#1a2744] border-green-500/20">
            <CardContent className="p-5 space-y-3">
              <div className="text-center">
                <p className="text-sm font-bold text-white flex items-center justify-center gap-2">
                  <Share2 className="w-4 h-4 text-green-400" />
                  ¿Tienes vecinos remodelando?
                </p>
                <p className="text-xs text-emerald-400 mt-1">Comparte y ambos ganan {fc(5000)} en materiales</p>
              </div>
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-11" onClick={shareWhatsApp} data-testid="button-share-whatsapp-success">
                <MessageCircle className="w-5 h-5 mr-2" />
                Compartir por WhatsApp
              </Button>
              <Button className="w-full bg-[#c77b3f] hover:bg-[#b06a30] text-white" onClick={() => { setSubmitSuccess(false); setCart([]); setShowCheckout(false); }} data-testid="button-continue-shopping">
                Seguir Comprando
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1729]">
      <header className="bg-[#1a2744] border-b border-zinc-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/marketplace")}>
            <img src={bitcoperLogo} alt="SmartBuild" className="w-8 h-8 rounded-lg" />
            <div>
              <h1 className="text-lg font-bold text-white">SmartBuild Marketplace</h1>
              <p className="text-xs text-zinc-400">Ferreterías Aliadas · Precios Mayoristas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(refParam || couponParam) && (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs hidden sm:flex" data-testid="badge-referred">
                <Gift className="w-3 h-3 mr-1" />
                {couponParam ? couponParam : "Invitado"}
              </Badge>
            )}
            <Button variant="outline" size="sm" className="border-zinc-600 text-zinc-300 hover:bg-zinc-700" onClick={() => navigate("/mi-cuenta")} data-testid="button-go-mi-cuenta">
              <Wallet className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Mi Cuenta</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-[#c77b3f] text-[#c77b3f] hover:bg-[#c77b3f]/10 relative"
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0}
              data-testid="button-view-cart"
            >
              <ShoppingCart className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Carrito</span> ({cart.length})
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#c77b3f] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{cart.length}</span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {isFromMaestro && (
        <div className="bg-gradient-to-r from-[#1a2744] via-[#1f3058] to-[#1a2744] border-b border-[#c77b3f]/20" data-testid="section-maestro-hero">
          <div className="max-w-7xl mx-auto px-4 py-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#c77b3f]/10 flex items-center justify-center shrink-0">
                <Hammer className="w-7 h-7 text-[#c77b3f]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-white" data-testid="text-maestro-hero-name">{maestroNameParam || "Tu Maestro"}</h2>
                  {maestroLevelParam && (
                    <Badge className={`text-[10px] ${maestroLevelParam === "Master" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : maestroLevelParam === "Experto" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"}`}>
                      <Crown className="w-2.5 h-2.5 mr-0.5" />{maestroLevelParam}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-emerald-400 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                  Por ser cliente de <strong>{maestroNameParam}</strong>, accedes a <strong>precios mayoristas</strong> de nuestras ferreterías aliadas.
                </p>
              </div>
            </div>
            {couponParam && (
              <div className="mt-3 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-400">Cupón activo:</span>
                  <span className="text-sm font-bold font-mono text-white" data-testid="text-active-coupon">{couponParam}</span>
                </div>
                <span className="text-xs text-emerald-400 font-medium">10% OFF</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar materiales (cemento, fierro, madera...)" className="bg-[#1a2744] border-zinc-700 text-white pl-9" data-testid="input-search-catalog" />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48 bg-[#1a2744] border-zinc-700 text-white">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Categorías</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {catalogLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#c77b3f]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCatalog.map((item, idx) => (
              <Card key={idx} className="bg-[#1a2744] border-zinc-700/50 hover:border-[#c77b3f]/30 transition-colors" data-testid={`card-product-${idx}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white leading-tight">{item.sodimac.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{item.category}</p>
                    </div>
                    <Badge className="bg-[#c77b3f]/15 text-[#c77b3f] border-[#c77b3f]/30 text-[10px] shrink-0">{item.bestSupplier}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-[#0f1729] rounded-lg">
                      <p className="text-[10px] text-zinc-500">Sodimac</p>
                      <p className="text-sm font-bold text-white">{fc(item.sodimac.price)}</p>
                      <p className="text-[10px] text-zinc-500">{item.sodimac.brand}</p>
                      <Badge className={`text-[9px] mt-1 ${item.sodimac.stock ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                        {item.sodimac.stock ? "En Stock" : "Sin Stock"}
                      </Badge>
                    </div>
                    <div className="p-2 bg-[#0f1729] rounded-lg">
                      <p className="text-[10px] text-zinc-500">Easy</p>
                      <p className="text-sm font-bold text-white">{fc(item.easy.price)}</p>
                      <p className="text-[10px] text-zinc-500">{item.easy.brand}</p>
                      <Badge className={`text-[9px] mt-1 ${item.easy.stock ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                        {item.easy.stock ? "En Stock" : "Sin Stock"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-400">Mejor Precio</p>
                      <p className="text-lg font-bold text-emerald-400">{fc(item.bestPrice)}</p>
                    </div>
                    <Button size="sm" className="bg-[#c77b3f] hover:bg-[#b06a30] text-white text-xs" onClick={() => addToCart(item)} data-testid={`button-add-cart-${idx}`}>
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      Agregar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredCatalog.length === 0 && !catalogLoading && (
          <div className="text-center py-20">
            <Package className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
            <p className="text-zinc-400">No se encontraron productos</p>
          </div>
        )}
      </div>

      {!isFromMaestro && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-40">
          <Card className="bg-green-600/95 border-green-500 backdrop-blur-sm shadow-lg">
            <CardContent className="p-3 flex items-center gap-3">
              <MessageCircle className="w-8 h-8 text-white shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-bold text-white">¿Vecinos remodelando?</p>
                <p className="text-[10px] text-green-100">Comparte y gana {fc(5000)}</p>
              </div>
              <Button size="sm" className="bg-white text-green-700 hover:bg-green-50 text-xs shrink-0" onClick={shareWhatsApp} data-testid="button-whatsapp-float">
                Compartir
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowCheckout(false); }}>
          <Card className="w-full sm:max-w-lg bg-[#1a2744] border-zinc-700/50 max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#c77b3f]" />
                  Tu Carrito
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-zinc-400 h-8 w-8 p-0" onClick={() => setShowCheckout(false)} data-testid="button-close-cart">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-zinc-400 text-sm text-center py-4">Tu carrito está vacío</p>
              ) : (
                <>
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-[#0f1729] rounded-lg" data-testid={`cart-item-${idx}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{item.name}</p>
                        <p className="text-xs text-zinc-500">{item.supplier} · {fc(item.price)}/{item.unit}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="ghost" className="text-zinc-400 h-7 w-7 p-0" onClick={() => updateQuantity(idx, item.quantity - 1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-white text-sm w-6 text-center">{item.quantity}</span>
                        <Button size="sm" variant="ghost" className="text-zinc-400 h-7 w-7 p-0" onClick={() => updateQuantity(idx, item.quantity + 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-400 h-7 w-7 p-0 ml-1" onClick={() => removeFromCart(idx)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-300">Total Estimado</span>
                      <span className="text-lg font-bold text-emerald-400" data-testid="text-cart-total">{fc(cartTotal)}</span>
                    </div>
                    {couponParam && (
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-emerald-400 flex items-center gap-1"><Tag className="w-3 h-3" />Cupon {couponParam}</span>
                        <span className="text-xs font-bold text-emerald-400">-10%</span>
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-emerald-500/20">
                      <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        Distribucion: 85% Ferreteria · 12% Bitcopper · 3% Cashback Maestro
                      </p>
                    </div>
                  </div>

                  <PaymentGatewaySelector
                    amount={cartTotal}
                    selectedGateway={selectedGateway}
                    onSelect={setSelectedGateway}
                  />

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-zinc-300">¿Cómo deseas proceder?</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={checkoutType === "direct_purchase" ? "default" : "outline"}
                        className={checkoutType === "direct_purchase" ? "bg-[#c77b3f] hover:bg-[#b06a30] text-white" : "border-zinc-600 text-zinc-300 hover:bg-zinc-700"}
                        onClick={() => { setCheckoutType("direct_purchase"); if (!maestroParam) setSelectedMaestro(null); }}
                        data-testid="button-checkout-diy"
                      >
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        Comprar (DIY)
                      </Button>
                      <Button
                        variant={checkoutType === "budget_request" ? "default" : "outline"}
                        className={checkoutType === "budget_request" ? "bg-[#c77b3f] hover:bg-[#b06a30] text-white" : "border-zinc-600 text-zinc-300 hover:bg-zinc-700"}
                        onClick={() => { setCheckoutType("budget_request"); if (!selectedMaestro) setShowMaestroDialog(true); }}
                        data-testid="button-checkout-maestro"
                      >
                        <Hammer className="w-4 h-4 mr-1" />
                        Pedir Presupuesto
                      </Button>
                    </div>

                    {checkoutType === "budget_request" && selectedMaestro && (
                      <div className="p-2 bg-[#0f1729] rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-xs text-zinc-400">Maestro seleccionado:</p>
                          <p className="text-sm text-white font-medium">{maestroNameParam || maestros?.find(m => m.id === selectedMaestro)?.displayName}</p>
                        </div>
                        {!maestroParam && (
                          <Button size="sm" variant="ghost" className="text-zinc-400" onClick={() => setShowMaestroDialog(true)}>Cambiar</Button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    <p className="text-xs text-[#c77b3f] font-medium">Tus datos de contacto</p>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                      <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre completo *" className="bg-[#0f1729] border-zinc-700 text-white pl-9" data-testid="input-checkout-name" />
                    </div>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                      <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Teléfono *" className="bg-[#0f1729] border-zinc-700 text-white pl-9" data-testid="input-checkout-phone" />
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                      <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Correo *" type="email" className="bg-[#0f1729] border-zinc-700 text-white pl-9" data-testid="input-checkout-email" />
                    </div>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas adicionales (opcional)" rows={2} className="bg-[#0f1729] border-zinc-700 text-white" data-testid="input-checkout-notes" />
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#0f1729] rounded-lg border border-zinc-700/50">
                    <Checkbox
                      id="accept-terms"
                      checked={acceptedTerms}
                      onCheckedChange={(v) => setAcceptedTerms(v === true)}
                      className="mt-0.5 border-zinc-500 data-[state=checked]:bg-[#c77b3f] data-[state=checked]:border-[#c77b3f]"
                      data-testid="checkbox-accept-terms"
                    />
                    <label htmlFor="accept-terms" className="text-xs text-zinc-400 leading-relaxed cursor-pointer select-none">
                      Al continuar, acepto los <span className="text-[#e8a563] font-medium">Términos y Condiciones</span> y autorizo a Smart Build Apu a custodiar estos fondos en garantía (Escrow). Entiendo que la plataforma actúa como intermediario tecnológico de confianza y que los pagos a proveedores o maestros se liberarán únicamente contra el cumplimiento de los hitos establecidos.
                    </label>
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-[#c77b3f] to-[#e8a563] hover:from-[#b06a30] hover:to-[#c77b3f] text-white font-medium h-11"
                    onClick={() => submitMutation.mutate()}
                    disabled={!isFormValid || !acceptedTerms || submitMutation.isPending || (checkoutType === "budget_request" && !selectedMaestro)}
                    data-testid="button-submit-request"
                  >
                    {submitMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    {checkoutType === "direct_purchase" ? "Confirmar Compra" : "Solicitar Presupuesto al Maestro"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {showMaestroDialog && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-[#1a2744] border-zinc-700/50 max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-lg">Elige un Maestro Certificado</CardTitle>
                <Button variant="ghost" size="sm" className="text-zinc-400" onClick={() => setShowMaestroDialog(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-2">
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger className="bg-[#0f1729] border-zinc-700 text-white">
                    <SelectValue placeholder="Filtrar por Ciudad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las Ciudades</SelectItem>
                    {cities.map(city => (
                      <SelectItem key={city} value={city!}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {maestros && maestros.length > 0 ? maestros.map(m => (
                <div
                  key={m.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors border ${selectedMaestro === m.id ? "bg-[#c77b3f]/10 border-[#c77b3f]/30" : "bg-[#0f1729] border-transparent hover:border-zinc-600"}`}
                  onClick={() => { setSelectedMaestro(m.id); setShowMaestroDialog(false); }}
                  data-testid={`maestro-option-${m.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{m.displayName}</p>
                      <p className="text-xs text-zinc-400">{m.specialty} · {m.city}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-sm text-white">{Number(m.avgRating).toFixed(1)}</span>
                        <span className="text-xs text-zinc-500">({m.ratingCount})</span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        {m.kycVerified && (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px]">
                            <Shield className="w-2.5 h-2.5 mr-0.5" />Verificado
                          </Badge>
                        )}
                        {m.hasActiveBadge && (
                          <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[9px]">
                            <Flame className="w-2.5 h-2.5 mr-0.5" />Activo
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-zinc-400 text-sm text-center py-4">No hay maestros disponibles</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function PaymentGatewaySelector({
  amount,
  selectedGateway,
  onSelect,
}: {
  amount: number;
  selectedGateway: string | null;
  onSelect: (id: string) => void;
}) {
  const config = activeConfig();
  const isHighAmount = amount >= config.highAmountThreshold;
  const gateways = config.paymentGateways.filter((g) => g.enabled);

  useEffect(() => {
    if (!selectedGateway && gateways.length > 0) {
      const preferred = isHighAmount
        ? gateways.find((g) => g.supportsBankTransfer) || gateways[0]
        : gateways.find((g) => g.supportsCreditCard && g.supportsInstallments) || gateways[0];
      onSelect(preferred.id);
    }
  }, [amount, isHighAmount]);

  if (gateways.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="payment-gateway-selector">
      <p className="text-xs text-[#c77b3f] font-medium flex items-center gap-1.5">
        <CreditCard className="w-3.5 h-3.5" />
        Forma de Pago
      </p>
      {isHighAmount && (
        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <p className="text-[10px] text-emerald-400 flex items-center gap-1">
            <Banknote className="w-3 h-3" />
            Monto alto detectado — Transferencia bancaria recomendada (menor comision)
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-2">
        {gateways.map((gw) => {
          const isSelected = selectedGateway === gw.id;
          const commission = Math.round(amount * (gw.commissionPercent / 100));
          const isPrimary =
            isHighAmount
              ? gw.supportsBankTransfer
              : gw.supportsCreditCard && gw.supportsInstallments;
          return (
            <button
              key={gw.id}
              onClick={() => onSelect(gw.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                isSelected
                  ? "border-[#c77b3f] bg-[#c77b3f]/10"
                  : "border-zinc-700/50 bg-[#0f1729] hover:border-zinc-600"
              }`}
              data-testid={`gateway-${gw.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    gw.supportsBankTransfer
                      ? "bg-emerald-500/15"
                      : "bg-blue-500/15"
                  }`}>
                    {gw.supportsBankTransfer ? (
                      <Banknote className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <CreditCard className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${isSelected ? "text-white" : "text-zinc-300"}`}>
                      {gw.supportsBankTransfer ? "Paga con tu Banco" : gw.displayName}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {gw.supportsBankTransfer && "Sin comision · "}
                      {gw.supportsInstallments && "Cuotas disponibles · "}
                      {gw.supportsCreditCard && "Tarjeta credito/debito"}
                      {gw.supportsBankTransfer && "Transferencia directa"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {isPrimary && (
                    <Badge className="bg-[#c77b3f]/15 text-[#c77b3f] border-[#c77b3f]/30 text-[9px] mb-0.5">
                      Recomendado
                    </Badge>
                  )}
                  <p className="text-[10px] text-zinc-500">
                    Comision: {gw.commissionPercent}% ({fc(commission)})
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
