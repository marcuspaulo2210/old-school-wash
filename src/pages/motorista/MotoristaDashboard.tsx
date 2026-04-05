import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { registrarMudancaStatus } from "@/lib/statusHistory";
import AppLayout from "@/components/AppLayout";
import OrderCard from "@/components/OrderCard";
import ConfirmationModal from "@/components/ConfirmationModal";
import { MapPin, MessageSquare } from "lucide-react";

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
  clientes: { nome: string; endereco: string | null; tipo: string } | null;
}

const MotoristaDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const [orderItems, setOrderItems] = useState<ItemPedido[]>([]);
  const [collectionNotes, setCollectionNotes] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState<{ pedido: string } | null>(null);

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, status, obs_cliente, tipo_cobranca, quem_contou, criado_em, clientes(nome, endereco, tipo)")
      .eq("motorista_id", user.id)
      .in("status", ["aguardando_coleta", "coletado"])
      .order("criado_em", { ascending: true });
    setOrders((data as unknown as Pedido[]) || []);
  };

  useEffect(() => { fetchOrders(); }, [user]);

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
    setConfirmation({ pedido });
    fetchOrders();
  };

  return (
    <AppLayout title="Amaná" subtitle="Painel do Motorista">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Rota de coletas ({orders.filter((o) => o.status === "aguardando_coleta").length} pendentes)
      </h3>

      {orders.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">🚚</div><p className="empty-state-text">Nenhuma coleta atribuída</p></div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              numeroPedido={order.numero_pedido}
              clienteNome={order.clientes?.nome || "—"}
              resumo={order.clientes?.endereco || "Endereço não informado"}
              status={order.status}
              criadoEm={order.criado_em}
              obsCliente={order.obs_cliente}
              onClick={() => openOrder(order)}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-[rgba(255,255,255,0.07)] rounded-xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4 animate-fade-in">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Pedido <span className="font-mono" style={{ color: "#5b8df6" }}>{selectedOrder.numero_pedido}</span>
                </h3>
                <p className="text-sm text-muted-foreground">{selectedOrder.clientes?.nome} ({selectedOrder.clientes?.tipo === "hospital" ? "Hospital" : "Clínica"})</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {selectedOrder.clientes?.endereco || "—"}</p>
              </div>
              <button className="text-muted-foreground hover:text-foreground text-lg" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>

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

            <button className="btn-ghost w-full" onClick={() => setSelectedOrder(null)}>Fechar</button>
          </div>
        </div>
      )}

      {confirmation && (
        <ConfirmationModal numeroPedido={confirmation.pedido} variant="success" title="Coleta Confirmada" onClose={() => setConfirmation(null)}>
          <div className="flex justify-between"><span>Status:</span><span className="text-foreground">Coletado</span></div>
        </ConfirmationModal>
      )}
    </AppLayout>
  );
};

export default MotoristaDashboard;
