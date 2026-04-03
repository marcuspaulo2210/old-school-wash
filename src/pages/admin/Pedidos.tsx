import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";

interface Order {
  id: string;
  order_number: number;
  status: string;
  charge_type: string;
  has_divergence: boolean;
  created_at: string;
  client_id: string;
  profiles: { name: string } | null;
}

const statusLabels: Record<string, { label: string; badge: string }> = {
  cadastrado: { label: "Cadastrado", badge: "badge-neutral" },
  aguardando_coleta: { label: "Aguard. Coleta", badge: "badge-warning" },
  coletado: { label: "Coletado", badge: "badge-primary" },
  em_lavagem: { label: "Em Lavagem", badge: "badge-teal" },
  finalizado: { label: "Finalizado", badge: "badge-success" },
  entregue: { label: "Entregue", badge: "badge-purple" },
};

const AdminPedidos = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("todos");

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status, charge_type, has_divergence, created_at, client_id, profiles!orders_client_id_fkey(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      setOrders((data as unknown as Order[]) || []);
    };
    fetchOrders();
  }, []);

  const filtered = filter === "todos" ? orders : filter === "divergencias" ? orders.filter((o) => o.has_divergence) : orders.filter((o) => o.status === filter);

  return (
    <AppLayout title="Pedidos" subtitle="Todos os pedidos do sistema" backTo="/admin">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {[
          { key: "todos", label: "Todos" },
          { key: "cadastrado", label: "Cadastrado" },
          { key: "aguardando_coleta", label: "Aguard. Coleta" },
          { key: "em_lavagem", label: "Em Lavagem" },
          { key: "finalizado", label: "Finalizado" },
          { key: "divergencias", label: "⚠ Divergências" },
        ].map((f) => (
          <button
            key={f.key}
            className={`btn text-xs whitespace-nowrap ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p className="empty-state-text">Nenhum pedido encontrado</p>
          </div>
        )}
        {filtered.map((order) => {
          const s = statusLabels[order.status] || { label: order.status, badge: "badge-neutral" };
          return (
            <div key={order.id} className="list-item">
              <div>
                <div className="text-sm font-bold text-foreground">
                  Pedido <span className="font-mono">#{order.order_number}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {order.profiles?.name || "—"} · {order.charge_type === "por_peca" ? "Por peça" : "Por peso"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {order.has_divergence && <span className="badge-danger">⚠</span>}
                <span className={s.badge}>{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
};

export default AdminPedidos;
