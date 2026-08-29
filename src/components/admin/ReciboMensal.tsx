import { Fragment, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Receipt, X, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/amana-logo.png";

interface ClienteOpt { id: string; nome: string; tipo?: string; tipo_cobranca?: string; tarifa_minima?: number | null; valor_por_kg?: number | null; }

interface ItemLinha {
  nome: string;
  quantidade: number;
  preco: number | null;
  subtotal: number;
}

interface Linha {
  id: string;
  numero_pedido: string;
  data: string;
  itens: ItemLinha[];
  pecas: number;
  peso: number;
  total: number;
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const brl = (n: number) => n.toFixed(2).replace(".", ",");

function periodoExtenso(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${MESES[m - 1]} de ${y}`;
}

function dataExtenso(d: Date) {
  return `${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} de ${d.getFullYear()}`;
}

function monthBounds(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return { start: new Date(y, m - 1, 1).toISOString(), end: new Date(y, m, 1).toISOString() };
}

const db = supabase as any;

const ReciboMensal = ({ clientes }: { clientes: ClienteOpt[] }) => {
  const [clienteId, setClienteId] = useState("");
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});

  const cliente = clientes.find((c) => c.id === clienteId);
  const tarifaMinima = cliente?.tarifa_minima != null ? Number(cliente.tarifa_minima) : null;

  const gerar = async () => {
    if (!clienteId) { toast.error("Selecione um cliente"); return; }
    setLoading(true);
    const { start, end } = monthBounds(mes);

    const { data: peds, error } = await db
      .from("pedidos")
      .select("id, numero_pedido, criado_em, coletado_em, entregue_em, peso_kg, peso_recebido_producao, tipo_cobranca")
      .eq("cliente_id", clienteId)
      .eq("status", "entregue")
      .gte("criado_em", start)
      .lt("criado_em", end)
      .order("criado_em", { ascending: true });

    if (error) {
      setLoading(false);
      toast.error("Erro ao buscar pedidos: " + error.message);
      return;
    }

    const pedidos = (peds as any[]) || [];
    const ids = pedidos.map((p) => p.id);

    let itensPedido: any[] = [];
    let itensSaida: any[] = [];
    if (ids.length) {
      const [{ data: ip }, { data: isd }] = await Promise.all([
        db.from("itens_pedido")
          .select("pedido_id, tipo_roupa_id, descricao_livre, quantidade_original, quantidade_conferida, tipos_roupa(nome)")
          .in("pedido_id", ids),
        db.from("itens_saida")
          .select("pedido_id, tipo_roupa_id, descricao_livre, quantidade, tipos_roupa(nome)")
          .in("pedido_id", ids),
      ]);
      itensPedido = (ip as any[]) || [];
      itensSaida = (isd as any[]) || [];
    }

    const { data: prs, error: errPrecos } = await db
      .from("precos_cliente")
      .select("tipo_roupa_id, preco_unitario, tipos_roupa(nome)")
      .eq("cliente_id", clienteId);
    if (errPrecos) toast.error("Erro ao buscar tabela de preços: " + errPrecos.message);
    const precoMap: Record<string, number> = {};
    const precoPorNome: Record<string, number> = {};
    for (const p of (prs as any[]) || []) {
      const valor = Number(p.preco_unitario);
      if (!Number.isFinite(valor) || valor <= 0) continue;
      if (p.tipo_roupa_id) precoMap[p.tipo_roupa_id] = valor;
      const nome = p.tipos_roupa?.nome;
      if (nome) precoPorNome[String(nome).trim().toLowerCase()] = valor;
    }
    const acharPreco = (tipoId: string | null | undefined, nome: string) => {
      if (tipoId && precoMap[tipoId] != null) return precoMap[tipoId];
      const byName = precoPorNome[String(nome).trim().toLowerCase()];
      return byName != null ? byName : null;
    };

    const rows: Linha[] = pedidos.map((p) => {
      const saidas = itensSaida.filter((i) => i.pedido_id === p.id);
      const base = saidas.length ? saidas : itensPedido.filter((i) => i.pedido_id === p.id);

      const agrupado: Record<string, ItemLinha> = {};
      for (const i of base) {
        const qtd = Number(
          saidas.length ? i.quantidade : (i.quantidade_conferida ?? i.quantidade_original ?? 0)
        ) || 0;
        const nome = i.tipos_roupa?.nome || i.descricao_livre || "Peça";
        const key = i.tipo_roupa_id || `livre:${nome}`;
        const preco = acharPreco(i.tipo_roupa_id, nome);
        if (!agrupado[key]) agrupado[key] = { nome, quantidade: 0, preco, subtotal: 0 };
        agrupado[key].quantidade += qtd;
        agrupado[key].subtotal = preco != null ? agrupado[key].quantidade * preco : 0;
      }

      const itens = Object.values(agrupado);
      return {
        id: p.id,
        numero_pedido: p.numero_pedido,
        data: p.coletado_em || p.criado_em,
        itens,
        pecas: itens.reduce((s, i) => s + i.quantidade, 0),
        peso: Number(p.peso_recebido_producao ?? p.peso_kg ?? 0),
        total: itens.reduce((s, i) => s + i.subtotal, 0),
      };
    });

    setLinhas(rows);
    setExpandido({});
    setLoading(false);
    setOpen(true);
    if (!rows.length) toast.info("Nenhum pedido entregue neste período");
  };

  const subtotal = linhas.reduce((s, l) => s + l.total, 0);
  const totalPecas = linhas.reduce((s, l) => s + l.pecas, 0);
  const totalPeso = linhas.reduce((s, l) => s + l.peso, 0);
  const aplicarMinima = tarifaMinima != null && tarifaMinima > 0 && subtotal < tarifaMinima;
  const totalCobrado = aplicarMinima ? (tarifaMinima as number) : subtotal;

  return (
    <>
      <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.07)] flex items-center gap-2">
          <Receipt className="w-4 h-4" style={{ color: "#5b8df6" }} />
          <h3 className="text-sm font-bold text-foreground">Recibo Mensal</h3>
        </div>
        <div className="p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="field-label">Cliente *</label>
            <select className="field-select" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Selecione…</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">Mês</label>
            <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="field-input font-mono" />
          </div>
          <button className="btn-primary" disabled={!clienteId || loading} onClick={gerar}>
            <Receipt className="w-4 h-4" /> {loading ? "Gerando…" : "Gerar recibo"}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4">
          <div className="mx-auto max-w-[820px]">
            <div className="flex justify-between items-center mb-3 btn-imprimir">
              <button className="btn-primary" onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> Imprimir recibo
              </button>
              <button className="p-2 rounded-lg bg-card border border-[rgba(255,255,255,0.1)] text-foreground" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {aplicarMinima && (
              <div className="btn-imprimir mb-3 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold" style={{ background: "rgba(240,160,32,0.15)", color: "#f0a020" }}>
                <AlertTriangle className="w-4 h-4" />
                Tarifa mínima aplicada — total calculado R$ {brl(subtotal)}
              </div>
            )}

            <div className="recibo-print bg-white text-[#111] rounded-lg p-10" style={{ fontFamily: "system-ui, sans-serif" }}>
              {/* Cabeçalho */}
              <div className="text-center">
                <img src={logo} alt="Amaná Lavanderia Hospitalar" style={{ maxWidth: 180, height: "auto", objectFit: "contain", margin: "0 auto" }} />
              </div>
              <div style={{ borderTop: "3px solid #1e4fa3", margin: "14px 0" }} />
              <div className="text-center">
                <h1 className="text-2xl font-extrabold tracking-wide" style={{ color: "#111" }}>AMANA LAVANDERIA HOSPITALAR</h1>
                <p className="text-sm" style={{ color: "#444" }}>Comprovante de Serviços Prestados</p>
              </div>
              <div style={{ borderTop: "1px solid #ccc", margin: "14px 0" }} />

              {/* Dados do cliente */}
              <div className="text-sm space-y-1">
                <p><strong>Cliente:</strong> {cliente?.nome || "—"}</p>
                <p><strong>Período:</strong> {periodoExtenso(mes)}</p>
                <p><strong>Emitido em:</strong> {dataExtenso(new Date())}</p>
              </div>
              <div style={{ borderTop: "1px solid #ccc", margin: "14px 0" }} />

              {/* Tabela */}
              <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#1e4fa3", color: "#fff" }}>
                    <th style={{ textAlign: "left", padding: "8px" }}>Data</th>
                    <th style={{ textAlign: "left", padding: "8px" }}>Pedido</th>
                    <th style={{ textAlign: "left", padding: "8px" }}>Itens</th>
                    <th style={{ textAlign: "right", padding: "8px" }}>Total do pedido</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: "16px", textAlign: "center", color: "#666" }}>Nenhum pedido entregue no período</td></tr>
                  )}
                  {linhas.map((l, idx) => (
                    <Fragment key={l.id}>
                      <tr style={{ background: idx % 2 === 0 ? "#f5f6f8" : "#fff" }}>
                        <td style={{ padding: "8px" }}>{new Date(l.data).toLocaleDateString("pt-BR")}</td>
                        <td style={{ padding: "8px", fontWeight: 700 }}>{l.numero_pedido}</td>
                        <td style={{ padding: "8px" }}>
                          <button
                            className="btn-imprimir"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#1e4fa3", fontWeight: 600 }}
                            onClick={() => setExpandido((e) => ({ ...e, [l.id]: !e[l.id] }))}
                          >
                            {expandido[l.id] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            {l.itens.length} {l.itens.length === 1 ? "tipo de peça" : "tipos de peça"}
                          </button>
                        </td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: 700 }}>R$ {brl(l.total)}</td>
                      </tr>
                      {(expandido[l.id] || l.itens.length > 0) && (
                        <tr className={expandido[l.id] ? "" : "detalhe-recibo"} style={{ background: "#fff", display: expandido[l.id] ? undefined : "none" }}>
                          <td colSpan={4} style={{ padding: "4px 8px 10px 24px" }}>
                            {l.itens.length === 0 && <span style={{ color: "#888" }}>Sem itens registrados</span>}
                            {l.itens.map((i, k) => (
                              <div key={k} style={{ fontSize: 12.5, padding: "2px 0" }}>
                                {i.nome} × {i.quantidade} ×{" "}
                                {i.preco != null ? (
                                  <>R$ {brl(i.preco)} = <strong>R$ {brl(i.subtotal)}</strong></>
                                ) : (
                                  <span style={{ color: "#888" }}>sem preço</span>
                                )}
                              </div>
                            ))}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
                <tfoot>
                  {aplicarMinima ? (
                    <>
                      <tr>
                        <td colSpan={3} style={{ padding: "8px", textAlign: "right", color: "#666", borderTop: "2px solid #1e4fa3" }}>Subtotal calculado:</td>
                        <td style={{ padding: "8px", textAlign: "right", color: "#666", borderTop: "2px solid #1e4fa3" }}>R$ {brl(subtotal)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} style={{ padding: "6px 8px", textAlign: "right" }}>Tarifa mínima:</td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>R$ {brl(tarifaMinima as number)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} style={{ padding: "10px 8px", textAlign: "right", fontWeight: 800, color: "#b8760c" }}>TOTAL COBRADO:</td>
                        <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 800, color: "#b8760c" }}>R$ {brl(totalCobrado)}</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ padding: "10px 8px", textAlign: "right", fontWeight: 800, color: "#127a56", borderTop: "2px solid #1e4fa3" }}>
                        TOTAL DO PERÍODO:
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 800, color: "#127a56", borderTop: "2px solid #1e4fa3" }}>
                        R$ {brl(totalCobrado)}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>

              <div className="text-sm mt-3 space-y-1">
                <p><strong>Total de peças lavadas:</strong> {totalPecas}</p>
                <p><strong>Peso total lavado:</strong> {totalPeso.toFixed(3).replace(".", ",")} kg</p>
              </div>

              <div style={{ borderTop: "1px solid #ccc", margin: "24px 0 12px" }} />
              <div className="text-center text-xs" style={{ color: "#444" }}>
                {aplicarMinima && (
                  <p className="font-bold" style={{ color: "#b8760c" }}>Tarifa mínima aplicada — volume abaixo do mínimo acordado</p>
                )}
                <p className="font-bold" style={{ color: "#111" }}>Amana Lavanderia Hospitalar</p>
                <p>Este documento é um comprovante de serviços e não possui valor fiscal.</p>
                <p>Obrigado pela confiança!</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReciboMensal;
