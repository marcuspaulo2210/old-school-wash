import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Pencil, X, ChevronDown, ChevronRight } from "lucide-react";

interface SaldoRow {
  id: string;
  cliente_id: string;
  descricao: string;
  total_enviado: number;
  total_devolvido: number;
  saldo: number;
  ultima_atualizacao: string;
  obs_admin: string | null;
  clientes: { nome: string; tipo: string } | null;
}

interface HistoricoRow {
  id: string;
  pedido_id: string | null;
  descricao: string;
  quantidade_enviada: number;
  quantidade_devolvida: number;
  saldo_anterior: number;
  saldo_novo: number;
  tipo: string;
  editado_por: string | null;
  obs: string | null;
  criado_em: string;
  pedidos?: { numero_pedido: string } | null;
  usuarios?: { nome: string } | null;
}

const SaldoRoupasSection = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<SaldoRow[]>([]);
  const [filterCliente, setFilterCliente] = useState("todos");
  const [onlyPending, setOnlyPending] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [historico, setHistorico] = useState<Record<string, HistoricoRow[]>>({});
  const [editing, setEditing] = useState<SaldoRow | null>(null);
  const [editEnv, setEditEnv] = useState("");
  const [editDev, setEditDev] = useState("");
  const [editMotivo, setEditMotivo] = useState("");
  const [editObs, setEditObs] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    const { data } = await supabase
      .from("saldo_roupas" as any)
      .select("*, clientes(nome, tipo)")
      .order("cliente_id");
    setRows(((data as unknown) as SaldoRow[]) || []);
  };

  useEffect(() => { fetchAll(); }, []);

  const clientesOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) if (r.clientes?.nome) map.set(r.cliente_id, r.clientes.nome);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (filterCliente !== "todos" && r.cliente_id !== filterCliente) return false;
    if (onlyPending && r.saldo === 0) return false;
    return true;
  });

  const toggleExpand = async (key: string, r: SaldoRow) => {
    if (expanded === key) { setExpanded(null); return; }
    setExpanded(key);
    if (!historico[key]) {
      const { data } = await supabase
        .from("historico_saldo" as any)
        .select("*, pedidos(numero_pedido), usuarios(nome)")
        .eq("cliente_id", r.cliente_id)
        .ilike("descricao", r.descricao)
        .order("criado_em", { ascending: false });
      setHistorico((h) => ({ ...h, [key]: ((data as unknown) as HistoricoRow[]) || [] }));
    }
  };

  const openEdit = (r: SaldoRow) => {
    setEditing(r);
    setEditEnv(String(r.total_enviado));
    setEditDev(String(r.total_devolvido));
    setEditMotivo("");
    setEditObs("");
  };

  const saveEdit = async () => {
    if (!editing || !user) return;
    if (!editMotivo.trim()) { alert("Informe o motivo do ajuste."); return; }
    const novoEnv = parseInt(editEnv) || 0;
    const novoDev = parseInt(editDev) || 0;
    const saldoAnterior = editing.saldo;
    const saldoNovo = novoEnv - novoDev;
    setSaving(true);
    await supabase
      .from("saldo_roupas" as any)
      .update({
        total_enviado: novoEnv,
        total_devolvido: novoDev,
        ultima_atualizacao: new Date().toISOString(),
        obs_admin: saldoNovo < 0 ? "Devolvido maior que enviado — verificar contagem" : editing.obs_admin,
      })
      .eq("id", editing.id);
    await supabase.from("historico_saldo" as any).insert({
      cliente_id: editing.cliente_id,
      pedido_id: null,
      descricao: editing.descricao,
      quantidade_enviada: novoEnv - editing.total_enviado,
      quantidade_devolvida: novoDev - editing.total_devolvido,
      saldo_anterior: saldoAnterior,
      saldo_novo: saldoNovo,
      tipo: "manual",
      editado_por: user.id,
      obs: `${editMotivo}${editObs ? ` — ${editObs}` : ""}`,
    });
    setSaving(false);
    setEditing(null);
    setHistorico({});
    fetchAll();
  };

  const situacaoBadge = (saldo: number) => {
    if (saldo === 0) return { label: "Em dia", bg: "rgba(52,201,122,0.12)", color: "#34c97a" };
    if (saldo > 0) return { label: `${saldo} pendente${saldo > 1 ? "s" : ""}`, bg: "rgba(240,160,32,0.12)", color: "#f0a020" };
    return { label: "Verificar", bg: "rgba(224,80,80,0.12)", color: "#e05050" };
  };

  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(255,255,255,0.07)]">
        <h3 className="text-sm font-bold text-foreground">Controle de Saldo de Roupas</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">Peças enviadas versus devolvidas por cliente</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 p-4 border-b border-[rgba(255,255,255,0.07)]">
        <div>
          <label className="field-label">Cliente</label>
          <select className="field-select" value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)}>
            <option value="todos">Todos os clientes</option>
            {clientesOptions.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
          Mostrar apenas pendentes
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th></th>
              <th>Cliente</th>
              <th>Peça</th>
              <th className="text-right">Enviado</th>
              <th className="text-right">Devolvido</th>
              <th className="text-right">Saldo</th>
              <th className="text-center">Situação</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center text-muted-foreground py-6">Nenhum saldo registrado</td></tr>
            )}
            {filtered.map((r) => {
              const key = r.id;
              const isOpen = expanded === key;
              const badge = situacaoBadge(r.saldo);
              const hist = historico[key] || [];
              return (
                <>
                  <tr key={key} className="cursor-pointer hover:bg-secondary/30" onClick={() => toggleExpand(key, r)}>
                    <td className="w-8">{isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}</td>
                    <td className="font-medium text-foreground">{r.clientes?.nome || "—"}</td>
                    <td>{r.descricao}</td>
                    <td className="text-right font-mono">{r.total_enviado}</td>
                    <td className="text-right font-mono">{r.total_devolvido}</td>
                    <td className="text-right font-mono font-bold">{r.saldo}</td>
                    <td className="text-center">
                      <span className="inline-flex px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded" style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border border-[rgba(255,255,255,0.13)] hover:bg-secondary/50"
                        onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                      >
                        <Pencil className="w-3 h-3" /> Editar
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={8} className="bg-[#0c0e14] p-3">
                        {r.obs_admin && (
                          <div className="text-[11px] mb-2" style={{ color: "#f0a020" }}>⚠ {r.obs_admin}</div>
                        )}
                        {hist.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Sem histórico</p>
                        ) : (
                          <table className="data-table w-full text-xs">
                            <thead>
                              <tr>
                                <th>Data</th>
                                <th>Pedido</th>
                                <th className="text-right">Enviado</th>
                                <th className="text-right">Devolvido</th>
                                <th className="text-right">Saldo ant.</th>
                                <th className="text-right">Saldo novo</th>
                                <th className="text-center">Tipo</th>
                                <th>Quem</th>
                              </tr>
                            </thead>
                            <tbody>
                              {hist.map((h) => (
                                <tr key={h.id}>
                                  <td className="font-mono">{new Date(h.criado_em).toLocaleString("pt-BR")}</td>
                                  <td className="font-mono">{h.pedidos?.numero_pedido || "—"}</td>
                                  <td className="text-right font-mono">{h.quantidade_enviada}</td>
                                  <td className="text-right font-mono">{h.quantidade_devolvida}</td>
                                  <td className="text-right font-mono">{h.saldo_anterior}</td>
                                  <td className="text-right font-mono font-bold">{h.saldo_novo}</td>
                                  <td className="text-center">
                                    {h.tipo === "manual" ? (
                                      <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold uppercase rounded" style={{ background: "rgba(240,160,32,0.12)", color: "#f0a020" }}>Ajuste manual</span>
                                    ) : (
                                      <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold uppercase rounded" style={{ background: "rgba(91,141,246,0.12)", color: "#5b8df6" }}>Automático</span>
                                    )}
                                  </td>
                                  <td>{h.usuarios?.nome || "—"}{h.obs ? <span className="text-muted-foreground"> — {h.obs}</span> : null}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => !saving && setEditing(null)}>
          <div className="w-full max-w-md rounded-xl bg-card border border-[rgba(255,255,255,0.07)] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-foreground">Ajuste manual</h4>
                <p className="text-[11px] text-muted-foreground">{editing.clientes?.nome} — {editing.descricao}</p>
              </div>
              <button onClick={() => setEditing(null)} disabled={saving}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Total enviado</label>
                  <input type="number" className="field-input font-mono" value={editEnv} onChange={(e) => setEditEnv(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Total devolvido</label>
                  <input type="number" className="field-input font-mono" value={editDev} onChange={(e) => setEditDev(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="field-label">Motivo do ajuste *</label>
                <input className="field-input" value={editMotivo} onChange={(e) => setEditMotivo(e.target.value)} placeholder="Ex: recontagem no estoque" />
              </div>
              <div>
                <label className="field-label">Observação (opcional)</label>
                <textarea className="field-input" rows={2} value={editObs} onChange={(e) => setEditObs(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button className="btn-ghost" onClick={() => setEditing(null)} disabled={saving}>Cancelar</button>
                <button className="btn-primary" onClick={saveEdit} disabled={saving}>{saving ? "Salvando..." : "Salvar ajuste"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaldoRoupasSection;