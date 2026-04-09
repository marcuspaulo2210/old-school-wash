import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { Search } from "lucide-react";

interface PrecoRow {
  cliente_id: string;
  cliente_nome: string;
  tipo_cobranca: string;
  preco_peca: number;
  preco_kg: number;
}

interface HistoricoPreco {
  id: string;
  preco_anterior: number;
  preco_novo: number;
  criado_em: string;
  cliente_nome?: string;
}

const Precos = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<PrecoRow[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [historico, setHistorico] = useState<HistoricoPreco[]>([]);

  const fetchAll = async () => {
    const { data } = await supabase.from("clientes").select("id, nome, tipo_cobranca, preco_peca, preco_kg").eq("ativo", true).order("nome");
    setRows((data as unknown as PrecoRow[])?.map((d: any) => ({
      cliente_id: d.id, cliente_nome: d.nome,
      tipo_cobranca: d.tipo_cobranca || "peca",
      preco_peca: d.preco_peca || 0, preco_kg: d.preco_kg || 0,
    })) || []);
    // Historico
    const { data: hist } = await supabase.from("historico_precos").select("id, preco_anterior, preco_novo, criado_em, clientes(nome)").order("criado_em", { ascending: false }).limit(20);
    setHistorico((hist as any || []).map((h: any) => ({ ...h, cliente_nome: h.clientes?.nome })));
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSave = async (row: PrecoRow) => {
    const newPrice = Number(editValue);
    if (isNaN(newPrice) || newPrice < 0) return;
    const field = row.tipo_cobranca === "peso" ? "preco_kg" : "preco_peca";
    const oldPrice = row.tipo_cobranca === "peso" ? row.preco_kg : row.preco_peca;

    await supabase.from("clientes").update({ [field]: newPrice } as any).eq("id", row.cliente_id);
    if (user) {
      await supabase.from("historico_precos").insert({
        cliente_id: row.cliente_id,
        preco_anterior: oldPrice,
        preco_novo: newPrice,
        alterado_por: user.id,
      } as any);
    }
    setEditingId(null);
    fetchAll();
  };

  const filtered = rows.filter((r) => r.cliente_nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout title="Preços" subtitle="Tabela de preços por cliente">
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input className="field-input pl-9" placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-card overflow-hidden mb-6">
        <table className="data-table w-full">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Tipo</th>
              <th className="text-right">Preço atual</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const price = r.tipo_cobranca === "peso" ? r.preco_kg : r.preco_peca;
              const isEditing = editingId === r.cliente_id;
              return (
                <tr key={r.cliente_id}>
                  <td className="font-medium text-foreground">{r.cliente_nome}</td>
                  <td className="text-muted-foreground">{r.tipo_cobranca === "peso" ? "Por kg" : "Por peça"}</td>
                  <td className="text-right">
                    {isEditing ? (
                      <input
                        className="field-input text-right w-24 inline-block py-1 px-2 text-sm"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSave(r); if (e.key === "Escape") setEditingId(null); }}
                        onBlur={() => handleSave(r)}
                      />
                    ) : (
                      <button
                        className="font-mono font-bold text-foreground hover:text-primary transition-colors"
                        onClick={() => { setEditingId(r.cliente_id); setEditValue(String(price)); }}
                      >
                        R$ {Number(price).toFixed(2)}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Historico */}
      {historico.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Últimas alterações</h3>
          <div className="space-y-1">
            {historico.slice(0, 10).map((h) => (
              <div key={h.id} className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono text-[10px]">{new Date(h.criado_em).toLocaleDateString("pt-BR")}</span>
                <span className="text-foreground font-medium">{h.cliente_nome}</span>
                <span>R$ {Number(h.preco_anterior).toFixed(2)} → <strong className="text-foreground">R$ {Number(h.preco_novo).toFixed(2)}</strong></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Precos;
