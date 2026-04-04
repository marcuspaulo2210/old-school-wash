import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";

interface Order {
  id: string;
  numero_pedido: string;
  status: string;
  tipo_cobranca: string;
  criado_em: string;
  cliente_id: string;
  clientes: { nome: string } | null;
}

const statusLabels: Record<string, { label: string; badge: string }> = {
  aguardando_coleta: { label: "Aguard. Coleta", badge: "badge-warning" },
  coletado: { label: "Coletado", badge: "badge-primary" },
  em_producao: { label: "Em Produção", badge: "badge-teal" },
  embalado: { label: "Embalado", badge: "badge-success" },
  entregue: { label: "Entregue", badge: "badge-purple" },
  divergencia: { label: "Divergência", badge: "badge-danger" },
};

const AdminPedidos = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("todos");

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("pedidos")
        .select("id, numero_pedido, status, tipo_cobranca, criado_em, cliente_id, clientes(nome)")
        .order("criado_em", { ascending: false })
        .limit(50);
      setOrders((data as unknown as Order[]) || []);
    };
    fetchOrders();
  }, []);

  const filtered = filter === "todos" ? orders : filter === "divergencia" ? orders.filter((o) => o.status === "divergencia") : orders.filter((o) => o.status === filter);

  return (
    <AppLayout title="Pedidos" subtitle="Todos os pedidos do sistema" backTo="/admin">
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {[
          { key: "todos", label: "Todos" },
          { key: "aguardando_coleta", label: "Aguard. Coleta" },
          { key: "em_producao", label: "Em Produção" },
          { key: "embalado", label: "Embalado" },
          { key: "divergencia", label: "⚠ Divergências" },
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
                  Pedido <span className="font-mono">{order.numero_pedido}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {order.clientes?.nome || "—"} · {order.tipo_cobranca === "peca" ? "Por peça" : "Por peso"}
                </div>
              </div>
              <span className={s.badge}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
};

export default AdminPedidos;
