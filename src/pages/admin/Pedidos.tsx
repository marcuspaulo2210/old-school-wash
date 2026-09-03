import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { registrarMudancaStatus } from "@/lib/statusHistory";
import { liberarDivergenciaParaEntrega, devolverDivergenciaParaProducao } from "@/lib/divergencia";
import AdminLayout from "@/components/admin/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import ConfirmationModal from "@/components/ConfirmationModal";
import { MessageSquare, TruckIcon, X, Pencil } from "lucide-react";
import { toast } from "sonner";

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
  peso_motorista_kg: number | null;
  itens_pedido?: { quantidade_original: number; tipo_roupa_id: string | null; descricao_livre: string | null }[] | null;
  valor_calculado?: number | null;
  valor_total: number | null;
  motorista_id: string | null;
  cliente_id: string;
  clientes: { nome: string; tipo: string } | null;
  usuarios?: { nome: string } | null;
}

interface Motorista { id: string; nome: string; }

const formatPeso = (order: Order) => {
  const pm = order.peso_motorista_kg != null ? Number(order.peso_motorista_kg) : null;
  if (pm != null && pm > 0) return `${pm} kg`;
  const pk = order.peso_kg != null ? Number(order.peso_kg) : null;
  if (pk != null && pk > 0) return `${pk} kg`;
  const pecas = (order.itens_pedido || []).reduce((s, i) => s + (Number(i.quantidade_original) || 0), 0);
  if (pecas > 0) return `${pecas} pç`;
  return "—";
};

