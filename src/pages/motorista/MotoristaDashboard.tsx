import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { MapPin, Check, MessageSquare } from "lucide-react";

interface Order {
  id: string;
  order_number: number;
  status: string;
  client_notes: string | null;
  charge_type: string;
  profiles: { name: string; address: string | null } | null;
}

const MotoristaDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [collectionNotes, setCollectionNotes] = useState("");
  const [confirming, setConfirming] = useState(false);

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, status, client_notes, charge_type, profiles!orders_client_id_fkey(name, address)")
      .eq("driver_id", user.id)
      .in("status", ["aguardando_coleta", "coletado"])
      .order("created_at", { ascending: true });
    setOrders((data as unknown as Order[]) || []);
  };

  useEffect(() => { fetchOrders(); }, [user]);

  const confirmCollection = async (order: Order) => {
    setConfirming(true);
    await supabase.from("orders").update({
      status: "coletado" as const,
      collected_at: new Date().toISOString(),
      collection_notes: collectionNotes || null,
    }).eq("id", order.id);
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
              onClick={() => setSelectedOrder(order)}
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
                    {order.profiles?.name} · <span className="font-mono text-xs">#{order.order_number}</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {order.profiles?.address || "Endereço não informado"}
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

      {/* Order detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="app-card-elevated w-full max-w-md space-y-4 animate-fade-in">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Pedido <span className="font-mono">#{selectedOrder.order_number}</span>
                </h3>
                <p className="text-sm text-muted-foreground">{selectedOrder.profiles?.name}</p>
              </div>
              <button className="text-muted-foreground hover:text-foreground text-lg" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>

            {selectedOrder.charge_type === "por_peso" ? (
              <div className="rounded-lg bg-warning/10 text-warning text-sm font-medium px-4 py-3">
                ⚠ Coleta sem contagem prévia (hospital — por peso)
              </div>
            ) : (
              <div className="rounded-lg bg-primary/10 text-primary text-sm font-medium px-4 py-3">
                Contagem registrada pelo cliente disponível
              </div>
            )}

            {selectedOrder.client_notes && (
              <div className="flex gap-2 text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{selectedOrder.client_notes}</span>
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
