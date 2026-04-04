import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import { Plus, Minus } from "lucide-react";

interface ClothingType { id: string; name: string; unit: string; }
interface OrderItem { clothing_type_id: string; quantity_registered: number; }
interface Order {
  id: string;
  order_number: number;
  status: string;
  created_at: string;
}

const statusSteps = ["cadastrado", "aguardando_coleta", "coletado", "em_lavagem", "entregue"];
const stepLabels = ["Cadastrar", "Aguardar", "Coletado", "Lavagem", "Entregue"];

const statusBadge: Record<string, { label: string; cls: string }> = {
  cadastrado: { label: "Cadastrado", cls: "badge-neutral" },
  aguardando_coleta: { label: "Aguard. Coleta", cls: "badge-warning" },
  coletado: { label: "Coletado", cls: "badge-primary" },
  em_lavagem: { label: "Em Lavagem", cls: "badge-teal" },
  finalizado: { label: "Finalizado", cls: "badge-success" },
  entregue: { label: "Entregue", cls: "badge-purple" },
};

const ClienteDashboard = () => {
  const { user, profile } = useAuth();
  const [clothingTypes, setClothingTypes] = useState<ClothingType[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [chargeType, setChargeType] = useState<"por_peca" | "por_peso">("por_peca");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    supabase.from("clothing_types").select("id, name, unit").eq("active", true).order("sort_order").then(({ data }) => setClothingTypes(data || []));
    if (user) {
      supabase.from("orders").select("id, order_number, status, created_at").eq("client_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setOrders((data as Order[]) || []));
    }
  }, [user]);

  const addItem = () => {
    if (clothingTypes.length > 0) {
      setItems([...items, { clothing_type_id: clothingTypes[0].id, quantity_registered: 1 }]);
    }
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof OrderItem, value: string | number) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const totalPieces = items.reduce((sum, i) => sum + i.quantity_registered, 0);

  const handleSubmit = async () => {
    if (!user || items.length === 0) return;
    setSaving(true);

    const { data: order, error } = await supabase
      .from("orders")
      .insert({ client_id: user.id, charge_type: chargeType, client_notes: notes || null })
      .select("id")
      .single();

    if (order && !error) {
      const orderItems = items.map((i) => ({
        order_id: order.id,
        clothing_type_id: i.clothing_type_id,
        quantity_registered: i.quantity_registered,
      }));
      await supabase.from("order_items").insert(orderItems);

      // Update status to aguardando_coleta
      await supabase.from("orders").update({ status: "aguardando_coleta" as const }).eq("id", order.id);

      setItems([]);
      setNotes("");
      setShowForm(false);
      // Refresh orders
      const { data } = await supabase.from("orders").select("id, order_number, status, created_at").eq("client_id", user.id).order("created_at", { ascending: false });
      setOrders((data as Order[]) || []);
    }
    setSaving(false);
  };

  // Progress indicator for latest order
  const latestOrder = orders[0];
  const currentStep = latestOrder ? statusSteps.indexOf(latestOrder.status) : -1;

  return (
    <AppLayout title="Amaná" subtitle={profile?.name || "Cliente"}>
      {/* Progress indicator */}
      {latestOrder && (
        <div className="app-card mb-5">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">
            Pedido <span className="font-mono">#{latestOrder.order_number}</span>
          </p>
          <div className="flex items-center justify-between">
            {stepLabels.map((label, idx) => (
              <div key={label} className="flex flex-col items-center flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                  idx <= currentStep ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                  {idx < currentStep ? "✓" : idx + 1}
                </div>
                <span className={`text-[10px] font-medium ${idx <= currentStep ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New order button or form */}
      {!showForm ? (
        <button className="btn-primary w-full btn-lg mb-5" onClick={() => setShowForm(true)}>
          <Plus className="w-5 h-5" /> Novo Pedido
        </button>
      ) : (
        <div className="app-card-elevated mb-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Novo Pedido</h3>

          {/* Client name (read-only) */}
          <div>
            <label className="field-label">Clínica</label>
            <input className="field-input opacity-60" value={profile?.name || ""} readOnly />
          </div>

          {/* Charge type */}
          <div>
            <label className="field-label">Tipo de cobrança</label>
            <select className="field-select" value={chargeType} onChange={(e) => setChargeType(e.target.value as "por_peca" | "por_peso")}>
              <option value="por_peca">Por peça</option>
              <option value="por_peso">Por peso</option>
            </select>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="field-label mb-0">Peças</label>
              <button className="btn-primary text-xs px-3 py-1.5" onClick={addItem}>
                <Plus className="w-3 h-3" /> Adicionar
              </button>
            </div>
            {items.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma peça adicionada</p>}
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <select
                      className="field-select text-xs py-2"
                      value={item.clothing_type_id}
                      onChange={(e) => updateItem(idx, "clothing_type_id", e.target.value)}
                    >
                      {clothingTypes.map((ct) => (
                        <option key={ct.id} value={ct.id}>{ct.name} ({ct.unit})</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="number"
                    className="field-input w-20 text-center font-mono font-bold text-xs py-2"
                    min={1}
                    value={item.quantity_registered}
                    onChange={(e) => updateItem(idx, "quantity_registered", parseInt(e.target.value) || 0)}
                  />
                  <button className="p-2 text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => removeItem(idx)}>
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          {items.length > 0 && (
            <div className="flex justify-between items-center py-2 border-t border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Total de peças</span>
              <span className="text-lg font-extrabold text-foreground font-mono">{totalPieces}</span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="field-label">Observações</label>
            <textarea
              className="field-input min-h-[60px] resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações opcionais..."
            />
          </div>

          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => { setShowForm(false); setItems([]); }}>Cancelar</button>
            <button className="btn-success flex-1 btn-lg" onClick={handleSubmit} disabled={saving || items.length === 0}>
              {saving ? "Enviando..." : "Enviar Pedido"}
            </button>
          </div>
        </div>
      )}

      {/* Order history */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Histórico de pedidos</h3>
        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p className="empty-state-text">Nenhum pedido ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => {
              const s = statusBadge[order.status] || { label: order.status, cls: "badge-neutral" };
              return (
                <div key={order.id} className="list-item">
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      Pedido <span className="font-mono">#{order.order_number}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <span className={s.cls}>{s.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ClienteDashboard;