const AdminPedidos = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("todos");
  const [filterCliente, setFilterCliente] = useState("");
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<ItemPedido[]>([]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [assignMotorista, setAssignMotorista] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState<{ pedido: string; variant: "info" | "success" | "danger"; title: string } | null>(null);
  const [resolvingOrder, setResolvingOrder] = useState<Order | null>(null);
  const [editingValorId, setEditingValorId] = useState<string | null>(null);
  const [valorDraft, setValorDraft] = useState("");

  const startEditValor = (order: Order) => {
    setEditingValorId(order.id);
    setValorDraft(order.valor_total != null ? String(order.valor_total).replace(".", ",") : "");
  };

  const saveValor = async (order: Order) => {
    const raw = valorDraft.trim().replace(/\./g, "").replace(",", ".");
    setEditingValorId(null);
    const parsed = raw === "" ? null : Number(raw);
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      toast.error("Valor inválido");
      return;
    }
    if (parsed === (order.valor_total != null ? Number(order.valor_total) : null)) return;
    const { error } = await supabase.from("pedidos").update({ valor_total: parsed } as any).eq("id", order.id);
    if (error) {
      toast.error("Erro ao salvar valor: " + error.message);
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, valor_total: parsed } : o)));
    toast.success("Valor atualizado");
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, status, tipo_cobranca, quem_contou, criado_em, coletado_em, embalado_em, obs_cliente, obs_motorista, obs_producao, peso_kg, peso_motorista_kg, valor_total, motorista_id, cliente_id, clientes(nome, tipo), usuarios!pedidos_motorista_id_fkey(nome), itens_pedido(quantidade_original, tipo_roupa_id, descricao_livre)")
      .order("criado_em", { ascending: false })
      .limit(200);
    const pedidos = (data as unknown as Order[]) || [];
    if (pedidos.length === 0) { setOrders([]); return; }

    const clienteIds = Array.from(new Set(pedidos.map((p) => p.cliente_id).filter(Boolean)));
    const [{ data: precos }, { data: cls }] = await Promise.all([
      supabase.from("precos_cliente").select("cliente_id, tipo_roupa_id, preco_unitario, tipos_roupa(nome)").in("cliente_id", clienteIds),
      supabase.from("clientes").select("id, valor_por_kg, tarifa_minima").in("id", clienteIds),
    ]);

    const precoPorTipo = new Map<string, number>();
    const precoPorNome = new Map<string, number>();
    ((precos as any[]) || []).forEach((p) => {
      const val = Number(p.preco_unitario) || 0;
      if (val <= 0) return;
      if (p.tipo_roupa_id) precoPorTipo.set(`${p.cliente_id}|${p.tipo_roupa_id}`, val);
      const nome = p.tipos_roupa?.nome;
      if (nome) precoPorNome.set(`${p.cliente_id}|${String(nome).trim().toLowerCase()}`, val);
    });
    const kgPorCliente = new Map<string, number>();
    ((cls as any[]) || []).forEach((c) => {
      const v = Number(c.valor_por_kg) || 0;
      if (v > 0) kgPorCliente.set(c.id, v);
    });

    const withCalc = pedidos.map((o) => {
      let calc: number | null = null;
      if (o.tipo_cobranca === "peso") {
        const kg = Number(o.peso_motorista_kg ?? o.peso_kg ?? 0);
        const preco = kgPorCliente.get(o.cliente_id);
        if (kg > 0 && preco) calc = kg * preco;
      } else {
        let total = 0;
        (o.itens_pedido || []).forEach((it) => {
          const qtd = Number(it.quantidade_original) || 0;
          const preco =
            (it.tipo_roupa_id ? precoPorTipo.get(`${o.cliente_id}|${it.tipo_roupa_id}`) : undefined) ??
            (it.descricao_livre ? precoPorNome.get(`${o.cliente_id}|${it.descricao_livre.trim().toLowerCase()}`) : undefined);
          if (preco) total += qtd * preco;
        });
        if (total > 0) calc = total;
      }
      return { ...o, valor_calculado: calc };
    });
    setOrders(withCalc);
  };

  useEffect(() => {
    fetchOrders();
    supabase.from("usuarios").select("id, nome").eq("perfil", "motorista").eq("ativo", true)
      .then(({ data }) => setMotoristas((data as unknown as Motorista[]) || []));
    supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome")
      .then(({ data }) => setClientes((data as any) || []));
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
    const { error } = await supabase
      .from("pedidos")
      .update({ motorista_id: assignMotorista } as any)
      .eq("id", selectedOrder.id);
    setSaving(false);
    if (error) {
      console.error("Erro ao atribuir motorista:", error);
      toast.error("Erro ao atribuir motorista: " + error.message);
      return;
    }
    toast.success("Motorista atribuído com sucesso!");
    setSelectedOrder(null);
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

  const handleResolverLiberar = async () => {
    if (!resolvingOrder || !user) return;
    setSaving(true);
    const { error } = await liberarDivergenciaParaEntrega(resolvingOrder.id, resolvingOrder.numero_pedido, user.id);
    setSaving(false);
    if (error) { toast.error("Erro ao liberar: " + error.message); return; }
    const pedido = resolvingOrder.numero_pedido;
    setResolvingOrder(null);
    setSelectedOrder(null);
    setConfirmation({ pedido, variant: "success", title: "Divergência resolvida — liberado para entrega" });
    fetchOrders();
  };

  const handleResolverDevolver = async () => {
    if (!resolvingOrder || !user) return;
    setSaving(true);
    const { error } = await devolverDivergenciaParaProducao(resolvingOrder.id, user.id);
    setSaving(false);
    if (error) { toast.error("Erro ao devolver: " + error.message); return; }
    const pedido = resolvingOrder.numero_pedido;
    setResolvingOrder(null);
    setSelectedOrder(null);
    setConfirmation({ pedido, variant: "info", title: "Pedido devolvido para produção" });
    fetchOrders();
  };

  const filtered = orders.filter((o) => {
    if (filter !== "todos" && o.status !== filter) return false;
    if (filterCliente && o.cliente_id !== filterCliente) return false;
    return true;
  });

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
    <AdminLayout title="Pedidos" subtitle="Todos os pedidos do sistema">
      <div className="flex flex-wrap gap-2 mb-4">
        {filterTabs.map((f) => (
          <button key={f.key}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-card border border-[rgba(255,255,255,0.07)] text-muted-foreground hover:text-foreground"}`}
            onClick={() => setFilter(f.key)}
          >{f.label}</button>
        ))}
        <select className="field-select text-xs py-1.5 px-3 w-auto" value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)}>
          <option value="">Todos os clientes</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Nº Pedido</th>
                <th>Cliente</th>
                <th>Motorista</th>
                <th>Quem contou</th>
                <th className="text-right">Peso</th>
                <th className="text-right">Valor</th>
                <th>Status</th>
                <th className="text-center">Obs</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center text-muted-foreground py-8">Nenhum pedido</td></tr>}
              {filtered.map((order) => (
                <tr key={order.id} className="cursor-pointer" onClick={() => openOrder(order)}>
                  <td className="font-mono font-bold" style={{ color: "#5b8df6" }}>{order.numero_pedido}</td>
                  <td className="text-foreground font-medium">{order.clientes?.nome || "—"}</td>
                  <td>
                    {order.motorista_id ? (
                      <span className="text-foreground">{order.usuarios?.nome || "Atribuído"}</span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: "rgba(224,80,80,0.15)", color: "#e05050", border: "1px solid rgba(224,80,80,0.35)" }}>Sem motorista</span>
                        <button
                          className="text-[10px] font-semibold underline"
                          style={{ color: "#5b8df6" }}
                          onClick={(e) => { e.stopPropagation(); openOrder(order); }}
                        >Atribuir</button>
                      </span>
                    )}
                  </td>
                  <td className="text-muted-foreground capitalize">{order.quem_contou}</td>
                  <td className="text-right font-mono">{formatPeso(order)}</td>
                  <td className="text-right font-mono" onClick={(e) => { e.stopPropagation(); if (editingValorId !== order.id) startEditValor(order); }}>
                    {editingValorId === order.id ? (
                      <input
                        autoFocus
                        inputMode="decimal"
                        className="field-input w-24 text-right py-1 px-2 font-mono text-xs"
                        value={valorDraft}
                        onChange={(e) => setValorDraft(e.target.value)}
                        onBlur={() => saveValor(order)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
                          if (e.key === "Escape") { e.preventDefault(); setEditingValorId(null); }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : order.valor_total != null && Number(order.valor_total) > 0 ? (
                      <span className="inline-flex items-center gap-1 font-bold cursor-pointer" style={{ color: "#2dbfa0" }}>
                        R$ {Number(order.valor_total).toFixed(2).replace(".", ",")}
                        <Pencil className="w-3 h-3 opacity-60" />
                      </span>
                    ) : order.valor_calculado != null && order.valor_calculado > 0 ? (
                      <span className="inline-flex flex-col items-end cursor-pointer leading-tight">
                        <span className="font-bold" style={{ color: "#7fe3cd" }}>
                          R$ {order.valor_calculado.toFixed(2).replace(".", ",")}
                        </span>
                        <span className="text-[9px] text-muted-foreground">(calculado)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground cursor-pointer">
                        — <Pencil className="w-3 h-3" />
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={order.status} />
                      {order.status === "divergencia" && (
                        <button
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                          style={{ background: "rgba(224,80,80,0.15)", color: "#e05050", border: "1px solid rgba(224,80,80,0.35)" }}
                          onClick={(e) => { e.stopPropagation(); setResolvingOrder(order); }}
                        >Resolver divergência</button>
                      )}
                    </div>
                  </td>
                  <td className="text-center">
                    {(order.obs_cliente || order.obs_motorista || order.obs_producao) && (
                      <MessageSquare className="w-3.5 h-3.5 inline" style={{ color: "#f0a020" }} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-[rgba(255,255,255,0.07)] rounded-xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 animate-fade-in">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Pedido <span className="font-mono" style={{ color: "#5b8df6" }}>{selectedOrder.numero_pedido}</span>
                </h3>
                <p className="text-sm text-muted-foreground">{selectedOrder.clientes?.nome}</p>
              </div>
              <button className="text-muted-foreground hover:text-foreground" onClick={() => setSelectedOrder(null)}><X className="w-5 h-5" /></button>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusBadge status={selectedOrder.status} />
              <span className="badge-neutral">{selectedOrder.tipo_cobranca === "peca" ? "Por peça" : "Por peso"}</span>
            </div>

            {(selectedOrder.obs_cliente || selectedOrder.obs_motorista || selectedOrder.obs_producao) && (
              <div className="space-y-2 bg-secondary rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Observações</p>
                {selectedOrder.obs_cliente && <div className="flex gap-2 text-xs text-muted-foreground"><MessageSquare className="w-3 h-3 mt-0.5 shrink-0" /><span><strong className="text-foreground">Cliente:</strong> {selectedOrder.obs_cliente}</span></div>}
                {selectedOrder.obs_motorista && <div className="flex gap-2 text-xs text-muted-foreground"><TruckIcon className="w-3 h-3 mt-0.5 shrink-0" /><span><strong className="text-foreground">Motorista:</strong> {selectedOrder.obs_motorista}</span></div>}
                {selectedOrder.obs_producao && <div className="flex gap-2 text-xs text-muted-foreground"><MessageSquare className="w-3 h-3 mt-0.5 shrink-0" /><span><strong className="text-foreground">Produção:</strong> {selectedOrder.obs_producao}</span></div>}
              </div>
            )}

            {orderItems.length > 0 && (
              <table className="data-table">
                <thead><tr><th>Peça</th><th className="text-center">Orig.</th><th className="text-center">Conf.</th><th className="text-center">Dif.</th></tr></thead>
                <tbody>
                  {orderItems.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium text-foreground">{item.tipos_roupa?.nome || item.descricao_livre || "—"}</td>
                      <td className="text-center font-mono">{item.quantidade_original}</td>
                      <td className="text-center font-mono">{item.quantidade_conferida ?? "—"}</td>
                      <td className="text-center font-mono font-bold">
                        {item.diferenca === null ? <span className="text-muted-foreground">—</span> : item.diferenca === 0 ? <span style={{ color: "#34c97a" }}>✓</span> : <span style={{ color: "#e05050" }}>{item.diferenca > 0 ? `+${item.diferenca}` : item.diferenca}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {(selectedOrder.status === "aguardando_coleta" || !selectedOrder.motorista_id) && (
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

            {selectedOrder.status === "divergencia" && (
              <button
                className="w-full btn-lg font-bold rounded-lg"
                style={{ background: "rgba(224,80,80,0.15)", color: "#e05050", border: "1px solid rgba(224,80,80,0.35)" }}
                onClick={() => setResolvingOrder(selectedOrder)}
              >⚠ Resolver divergência</button>
            )}

            {selectedOrder.status === "embalado" && (
              <button className="btn-success w-full btn-lg" onClick={handleMarkEntregue} disabled={saving}>✓ Marcar como Entregue</button>
            )}

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

      {resolvingOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-[rgba(255,255,255,0.07)] rounded-xl p-5 w-full max-w-md space-y-4 animate-fade-in">
            <div>
              <h3 className="text-base font-bold text-foreground">Resolver divergência</h3>
              <p className="text-sm text-muted-foreground">
                Pedido <span className="font-mono" style={{ color: "#5b8df6" }}>{resolvingOrder.numero_pedido}</span>
                {resolvingOrder.clientes?.nome ? ` — ${resolvingOrder.clientes.nome}` : ""}
              </p>
            </div>
            <button className="btn-success w-full btn-lg" onClick={handleResolverLiberar} disabled={saving}>
              ✓ Resolver e liberar para entrega
            </button>
            <button
              className="w-full btn-lg font-bold rounded-lg"
              style={{ background: "rgba(240,160,32,0.15)", color: "#f0a020", border: "1px solid rgba(240,160,32,0.35)" }}
              onClick={handleResolverDevolver}
              disabled={saving}
            >↺ Devolver para produção</button>
            <button className="btn-ghost w-full" onClick={() => setResolvingOrder(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {confirmation && (
        <ConfirmationModal numeroPedido={confirmation.pedido} variant={confirmation.variant} title={confirmation.title} onClose={() => setConfirmation(null)} />
      )}
    </AdminLayout>
  );
};

export default AdminPedidos;
