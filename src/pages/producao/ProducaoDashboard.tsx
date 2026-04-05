import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { registrarMudancaStatus } from "@/lib/statusHistory";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import ConfirmationModal from "@/components/ConfirmationModal";
import { CheckCircle, AlertTriangle, Package } from "lucide-react";

interface ItemPedido {
  id: string;
  tipo_roupa_id: string | null;
  descricao_livre: string | null;
  quantidade_original: number;
  quantidade_conferida: number | null;
  diferenca: number | null;
  tipos_roupa: { nome: string } | null;
}

interface Pedido {
  id: string;
  numero_pedido: string;
  status: string;
  obs_cliente: string | null;
  obs_motorista: string | null;
  quem_contou: string;
  clientes: { nome: string; tipo: string } | null;
}

const ProducaoDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const [items, setItems] = useState<ItemPedido[]>([]);
  const [productionNotes, setProductionNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<{ pedido: string; variant: "success" | "danger"; title: string } | null>(null);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, status, obs_cliente, obs_motorista, quem_contou, clientes(nome, tipo)")
      .in("status", ["coletado", "em_producao"])
      .order("criado_em", { ascending: true });
    setOrders((data as unknown as Pedido[]) || []);
  };

  useEffect(() => { fetchOrders(); }, []);

  const openOrder = async (order: Pedido) => {
    setSelectedOrder(order);
    setProductionNotes("");
    if (order.status === "coletado" && user) {
      await supabase.from("pedidos").update({ status: "em_producao" as any } as any).eq("id", order.id);
      await registrarMudancaStatus(order.id, "coletado", "em_producao", user.id, "Pedido aberto na produção");
      order.status = "em_producao";
    }
    const { data } = await supabase.from("itens_pedido").select("id, tipo_roupa_id, descricao_livre, quantidade_original, quantidade_conferida, diferenca, tipos_roupa(nome)").eq("pedido_id", order.id);
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

  const handleConfirm = async (registerDivergence: boolean) => {
    if (!selectedOrder || !user) return;
    setSaving(true);
    for (const item of items) {
      if (item.quantidade_conferida !== null) {
        await supabase.from("itens_pedido").update({ quantidade_conferida: item.quantidade_conferida } as any).eq("id", item.id);
      }
    }
    const newStatus = registerDivergence ? "divergencia" : "embalado";
    await supabase.from("pedidos").update({ status: newStatus as any, obs_producao: productionNotes || null, embalado_em: registerDivergence ? null : new Date().toISOString() } as any).eq("id", selectedOrder.id);
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
                  </div>
                  <div className="text-xs text-muted-foreground">{order.clientes?.nome}</div>
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
                  Conferência — <span className="font-mono" style={{ color: "#5b8df6" }}>{selectedOrder.numero_pedido}</span>
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

            {items.length === 0 ? (
              <div className="rounded-lg px-4 py-3 text-sm font-medium" style={{ background: "rgba(240,160,32,0.12)", color: "#f0a020" }}>
                ⚠ Nenhum item cadastrado (hospital — contagem pela lavanderia)
              </div>
            ) : (
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

            <div>
              <label className="field-label">Observações da produção</label>
              <textarea className="field-input min-h-[60px] resize-none" value={productionNotes} onChange={(e) => setProductionNotes(e.target.value)} placeholder="Observações opcionais..." />
            </div>

            <div className="flex gap-2">
              {hasDivergence ? (
                <>
                  <button className="btn-danger flex-1 btn-lg" onClick={() => handleConfirm(true)} disabled={saving}>
                    <AlertTriangle className="w-4 h-4" /> Divergência
                  </button>
                  <button className="btn-success flex-1 btn-lg" onClick={() => handleConfirm(false)} disabled={saving}>
                    <CheckCircle className="w-4 h-4" /> Confirmar
                  </button>
                </>
              ) : (
                <button className="btn-success w-full btn-lg" onClick={() => handleConfirm(false)} disabled={saving || !allChecked}>
                  <CheckCircle className="w-4 h-4" /> Confirmar e Embalar
                </button>
              )}
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
