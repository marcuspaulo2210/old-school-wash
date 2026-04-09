import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const statusColors: Record<string, string> = {
  aguardando_coleta: "#9b72f4", coletado: "#f0a020", em_producao: "#5b8df6",
  embalado: "#34c97a", entregue: "#6b7190", divergencia: "#e05050",
};

const Relatorios = () => {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [tab, setTab] = useState<"geral" | "cliente" | "motorista">("geral");
  const [dtInicio, setDtInicio] = useState("");
  const [dtFim, setDtFim] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome")
      .then(({ data }) => setClientes((data as any) || []));
    fetchPedidos();
  }, []);

  const fetchPedidos = async () => {
    let q = supabase.from("pedidos").select("id, numero_pedido, status, tipo_cobranca, peso_kg, valor_total, criado_em, cliente_id, clientes(nome), motorista_id, usuarios!pedidos_motorista_id_fkey(nome)");
    const { data } = await q.order("criado_em", { ascending: false }).limit(500);
    setPedidos((data as any) || []);
  };

  const filtered = pedidos.filter((p) => {
    if (dtInicio && p.criado_em < dtInicio) return false;
    if (dtFim && p.criado_em > dtFim + "T23:59:59") return false;
    if (filterCliente && p.cliente_id !== filterCliente) return false;
    return true;
  });

  // Stats
  const totalPedidos = filtered.length;
  const totalFaturamento = filtered.reduce((s, p) => s + (Number(p.valor_total) || 0), 0);
  const totalPeso = filtered.reduce((s, p) => s + (p.tipo_cobranca === "peso" ? (Number(p.peso_kg) || 0) : 0), 0);
  const totalDivergencias = filtered.filter((p) => p.status === "divergencia").length;

  const statusChart = Object.entries(
    filtered.reduce((acc: Record<string, number>, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {})
  ).map(([status, count]) => ({ status, count }));

  // By client
  const byClient = Object.values(
    filtered.reduce((acc: Record<string, any>, p) => {
      const nome = p.clientes?.nome || "—";
      if (!acc[nome]) acc[nome] = { nome, pedidos: 0, valor: 0, divergencias: 0 };
      acc[nome].pedidos++;
      acc[nome].valor += Number(p.valor_total) || 0;
      if (p.status === "divergencia") acc[nome].divergencias++;
      return acc;
    }, {})
  ) as any[];

  // By motorista
  const byMotorista = Object.values(
    filtered.reduce((acc: Record<string, any>, p) => {
      const nome = p.usuarios?.nome || "Sem motorista";
      if (!acc[nome]) acc[nome] = { nome, coletas: 0 };
      acc[nome].coletas++;
      return acc;
    }, {})
  ) as any[];

  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(","), ...data.map((r) => headers.map((h) => `"${r[h] ?? ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  const tabs = [
    { key: "geral" as const, label: "Resumo Geral" },
    { key: "cliente" as const, label: "Por Cliente" },
    { key: "motorista" as const, label: "Por Motorista" },
  ];

  return (
    <AdminLayout title="Relatórios" subtitle="Análises e exportações">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div>
          <label className="field-label">Data início</label>
          <input type="date" className="field-input text-xs py-1.5" value={dtInicio} onChange={(e) => setDtInicio(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Data fim</label>
          <input type="date" className="field-input text-xs py-1.5" value={dtFim} onChange={(e) => setDtFim(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Cliente</label>
          <select className="field-select text-xs py-1.5" value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)}>
            <option value="">Todos</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${tab === t.key ? "bg-primary text-primary-foreground" : "bg-card border border-[rgba(255,255,255,0.07)] text-muted-foreground"}`}
          >{t.label}</button>
        ))}
      </div>

      {tab === "geral" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total pedidos", value: totalPedidos, color: "#5b8df6" },
              { label: "Peso total (kg)", value: totalPeso.toFixed(1), color: "#2dbfa0" },
              { label: "Faturamento", value: `R$ ${totalFaturamento.toFixed(2)}`, color: "#34c97a" },
              { label: "Divergências", value: totalDivergencias, color: "#e05050" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-4 bg-card border border-[rgba(255,255,255,0.07)]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-xl font-extrabold font-mono mt-1" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {statusChart.length > 0 && (
            <div className="rounded-xl p-4 bg-card border border-[rgba(255,255,255,0.07)]">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pedidos por status</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusChart}>
                  <XAxis dataKey="status" tick={{ fontSize: 10, fill: "#6b7190" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#6b7190" }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {statusChart.map((entry) => (
                      <Cell key={entry.status} fill={statusColors[entry.status] || "#6b7190"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <button className="btn-ghost text-xs" onClick={() => exportCSV(filtered.map((p) => ({
            pedido: p.numero_pedido, cliente: p.clientes?.nome, status: p.status,
            valor: p.valor_total, peso: p.peso_kg, data: p.criado_em?.slice(0, 10),
          })), "relatorio_geral.csv")}>
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        </div>
      )}

      {tab === "cliente" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-card overflow-hidden">
            <table className="data-table w-full">
              <thead><tr><th>Cliente</th><th className="text-right">Pedidos</th><th className="text-right">Valor</th><th className="text-right">Diverg.</th></tr></thead>
              <tbody>
                {byClient.map((c) => (
                  <tr key={c.nome}>
                    <td className="font-medium text-foreground">{c.nome}</td>
                    <td className="text-right font-mono">{c.pedidos}</td>
                    <td className="text-right font-mono">R$ {c.valor.toFixed(2)}</td>
                    <td className="text-right font-mono" style={{ color: c.divergencias > 0 ? "#e05050" : undefined }}>{c.divergencias}</td>
                  </tr>
                ))}
                <tr className="font-bold border-t-2 border-border">
                  <td>Total</td>
                  <td className="text-right font-mono">{byClient.reduce((s, c) => s + c.pedidos, 0)}</td>
                  <td className="text-right font-mono">R$ {byClient.reduce((s, c) => s + c.valor, 0).toFixed(2)}</td>
                  <td className="text-right font-mono">{byClient.reduce((s, c) => s + c.divergencias, 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <button className="btn-ghost text-xs" onClick={() => exportCSV(byClient, "relatorio_clientes.csv")}>
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        </div>
      )}

      {tab === "motorista" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-card overflow-hidden">
            <table className="data-table w-full">
              <thead><tr><th>Motorista</th><th className="text-right">Coletas</th></tr></thead>
              <tbody>
                {byMotorista.map((m) => (
                  <tr key={m.nome}>
                    <td className="font-medium text-foreground">{m.nome}</td>
                    <td className="text-right font-mono">{m.coletas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn-ghost text-xs" onClick={() => exportCSV(byMotorista, "relatorio_motoristas.csv")}>
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        </div>
      )}
    </AdminLayout>
  );
};

export default Relatorios;
