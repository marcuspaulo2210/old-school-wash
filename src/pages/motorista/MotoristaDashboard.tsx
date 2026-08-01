import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { registrarMudancaStatus } from "@/lib/statusHistory";
import { atualizarSaldo } from "@/lib/saldoRoupas";
import AppLayout from "@/components/AppLayout";
import OrderCard from "@/components/OrderCard";
import ConfirmationModal from "@/components/ConfirmationModal";
import StatusBadge from "@/components/StatusBadge";
import { MapPin, MessageSquare, Plus, X, Package, Truck, Scale, Route, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface ItemPedido {
  id: string;
  descricao_livre: string | null;
  quantidade_original: number;
  tipos_roupa: { nome: string } | null;
}

interface Pedido {
  id: string;
  numero_pedido: string;
  status: string;
  obs_cliente: string | null;
  tipo_cobranca: string;
  quem_contou: string;
  criado_em: string;
  peso_kg: number | null;
  peso_informado_cliente: number | null;
  clientes: { nome: string; endereco: string | null; tipo: string } | null;
  item_count?: number;
}

interface SolicitacaoCliente {
  id: string;
  nome: string;
  status: string;
  criado_em: string;
}

interface RouteCliente {
  id: string;
  nome: string;
  tipo: string;
  endereco: string | null;
  tipo_cobranca: string;
  ja_coletou_hoje: boolean;
}

const MotoristaDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [deliveryOrders, setDeliveryOrders] = useState<Pedido[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const [orderItems, setOrderItems] = useState<ItemPedido[]>([]);
  const [collectionNotes, setCollectionNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState<{ pedido: string; action: string } | null>(null);

  // Solicitar novo cliente
  const [showSolicForm, setShowSolicForm] = useState(false);
  const [solicNome, setSolicNome] = useState("");
  const [solicEmail, setSolicEmail] = useState("");
  const [solicTelefone, setSolicTelefone] = useState("");
  const [solicTipo, setSolicTipo] = useState("clinica");
  const [solicObs, setSolicObs] = useState("");
  const [solicSaving, setSolicSaving] = useState(false);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCliente[]>([]);

  // Lançar peso
  const [pesoTarget, setPesoTarget] = useState<Pedido | null>(null);
  const [pesoValor, setPesoValor] = useState("");
  const [pesoObs, setPesoObs] = useState("");
  const [pesoSaving, setPesoSaving] = useState(false);

  // Rota do dia
  const [routeClients, setRouteClients] = useState<RouteCliente[]>([]);
  const [coletaSemPedidoTarget, setColetaSemPedidoTarget] = useState<RouteCliente | null>(null);
  const [cspPeso, setCspPeso] = useState("");
  const [cspObs, setCspObs] = useState("");
  const [cspSaving, setCspSaving] = useState(false);

  // Abrir pedido (motorista)
  const [showNovoPedido, setShowNovoPedido] = useState(false);
  const [npClienteId, setNpClienteId] = useState("");
  const [npTipo, setNpTipo] = useState<"peca" | "peso">("peca");
  const [npItens, setNpItens] = useState<{ descricao: string; quantidade: string }[]>([{ descricao: "", quantidade: "" }]);
  const [npPeso, setNpPeso] = useState("");
  const [npPesoObs, setNpPesoObs] = useState("");
  const [npObs, setNpObs] = useState("");
  const [npSaving, setNpSaving] = useState(false);

  // Expandir detalhes na aba Coletas
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, ItemPedido[]>>({});

  const openNovoPedido = (clienteId?: string, tipoCobranca?: string) => {
    setNpClienteId(clienteId || "");
    setNpTipo(tipoCobranca === "peso" ? "peso" : "peca");
    setNpItens([{ descricao: "", quantidade: "" }]);
    setNpPeso(""); setNpPesoObs(""); setNpObs("");
    setShowNovoPedido(true);
  };

  const toggleDetalhes = async (order: Pedido) => {
    if (expandedId === order.id) { setExpandedId(null); return; }
    setExpandedId(order.id);
    if (!expandedItems[order.id]) {
      const { data } = await supabase
        .from("itens_pedido")
        .select("id, descricao_livre, quantidade_original, tipos_roupa(nome)")
        .eq("pedido_id", order.id);
      setExpandedItems((prev) => ({ ...prev, [order.id]: (data as unknown as ItemPedido[]) || [] }));
    }
  };

  const notificarAdmins = async (mensagem: string, pedidoId: string) => {
    const { data: admins } = await supabase.from("usuarios").select("id").eq("perfil", "admin").eq("ativo", true);
    for (const a of (admins || []) as any[]) {
      await supabase.from("notificacoes").insert({
        user_id: a.id,
        pedido_id: pedidoId,
        tipo: "info",
        titulo: "Pedido aberto pelo motorista",
        mensagem,
      } as any);
    }
  };

  const handleCriarPedidoMotorista = async () => {
    if (!user) return;
    if (!npClienteId) { toast.error("Selecione o cliente"); return; }
    const itensValidos = npItens
      .map((i) => ({ descricao: i.descricao.trim(), quantidade: parseInt(i.quantidade || "0", 10) }))
      .filter((i) => i.descricao && i.quantidade > 0);
    const pesoNum = parseFloat(npPeso);
    if (npTipo === "peca" && itensValidos.length === 0) { toast.error("Adicione pelo menos uma peça"); return; }
    if (npTipo === "peso" && (!pesoNum || pesoNum <= 0)) { toast.error("Informe um peso válido"); return; }

    setNpSaving(true);
    const nowIso = new Date().toISOString();
    const { data: novo, error } = await supabase.from("pedidos").insert({
      cliente_id: npClienteId,
      motorista_id: user.id,
      status: "aguardando_coleta",
      tipo_cobranca: npTipo,
      quem_contou: "lavanderia",
      obs_motorista: npObs.trim() || null,
      peso_kg: npTipo === "peso" ? pesoNum : null,
      peso_motorista_kg: npTipo === "peso" ? pesoNum : null,
      peso_motorista_em: npTipo === "peso" ? nowIso : null,
      peso_motorista_obs: npTipo === "peso" ? (npPesoObs.trim() || null) : null,
      data_coleta_prevista: nowIso.slice(0, 10),
    } as any).select("id, numero_pedido").single();

    if (error || !novo) {
      toast.error("Não foi possível criar o pedido: " + (error?.message || ""));
      setNpSaving(false);
      return;
    }
    const pedidoId = (novo as any).id as string;

    if (npTipo === "peca") {
      const { error: itensErr } = await supabase.from("itens_pedido").insert(
        itensValidos.map((i) => ({
          pedido_id: pedidoId,
          descricao_livre: i.descricao,
          quantidade_original: i.quantidade,
          origem: "motorista",
        })) as any
      );
      if (itensErr) toast.error("Peças não salvas: " + itensErr.message);
    }

    await supabase.from("pedidos").update({
      status: "coletado" as any,
      coletado_em: nowIso,
    } as any).eq("id", pedidoId);
    await registrarMudancaStatus(pedidoId, "aguardando_coleta", "coletado", user.id, "Pedido aberto pelo motorista");

    if (npTipo === "peso") {
      await supabase.from("lancamentos_peso").insert({
        pedido_id: pedidoId,
        cliente_id: npClienteId,
        motorista_id: user.id,
        peso_kg: pesoNum,
        observacao: npPesoObs.trim() || "Pedido aberto pelo motorista",
      } as any);
    }

    const clienteNome = routeClients.find((c) => c.id === npClienteId)?.nome || "cliente";
    try {
      await notificarAdmins(
        `Pedido ${(novo as any).numero_pedido} aberto pelo motorista para ${clienteNome}.`,
        pedidoId
      );
    } catch (e) { console.error("notificarAdmins falhou", e); }

    setShowNovoPedido(false);
    setNpSaving(false);
    setConfirmation({ pedido: (novo as any).numero_pedido, action: "Pedido aberto (coletado)" });
    fetchOrders();
    fetchRouteOfDay();
  };

  const handleSalvarPeso = async () => {
    if (!user || !pesoTarget) return;
    const v = parseFloat(pesoValor);
    if (!v || v <= 0) { toast.error("Informe um peso válido"); return; }
    setPesoSaving(true);
    const nowIso = new Date().toISOString();
    await supabase.from("pedidos").update({
      peso_motorista_kg: v,
      peso_motorista_em: nowIso,
      peso_motorista_obs: pesoObs || null,
    } as any).eq("id", pesoTarget.id);
    const { data: ped } = await supabase.from("pedidos").select("cliente_id").eq("id", pesoTarget.id).single();
    await supabase.from("lancamentos_peso").insert({
      pedido_id: pesoTarget.id,
      cliente_id: (ped as any)?.cliente_id,
      motorista_id: user.id,
      peso_kg: v,
      observacao: pesoObs || null,
    } as any);
    toast.success(`Peso de ${v.toFixed(3)} kg salvo!`);
    setPesoTarget(null);
    setPesoValor("");
    setPesoObs("");
    setPesoSaving(false);
  };

  const fetchOrders = async () => {
    if (!user) return;
    return _fetchOrders();
  };

  const hydrateClientes = async (pedidos: any[]) => {
    const missing = Array.from(new Set(pedidos.filter(p => !p.clientes && p.cliente_id).map(p => p.cliente_id)));
    if (missing.length === 0) return;
    const { data: cls } = await supabase.from("clientes").select("id, nome, endereco, tipo").in("id", missing);
    const byId = new Map((cls || []).map((c: any) => [c.id, c]));
    for (const p of pedidos) {
      if (!p.clientes && p.cliente_id) {
        const c = byId.get(p.cliente_id);
        if (c) p.clientes = { nome: c.nome, endereco: c.endereco, tipo: c.tipo };
      }
    }
  };

  const _fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, status, obs_cliente, tipo_cobranca, quem_contou, criado_em, peso_kg, peso_informado_cliente, cliente_id, clientes(nome, endereco, tipo)")
      .eq("motorista_id", user.id)
      .in("status", ["aguardando_coleta", "coletado"])
      .order("criado_em", { ascending: true });
    
    const pedidos = (data as unknown as Pedido[]) || [];
    await hydrateClientes(pedidos);
    // Fetch item counts for each order
    for (const p of pedidos) {
      const { count } = await supabase.from("itens_pedido").select("*", { count: "exact", head: true }).eq("pedido_id", p.id);
      p.item_count = count || 0;
    }
    setOrders(pedidos);
  };

  const fetchDeliveryOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, status, obs_cliente, tipo_cobranca, quem_contou, criado_em, peso_kg, peso_informado_cliente, cliente_id, clientes(nome, endereco, tipo)")
      .in("status", ["pronto_para_entrega", "saiu_para_entrega"])
      .order("criado_em", { ascending: true });

    const pedidos = (data as unknown as Pedido[]) || [];
    await hydrateClientes(pedidos);
    for (const p of pedidos) {
      const { count } = await supabase.from("itens_pedido").select("*", { count: "exact", head: true }).eq("pedido_id", p.id);
      p.item_count = count || 0;
    }
    setDeliveryOrders(pedidos);
  };

  const fetchSolicitacoes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("solicitacoes_clientes")
      .select("id, nome, status, criado_em")
      .eq("motorista_id", user.id)
      .order("criado_em", { ascending: false })
      .limit(20);
    setSolicitacoes((data as any) || []);
  };

  const fetchRouteOfDay = async () => {
    if (!user) return;
    // Find clientes assigned to a route owned by this driver
    const { data: rotas } = await supabase.from("rotas").select("id").eq("motorista_id", user.id).eq("ativo", true);
    const rotaIds = (rotas || []).map((r: any) => r.id);
    let clientesData: any[] = [];
    if (rotaIds.length > 0) {
      const { data: cls } = await supabase
        .from("clientes")
        .select("id, nome, tipo, endereco, tipo_cobranca")
        .in("rota_id", rotaIds)
        .eq("ativo", true);
      clientesData = cls || [];
    }
    // Check who already had a pedido created today
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const { data: peds } = await supabase
      .from("pedidos")
      .select("cliente_id")
      .gte("criado_em", today.toISOString());
    const coletadosHoje = new Set((peds || []).map((p: any) => p.cliente_id));
    setRouteClients(clientesData.map(c => ({ ...c, ja_coletou_hoje: coletadosHoje.has(c.id) })));
  };

  useEffect(() => {
    fetchOrders();
    fetchDeliveryOrders();
    fetchSolicitacoes();
    fetchRouteOfDay();
  }, [user]);

  const handleColetaSemPedido = async () => {
    if (!user || !coletaSemPedidoTarget) return;
    setCspSaving(true);
    const peso = cspPeso ? parseFloat(cspPeso) : null;
    const isPeso = coletaSemPedidoTarget.tipo_cobranca === "peso";
    const { data: novo, error } = await supabase.from("pedidos").insert({
      cliente_id: coletaSemPedidoTarget.id,
      motorista_id: user.id,
      status: "aguardando_coleta",
      tipo_cobranca: coletaSemPedidoTarget.tipo_cobranca || "peca",
      quem_contou: "lavanderia",
      obs_motorista: cspObs || null,
      peso_motorista_kg: isPeso ? peso : null,
      peso_motorista_em: peso ? new Date().toISOString() : null,
      data_coleta_prevista: new Date().toISOString().slice(0, 10),
    } as any).select("id, numero_pedido").single();

    if (error || !novo) {
      toast.error("Não foi possível criar o pedido: " + (error?.message || ""));
      setCspSaving(false);
      return;
    }
    // Already collected — move directly to coletado
    await supabase.from("pedidos").update({
      status: "coletado" as any,
      coletado_em: new Date().toISOString(),
    } as any).eq("id", (novo as any).id);
    await registrarMudancaStatus((novo as any).id, "aguardando_coleta", "coletado", user.id, "Coleta sem pedido prévio");

    if (peso) {
      await supabase.from("lancamentos_peso").insert({
        pedido_id: (novo as any).id,
        cliente_id: coletaSemPedidoTarget.id,
        motorista_id: user.id,
        peso_kg: peso,
        observacao: cspObs || "Coleta sem pedido",
      } as any);
    }
    toast.success(`Pedido ${(novo as any).numero_pedido} criado!`);
    setColetaSemPedidoTarget(null);
    setCspPeso(""); setCspObs(""); setCspSaving(false);
    fetchOrders();
    fetchRouteOfDay();
  };

  const openOrder = async (order: Pedido) => {
    setSelectedOrder(order);
    setCollectionNotes("");
    if (order.quem_contou === "cliente") {
      const { data } = await supabase.from("itens_pedido").select("id, descricao_livre, quantidade_original, tipos_roupa(nome)").eq("pedido_id", order.id);
      setOrderItems((data as unknown as ItemPedido[]) || []);
    } else {
      setOrderItems([]);
    }
  };

  const confirmCollection = async (order: Pedido) => {
    if (!user) return;
    setConfirming(true);
    await supabase.from("pedidos").update({ status: "coletado" as any, coletado_em: new Date().toISOString(), obs_motorista: collectionNotes || null } as any).eq("id", order.id);
    await registrarMudancaStatus(order.id, "aguardando_coleta", "coletado", user.id, collectionNotes || "Coleta confirmada pelo motorista");
    const pedido = order.numero_pedido;
    setSelectedOrder(null);
    setCollectionNotes("");
    setConfirming(false);
    setConfirmation({ pedido, action: "Coletado" });
    fetchOrders();
  };

  const confirmSaiuEntrega = async (order: Pedido) => {
    if (!user) return;
    setConfirming(true);
    await supabase.from("pedidos").update({ status: "saiu_para_entrega" as any, saiu_em: new Date().toISOString(), motorista_id: user.id } as any).eq("id", order.id);
    await registrarMudancaStatus(order.id, "pronto_para_entrega", "saiu_para_entrega", user.id, "Saiu para entrega");
    const pedido = order.numero_pedido;
    setSelectedOrder(null);
    setConfirming(false);
    setConfirmation({ pedido, action: "Saiu para Entrega" });
    fetchDeliveryOrders();
  };

  const confirmEntrega = async (order: Pedido) => {
    if (!user) return;
    setConfirming(true);
    await supabase.from("pedidos").update({ status: "entregue" as any, entregue_em: new Date().toISOString() } as any).eq("id", order.id);
    await registrarMudancaStatus(order.id, "saiu_para_entrega", "entregue", user.id, "Entrega confirmada pelo motorista");
    try { await atualizarSaldo(order.id); } catch (e) { console.error("atualizarSaldo falhou", e); }
    const pedido = order.numero_pedido;
    setSelectedOrder(null);
    setConfirming(false);
    setConfirmation({ pedido, action: "Entregue" });
    fetchDeliveryOrders();
  };

  const handleSolicitarCliente = async () => {
    if (!user || !solicNome.trim()) return;
    setSolicSaving(true);
    await supabase.from("solicitacoes_clientes").insert({
      motorista_id: user.id,
      nome: solicNome.trim(),
      email: solicEmail.trim() || null,
      telefone: solicTelefone.trim() || null,
      tipo: solicTipo,
      observacoes: solicObs.trim() || null,
    } as any);
    setSolicSaving(false);
    setShowSolicForm(false);
    setSolicNome(""); setSolicEmail(""); setSolicTelefone(""); setSolicTipo("clinica"); setSolicObs("");
    fetchSolicitacoes();
  };

  const getResumo = (order: Pedido) => {
    if (order.tipo_cobranca === "peso") {
      const peso = order.peso_informado_cliente || order.peso_kg;
      return peso ? `${peso} kg` : "Peso não informado";
    }
    return order.item_count ? `${order.item_count} peça(s)` : "Sem itens";
  };

  const tipoBadge = (tipo: string) => {
    if (tipo === "hospital") return { label: "Hospital", bg: "rgba(155,114,244,0.12)", color: "#9b72f4" };
    return { label: "Clínica", bg: "rgba(45,191,160,0.12)", color: "#2dbfa0" };
  };

  const renderOrderCard = (order: Pedido) => {
    const badge = tipoBadge(order.clientes?.tipo || "clinica");
    return (
      <button
        key={order.id}
        className="w-full text-left rounded-xl border border-[rgba(255,255,255,0.07)] bg-card p-4 transition-all hover:bg-[#1a1e2a] hover:border-[rgba(255,255,255,0.13)] cursor-pointer"
        onClick={() => openOrder(order)}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded" style={{ background: badge.bg, color: badge.color }}>
                {badge.label}
              </span>
              <span className="font-mono text-xs font-bold" style={{ color: "#5b8df6" }}>{order.numero_pedido}</span>
            </div>
            <p className="text-sm font-bold text-foreground truncate">
              {order.clientes?.nome?.trim() || order.numero_pedido}
            </p>
            {order.clientes?.endereco && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {order.clientes.endereco}
              </p>
            )}
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">
            {getResumo(order)} • {order.quem_contou === "cliente" ? "contado pelo cliente" : "contagem na lavanderia"}
          </span>
          <div className="flex items-center gap-2">
            {order.obs_cliente && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: "rgba(240,160,32,0.12)", color: "#f0a020" }}>
                <MessageSquare className="w-3 h-3" /> obs
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <AppLayout title="Amaná" subtitle="Painel do Motorista">
      {/* Solicitar novo cliente button */}
      <div className="flex items-center justify-between mb-4">
        <div />
        <div className="flex items-center gap-2">
          <button className="btn-primary text-xs px-3 py-2" onClick={() => openNovoPedido()}>
            <Plus className="w-4 h-4" /> Abrir pedido
          </button>
          <button className="btn-ghost text-xs px-3 py-2" onClick={() => setShowSolicForm(true)}>
            <Plus className="w-4 h-4" /> Solicitar novo cliente
          </button>
        </div>
      </div>

      {/* Solicitar form */}
      {showSolicForm && (
        <div className="app-card-elevated mb-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-foreground">Solicitar novo cliente</h3>
            <button onClick={() => setShowSolicForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="field-label">Nome *</label>
              <input className="field-input" value={solicNome} onChange={(e) => setSolicNome(e.target.value)} placeholder="Ex: Clínica Bem Estar" />
            </div>
            <div>
              <label className="field-label">Tipo</label>
              <select className="field-select" value={solicTipo} onChange={(e) => setSolicTipo(e.target.value)}>
                <option value="clinica">Clínica</option>
                <option value="hospital">Hospital</option>
              </select>
            </div>
            <div>
              <label className="field-label">Email (opcional)</label>
              <input className="field-input" type="email" value={solicEmail} onChange={(e) => setSolicEmail(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Telefone (opcional)</label>
              <input className="field-input" value={solicTelefone} onChange={(e) => setSolicTelefone(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="field-label">Observações</label>
            <textarea className="field-input min-h-[50px] resize-none" value={solicObs} onChange={(e) => setSolicObs(e.target.value)} />
          </div>
          <button className="btn-primary w-full" onClick={handleSolicitarCliente} disabled={solicSaving || !solicNome.trim()}>
            {solicSaving ? "Enviando..." : "Enviar solicitação"}
          </button>
        </div>
      )}

      {/* Pending solicitations */}
      {solicitacoes.filter(s => s.status === "pendente").length > 0 && (
        <div className="mb-4 space-y-1">
          {solicitacoes.filter(s => s.status === "pendente").map(s => (
            <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "rgba(240,160,32,0.08)" }}>
              <span className="text-xs text-foreground font-medium">{s.nome}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: "rgba(240,160,32,0.15)", color: "#f0a020" }}>Aguardando aprovação</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs: Coletas / Entregas */}
      <Tabs defaultValue="coletas" className="w-full">
        <TabsList className="w-full mb-3">
          <TabsTrigger value="rota" className="flex-1 gap-1">
            <Route className="w-4 h-4" />
            Rota ({routeClients.length})
          </TabsTrigger>
          <TabsTrigger value="coletas" className="flex-1 gap-1">
            <Package className="w-4 h-4" />
            Coletas ({orders.filter((o) => o.status === "aguardando_coleta").length})
          </TabsTrigger>
          <TabsTrigger value="entregas" className="flex-1 gap-1">
            <Truck className="w-4 h-4" />
            Entregas ({deliveryOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rota">
          {routeClients.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🗺️</div><p className="empty-state-text">Nenhum cliente atribuído à sua rota</p></div>
          ) : (
            <div className="space-y-2">
              {routeClients.map(c => {
                const badge = tipoBadge(c.tipo);
                return (
                  <div key={c.id} className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-card p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded" style={{ background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                        {c.ja_coletou_hoje && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded" style={{ background: "rgba(52,201,122,0.12)", color: "#34c97a" }}>
                            <CheckCircle2 className="w-3 h-3" /> coletado hoje
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-foreground truncate">{c.nome}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" /> {c.endereco || "Endereço não informado"}
                      </p>
                    </div>
                    {!c.ja_coletou_hoje && (
                      <button
                        className="text-[11px] font-bold px-3 py-2 rounded-lg shrink-0"
                        style={{ background: "rgba(240,160,32,0.15)", color: "#f0a020" }}
                        onClick={() => openNovoPedido(c.id, c.tipo_cobranca)}
                      >
                        Coletar sem pedido
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="coletas">
          {orders.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🚚</div><p className="empty-state-text">Nenhuma coleta atribuída</p></div>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <div key={o.id} className="space-y-1">
                  {renderOrderCard(o)}
                  <button
                    className="w-full text-[11px] font-semibold py-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={() => toggleDetalhes(o)}
                  >
                    {expandedId === o.id ? "Ocultar detalhes" : "Ver detalhes"}
                  </button>
                  {expandedId === o.id && (
                    <div className="rounded-lg border border-[rgba(255,255,255,0.07)] bg-card p-3">
                      {(expandedItems[o.id] || []).length > 0 ? (
                        <table className="data-table">
                          <thead><tr><th>Peça</th><th className="text-center">Qtd.</th></tr></thead>
                          <tbody>
                            {(expandedItems[o.id] || []).map((it) => (
                              <tr key={it.id}>
                                <td className="font-medium text-foreground">{it.tipos_roupa?.nome || it.descricao_livre || "—"}</td>
                                <td className="text-center font-mono font-bold">{it.quantidade_original}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {o.tipo_cobranca === "peso"
                            ? `Pedido por peso${o.peso_kg ? ` — ${o.peso_kg} kg` : ""}`
                            : "Nenhuma peça registrada neste pedido"}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="entregas">
          {deliveryOrders.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📦</div><p className="empty-state-text">Nenhuma entrega pendente</p></div>
          ) : (
            <div className="space-y-2">{deliveryOrders.map(renderOrderCard)}</div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-[rgba(255,255,255,0.07)] rounded-xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4 animate-fade-in">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {(() => {
                    const b = tipoBadge(selectedOrder.clientes?.tipo || "clinica");
                    return <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded" style={{ background: b.bg, color: b.color }}>{b.label}</span>;
                  })()}
                  <span className="font-mono text-sm font-bold" style={{ color: "#5b8df6" }}>{selectedOrder.numero_pedido}</span>
                </div>
                <h3 className="text-base font-bold text-foreground">
                  {selectedOrder.clientes?.nome?.trim() || selectedOrder.numero_pedido}
                </h3>
                {selectedOrder.clientes?.endereco && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {selectedOrder.clientes.endereco}
                  </p>
                )}
              </div>
              <button className="text-muted-foreground hover:text-foreground text-lg" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>

            {/* Info line */}
            <div className="text-xs text-muted-foreground">{getResumo(selectedOrder)}</div>

            {selectedOrder.quem_contou === "lavanderia" ? (
              <div className="rounded-lg px-4 py-3 text-sm font-medium" style={{ background: "rgba(240,160,32,0.12)", color: "#f0a020" }}>
                ⚠ Coleta sem contagem prévia (hospital)
              </div>
            ) : (
              <>
                <div className="rounded-lg px-4 py-3 text-sm font-medium" style={{ background: "rgba(91,141,246,0.12)", color: "#5b8df6" }}>
                  Contagem registrada pelo cliente
                </div>
                {orderItems.length > 0 && (
                  <table className="data-table">
                    <thead><tr><th>Peça</th><th className="text-center">Qtd.</th></tr></thead>
                    <tbody>
                      {orderItems.map((item) => (
                        <tr key={item.id}>
                          <td className="font-medium text-foreground">{item.tipos_roupa?.nome || item.descricao_livre || "—"}</td>
                          <td className="text-center font-mono font-bold">{item.quantidade_original}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {selectedOrder.obs_cliente && (
              <div className="flex gap-2 text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                <span>📝 Cliente: {selectedOrder.obs_cliente}</span>
              </div>
            )}

            {/* Coleta actions */}
            {selectedOrder.status === "aguardando_coleta" && (
              <>
                <div>
                  <label className="field-label">Observações da coleta</label>
                  <textarea className="field-input min-h-[60px] resize-none" value={collectionNotes} onChange={(e) => setCollectionNotes(e.target.value)} placeholder="Alguma observação?" />
                </div>
                <button className="btn-success w-full btn-lg" onClick={() => confirmCollection(selectedOrder)} disabled={confirming}>
                  {confirming ? "Confirmando..." : "✓ Confirmar Coleta"}
                </button>
              </>
            )}

            {/* Entrega actions */}
            {selectedOrder.status === "pronto_para_entrega" && (
              <button
                className="btn-primary w-full btn-lg"
                onClick={() => confirmSaiuEntrega(selectedOrder)}
                disabled={confirming}
              >
                {confirming ? "Confirmando..." : "🚚 Confirmar: Saiu para entrega"}
              </button>
            )}

            {selectedOrder.status === "saiu_para_entrega" && (
              <button
                className="btn-success w-full btn-lg"
                onClick={() => confirmEntrega(selectedOrder)}
                disabled={confirming}
              >
                {confirming ? "Confirmando..." : "✓ Confirmar entrega realizada"}
              </button>
            )}

            <button className="btn-ghost w-full" onClick={() => setSelectedOrder(null)}>Fechar</button>
            <button
              className="w-full py-2 text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5"
              style={{ background: "rgba(240,160,32,0.12)", color: "#f0a020" }}
              onClick={() => { setPesoTarget(selectedOrder); setPesoValor(""); setPesoObs(""); }}
            >
              <Scale className="w-4 h-4" /> Lançar peso
            </button>
          </div>
        </div>
      )}

      {pesoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setPesoTarget(null)}>
          <div className="bg-card border border-[rgba(255,255,255,0.07)] rounded-xl p-5 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground">Lançar peso — {pesoTarget.clientes?.nome}</h3>
              <button onClick={() => setPesoTarget(null)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div>
              <label className="field-label">Peso (kg) *</label>
              <input type="number" step="0.001" className="field-input font-mono" value={pesoValor} onChange={(e) => setPesoValor(e.target.value)} placeholder="Ex: 4.5" />
            </div>
            <div>
              <label className="field-label">Observação</label>
              <textarea className="field-input min-h-[50px] resize-none" value={pesoObs} onChange={(e) => setPesoObs(e.target.value)} />
            </div>
            <button className="btn-primary w-full" onClick={handleSalvarPeso} disabled={pesoSaving}>
              {pesoSaving ? "Salvando..." : "Salvar peso"}
            </button>
          </div>
        </div>
      )}

      {confirmation && (
        <ConfirmationModal numeroPedido={confirmation.pedido} variant="success" title={confirmation.action} onClose={() => setConfirmation(null)}>
          <div className="flex justify-between"><span>Status:</span><span className="text-foreground">{confirmation.action}</span></div>
        </ConfirmationModal>
      )}

      {coletaSemPedidoTarget && (
        <></>
      )}

      {showNovoPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => !npSaving && setShowNovoPedido(false)}>
          <div className="bg-card border border-[rgba(255,255,255,0.07)] rounded-xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground">Abrir pedido para cliente</h3>
              <button onClick={() => setShowNovoPedido(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>

            <div>
              <label className="field-label">Cliente *</label>
              <select className="field-select" value={npClienteId} onChange={(e) => {
                const id = e.target.value;
                setNpClienteId(id);
                const c = routeClients.find((rc) => rc.id === id);
                if (c) setNpTipo(c.tipo_cobranca === "peso" ? "peso" : "peca");
              }}>
                <option value="">Selecione...</option>
                {routeClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              {routeClients.length === 0 && (
                <p className="text-[11px] mt-1" style={{ color: "#f0a020" }}>Nenhum cliente vinculado à sua rota.</p>
              )}
            </div>

            <div>
              <label className="field-label">Tipo de registro</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 py-2 text-xs font-bold rounded-lg border"
                  style={npTipo === "peca"
                    ? { background: "rgba(91,141,246,0.15)", color: "#5b8df6", borderColor: "rgba(91,141,246,0.4)" }
                    : { background: "transparent", color: "#6b7190", borderColor: "rgba(255,255,255,0.07)" }}
                  onClick={() => setNpTipo("peca")}
                >
                  Por Peças
                </button>
                <button
                  type="button"
                  className="flex-1 py-2 text-xs font-bold rounded-lg border"
                  style={npTipo === "peso"
                    ? { background: "rgba(91,141,246,0.15)", color: "#5b8df6", borderColor: "rgba(91,141,246,0.4)" }
                    : { background: "transparent", color: "#6b7190", borderColor: "rgba(255,255,255,0.07)" }}
                  onClick={() => setNpTipo("peso")}
                >
                  Por Peso
                </button>
              </div>
            </div>

            {npTipo === "peca" ? (
              <div className="space-y-2">
                {npItens.map((it, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="field-label">Descrição da peça</label>
                      <input
                        className="field-input"
                        value={it.descricao}
                        onChange={(e) => setNpItens((prev) => prev.map((p, i) => i === idx ? { ...p, descricao: e.target.value } : p))}
                        placeholder="Ex: Camisola"
                      />
                    </div>
                    <div className="w-20">
                      <label className="field-label">Qtd.</label>
                      <input
                        type="number"
                        min="1"
                        className="field-input font-mono"
                        value={it.quantidade}
                        onChange={(e) => setNpItens((prev) => prev.map((p, i) => i === idx ? { ...p, quantidade: e.target.value } : p))}
                      />
                    </div>
                    <button
                      type="button"
                      className="p-2 rounded-lg shrink-0"
                      style={{ background: "rgba(224,80,80,0.12)", color: "#e05050" }}
                      onClick={() => setNpItens((prev) => prev.length === 1 ? [{ descricao: "", quantidade: "" }] : prev.filter((_, i) => i !== idx))}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-ghost w-full text-xs"
                  onClick={() => setNpItens((prev) => [...prev, { descricao: "", quantidade: "" }])}
                >
                  <Plus className="w-4 h-4" /> Adicionar peça
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="field-label">Peso (kg) *</label>
                  <input type="number" step="0.001" className="field-input font-mono" value={npPeso} onChange={(e) => setNpPeso(e.target.value)} placeholder="Ex: 4.5" />
                </div>
                <div>
                  <label className="field-label">Observação do peso</label>
                  <textarea className="field-input min-h-[50px] resize-none" value={npPesoObs} onChange={(e) => setNpPesoObs(e.target.value)} />
                </div>
              </>
            )}

            <div>
              <label className="field-label">Observações gerais</label>
              <textarea className="field-input min-h-[50px] resize-none" value={npObs} onChange={(e) => setNpObs(e.target.value)} />
            </div>

            <p className="text-[11px] text-muted-foreground">O pedido será criado já como <strong className="text-foreground">coletado</strong> e seguirá para a produção.</p>

            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setShowNovoPedido(false)} disabled={npSaving}>Cancelar</button>
              <button className="btn-primary flex-1" onClick={handleCriarPedidoMotorista} disabled={npSaving}>
                {npSaving ? "Criando..." : "Criar pedido"}
              </button>
            </div>
          </div>
        </div>
      )}

      {false && coletaSemPedidoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => !cspSaving && setColetaSemPedidoTarget(null)}>
          <div className="bg-card border border-[rgba(255,255,255,0.07)] rounded-xl p-5 w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-foreground">Coletar sem pedido</h3>
              <button onClick={() => setColetaSemPedidoTarget(null)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cliente: <strong className="text-foreground">{coletaSemPedidoTarget.nome}</strong>
            </p>
            <p className="text-[11px] text-muted-foreground">Um novo pedido será criado e marcado como coletado.</p>
            {coletaSemPedidoTarget.tipo_cobranca === "peso" && (
              <div>
                <label className="field-label">Peso (kg)</label>
                <input type="number" step="0.001" className="field-input font-mono" value={cspPeso} onChange={(e) => setCspPeso(e.target.value)} placeholder="Ex: 4.5" />
              </div>
            )}
            <div>
              <label className="field-label">Observações</label>
              <textarea className="field-input min-h-[50px] resize-none" value={cspObs} onChange={(e) => setCspObs(e.target.value)} />
            </div>
            <button className="btn-primary w-full" onClick={handleColetaSemPedido} disabled={cspSaving}>
              {cspSaving ? "Criando..." : "Confirmar coleta"}
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default MotoristaDashboard;
