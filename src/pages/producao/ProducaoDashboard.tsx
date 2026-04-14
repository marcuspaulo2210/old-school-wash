import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { registrarMudancaStatus } from "@/lib/statusHistory";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import ConfirmationModal from "@/components/ConfirmationModal";
import { CheckCircle, AlertTriangle, Package, Plus, X, Scale, Save } from "lucide-react";

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
  clientes: { nome: string; tipo: string } | null;
}

interface NewProdItem {
  descricao: string;
  quantidade: number;
  observacao: string;
}

const ProducaoDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const [items, setItems] = useState<ItemPedido[]>([]);
  const [productionNotes, setProductionNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<{ pedido: string; variant: "success" | "danger"; title: string } | null>(null);

  // Production registration tabs
  const [prodTab, setProdTab] = useState<"pecas" | "peso">("pecas");

  // Production weight
  const [pesoRecebido, setPesoRecebido] = useState("");

  // Production items (new items added by production)
  const [newProdItems, setNewProdItems] = useState<NewProdItem[]>([]);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, status, tipo_cobranca, obs_cliente, obs_motorista, quem_contou, peso_kg, peso_informado_cliente, peso_recebido_producao, tipo_registro_producao, status_entrada, clientes(nome, tipo)")
      .in("status", ["coletado", "em_producao"])
      .order("criado_em", { ascending: true });
    setOrders((data as unknown as Pedido[]) || []);
  };

  useEffect(() => { fetchOrders(); }, []);

  const openOrder = async (order: Pedido) => {
    setSelectedOrder(order);
    setProductionNotes("");
    setPesoRecebido(order.peso_recebido_producao ? String(order.peso_recebido_producao) : "");
    setProdTab(order.tipo_cobranca === "peso" ? "peso" : "pecas");
    setNewProdItems([]);

    // Auto-advance to em_producao if coletado
    if (order.status === "coletado" && user) {
      await supabase.from("pedidos").update({ status: "em_producao" as any } as any).eq("id", order.id);
      await registrarMudancaStatus(order.id, "coletado", "em_producao", user.id, "Pedido aberto na produção");
      order.status = "em_producao";
    }

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

  const allChecked = items.length > 0 && items.every((i) => i.quantidade_conferida !== null);
  const hasDivergence = items.some((i) => { const d = getDiff(i); return d !== null && d !== 0; });

  const addProdItem = () => setNewProdItems([...newProdItems, { descricao: "", quantidade: 1, observacao: "" }]);
  const removeProdItem = (idx: number) => setNewProdItems(newProdItems.filter((_, i) => i !== idx));

  const weightDiff = selectedOrder?.peso_informado_cliente && pesoRecebido
    ? parseFloat(pesoRecebido) - selectedOrder.peso_informado_cliente
    : null;

  const handleSaveEntry = async () => {
    if (!selectedOrder || !user) return;
    setSaving(true);

    // Save existing items
    for (const item of items) {
      if (item.quantidade_conferida !== null) {
        await supabase.from("itens_pedido").update({ quantidade_conferida: item.quantidade_conferida } as any).eq("id", item.id);
      }
    }

    // Save new production items
    if (newProdItems.length > 0) {
      const prodItems = newProdItems.filter(pi => pi.descricao.trim()).map(pi => ({
        pedido_id: selectedOrder.id,
        descricao_livre: pi.descricao,
        quantidade_original: pi.quantidade,
        origem: "producao",
      }));
      if (prodItems.length > 0) await supabase.from("itens_pedido").insert(prodItems as any);
    }

    // Update order
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

    // Save existing items
    for (const item of items) {
      if (item.quantidade_conferida !== null) {
        await supabase.from("itens_pedido").update({ quantidade_conferida: item.quantidade_conferida } as any).eq("id", item.id);
      }
    }

    // Save new production items
    if (newProdItems.length > 0) {
      const prodItems = newProdItems.filter(pi => pi.descricao.trim()).map(pi => ({
        pedido_id: selectedOrder.id,
        descricao_livre: pi.descricao,
        quantidade_original: pi.quantidade,
        origem: "producao",
      }));
      if (prodItems.length > 0) await supabase.from("itens_pedido").insert(prodItems as any);
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

  return (
    <AppLayout title="Amaná" subtitle="Produção">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Pedidos em produção ({orders.length})
      </h3>

      {orders.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📦</div><p className="empty-state-text">Nenhum pedido na produção</p></div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <button key={order.id} className="w-full text-left flex items-center justify-between p-4 rounded-xl border border-[rgba(255,255,255,0.07)] bg-card transition-all hover:bg-[#1a1e2a] hover:border-[rgba(255,255,255,0.13)]" onClick={() => openOrder(order)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(45,191,160,0.12)" }}>
                  <Package className="w-5 h-5" style={{ color: "#2dbfa0" }} />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">
                    <span className="font-mono" style={{ color: "#5b8df6" }}>{order.numero_pedido}</span>
                    {order.tipo_cobranca === "peso" && (
                      <Scale className="w-3.5 h-3.5 inline-block ml-2" style={{ color: "#f0a020" }} />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {order.clientes?.nome}
                    {order.status_entrada === "salvo" && (
                      <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(91,141,246,0.12)", color: "#5b8df6" }}>Salvo</span>
                    )}
                  </div>
                </div>
              </div>
              <StatusBadge status={order.status} />
            </button>
          ))}
        </div>
      )}

      {/* Conference modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-[rgba(255,255,255,0.07)] rounded-xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 animate-fade-in">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Entrada — <span className="font-mono" style={{ color: "#5b8df6" }}>{selectedOrder.numero_pedido}</span>
                </h3>
                <p className="text-sm text-muted-foreground">{selectedOrder.clientes?.nome}</p>
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

                {/* New items added by production */}
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

                {/* Weight comparison */}
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
                  // Check for divergence
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

      {confirmation && (
        <ConfirmationModal numeroPedido={confirmation.pedido} variant={confirmation.variant} title={confirmation.title} onClose={() => setConfirmation(null)} />
      )}
    </AppLayout>
  );
};

export default ProducaoDashboard;
