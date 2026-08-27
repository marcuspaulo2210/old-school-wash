import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Download, TrendingUp, Scale, Package, AlertTriangle, Calendar } from "lucide-react";
import SaldoRoupasSection from "@/components/admin/SaldoRoupasSection";
import ReciboMensal from "@/components/admin/ReciboMensal";

interface Lancamento {
  id: string;
  peso_kg: number;
  observacao: string | null;
  criado_em: string;
  cliente_id: string;
  motorista_id: string;
  pedido_id: string;
}
interface ClienteLite { id: string; nome: string; tipo: string; preco_kg: number | null; preco_peca: number | null; tipo_cobranca: string; tarifa_minima: number | null; }
interface UsuarioLite { id: string; nome: string; }
interface PedidoLite {
  id: string; numero_pedido: string; status: string; criado_em: string; cliente_id: string;
  peso_kg: number | null; peso_informado_cliente: number | null; peso_motorista_kg: number | null; peso_recebido_producao: number | null;
}

function monthBounds(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

const Analise = () => {
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [pedidos, setPedidos] = useState<PedidoLite[]>([]);
  const [clientes, setClientes] = useState<ClienteLite[]>([]);
  const [motoristas, setMotoristas] = useState<UsuarioLite[]>([]);
  const [filterCliente, setFilterCliente] = useState("todos");
  const [clientesComTabela, setClientesComTabela] = useState<Record<string, boolean>>({});

  const fetchAll = async () => {
    setLoading(true);
    const { start, end } = monthBounds(mes);
    const [{ data: lps }, { data: peds }, { data: cls }, { data: us }] = await Promise.all([
      supabase.from("lancamentos_peso").select("*").gte("criado_em", start).lt("criado_em", end),
      supabase.from("pedidos").select("id, numero_pedido, status, criado_em, cliente_id, peso_kg, peso_informado_cliente, peso_motorista_kg, peso_recebido_producao")
        .gte("criado_em", start).lt("criado_em", end),
      supabase.from("clientes").select("id, nome, tipo, preco_kg, preco_peca, tipo_cobranca, tarifa_minima"),
      supabase.from("usuarios").select("id, nome").eq("perfil", "motorista"),
    ]);
    const { data: prs } = await (supabase as any).from("precos_cliente").select("cliente_id");
    const comTabela: Record<string, boolean> = {};
    for (const p of ((prs as any[]) || [])) comTabela[p.cliente_id] = true;
    setClientesComTabela(comTabela);
    setLancamentos((lps as any) || []);
    setPedidos((peds as any) || []);
    setClientes((cls as any) || []);
    setMotoristas((us as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [mes]);

  const clienteMap = useMemo(() => Object.fromEntries(clientes.map(c => [c.id, c])), [clientes]);
  const motoristaMap = useMemo(() => Object.fromEntries(motoristas.map(m => [m.id, m])), [motoristas]);

  const filteredLancamentos = lancamentos.filter(l => filterCliente === "todos" || l.cliente_id === filterCliente);
  const filteredPedidos = pedidos.filter(p => filterCliente === "todos" || p.cliente_id === filterCliente);

  // Cards
  const totalPesoMotorista = filteredLancamentos.reduce((s, l) => s + Number(l.peso_kg || 0), 0);
  const totalPedidos = filteredPedidos.length;
  const totalDivergencias = filteredPedidos.filter(p => p.status === "divergencia").length;
  const clientesAtivosCount = new Set(filteredPedidos.map(p => p.cliente_id)).size;

  // Per-client aggregation
  const perClient = useMemo(() => {
    const map: Record<string, { cliente: ClienteLite | undefined; pedidos: number; pesoMot: number; pesoProd: number; }> = {};
    for (const p of filteredPedidos) {
      const k = p.cliente_id;
      if (!map[k]) map[k] = { cliente: clienteMap[k], pedidos: 0, pesoMot: 0, pesoProd: 0 };
      map[k].pedidos += 1;
      map[k].pesoMot += Number(p.peso_motorista_kg || 0);
      map[k].pesoProd += Number(p.peso_recebido_producao || 0);
    }
    return Object.entries(map).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.pedidos - a.pedidos);
  }, [filteredPedidos, clienteMap]);

  const exportCsv = () => {
    const rows: string[][] = [
      ["Data", "Cliente", "Tipo", "Motorista", "Pedido", "Peso (kg)", "Observação"],
    ];
    for (const l of filteredLancamentos) {
      const c = clienteMap[l.cliente_id];
      const m = motoristaMap[l.motorista_id];
      rows.push([
        new Date(l.criado_em).toLocaleString("pt-BR"),
        c?.nome || "—",
        c?.tipo || "—",
        m?.nome || "—",
        l.pedido_id || "—",
        Number(l.peso_kg).toFixed(3).replace(".", ","),
        l.observacao || "",
      ]);
    }
    const csv = rows.map(r => r.map(c => `"${(c || "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analise_${mes}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cards = [
    { label: "Clientes ativos", value: clientesAtivosCount, icon: Package, color: "#5b8df6" },
    { label: "Pedidos", value: totalPedidos, icon: TrendingUp, color: "#2dbfa0" },
    { label: "Peso lançado (motorista)", value: `${totalPesoMotorista.toFixed(2)} kg`, icon: Scale, color: "#f0a020" },
    { label: "Divergências", value: totalDivergencias, icon: AlertTriangle, color: "#e05050" },
  ];

  return (
    <AdminLayout title="Análise Mensal" subtitle="Visão consolidada do mês">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div className="flex items-end gap-3">
          <div>
            <label className="field-label flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Mês</label>
            <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="field-input font-mono" />
          </div>
          <div>
            <label className="field-label">Cliente</label>
            <select className="field-select" value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)}>
              <option value="todos">Todos</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>
        <button className="btn-primary" onClick={exportCsv}><Download className="w-4 h-4" /> Exportar CSV</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{c.label}</span>
              <c.icon className="w-4 h-4" style={{ color: c.color }} />
            </div>
            <div className="text-lg font-extrabold font-mono" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-card overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.07)]">
          <h3 className="text-sm font-bold text-foreground">Por cliente</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Cliente</th>
                <th className="text-center">Tipo</th>
                <th className="text-center">Tarifação</th>
                <th className="text-center">Pedidos</th>
                <th className="text-right">Peso motorista</th>
                <th className="text-right">Peso produção</th>
              </tr>
            </thead>
            <tbody>
              {perClient.length === 0 && (
                <tr><td colSpan={6} className="text-center text-muted-foreground py-6">Nenhum dado neste mês</td></tr>
              )}
              {perClient.map(r => (
                <tr key={r.id}>
                  <td className="font-medium text-foreground">{r.cliente?.nome || "—"}</td>
                  <td className="text-center">
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${clientesComTabela[r.id] ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}`}>
                        {clientesComTabela[r.id] ? "Tabela configurada" : "Sem tabela"}
                      </span>
                      {r.cliente?.tarifa_minima != null && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: "rgba(240,160,32,0.15)", color: "#f0a020" }}>
                          Mín. R$ {Number(r.cliente.tarifa_minima).toFixed(2).replace(".", ",")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-center font-mono">{r.pedidos}</td>
                  <td className="text-right font-mono">{r.pesoMot.toFixed(2)} kg</td>
                  <td className="text-right font-mono">{r.pesoProd.toFixed(2)} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.07)]">
          <h3 className="text-sm font-bold text-foreground">Histórico de pesos lançados ({filteredLancamentos.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Motorista</th>
                <th className="text-right">Peso</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {filteredLancamentos.length === 0 && (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-6">Nenhum lançamento</td></tr>
              )}
              {filteredLancamentos.slice().sort((a, b) => b.criado_em.localeCompare(a.criado_em)).map(l => (
                <tr key={l.id}>
                  <td className="text-xs font-mono">{new Date(l.criado_em).toLocaleString("pt-BR")}</td>
                  <td className="font-medium text-foreground">{clienteMap[l.cliente_id]?.nome || "—"}</td>
                  <td>{motoristaMap[l.motorista_id]?.nome || "—"}</td>
                  <td className="text-right font-mono font-bold" style={{ color: "#f0a020" }}>{Number(l.peso_kg).toFixed(3)} kg</td>
                  <td className="text-xs text-muted-foreground">{l.observacao || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {loading && <p className="text-center text-xs text-muted-foreground mt-4">Carregando...</p>}

      <div className="mt-8">
        <SaldoRoupasSection />
      </div>

      <div className="mt-8">
        <ReciboMensal clientes={clientes} />
      </div>
    </AdminLayout>
  );
};

export default Analise;