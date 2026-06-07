import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { registrarMudancaStatus } from "@/lib/statusHistory";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import ConfirmationModal from "@/components/ConfirmationModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle, AlertTriangle, Package, Plus, X, Scale, Save, Search, Truck } from "lucide-react";

interface ItemPedido {
  id: string;
  tipo_roupa_id: string | null;
  descricao_livre: string | null;
  quantidade_original: number;
  quantidade_conferida: number | null;
  diferenca: number | null;
  origem: string;
  tipos_roupa: { nome: string } | null;
}

interface Pedido {
  id: string;
  numero_pedido: string;
  status: string;
  tipo_cobranca: string;
  obs_cliente: string | null;
  obs_motorista: string | null;
  quem_contou: string;
  peso_kg: number | null;
  peso_informado_cliente: number | null;
  peso_recebido_producao: number | null;
  tipo_registro_producao: string | null;
  status_entrada: string;
  cliente_id: string;
  clientes: { nome: string; tipo: string } | null;
}

interface NewProdItem {
  descricao: string;
  quantidade: number;
  observacao: string;
}

interface SaidaItem {
  tipo_roupa_id: string | null;
  descricao: string;
  quantidade: number;
}
interface TipoRoupa { id: string; nome: string; }

interface ClienteGroup {
  nome: string;
  tipo: string;
  pedidos: Pedido[];
}

const ProducaoDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const [items, setItems] = useState<ItemPedido[]>([]);
  const [productionNotes, setProductionNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<{ pedido: string; variant: "success" | "danger"; title: string } | null>(null);

  // Filters
  const [filterTipo, setFilterTipo] = useState("todas");
  const [searchText, setSearchText] = useState("");

  // Production registration tabs
  const [prodTab, setProdTab] = useState<"pecas" | "peso">("pecas");

  // Production weight
  const [pesoRecebido, setPesoRecebido] = useState("");

  // Production items (new items added by production)
  const [newProdItems, setNewProdItems] = useState<NewProdItem[]>([]);

  // Finalize modal
  const [finalizingOrder, setFinalizingOrder] = useState<Pedido | null>(null);
  const [saidaItems, setSaidaItems] = useState<SaidaItem[]>([]);
  const [tiposRoupa, setTiposRoupa] = useState<TipoRoupa[]>([]);

  // Selected client group
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, status, tipo_cobranca, obs_cliente, obs_motorista, quem_contou, peso_kg, peso_informado_cliente, peso_recebido_producao, tipo_registro_producao, status_entrada, cliente_id, clientes(nome, tipo)")
      .in("status", ["coletado", "em_producao", "embalado"])
      .order("criado_em", { ascending: true });
    const pedidos = (data as unknown as Pedido[]) || [];
    const missing = Array.from(new Set(pedidos.filter(p => !p.clientes && p.cliente_id).map(p => p.cliente_id)));
    if (missing.length > 0) {
      const { data: cls } = await supabase.from("clientes").select("id, nome, tipo").in("id", missing);
      const byId = new Map((cls || []).map((c: any) => [c.id, c]));
      for (const p of pedidos) {
        if (!p.clientes && p.cliente_id) {
          const c = byId.get(p.cliente_id);
          if (c) p.clientes = { nome: c.nome, tipo: c.tipo };
        }
      }
    }
    setOrders(pedidos);
  };

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    supabase.from("tipos_roupa").select("id, nome").eq("ativo", true).then(({ data }) => {
      setTiposRoupa((data as any) || []);
    });
  }, []);

  // Group orders by client
  const getGroups = (orderList: Pedido[]): ClienteGroup[] => {
    const map: Record<string, ClienteGroup> = {};
    for (const o of orderList) {
      const key = o.clientes?.nome || "Sem cliente";
      if (!map[key]) map[key] = { nome: key, tipo: o.clientes?.tipo || "clinica", pedidos: [] };
      map[key].pedidos.push(o);
    }
    return Object.values(map).sort((a, b) => a.nome.localeCompare(b.nome));
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    if (filterTipo === "clinica" && o.clientes?.tipo !== "clinica") return false;
    if (filterTipo === "hospital" && o.clientes?.tipo !== "hospital") return false;
    if (searchText && !o.clientes?.nome.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  // Separate entry orders vs production/embalado
  const entryOrders = filteredOrders.filter(o => o.status === "coletado");
  const productionOrders = filteredOrders.filter(o => o.status === "em_producao" || o.status === "embalado");

  const entryGroups = getGroups(entryOrders);
  const productionGroups = getGroups(productionOrders);

  const tipoBadge = (tipo: string) => {
    if (tipo === "hospital") return { label: "Hospital", bg: "rgba(155,114,244,0.12)", color: "#9b72f4" };
    return { label: "Clínica", bg: "rgba(45,191,160,0.12)", color: "#2dbfa0" };
  };

  const openOrder = async (order: Pedido) => {
    setSelectedOrder(order);
    setProductionNotes("");
    setPesoRecebido(order.peso_recebido_producao ? String(order.peso_recebido_producao) : "");
    setProdTab(order.tipo_cobranca === "peso" ? "peso" : "pecas");
    setNewProdItems([]);

    const { data } = await supabase.from("itens_pedido")
      .select("id, tipo_roupa_id, descricao_livre, quantidade_original, quantidade_conferida, diferenca, origem, tipos_roupa(nome)")
      .eq("pedido_id", order.id);
    setItems((data as unknown as ItemPedido[]) || []);
  };

  const updateChecked = (itemId: string, value: number) => {
    setItems(items.map((i) => i.id === itemId ? { ...i, quantidade_conferida: value } : i));
  };

  const getDiff = (item: ItemPedido) => {
    if (item.quantidade_conferida === null) return null;
    return item.quantidade_conferida - item.quantidade_original;
  };

  const hasDivergence = items.some((i) => { const d = getDiff(i); return d !== null && d !== 0; });

  const addProdItem = () => setNewProdItems([...newProdItems, { descricao: "", quantidade: 1, observacao: "" }]);
  const removeProdItem = (idx: number) => setNewProdItems(newProdItems.filter((_, i) => i !== idx));

  const weightDiff = selectedOrder?.peso_informado_cliente && pesoRecebido
    ? parseFloat(pesoRecebido) - selectedOrder.peso_informado_cliente
    : null;

  const handleSaveEntry = async () => {
    if (!selectedOrder || !user) return;
    setSaving(true);

    for (const item of items) {
      if (item.quantidade_conferida !== null) {
        await supabase.from("itens_pedido").update({ quantidade_conferida: item.quantidade_conferida } as any).eq("id", item.id);
      }
    }

    if (newProdItems.length > 0) {
      const prodItems = newProdItems.filter(pi => pi.descricao.trim()).map(pi => ({
        pedido_id: selectedOrder.id,
        descricao_livre: pi.descricao,
        quantidade_original: pi.quantidade,
        origem: "producao",
      }));
      if (prodItems.length > 0) await supabase.from("itens_pedido").insert(prodItems as any);
    }

    await supabase.from("pedidos").update({
      obs_producao: productionNotes || null,
      peso_recebido_producao: pesoRecebido ? parseFloat(pesoRecebido) : null,
      tipo_registro_producao: prodTab,
      status_entrada: "salvo",
    } as any).eq("id", selectedOrder.id);

    setSaving(false);
    setSelectedOrder(null);
    fetchOrders();
  };

  const handleConfirmEntry = async (registerDivergence: boolean) => {
    if (!selectedOrder || !user) return;
    setSaving(true);

    for (const item of items) {
      if (item.quantidade_conferida !== null) {
        await supabase.from("itens_pedido").update({ quantidade_conferida: item.quantidade_conferida } as any).eq("id", item.id);
      }
    }

    if (newProdItems.length > 0) {
      const prodItems = newProdItems.filter(pi => pi.descricao.trim()).map(pi => ({
        pedido_id: selectedOrder.id,
        descricao_livre: pi.descricao,
        quantidade_original: pi.quantidade,
        origem: "producao",
      }));
      if (prodItems.length > 0) await supabase.from("itens_pedido").insert(prodItems as any);
    }

    // If coletado, first move to em_producao
    if (selectedOrder.status === "coletado") {
      await supabase.from("pedidos").update({ status: "em_producao" as any } as any).eq("id", selectedOrder.id);
      await registrarMudancaStatus(selectedOrder.id, "coletado", "em_producao", user.id, "Entrada registrada na produção");
    }

    const newStatus = registerDivergence ? "divergencia" : "embalado";
    await supabase.from("pedidos").update({
      status: newStatus as any,
      obs_producao: productionNotes || null,
      embalado_em: registerDivergence ? null : new Date().toISOString(),
      peso_recebido_producao: pesoRecebido ? parseFloat(pesoRecebido) : null,
      tipo_registro_producao: prodTab,
      status_entrada: "confirmado",
    } as any).eq("id", selectedOrder.id);

    await registrarMudancaStatus(selectedOrder.id, "em_producao", newStatus as any, user.id, registerDivergence ? `Divergência registrada. ${productionNotes || ""}` : productionNotes || "Conferência concluída e embalado");

    const pedido = selectedOrder.numero_pedido;
    setSelectedOrder(null);
    setSaving(false);
    setConfirmation({ pedido, variant: registerDivergence ? "danger" : "success", title: registerDivergence ? "Divergência Registrada" : "Pedido Embalado" });
    fetchOrders();
  };

  const handleFinalize = async () => {
    if (!finalizingOrder || !user) return;
    const validItems = saidaItems.filter(s => (s.descricao.trim() || s.tipo_roupa_id) && s.quantidade > 0);
    if (validItems.length === 0) {
      alert("Registre ao menos uma peça de saída antes de liberar o pedido para entrega.");
      return;
    }
    setSaving(true);

    await supabase.from("itens_saida").insert(
      validItems.map(s => ({
        pedido_id: finalizingOrder.id,
        tipo_roupa_id: s.tipo_roupa_id || null,
        descricao_livre: s.tipo_roupa_id ? null : s.descricao.trim(),
        quantidade: s.quantidade,
        criado_por: user.id,
      })) as any
    );

    await supabase.from("pedidos").update({
      status: "pronto_para_entrega" as any,
      pronto_em: new Date().toISOString(),
    } as any).eq("id", finalizingOrder.id);

    await registrarMudancaStatus(finalizingOrder.id, "embalado", "pronto_para_entrega", user.id, "Finalizado e liberado para entrega");

    const pedido = finalizingOrder.numero_pedido;
    setFinalizingOrder(null);
    setSaidaItems([]);
    setSaving(false);
    setConfirmation({ pedido, variant: "success", title: "Liberado para Entrega" });
    fetchOrders();
  };

  const renderClientGroup = (group: ClienteGroup, showFinalize: boolean) => {
    const badge = tipoBadge(group.tipo);
    const embaladoCount = group.pedidos.filter(p => p.status === "embalado").length;
    return (
      <div key={group.nome} className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-card overflow-hidden">
        <button
          className="w-full text-left p-4 hover:bg-[#1a1e2a] transition-all"
          onClick={() => setSelectedClient(selectedClient === group.nome ? null : group.nome)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: badge.bg }}>
                <Package className="w-5 h-5" style={{ color: badge.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded" style={{ background: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                  <span className="text-sm font-bold text-foreground">{group.nome}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {group.pedidos.length} pedido(s)
                  {embaladoCount > 0 && showFinalize && (
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(52,201,122,0.12)", color: "#34c97a" }}>
                      {embaladoCount} embalado(s)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <span className="text-muted-foreground text-lg">{selectedClient === group.nome ? "▾" : "▸"}</span>
          </div>
        </button>

        {selectedClient === group.nome && (
          <div className="border-t border-[rgba(255,255,255,0.07)] p-3 space-y-2">
            {group.pedidos.map(order => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <button className="flex-1 text-left" onClick={() => openOrder(order)}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold" style={{ color: "#5b8df6" }}>{order.numero_pedido}</span>
                    {order.tipo_cobranca === "peso" && <Scale className="w-3.5 h-3.5" style={{ color: "#f0a020" }} />}
                    {order.status_entrada === "salvo" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(91,141,246,0.12)", color: "#5b8df6" }}>Salvo</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.tipo_cobranca === "peso"
                      ? `${order.peso_informado_cliente || order.peso_kg || 0} kg`
                      : order.quem_contou === "cliente" ? "Contagem do cliente" : "Sem contagem prévia"}
                  </p>
                </button>
                <div className="flex items-center gap-2">
                  <StatusBadge status={order.status} />
                  {order.status === "embalado" && showFinalize && (
                    <button
                      className="px-3 py-1.5 text-xs font-bold rounded-lg text-white flex items-center gap-1"
                      style={{ background: "#34c97a" }}
                      onClick={(e) => { e.stopPropagation(); setFinalizingOrder(order); }}
                    >
                      <Truck className="w-3.5 h-3.5" /> Liberar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const filterButtons = [
    { key: "todas", label: "Todas" },
    { key: "clinica", label: "Clínicas" },
    { key: "hospital", label: "Hospitais" },
  ];

  return (
    <AppLayout title="Amaná" subtitle="Produção">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        {filterButtons.map(f => (
          <button
            key={f.key}
            onClick={() => setFilterTipo(f.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterTipo === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-[rgba(255,255,255,0.07)] text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input className="field-input pl-9" placeholder="Buscar clínica..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
      </div>

      <Tabs defaultValue="entrada" className="w-full">
        <TabsList className="w-full mb-3">
          <TabsTrigger value="entrada" className="flex-1 gap-1">
            <Package className="w-4 h-4" />
            Entrada ({entryOrders.length})
          </TabsTrigger>
          <TabsTrigger value="producao" className="flex-1 gap-1">
            <CheckCircle className="w-4 h-4" />
            Produção ({productionOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entrada">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Entrada de roupas — pedidos coletados
          </h3>
          {entryGroups.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">📦</div><p className="empty-state-text">Nenhum pedido aguardando entrada</p></div>
          ) : (
            <div className="space-y-2">{entryGroups.map(g => renderClientGroup(g, false))}</div>
          )}
        </TabsContent>

        <TabsContent value="producao">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Em produção / Embalados
          </h3>
          {productionGroups.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🏭</div><p className="empty-state-text">Nenhum pedido em produção</p></div>
          ) : (
            <div className="space-y-2">{productionGroups.map(g => renderClientGroup(g, true))}</div>
          )}
        </TabsContent>
      </Tabs>

      {/* Conference / Entry modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-[rgba(255,255,255,0.07)] rounded-xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 animate-fade-in">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {(() => {
                    const b = tipoBadge(selectedOrder.clientes?.tipo || "clinica");
                    return <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded" style={{ background: b.bg, color: b.color }}>{b.label}</span>;
                  })()}
                  <span className="font-mono text-sm font-bold" style={{ color: "#5b8df6" }}>{selectedOrder.numero_pedido}</span>
                </div>
                <h3 className="text-base font-bold text-foreground">{selectedOrder.clientes?.nome}</h3>
                <StatusBadge status={selectedOrder.status} className="mt-1" />
              </div>
              <button className="text-muted-foreground hover:text-foreground text-lg" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>

            {(selectedOrder.obs_cliente || selectedOrder.obs_motorista) && (
              <div className="space-y-1 text-xs text-muted-foreground bg-secondary rounded-lg p-3">
                {selectedOrder.obs_cliente && <p>📝 Cliente: {selectedOrder.obs_cliente}</p>}
                {selectedOrder.obs_motorista && <p>🚚 Coleta: {selectedOrder.obs_motorista}</p>}
              </div>
            )}

            {/* Show client-reported weight for peso orders */}
            {selectedOrder.peso_informado_cliente && (
              <div className="rounded-lg px-4 py-3" style={{ background: "rgba(240,160,32,0.08)" }}>
                <p className="text-xs text-muted-foreground mb-1">(informado pelo cliente)</p>
                <p className="font-mono text-lg font-bold" style={{ color: "#f0a020" }}>
                  Peso enviado: {Number(selectedOrder.peso_informado_cliente).toFixed(3)} kg
                </p>
              </div>
            )}

            {/* Production registration tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setProdTab("pecas")}
                className="flex-1 py-2 text-sm font-semibold rounded-[9px] transition-all"
                style={{
                  background: prodTab === "pecas" ? "#5b8df6" : "transparent",
                  color: prodTab === "pecas" ? "#fff" : "#6b7190",
                  border: prodTab === "pecas" ? "none" : "1px solid rgba(255,255,255,0.13)",
                }}
              >
                Registrar por Peças
              </button>
              <button
                onClick={() => setProdTab("peso")}
                className="flex-1 py-2 text-sm font-semibold rounded-[9px] transition-all"
                style={{
                  background: prodTab === "peso" ? "#5b8df6" : "transparent",
                  color: prodTab === "peso" ? "#fff" : "#6b7190",
                  border: prodTab === "peso" ? "none" : "1px solid rgba(255,255,255,0.13)",
                }}
              >
                Registrar por Peso
              </button>
            </div>

            {/* Tab: Registrar por Peças */}
            {prodTab === "pecas" && (
              <>
                {items.length === 0 && newProdItems.length === 0 ? (
                  <div className="rounded-lg px-4 py-3 text-sm font-medium" style={{ background: "rgba(240,160,32,0.12)", color: "#f0a020" }}>
                    ⚠ Nenhum item cadastrado pelo cliente
                  </div>
                ) : null}

                {items.length > 0 && (
                  <table className="data-table">
                    <thead><tr><th>Peça</th><th className="text-center">Orig.</th><th className="text-center">Conf.</th><th className="text-center">Dif.</th></tr></thead>
                    <tbody>
                      {items.map((item) => {
                        const diff = getDiff(item);
                        return (
                          <tr key={item.id}>
                            <td className="font-medium text-foreground">{item.tipos_roupa?.nome || item.descricao_livre || "—"}</td>
                            <td className="text-center font-mono">{item.quantidade_original}</td>
                            <td className="text-center">
                              <input type="number" className="field-input w-16 text-center font-mono font-bold py-1.5 text-xs mx-auto" min={0} value={item.quantidade_conferida ?? ""} onChange={(e) => updateChecked(item.id, parseInt(e.target.value) || 0)} placeholder="—" />
                            </td>
                            <td className="text-center font-mono font-bold">
                              {diff === null ? (
                                <span className="text-muted-foreground">—</span>
                              ) : diff === 0 ? (
                                <span style={{ color: "#34c97a", fontWeight: 700 }}>✓</span>
                              ) : (
                                <span style={{ color: "#e05050", fontWeight: 700 }}>{diff > 0 ? `+${diff}` : diff}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {newProdItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Peças adicionadas pela produção</p>
                    {newProdItems.map((pi, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input className="field-input flex-1 text-xs py-2" value={pi.descricao} onChange={(e) => setNewProdItems(prev => prev.map((p, i) => i === idx ? { ...p, descricao: e.target.value } : p))} placeholder="Descrição da peça" />
                        <input type="number" className="field-input w-16 text-center font-mono text-xs py-2" min={1} value={pi.quantidade} onChange={(e) => setNewProdItems(prev => prev.map((p, i) => i === idx ? { ...p, quantidade: parseInt(e.target.value) || 0 } : p))} />
                        <button onClick={() => removeProdItem(idx)} className="p-1.5 rounded-lg" style={{ color: "#e05050" }}><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}

                <button className="btn-ghost text-xs w-full" onClick={addProdItem}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar peça
                </button>
              </>
            )}

            {/* Tab: Registrar por Peso */}
            {prodTab === "peso" && (
              <>
                <div>
                  <label className="field-label flex items-center gap-2">
                    <Scale className="w-4 h-4" /> Peso recebido (kg)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    className="field-input font-mono"
                    value={pesoRecebido}
                    onChange={(e) => setPesoRecebido(e.target.value)}
                    placeholder="Peso conferido na balança"
                  />
                </div>

                {weightDiff !== null && pesoRecebido && (
                  <div className="rounded-lg px-4 py-3" style={{ background: weightDiff === 0 ? "rgba(52,201,122,0.08)" : "rgba(224,80,80,0.08)" }}>
                    {weightDiff === 0 ? (
                      <p className="flex items-center gap-2 text-sm font-bold" style={{ color: "#34c97a" }}>
                        <CheckCircle className="w-4 h-4" /> Peso conferido ✓
                      </p>
                    ) : (
                      <p className="text-sm font-bold font-mono" style={{ color: "#e05050" }}>
                        Diferença: {weightDiff > 0 ? "+" : ""}{weightDiff.toFixed(3)} kg
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            <div>
              <label className="field-label">Observações da produção</label>
              <textarea className="field-input min-h-[60px] resize-none" value={productionNotes} onChange={(e) => setProductionNotes(e.target.value)} placeholder="Observações opcionais..." />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                style={{ border: "1px solid rgba(255,255,255,0.13)", color: "#6b7190", background: "transparent" }}
                onClick={handleSaveEntry}
                disabled={saving}
              >
                <Save className="w-4 h-4" /> Salvar
              </button>
              <button
                className="flex-1 py-2.5 text-sm font-bold rounded-lg transition-all text-white flex items-center justify-center gap-2"
                style={{ background: "#5b8df6" }}
                onClick={() => {
                  const hasWeightDiff = weightDiff !== null && weightDiff !== 0;
                  const hasItemDiff = hasDivergence;
                  if (hasWeightDiff || hasItemDiff) {
                    handleConfirmEntry(true);
                  } else {
                    handleConfirmEntry(false);
                  }
                }}
                disabled={saving}
              >
                <CheckCircle className="w-4 h-4" /> Confirmar entrada
              </button>
            </div>

            <button className="btn-ghost w-full" onClick={() => setSelectedOrder(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Finalize confirmation modal */}
      {finalizingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => !saving && setFinalizingOrder(null)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div>
              <h3 className="text-sm font-bold text-foreground">Finalizar e liberar para entrega</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Pedido <span className="font-mono font-bold" style={{ color: "#5b8df6" }}>{finalizingOrder.numero_pedido}</span> — <strong className="text-foreground">{finalizingOrder.clientes?.nome}</strong>
              </p>
            </div>

            <div className="rounded-lg px-3 py-2 text-xs font-medium" style={{ background: "rgba(240,160,32,0.10)", color: "#f0a020" }}>
              ⚠ Registre as peças de saída antes de liberar para entrega.
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Peças de saída</p>
              {saidaItems.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Nenhuma peça adicionada ainda.</p>
              )}
              {saidaItems.map((s, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    className="field-select flex-1 text-xs py-2"
                    value={s.tipo_roupa_id || ""}
                    onChange={(e) => setSaidaItems(prev => prev.map((p, i) => i === idx ? { ...p, tipo_roupa_id: e.target.value || null, descricao: "" } : p))}
                  >
                    <option value="">— Outro (descrever) —</option>
                    {tiposRoupa.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                  {!s.tipo_roupa_id && (
                    <input
                      className="field-input flex-1 text-xs py-2"
                      placeholder="Descrição"
                      value={s.descricao}
                      onChange={(e) => setSaidaItems(prev => prev.map((p, i) => i === idx ? { ...p, descricao: e.target.value } : p))}
                    />
                  )}
                  <input
                    type="number"
                    min={1}
                    className="field-input w-16 text-center font-mono text-xs py-2"
                    value={s.quantidade}
                    onChange={(e) => setSaidaItems(prev => prev.map((p, i) => i === idx ? { ...p, quantidade: parseInt(e.target.value) || 0 } : p))}
                  />
                  <button onClick={() => setSaidaItems(prev => prev.filter((_, i) => i !== idx))} className="p-1.5" style={{ color: "#e05050" }}><X className="w-4 h-4" /></button>
                </div>
              ))}
              <button
                className="btn-ghost text-xs w-full"
                onClick={() => setSaidaItems(prev => [...prev, { tipo_roupa_id: null, descricao: "", quantidade: 1 }])}
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar peça de saída
              </button>
            </div>

            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => { setFinalizingOrder(null); setSaidaItems([]); }} disabled={saving}>Cancelar</button>
              <button
                className="flex-1 py-2.5 text-sm font-bold rounded-lg text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: "#34c97a" }}
                onClick={handleFinalize}
                disabled={saving}
              >
                {saving ? "Finalizando..." : "✓ Liberar para entrega"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmation && (
        <ConfirmationModal numeroPedido={confirmation.pedido} variant={confirmation.variant} title={confirmation.title} onClose={() => setConfirmation(null)} />
      )}
    </AppLayout>
  );
};

export default ProducaoDashboard;
