import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { registrarMudancaStatus } from "@/lib/statusHistory";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import OrderCard from "@/components/OrderCard";
import ConfirmationModal from "@/components/ConfirmationModal";
import { MessageSquare, TruckIcon } from "lucide-react";

interface ItemPedido {
  id: string;
  descricao_livre: string | null;
  quantidade_original: number;
  quantidade_conferida: number | null;
  diferenca: number | null;
  tipos_roupa: { nome: string } | null;
}

interface HistoricoItem {
  id: string;
  status_anterior: string | null;
  status_novo: string;
  observacao: string | null;
  criado_em: string;
  usuarios: { nome: string } | null;
}

interface Order {
  id: string;
  numero_pedido: string;
  status: string;
  tipo_cobranca: string;
  quem_contou: string;
  criado_em: string;
  coletado_em: string | null;
  embalado_em: string | null;
  obs_cliente: string | null;
  obs_motorista: string | null;
  obs_producao: string | null;
  peso_kg: number | null;
  motorista_id: string | null;
  cliente_id: string;
  clientes: { nome: string; tipo: string } | null;
}

interface Motorista { id: string; nome: string; }

const AdminPedidos = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("todos");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<ItemPedido[]>([]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [assignMotorista, setAssignMotorista] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<{ pedido: string; variant: "info" | "success" | "danger"; title: string } | null>(null);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, status, tipo_cobranca, quem_contou, criado_em, coletado_em, embalado_em, obs_cliente, obs_motorista, obs_producao, peso_kg, motorista_id, cliente_id, clientes(nome, tipo)")
      .order("criado_em", { ascending: false })
      .limit(100);
    setOrders((data as unknown as Order[]) || []);
  };

  useEffect(() => {
    fetchOrders();
    supabase.from("usuarios").select("id, nome").eq("perfil", "motorista").eq("ativo", true)
      .then(({ data }) => setMotoristas((data as unknown as Motorista[]) || []));
  }, []);

  const openOrder = async (order: Order) => {
    setSelectedOrder(order);
    setAssignMotorista(order.motorista_id || "");
    const [{ data: items }, { data: hist }] = await Promise.all([
      supabase.from("itens_pedido").select("id, descricao_livre, quantidade_original, quantidade_conferida, diferenca, tipos_roupa(nome)").eq("pedido_id", order.id),
      supabase.from("historico_status").select("id, status_anterior, status_novo, observacao, criado_em, usuarios(nome)").eq("pedido_id", order.id).order("criado_em", { ascending: true }),
    ]);
    setOrderItems((items as unknown as ItemPedido[]) || []);
    setHistorico((hist as unknown as HistoricoItem[]) || []);
  };

  const handleAssignMotorista = async () => {
    if (!selectedOrder || !assignMotorista || !user) return;
    setSaving(true);
    await supabase.from("pedidos").update({ motorista_id: assignMotorista } as any).eq("id", selectedOrder.id);
    setSaving(false);
    setSelectedOrder({ ...selectedOrder, motorista_id: assignMotorista });
    fetchOrders();
  };

  const handleMarkEntregue = async () => {
    if (!selectedOrder || !user) return;
    setSaving(true);
    await supabase.from("pedidos").update({ status: "entregue" as any, entregue_em: new Date().toISOString() } as any).eq("id", selectedOrder.id);
    await registrarMudancaStatus(selectedOrder.id, selectedOrder.status as any, "entregue", user.id, "Marcado como entregue pelo admin");
    setSaving(false);
    const pedido = selectedOrder.numero_pedido;
    setSelectedOrder(null);
    setConfirmation({ pedido, variant: "success", title: "Pedido Entregue" });
    fetchOrders();
  };

  const filtered = filter === "todos" ? orders : orders.filter((o) => o.status === filter);

  const filterTabs = [
    { key: "todos", label: "Todos" },
    { key: "aguardando_coleta", label: "Aguard." },
    { key: "coletado", label: "Coletados" },
    { key: "em_producao", label: "Produção" },
    { key: "embalado", label: "Embalado" },
    { key: "divergencia", label: "⚠ Diverg." },
    { key: "entregue", label: "Entregues" },
  ];

  return (
    <AppLayout title="Pedidos" subtitle="Todos os pedidos do sistema" backTo="/admin">
      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {filterTabs.map((f) => (
          <button
            key={f.key}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-[rgba(255,255,255,0.07)] text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Order list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="empty-state"><div className="empty-state-icon">📋</div><p className="empty-state-text">Nenhum pedido encontrado</p></div>
        )}
        {filtered.map((order) => (
          <OrderCard
            key={order.id}
            numeroPedido={order.numero_pedido}
            clienteNome={order.clientes?.nome || "—"}
            resumo={order.tipo_cobranca === "peca" ? "Por peça" : "Por peso"}
            status={order.status}
            criadoEm={order.criado_em}
            obsCliente={order.obs_cliente}
            onClick={() => openOrder(order)}
          />
        ))}
      </div>

      {/* Detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-[rgba(255,255,255,0.07)] rounded-xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 animate-fade-in">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Pedido <span className="font-mono" style={{ color: "#5b8df6" }}>{selectedOrder.numero_pedido}</span>
                </h3>
                <p className="text-sm text-muted-foreground">{selectedOrder.clientes?.nome} ({selectedOrder.clientes?.tipo === "hospital" ? "Hospital" : "Clínica"})</p>
              </div>
              <button className="text-muted-foreground hover:text-foreground text-lg" onClick={() => setSelectedOrder(null)}>✕</button>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status={selectedOrder.status} />
              <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-md bg-secondary text-muted-foreground">
                {selectedOrder.tipo_cobranca === "peca" ? "Por peça" : "Por peso"}
              </span>
            </div>

            {/* Observações */}
            {(selectedOrder.obs_cliente || selectedOrder.obs_motorista || selectedOrder.obs_producao) && (
              <div className="space-y-2 bg-secondary rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Observações</p>
                {selectedOrder.obs_cliente && (
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                    <span><strong className="text-foreground">Cliente:</strong> {selectedOrder.obs_cliente}</span>
                  </div>
                )}
                {selectedOrder.obs_motorista && (
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <TruckIcon className="w-3 h-3 mt-0.5 shrink-0" />
                    <span><strong className="text-foreground">Motorista:</strong> {selectedOrder.obs_motorista}</span>
                  </div>
                )}
                {selectedOrder.obs_producao && (
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                    <span><strong className="text-foreground">Produção:</strong> {selectedOrder.obs_producao}</span>
                  </div>
                )}
              </div>
            )}

            {/* Items table */}
            {orderItems.length > 0 && (
              <table className="data-table">
                <thead>
                  <tr><th>Peça</th><th className="text-center">Orig.</th><th className="text-center">Conf.</th><th className="text-center">Dif.</th></tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium text-foreground">{item.tipos_roupa?.nome || item.descricao_livre || "—"}</td>
                      <td className="text-center font-mono">{item.quantidade_original}</td>
                      <td className="text-center font-mono">{item.quantidade_conferida ?? "—"}</td>
                      <td className="text-center font-mono font-bold">
                        {item.diferenca === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : item.diferenca === 0 ? (
                          <span style={{ color: "#34c97a" }}>✓</span>
                        ) : (
                          <span style={{ color: "#e05050" }}>{item.diferenca > 0 ? `+${item.diferenca}` : item.diferenca}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Assign motorista */}
            {selectedOrder.status === "aguardando_coleta" && (
              <div className="space-y-2">
                <label className="field-label">Atribuir motorista</label>
                <div className="flex gap-2">
                  <select className="field-select flex-1" value={assignMotorista} onChange={(e) => setAssignMotorista(e.target.value)}>
                    <option value="">Selecione...</option>
                    {motoristas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                  <button className="btn-primary text-xs px-4" onClick={handleAssignMotorista} disabled={!assignMotorista || saving}>Atribuir</button>
                </div>
              </div>
            )}

            {selectedOrder.status === "embalado" && (
              <button className="btn-success w-full btn-lg" onClick={handleMarkEntregue} disabled={saving}>✓ Marcar como Entregue</button>
            )}

            {/* Historico */}
            {historico.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Histórico</p>
                <div className="space-y-1">
                  {historico.map((h) => (
                    <div key={h.id} className="text-xs text-muted-foreground flex gap-2">
                      <span className="font-mono text-[10px] shrink-0">
                        {new Date(h.criado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span>
                        <strong className="text-foreground">{h.usuarios?.nome || "Sistema"}</strong>
                        {" → "}<StatusBadge status={h.status_novo} className="text-[9px] py-0.5 px-1.5" />
                        {h.observacao && <span className="italic"> — {h.observacao}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="btn-ghost w-full" onClick={() => setSelectedOrder(null)}>Fechar</button>
          </div>
        </div>
      )}

      {confirmation && (
        <ConfirmationModal
          numeroPedido={confirmation.pedido}
          variant={confirmation.variant}
          title={confirmation.title}
          onClose={() => setConfirmation(null)}
        />
      )}
    </AppLayout>
  );
};

export default AdminPedidos;
