import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import { MessageSquare, AlertTriangle, Truck, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { liberarDivergenciaParaEntrega, devolverDivergenciaParaProducao } from "@/lib/divergencia";

interface Pedido {
  id: string;
  numero_pedido: string;
  status: string;
  obs_cliente: string | null;
  obs_motorista: string | null;
  obs_producao: string | null;
  obs_admin: string | null;
  divergencia_resolvida: boolean;
  criado_em: string;
  peso_kg: number | null;
  tipo_cobranca: string;
  clientes: { nome: string } | null;
}

const Divergencias = () => {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filter, setFilter] = useState<"todas" | "abertas" | "resolvidas">("abertas");
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [itensMap, setItensMap] = useState<Record<string, { nome: string; qtd: number }[]>>({});

  const fetchAll = async () => {
    const { data } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, status, obs_cliente, obs_motorista, obs_producao, obs_admin, divergencia_resolvida, criado_em, peso_kg, tipo_cobranca, clientes(nome)")
      .or("status.eq.divergencia,obs_cliente.neq.,obs_motorista.neq.,obs_producao.neq.,obs_admin.neq.")
      .order("criado_em", { ascending: false })
      .limit(200);
    const list = (data as unknown as Pedido[]) || [];
    setPedidos(list);

    const ativos = list.filter((p) => p.status === "divergencia").map((p) => p.id);
    if (ativos.length > 0) {
      const { data: itens } = await supabase
        .from("itens_pedido")
        .select("pedido_id, descricao_livre, quantidade_original, quantidade_conferida, tipos_roupa(nome)")
        .in("pedido_id", ativos);
      const map: Record<string, { nome: string; qtd: number }[]> = {};
      for (const it of (itens as any[]) || []) {
        const nome = it.tipos_roupa?.nome || it.descricao_livre || "Peça";
        const qtd = it.quantidade_conferida ?? it.quantidade_original ?? 0;
        (map[it.pedido_id] ||= []).push({ nome, qtd });
      }
      setItensMap(map);
    } else {
      setItensMap({});
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = pedidos.filter((p) => {
    if (filter === "abertas") return !p.divergencia_resolvida;
    if (filter === "resolvidas") return p.divergencia_resolvida;
    return true;
  });

  const handleComment = async (pedido: Pedido) => {
    const text = commentMap[pedido.id]?.trim();
    if (!text) return;
    setSaving(pedido.id);
    const currentObs = pedido.obs_admin ? pedido.obs_admin + "\n" + text : text;
    await supabase.from("pedidos").update({ obs_admin: currentObs } as any).eq("id", pedido.id);
    setCommentMap((prev) => ({ ...prev, [pedido.id]: "" }));
    setSaving(null);
    fetchAll();
  };

  const handleResolver = async (pedido: Pedido) => {
    await supabase.from("pedidos").update({ divergencia_resolvida: true } as any).eq("id", pedido.id);
    fetchAll();
  };

  const handleLiberar = async (p: Pedido) => {
    if (!user) return;
    setSaving(p.id);
    const { error } = await liberarDivergenciaParaEntrega(p.id, p.numero_pedido, user.id);
    setSaving(null);
    if (error) { toast.error("Erro ao liberar: " + error.message); return; }
    toast.success(`Pedido ${p.numero_pedido} liberado para entrega`);
    fetchAll();
  };

  const handleDevolver = async (p: Pedido) => {
    if (!user) return;
    setSaving(p.id);
    const { error } = await devolverDivergenciaParaProducao(p.id, user.id);
    setSaving(null);
    if (error) { toast.error("Erro ao devolver: " + error.message); return; }
    toast.success(`Pedido ${p.numero_pedido} devolvido para produção`);
    fetchAll();
  };

  const obsTimeline = (p: Pedido) => {
    const items: { label: string; text: string; color: string }[] = [];
    if (p.obs_cliente) items.push({ label: "Cliente", text: p.obs_cliente, color: "#2dbfa0" });
    if (p.obs_motorista) items.push({ label: "Motorista", text: p.obs_motorista, color: "#f0a020" });
    if (p.obs_producao) items.push({ label: "Produção", text: p.obs_producao, color: "#5b8df6" });
    if (p.obs_admin) items.push({ label: "Admin", text: p.obs_admin, color: "#9b72f4" });
    return items;
  };

  return (
    <AdminLayout title="Divergências" subtitle="Ocorrências e observações">
      {(() => {
        const ativos = pedidos.filter((p) => p.status === "divergencia");
        if (ativos.length === 0) return null;
        return (
          <div className="mb-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#e05050" }}>
              <AlertTriangle className="w-3.5 h-3.5" /> Divergências ativas ({ativos.length})
            </h3>
            {ativos.map((p) => (
              <div key={p.id} className="rounded-xl border p-4 space-y-3" style={{ background: "rgba(224,80,80,0.05)", borderColor: "rgba(224,80,80,0.3)" }}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-sm" style={{ color: "#5b8df6" }}>{p.numero_pedido}</span>
                    <span className="text-sm font-bold text-foreground ml-2">{p.clientes?.nome || "Sem cliente"}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(p.criado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {p.tipo_cobranca === "peso" && p.peso_kg ? ` — ${p.peso_kg} kg` : ""}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                {(itensMap[p.id] || []).length > 0 && (
                  <div className="text-xs text-muted-foreground bg-secondary rounded-lg p-2 space-y-0.5">
                    {(itensMap[p.id] || []).map((it, i) => (
                      <p key={i}>{it.nome} — <span className="font-mono text-foreground">{it.qtd}</span></p>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    className="btn-success flex-1 text-xs py-2 flex items-center justify-center gap-1"
                    disabled={saving === p.id}
                    onClick={() => handleLiberar(p)}
                  >
                    <Truck className="w-3.5 h-3.5" /> Resolver e liberar para entrega
                  </button>
                  <button
                    className="flex-1 text-xs py-2 font-bold rounded-lg flex items-center justify-center gap-1"
                    style={{ background: "rgba(240,160,32,0.15)", color: "#f0a020", border: "1px solid rgba(240,160,32,0.35)" }}
                    disabled={saving === p.id}
                    onClick={() => handleDevolver(p)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Devolver para produção
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      <div className="flex gap-2 mb-4">
        {(["todas", "abertas", "resolvidas"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${filter === f ? "bg-primary text-primary-foreground" : "bg-card border border-[rgba(255,255,255,0.07)] text-muted-foreground"}`}
          >{f}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <div className="empty-state"><div className="empty-state-icon">✓</div><p className="empty-state-text">Nenhuma ocorrência</p></div>}
        {filtered.map((p) => (
          <div key={p.id} className="app-card-elevated space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono font-bold text-sm" style={{ color: "#5b8df6" }}>{p.numero_pedido}</span>
                <span className="text-sm text-foreground ml-2">{p.clientes?.nome}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={p.status} />
                {p.divergencia_resolvida && <span className="badge-success text-[9px]">Resolvida</span>}
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-2 pl-3 border-l-2 border-border">
              {obsTimeline(p).map((item, i) => (
                <div key={i} className="text-xs">
                  <span className="font-bold" style={{ color: item.color }}>{item.label}:</span>
                  <span className="text-muted-foreground ml-1">{item.text}</span>
                </div>
              ))}
            </div>

            {/* Admin comment */}
            {!p.divergencia_resolvida && (
              <div className="flex gap-2">
                <input
                  className="field-input flex-1 text-xs py-2"
                  placeholder="Adicionar comentário admin..."
                  value={commentMap[p.id] || ""}
                  onChange={(e) => setCommentMap((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleComment(p); }}
                />
                <button className="btn-primary text-xs px-3 py-1" onClick={() => handleComment(p)} disabled={saving === p.id}>
                  Comentar
                </button>
                <button className="btn-success text-xs px-3 py-1" onClick={() => handleResolver(p)}>
                  Resolver
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default Divergencias;
