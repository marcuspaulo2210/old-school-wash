import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { registrarMudancaStatus } from "@/lib/statusHistory";
import AppLayout from "@/components/AppLayout";
import { MapPin, Check, MessageSquare } from "lucide-react";

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
  clientes: { nome: string; endereco: string | null; tipo: string } | null;
}

const MotoristaDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Pedido | null>(null);
  const [orderItems, setOrderItems] = useState<ItemPedido[]>([]);
  const [collectionNotes, setCollectionNotes] = useState("");
  const [confirming, setConfirming] = useState(false);

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, status, obs_cliente, tipo_cobranca, quem_contou, clientes(nome, endereco, tipo)")
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
      const { data } = await supabase
        .from("itens_pedido")
        .select("id, descricao_livre, quantidade_original, tipos_roupa(nome)")
        .eq("pedido_id", order.id);
      setOrderItems((data as unknown as ItemPedido[]) || []);
    } else {
      setOrderItems([]);
    }
  };

  const confirmCollection = async (order: Pedido) => {
    if (!user) return;
    setConfirming(true);

    await supabase.from("pedidos").update({
      status: "coletado" as any,
      coletado_em: new Date().toISOString(),
      obs_motorista: collectionNotes || null,
    } as any).eq("id", order.id);

    await registrarMudancaStatus(
      order.id,
      "aguardando_coleta",
      "coletado",
      user.id,
      collectionNotes || "Coleta confirmada pelo motorista"
    );

    setSelectedOrder(null);
    setCollectionNotes("");
    setConfirming(false);
    fetchOrders();
  };

  return (
    <AppLayout title="Amaná" subtitle="Painel do Motorista">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Rota de coletas ({orders.filter((o) => o.status === "aguardando_coleta").length} pendentes)
      </h3>

      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🚚</div>
          <p className="empty-state-text">Nenhuma coleta atribuída</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <button
              key={order.id}
              className="list-item w-full text-left"
              onClick={() => openOrder(order)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  order.status === "coletado" ? "bg-success/15" : "bg-warning/15"
                }`}>
                  {order.status === "coletado"
                    ? <Check className="w-5 h-5 text-success" />
                    : <MapPin className="w-5 h-5 text-warning" />
                  }
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">
                    {order.clientes?.nome} · <span className="font-mono text-xs">{order.numero_pedido}</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {order.clientes?.endereco || "Endereço não informado"}
                  </div>
                </div>
              </div>
              <span className={order.status === "coletado" ? "badge-success" : "badge-warning"}>
                {order.status === "coletado" ? "Coletado" : "Pendente"}
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="app-card-elevated w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4 animate-fade-in">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Pedido <span className="font-mono">{selectedOrder.numero_pedido}</span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.clientes?.nome} ({selectedOrder.clientes?.tipo === "hospital" ? "Hospital" : "Clínica"})
                </p>
              </div>
              <button className="text-muted-foreground hover:text-foreground text-lg" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>

            {selectedOrder.clientes?.tipo === "hospital" || selectedOrder.quem_contou === "lavanderia" ? (
              <div className="rounded-lg bg-warning/10 text-warning text-sm font-medium px-4 py-3">
                ⚠ Coleta sem contagem prévia (hospital — contagem pela lavanderia)
              </div>
            ) : (
              <>
                <div className="rounded-lg bg-primary/10 text-primary text-sm font-medium px-4 py-3">
                  Contagem registrada pelo cliente
                </div>
                {orderItems.length > 0 && (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Peça</th>
                        <th className="text-center">Qtd.</th>
                      </tr>
                    </thead>
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
                  <textarea
                    className="field-input min-h-[60px] resize-none"
                    value={collectionNotes}
                    onChange={(e) => setCollectionNotes(e.target.value)}
                    placeholder="Alguma observação?"
                  />
                </div>
                <button
                  className="btn-success w-full btn-lg"
                  onClick={() => confirmCollection(selectedOrder)}
                  disabled={confirming}
                >
                  {confirming ? "Confirmando..." : "✓ Confirmar Coleta"}
                </button>
              </>
            )}

            <button className="btn-ghost w-full" onClick={() => setSelectedOrder(null)}>Fechar</button>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default MotoristaDashboard;
