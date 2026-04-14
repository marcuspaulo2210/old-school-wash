import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import StatusBadge, { getStatusConfig } from "@/components/StatusBadge";
import { ClipboardList, TruckIcon, Package, AlertTriangle, MessageSquare, KeyRound } from "lucide-react";
import { format } from "date-fns";

interface Order {
  id: string;
  numero_pedido: string;
  status: string;
  tipo_cobranca: string;
  quem_contou: string;
  criado_em: string;
  peso_kg: number | null;
  valor_total: number | null;
  obs_cliente: string | null;
  obs_motorista: string | null;
  obs_producao: string | null;
  clientes: { nome: string } | null;
  motorista: { nome: string } | null;
  itens_count: number;
}

const AdminDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ total: 0, aguardando: 0, producao: 0, divergencias: 0 });
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterCliente, setFilterCliente] = useState("");
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [pendingPasswordRequests, setPendingPasswordRequests] = useState(0);
  const [pendingClientRequests, setPendingClientRequests] = useState(0);

  useEffect(() => {
    fetchOrders();
    supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome")
      .then(({ data }) => setClientes((data as any) || []));
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    const { count } = await supabase
      .from("solicitacoes_troca_senha")
      .select("*", { count: "exact", head: true })
      .eq("status", "pendente");
    setPendingPasswordRequests(count || 0);
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, status, tipo_cobranca, quem_contou, criado_em, peso_kg, valor_total, obs_cliente, obs_motorista, obs_producao, clientes(nome)")
      .order("criado_em", { ascending: false })
      .limit(200);
    const orders = (data as unknown as Order[]) || [];
    setOrders(orders);

    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter((o) => o.criado_em.slice(0, 10) === today);
    setStats({
      total: todayOrders.length,
      aguardando: orders.filter((o) => o.status === "aguardando_coleta").length,
      producao: orders.filter((o) => o.status === "em_producao").length,
      divergencias: orders.filter((o) => o.status === "divergencia").length,
    });
  };

  const filtered = orders.filter((o) => {
    if (filterStatus !== "todos" && o.status !== filterStatus) return false;
    if (filterCliente && o.clientes?.nome !== filterCliente) return false;
    return true;
  });

  const metricCards = [
    { label: "Pedidos hoje", value: stats.total, color: "#5b8df6", bg: "rgba(91,141,246,0.12)", icon: ClipboardList },
    { label: "Aguard. coleta", value: stats.aguardando, color: "#f0a020", bg: "rgba(240,160,32,0.12)", icon: TruckIcon },
    { label: "Na produção", value: stats.producao, color: "#2dbfa0", bg: "rgba(45,191,160,0.12)", icon: Package },
    { label: "Divergências", value: stats.divergencias, color: "#e05050", bg: "rgba(224,80,80,0.12)", icon: AlertTriangle },
  ];

  const hasObs = (o: Order) => !!(o.obs_cliente || o.obs_motorista || o.obs_producao);

  const statusTabs = [
    { key: "todos", label: "Todos" },
    { key: "aguardando_coleta", label: "Aguard." },
    { key: "coletado", label: "Coletados" },
    { key: "em_producao", label: "Produção" },
    { key: "embalado", label: "Embalado" },
    { key: "divergencia", label: "Diverg." },
    { key: "entregue", label: "Entregues" },
  ];

  return (
    <AdminLayout title="Dashboard" subtitle="Visão geral do sistema">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {metricCards.map((c) => (
          <div key={c.label} className="rounded-xl p-4 bg-card border border-[rgba(255,255,255,0.07)]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-extrabold font-mono mt-1" style={{ color: c.color }}>{c.value}</p>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: c.bg }}>
                <c.icon className="w-4 h-4" style={{ color: c.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending password requests */}
      {pendingPasswordRequests > 0 && (
        <div
          className="rounded-xl p-4 mb-6 flex items-center justify-between border"
          style={{ background: "rgba(240,160,32,0.08)", borderColor: "rgba(240,160,32,0.2)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(240,160,32,0.15)" }}>
              <KeyRound className="w-4 h-4" style={{ color: "#f0a020" }} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {pendingPasswordRequests} solicitação(ões) de troca de senha pendente(s)
              </p>
              <p className="text-xs text-muted-foreground">Usuários atingiram o limite de trocas e precisam de autorização</p>
            </div>
          </div>
          <a href="/admin/usuarios" className="btn-primary text-xs px-3 py-1.5">Ver solicitações</a>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {statusTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilterStatus(t.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filterStatus === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-[rgba(255,255,255,0.07)] text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
        <select
          className="field-select text-xs py-1.5 px-3 w-auto"
          value={filterCliente}
          onChange={(e) => setFilterCliente(e.target.value)}
        >
          <option value="">Todos os clientes</option>
          {clientes.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
        </select>
      </div>

      {/* Orders table */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Nº Pedido</th>
                <th>Cliente</th>
                <th>Quem contou</th>
                <th className="text-right">Qtd/Peso</th>
                <th className="text-right">Valor</th>
                <th>Status</th>
                <th className="text-center">Obs</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted-foreground py-8">Nenhum pedido encontrado</td></tr>
              )}
              {filtered.map((o) => (
                <tr key={o.id} className="cursor-pointer" onClick={() => window.location.href = `/admin/pedidos?id=${o.id}`}>
                  <td className="font-mono font-bold" style={{ color: "#5b8df6" }}>{o.numero_pedido}</td>
                  <td className="text-foreground font-medium">{o.clientes?.nome || "—"}</td>
                  <td className="text-muted-foreground capitalize">{o.quem_contou}</td>
                  <td className="text-right font-mono text-foreground">
                    {o.tipo_cobranca === "peso" ? `${o.peso_kg || 0} kg` : "—"}
                  </td>
                  <td className="text-right font-mono text-foreground">
                    {o.valor_total ? `R$ ${Number(o.valor_total).toFixed(2)}` : "—"}
                  </td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-center">
                    {hasObs(o) && <MessageSquare className="w-3.5 h-3.5 inline" style={{ color: "#f0a020" }} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
