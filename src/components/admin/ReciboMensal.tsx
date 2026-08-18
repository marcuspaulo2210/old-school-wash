import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Printer, Receipt, X } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/amana-logo.png";

interface ClienteOpt { id: string; nome: string; tipo?: string; tipo_cobranca?: string; }

interface Linha {
  id: string;
  numero_pedido: string;
  data: string;
  descricao: string;
  qtdPeso: string;
  pecas: number;
  peso: number;
  valor: number;
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

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

const ReciboMensal = ({ clientes }: { clientes: ClienteOpt[] }) => {
  const [clienteId, setClienteId] = useState("");
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>([]);

  const cliente = clientes.find((c) => c.id === clienteId);

  const gerar = async () => {
    if (!clienteId) { toast.error("Selecione um cliente"); return; }
    setLoading(true);
    const { start, end } = monthBounds(mes);
    const { data: peds, error } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, criado_em, coletado_em, entregue_em, peso_kg, peso_recebido_producao, valor_total, tipo_cobranca")
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
    let itens: any[] = [];
    if (ids.length) {
      const { data: its } = await supabase
        .from("itens_pedido")
        .select("pedido_id, descricao_livre, quantidade_original, quantidade_conferida, tipos_roupa(nome)")
        .in("pedido_id", ids);
      itens = (its as any[]) || [];
    }

    const rows: Linha[] = pedidos.map((p) => {
      const meus = itens.filter((i) => i.pedido_id === p.id);
      const pecas = meus.reduce((s, i) => s + Number(i.quantidade_conferida ?? i.quantidade_original ?? 0), 0);
      const peso = Number(p.peso_recebido_producao ?? p.peso_kg ?? 0);
      const nomes = meus
        .map((i) => {
          const q = Number(i.quantidade_conferida ?? i.quantidade_original ?? 0);
          const nome = i.tipos_roupa?.nome || i.descricao_livre || "Peça";
          return `${q}x ${nome}`;
        })
        .join(", ");
      const porPeso = p.tipo_cobranca === "peso";
      return {
        id: p.id,
        numero_pedido: p.numero_pedido,
        data: p.coletado_em || p.criado_em,
        descricao: porPeso || !nomes ? `${peso.toFixed(3).replace(".", ",")} kg lavados` : nomes,
        qtdPeso: porPeso || !pecas ? `${peso.toFixed(3).replace(".", ",")} kg` : `${pecas} peças`,
        pecas,
        peso,
        valor: Number(p.valor_total || 0),
      };
    });

    setLinhas(rows);
    setLoading(false);
    setOpen(true);
    if (!rows.length) toast.info("Nenhum pedido entregue neste período");
  };

  const totalValor = linhas.reduce((s, l) => s + l.valor, 0);
  const totalPecas = linhas.reduce((s, l) => s + l.pecas, 0);
  const totalPeso = linhas.reduce((s, l) => s + l.peso, 0);

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
                    <th style={{ textAlign: "left", padding: "8px" }}>Data da coleta</th>
                    <th style={{ textAlign: "left", padding: "8px" }}>Pedido</th>
                    <th style={{ textAlign: "left", padding: "8px" }}>Descrição</th>
                    <th style={{ textAlign: "right", padding: "8px" }}>Qtd/Peso</th>
                    <th style={{ textAlign: "right", padding: "8px" }}>Valor (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.length === 0 && (
                    <tr><td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "#666" }}>Nenhum pedido entregue no período</td></tr>
                  )}
                  {linhas.map((l, idx) => (
                    <tr key={l.id} style={{ background: idx % 2 === 0 ? "#f5f6f8" : "#fff" }}>
                      <td style={{ padding: "8px" }}>{new Date(l.data).toLocaleDateString("pt-BR")}</td>
                      <td style={{ padding: "8px", fontWeight: 700 }}>{l.numero_pedido}</td>
                      <td style={{ padding: "8px" }}>{l.descricao}</td>
                      <td style={{ padding: "8px", textAlign: "right" }}>{l.qtdPeso}</td>
                      <td style={{ padding: "8px", textAlign: "right" }}>{l.valor ? l.valor.toFixed(2).replace(".", ",") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ padding: "10px 8px", textAlign: "right", fontWeight: 800, borderTop: "2px solid #1e4fa3" }}>
                      TOTAL DO PERÍODO:
                    </td>
                    <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 800, borderTop: "2px solid #1e4fa3" }}>
                      R$ {totalValor.toFixed(2).replace(".", ",")}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div className="text-sm mt-3 space-y-1">
                <p><strong>Total de peças lavadas:</strong> {totalPecas}</p>
                <p><strong>Peso total lavado:</strong> {totalPeso.toFixed(3).replace(".", ",")} kg</p>
              </div>

              <div style={{ borderTop: "1px solid #ccc", margin: "24px 0 12px" }} />
              <div className="text-center text-xs" style={{ color: "#444" }}>
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
