import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { CheckCircle, AlertTriangle, Package } from "lucide-react";

interface OrderItem {
  id: string;
  clothing_type_id: string;
  quantity_registered: number;
  quantity_checked: number | null;
  notes: string | null;
  clothing_types: { name: string; unit: string } | null;
}

interface Order {
  id: string;
  order_number: number;
  status: string;
  client_notes: string | null;
  collection_notes: string | null;
  profiles: { name: string } | null;
}

const ProducaoDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [productionNotes, setProductionNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, status, client_notes, collection_notes, profiles!orders_client_id_fkey(name)")
      .in("status", ["coletado", "em_lavagem"])
      .order("created_at", { ascending: true });
    setOrders((data as unknown as Order[]) || []);
  };

  useEffect(() => { fetchOrders(); }, []);

  const openOrder = async (order: Order) => {
    setSelectedOrder(order);
    setProductionNotes("");
    const { data } = await supabase
      .from("order_items")
      .select("id, clothing_type_id, quantity_registered, quantity_checked, notes, clothing_types(name, unit)")
      .eq("order_id", order.id);
    setItems((data as unknown as OrderItem[]) || []);
  };

  const updateChecked = (itemId: string, value: number) => {
    setItems(items.map((i) => i.id === itemId ? { ...i, quantity_checked: value } : i));
  };

  const getDiff = (item: OrderItem) => {
    if (item.quantity_checked === null) return null;
    return item.quantity_checked - item.quantity_registered;
  };

  const hasDivergence = items.some((i) => {
    const diff = getDiff(i);
    return diff !== null && diff !== 0;
  });

  const handleConfirm = async (registerDivergence: boolean) => {
    if (!selectedOrder) return;
    setSaving(true);

    // Update each item's quantity_checked
    for (const item of items) {
      if (item.quantity_checked !== null) {
        await supabase.from("order_items").update({ quantity_checked: item.quantity_checked }).eq("id", item.id);
      }
    }

    // Update order
    await supabase.from("orders").update({
      status: "finalizado" as const,
      production_notes: productionNotes || null,
      has_divergence: registerDivergence,
    }).eq("id", selectedOrder.id);

    setSelectedOrder(null);
    setSaving(false);
    fetchOrders();
  };

  return (
    <AppLayout title="Amaná" subtitle="Produção">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Pedidos em produção ({orders.length})
      </h3>

      {orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <p className="empty-state-text">Nenhum pedido na produção</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <button key={order.id} className="list-item w-full text-left" onClick={() => openOrder(order)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-teal/15 flex items-center justify-center">
                  <Package className="w-5 h-5 text-teal" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">
                    Pedido <span className="font-mono">#{order.order_number}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{order.profiles?.name}</div>
                </div>
              </div>
              <span className={order.status === "em_lavagem" ? "badge-teal" : "badge-primary"}>
                {order.status === "em_lavagem" ? "Lavando" : "Coletado"}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Conference modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="app-card-elevated w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 animate-fade-in">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Conferência — <span className="font-mono">#{selectedOrder.order_number}</span>
                </h3>
                <p className="text-sm text-muted-foreground">{selectedOrder.profiles?.name}</p>
              </div>
              <button className="text-muted-foreground hover:text-foreground text-lg" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>

            {/* Notes from previous steps */}
            {(selectedOrder.client_notes || selectedOrder.collection_notes) && (
              <div className="space-y-1 text-xs text-muted-foreground bg-secondary rounded-lg p-3">
                {selectedOrder.client_notes && <p>📝 Cliente: {selectedOrder.client_notes}</p>}
                {selectedOrder.collection_notes && <p>🚚 Coleta: {selectedOrder.collection_notes}</p>}
              </div>
            )}

            {/* Conference table */}
            <table className="data-table">
              <thead>
                <tr>
                  <th>Peça</th>
                  <th className="text-center">Orig.</th>
                  <th className="text-center">Conf.</th>
                  <th className="text-center">Dif.</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const diff = getDiff(item);
                  return (
                    <tr key={item.id}>
                      <td className="font-medium text-foreground">{item.clothing_types?.name}</td>
                      <td className="text-center font-mono">{item.quantity_registered}</td>
                      <td className="text-center">
                        <input
                          type="number"
                          className="field-input w-16 text-center font-mono font-bold py-1.5 text-xs mx-auto"
                          min={0}
                          value={item.quantity_checked ?? ""}
                          onChange={(e) => updateChecked(item.id, parseInt(e.target.value) || 0)}
                          placeholder="—"
                        />
                      </td>
                      <td className="text-center font-mono font-bold">
                        {diff === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : diff === 0 ? (
                          <span className="text-success">✓</span>
                        ) : diff > 0 ? (
                          <span className="text-success">+{diff}</span>
                        ) : (
                          <span className="text-destructive">{diff}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Production notes */}
            <div>
              <label className="field-label">Observações da produção</label>
              <textarea
                className="field-input min-h-[60px] resize-none"
                value={productionNotes}
                onChange={(e) => setProductionNotes(e.target.value)}
                placeholder="Observações opcionais..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {hasDivergence ? (
                <>
                  <button className="btn-danger flex-1 btn-lg" onClick={() => handleConfirm(true)} disabled={saving}>
                    <AlertTriangle className="w-4 h-4" /> Registrar Divergência
                  </button>
                  <button className="btn-success flex-1 btn-lg" onClick={() => handleConfirm(false)} disabled={saving}>
                    <CheckCircle className="w-4 h-4" /> Confirmar
                  </button>
                </>
              ) : (
                <button className="btn-success w-full btn-lg" onClick={() => handleConfirm(false)} disabled={saving}>
                  <CheckCircle className="w-4 h-4" /> Confirmar e Embalar
                </button>
              )}
            </div>

            <button className="btn-ghost w-full" onClick={() => setSelectedOrder(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default ProducaoDashboard;
