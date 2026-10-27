import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { registrarMudancaStatus } from "@/lib/statusHistory";
import { X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { v: "aguardando_coleta", l: "Aguardando coleta" },
  { v: "coletado", l: "Coletado" },
  { v: "em_producao", l: "Em produção" },
  { v: "embalado", l: "Embalado" },
  { v: "pronto_para_entrega", l: "Pronto para entrega" },
  { v: "saiu_para_entrega", l: "Saiu para entrega" },
  { v: "entregue", l: "Entregue" },
  { v: "divergencia", l: "Divergência" },
];

interface EditItem {
  key: string;
  tipo_roupa_id: string | null;
  descricao_livre: string;
  quantidade_original: string;
  quantidade_conferida: string;
  origem: string;
}

interface Props {
  pedidoId: string;
  numeroPedido: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

const toStr = (v: any) => (v == null ? "" : String(v));
const toNum = (v: string) => {
  const s = v.trim().replace(",", ".");
  if (!s) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

const EditarPedidoModal = ({ pedidoId, numeroPedido, userId, onClose, onSaved }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusOriginal, setStatusOriginal] = useState("");
  const [status, setStatus] = useState("");
  const [tipoCobranca, setTipoCobranca] = useState("peca");
  const [pesoKg, setPesoKg] = useState("");
  const [pesoMotorista, setPesoMotorista] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [obs, setObs] = useState({ obs_cliente: "", obs_motorista: "", obs_producao: "", obs_admin: "" });
  const [itens, setItens] = useState<EditItem[]>([]);
  const [tipos, setTipos] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: its }, { data: tps }] = await Promise.all([
        supabase.from("pedidos").select("status, tipo_cobranca, peso_kg, peso_motorista_kg, valor_total, obs_cliente, obs_motorista, obs_producao, obs_admin").eq("id", pedidoId).maybeSingle(),
        supabase.from("itens_pedido").select("tipo_roupa_id, descricao_livre, quantidade_original, quantidade_conferida, origem").eq("pedido_id", pedidoId),
        supabase.from("tipos_roupa").select("id, nome").eq("ativo", true).order("nome"),
      ]);
      const pd = p as any;
      if (pd) {
        setStatus(pd.status); setStatusOriginal(pd.status);
        setTipoCobranca(pd.tipo_cobranca);
        setPesoKg(toStr(pd.peso_kg)); setPesoMotorista(toStr(pd.peso_motorista_kg)); setValorTotal(toStr(pd.valor_total));
        setObs({ obs_cliente: pd.obs_cliente || "", obs_motorista: pd.obs_motorista || "", obs_producao: pd.obs_producao || "", obs_admin: pd.obs_admin || "" });
      }
      setItens(((its as any[]) || []).map((i, idx) => ({
        key: `e${idx}`, tipo_roupa_id: i.tipo_roupa_id, descricao_livre: i.descricao_livre || "",
        quantidade_original: toStr(i.quantidade_original), quantidade_conferida: toStr(i.quantidade_conferida), origem: i.origem || "admin",
      })));
      setTipos((tps as any) || []);
      setLoading(false);
    })();
  }, [pedidoId]);

  const updItem = (key: string, patch: Partial<EditItem>) => setItens((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const salvar = async () => {
    setSaving(true);
    const { error } = await supabase.from("pedidos").update({
      status: status as any,
      tipo_cobranca: tipoCobranca as any,
      peso_kg: toNum(pesoKg),
      peso_motorista_kg: toNum(pesoMotorista),
      valor_total: toNum(valorTotal),
      obs_cliente: obs.obs_cliente || null,
      obs_motorista: obs.obs_motorista || null,
      obs_producao: obs.obs_producao || null,
      obs_admin: obs.obs_admin || null,
    } as any).eq("id", pedidoId);
    if (error) { setSaving(false); toast.error("Erro ao salvar pedido: " + error.message); return; }

    const validos = itens.filter((i) => (parseInt(i.quantidade_original) || 0) > 0 && (i.tipo_roupa_id || i.descricao_livre.trim()));
    // Busca os itens antigos para removê-los somente depois que os novos forem gravados
    const { data: antigos } = await supabase.from("itens_pedido").select("id").eq("pedido_id", pedidoId);
    const idsAntigos = ((antigos as any[]) || []).map((a) => a.id);
    if (validos.length) {
      // "diferenca" é calculada automaticamente pelo banco — não enviar
      const rows = validos.map((i) => {
        const conf = i.quantidade_conferida.trim() ? parseInt(i.quantidade_conferida) : null;
        return {
          pedido_id: pedidoId, tipo_roupa_id: i.tipo_roupa_id,
          descricao_livre: i.tipo_roupa_id ? null : i.descricao_livre.trim(),
          quantidade_original: parseInt(i.quantidade_original) || 0,
          quantidade_conferida: conf != null && !isNaN(conf) ? conf : null,
          origem: i.origem || "admin",
        };
      });
      const { error: insErr } = await supabase.from("itens_pedido").insert(rows as any);
      if (insErr) { setSaving(false); toast.error("Erro ao salvar peças: " + insErr.message); return; }
    }
    if (idsAntigos.length) {
      const { error: delErr } = await supabase.from("itens_pedido").delete().in("id", idsAntigos);
      if (delErr) { setSaving(false); toast.error("Erro ao atualizar peças: " + delErr.message); return; }
    }
    if (status !== statusOriginal) {
      await registrarMudancaStatus(pedidoId, statusOriginal as any, status as any, userId, "Status alterado pelo admin (edição)");
    }
    setSaving(false);
    toast.success(`Pedido ${numeroPedido} atualizado!`);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl p-5 w-full max-w-2xl max-h-[92vh] overflow-y-auto space-y-4 animate-fade-in">
        <div className="flex justify-between items-start">
          <h3 className="text-base font-bold text-foreground">Editar pedido <span className="font-mono text-primary">{numeroPedido}</span></h3>
          <button className="text-muted-foreground hover:text-foreground" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="field-label">Status</label>
                <select className="field-select w-full" value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUS_OPTIONS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Cobrança</label>
                <select className="field-select w-full" value={tipoCobranca} onChange={(e) => setTipoCobranca(e.target.value)}>
                  <option value="peca">Por peça</option>
                  <option value="peso">Por peso</option>
                </select>
              </div>
              <div>
                <label className="field-label">Peso informado (kg)</label>
                <input className="field-input font-mono" type="number" step="0.01" min="0" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Peso coletado/motorista (kg)</label>
                <input className="field-input font-mono" type="number" step="0.01" min="0" value={pesoMotorista} onChange={(e) => setPesoMotorista(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Valor total (R$)</label>
                <input className="field-input font-mono" type="number" step="0.01" min="0" placeholder="Vazio = cálculo automático" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Peças</p>
                <button className="btn-ghost text-xs flex items-center gap-1" onClick={() => setItens((p) => [...p, { key: `n${Date.now()}`, tipo_roupa_id: null, descricao_livre: "", quantidade_original: "", quantidade_conferida: "", origem: "admin" }])}>
                  <Plus className="w-3 h-3" /> Adicionar peça
                </button>
              </div>
              {itens.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma peça lançada.</p>}
              <div className="space-y-2">
                {itens.map((i) => (
                  <div key={i.key} className="grid grid-cols-12 gap-2 items-center">
                    <select className="field-select col-span-4" value={i.tipo_roupa_id || ""} onChange={(e) => updItem(i.key, { tipo_roupa_id: e.target.value || null })}>
                      <option value="">Tipo livre...</option>
                      {tipos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                    <input className="field-input col-span-3" placeholder="Descrição" disabled={!!i.tipo_roupa_id} value={i.tipo_roupa_id ? "" : i.descricao_livre} onChange={(e) => updItem(i.key, { descricao_livre: e.target.value })} />
                    <input className="field-input font-mono col-span-2" type="number" min="0" placeholder="Orig." value={i.quantidade_original} onChange={(e) => updItem(i.key, { quantidade_original: e.target.value })} />
                    <input className="field-input font-mono col-span-2" type="number" min="0" placeholder="Conf." value={i.quantidade_conferida} onChange={(e) => updItem(i.key, { quantidade_conferida: e.target.value })} />
                    <button className="col-span-1 text-destructive flex justify-center" onClick={() => setItens((p) => p.filter((x) => x.key !== i.key))}><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Orig. = quantidade enviada · Conf. = conferida na produção (opcional). Peças com quantidade 0 são removidas.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([["obs_cliente", "Obs. cliente"], ["obs_motorista", "Obs. motorista"], ["obs_producao", "Obs. produção"], ["obs_admin", "Obs. admin"]] as const).map(([k, l]) => (
                <div key={k}>
                  <label className="field-label">{l}</label>
                  <textarea className="field-input min-h-[60px]" value={obs[k]} onChange={(e) => setObs((o) => ({ ...o, [k]: e.target.value }))} />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={onClose} disabled={saving}>Cancelar</button>
              <button className="btn-primary flex-1" onClick={salvar} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EditarPedidoModal;
