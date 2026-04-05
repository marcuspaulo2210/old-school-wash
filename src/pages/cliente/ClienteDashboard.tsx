import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { registrarMudancaStatus } from "@/lib/statusHistory";
import AppLayout from "@/components/AppLayout";
import { Plus, Minus } from "lucide-react";

interface TipoRoupa { id: string; nome: string; }
interface ItemPedido { tipo_roupa_id: string; descricao_livre: string; quantidade_original: number; }
interface Pedido {
  id: string;
  numero_pedido: string;
  status: string;
  criado_em: string;
  tipo_cobranca: string;
  clientes: { tipo: string } | null;
}

const statusSteps = ["aguardando_coleta", "coletado", "em_producao", "embalado", "entregue"];
const stepLabels = ["Aguardar", "Coletado", "Produção", "Embalado", "Entregue"];

const statusBadge: Record<string, { label: string; cls: string }> = {
  aguardando_coleta: { label: "Aguard. Coleta", cls: "badge-warning" },
  coletado: { label: "Coletado", cls: "badge-primary" },
  em_producao: { label: "Em Produção", cls: "badge-teal" },
  embalado: { label: "Embalado", cls: "badge-success" },
  entregue: { label: "Entregue", cls: "badge-purple" },
  divergencia: { label: "Divergência", cls: "badge-danger" },
};

const ClienteDashboard = () => {
  const { user, profile } = useAuth();
  const [tiposRoupa, setTiposRoupa] = useState<TipoRoupa[]>([]);
  const [orders, setOrders] = useState<Pedido[]>([]);
  const [items, setItems] = useState<ItemPedido[]>([]);
  const [chargeType, setChargeType] = useState<"peca" | "peso">("peca");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [clienteInfo, setClienteInfo] = useState<{ tipo: string } | null>(null);

  useEffect(() => {
    supabase.from("tipos_roupa").select("id, nome").eq("ativo", true).order("nome")
      .then(({ data }) => setTiposRoupa((data as unknown as TipoRoupa[]) || []));

    if (user && profile?.cliente_id) {
      supabase.from("pedidos")
        .select("id, numero_pedido, status, criado_em, tipo_cobranca, clientes(tipo)")
        .eq("cliente_id", profile.cliente_id)
        .order("criado_em", { ascending: false })
        .then(({ data }) => setOrders((data as unknown as Pedido[]) || []));

      supabase.from("clientes").select("tipo").eq("id", profile.cliente_id).single()
        .then(({ data }) => {
          if (data) setClienteInfo(data as any);
        });
    }
  }, [user, profile]);

  const isHospital = clienteInfo?.tipo === "hospital";

  const addItem = () => {
    if (isHospital) return;
    setItems([...items, { tipo_roupa_id: "", descricao_livre: "", quantidade_original: 1 }]);
  };

  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof ItemPedido, value: string | number) => {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const totalPieces = items.reduce((sum, i) => sum + i.quantidade_original, 0);

  const handleSubmit = async () => {
    if (!user || !profile?.cliente_id) return;
    if (!isHospital && items.length === 0) return;
    setSaving(true);

    const quemContou = isHospital ? "lavanderia" : "cliente";

    const { data: order, error } = await supabase
      .from("pedidos")
      .insert({
        cliente_id: profile.cliente_id,
        tipo_cobranca: chargeType,
        obs_cliente: notes || null,
        quem_contou: quemContou,
      } as any)
      .select("id")
      .single();

    if (order && !error) {
      const orderId = (order as any).id;

      // Register status history
      await registrarMudancaStatus(orderId, null, "aguardando_coleta", user.id, "Pedido criado pelo cliente");

      // Insert items only for clinics
      if (!isHospital && items.length > 0) {
        const orderItems = items.map((i) => ({
          pedido_id: orderId,
          tipo_roupa_id: i.tipo_roupa_id || null,
          descricao_livre: i.descricao_livre || null,
          quantidade_original: i.quantidade_original,
        }));
        await supabase.from("itens_pedido").insert(orderItems as any);
      }

      setItems([]);
      setNotes("");
      setShowForm(false);
      const { data } = await supabase.from("pedidos")
        .select("id, numero_pedido, status, criado_em, tipo_cobranca, clientes(tipo)")
        .eq("cliente_id", profile.cliente_id)
        .order("criado_em", { ascending: false });
      setOrders((data as unknown as Pedido[]) || []);
    }
    setSaving(false);
  };

  const latestOrder = orders[0];
  const currentStep = latestOrder ? statusSteps.indexOf(latestOrder.status) : -1;

  return (
    <AppLayout title="Amaná" subtitle={profile?.nome || "Cliente"}>
      {latestOrder && (
        <div className="app-card mb-5">
          <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">
            Pedido <span className="font-mono">{latestOrder.numero_pedido}</span>
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

      {!showForm ? (
        <button className="btn-primary w-full btn-lg mb-5" onClick={() => setShowForm(true)}>
          <Plus className="w-5 h-5" /> Novo Pedido
        </button>
      ) : (
        <div className="app-card-elevated mb-5 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Novo Pedido</h3>

          <div>
            <label className="field-label">Clínica / Hospital</label>
            <input className="field-input opacity-60" value={`${profile?.nome || ""} (${isHospital ? "Hospital" : "Clínica"})`} readOnly />
          </div>

          <div>
            <label className="field-label">Tipo de cobrança</label>
            <select className="field-select" value={chargeType} onChange={(e) => setChargeType(e.target.value as "peca" | "peso")}>
              <option value="peca">Por peça</option>
              <option value="peso">Por peso</option>
            </select>
          </div>

          {isHospital ? (
            <div className="rounded-lg bg-warning/10 text-warning text-sm font-medium px-4 py-3">
              ⚠ Hospital — peças serão cadastradas pela lavanderia após a coleta.
            </div>
          ) : (
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
                      <input
                        type="text"
                        className="field-input text-xs py-2"
                        value={item.descricao_livre}
                        onChange={(e) => updateItem(idx, "descricao_livre", e.target.value)}
                        placeholder="Ex: Lençol, Toalha, Avental..."
                      />
                    </div>
                    <input
                      type="number"
                      className="field-input w-20 text-center font-mono font-bold text-xs py-2"
                      min={1}
                      value={item.quantidade_original}
                      onChange={(e) => updateItem(idx, "quantidade_original", parseInt(e.target.value) || 0)}
                    />
                    <button className="p-2 text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => removeItem(idx)}>
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isHospital && items.length > 0 && (
            <div className="flex justify-between items-center py-2 border-t border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Total de peças</span>
              <span className="text-lg font-extrabold text-foreground font-mono">{totalPieces}</span>
            </div>
          )}

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
            <button
              className="btn-success flex-1 btn-lg"
              onClick={handleSubmit}
              disabled={saving || (!isHospital && items.length === 0)}
            >
              {saving ? "Enviando..." : "Enviar Pedido"}
            </button>
          </div>
        </div>
      )}

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
                      Pedido <span className="font-mono">{order.numero_pedido}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.criado_em).toLocaleDateString("pt-BR")}
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
