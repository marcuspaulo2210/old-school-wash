import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import StatusBadge from "@/components/StatusBadge";
import { MessageSquare } from "lucide-react";

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

  const fetchAll = async () => {
    const { data } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, status, obs_cliente, obs_motorista, obs_producao, obs_admin, divergencia_resolvida, criado_em, peso_kg, tipo_cobranca, clientes(nome)")
      .or("status.eq.divergencia,obs_cliente.neq.,obs_motorista.neq.,obs_producao.neq.,obs_admin.neq.")
      .order("criado_em", { ascending: false })
      .limit(200);
    setPedidos((data as unknown as Pedido[]) || []);
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
