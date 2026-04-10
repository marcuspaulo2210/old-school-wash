import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Plus, Search, X, Pencil, Trash2 } from "lucide-react";


interface Servico {
  id: string;
  nome: string;
  descricao: string | null;
  tipo_cobranca: string;
  preco_unitario: number;
  ativo: boolean;
}

const tipoLabel: Record<string, string> = {
  peca: "Por peça",
  peso: "Por peso",
  pacote: "Por pacote",
};

const Servicos = () => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Servico | null>(null);

  // Form state
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoCobranca, setTipoCobranca] = useState("peca");
  const [precoUnitario, setPrecoUnitario] = useState("");
  const [ativo, setAtivo] = useState(true);

  const fetchServicos = async () => {
    const { data } = await supabase.from("servicos").select("*").order("nome");
    setServicos((data as unknown as Servico[]) || []);
  };

  useEffect(() => { fetchServicos(); }, []);

  const resetForm = () => {
    setNome(""); setDescricao(""); setTipoCobranca("peca"); setPrecoUnitario(""); setAtivo(true);
    setEditingId(null); setShowForm(false);
  };

  const openEdit = (s: Servico) => {
    setNome(s.nome);
    setDescricao(s.descricao || "");
    setTipoCobranca(s.tipo_cobranca);
    setPrecoUnitario(String(s.preco_unitario));
    setAtivo(s.ativo);
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    const payload = {
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      tipo_cobranca: tipoCobranca,
      preco_unitario: parseFloat(precoUnitario) || 0,
      ativo,
    };

    if (editingId) {
      await supabase.from("servicos").update(payload as any).eq("id", editingId);
    } else {
      await supabase.from("servicos").insert(payload as any);
    }
    setSaving(false);
    resetForm();
    fetchServicos();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("servicos").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    fetchServicos();
  };

  const toggleAtivo = async (s: Servico) => {
    await supabase.from("servicos").update({ ativo: !s.ativo } as any).eq("id", s.id);
    fetchServicos();
  };

  const filtered = servicos.filter((s) =>
    s.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="Serviços" subtitle="Gerenciamento de serviços oferecidos">
      {/* Form */}
      {showForm && (
        <div className="app-card-elevated mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-foreground">{editingId ? "Editar Serviço" : "Novo Serviço"}</h3>
            <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Nome do serviço *</label>
              <input className="field-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Lavagem padrão" />
            </div>
            <div>
              <label className="field-label">Tipo de cobrança</label>
              <select className="field-select" value={tipoCobranca} onChange={(e) => setTipoCobranca(e.target.value)}>
                <option value="peca">Por peça</option>
                <option value="peso">Por peso</option>
                <option value="pacote">Por pacote</option>
              </select>
            </div>
            <div>
              <label className="field-label">Preço unitário (R$)</label>
              <input className="field-input" type="number" step="0.01" min="0" value={precoUnitario} onChange={(e) => setPrecoUnitario(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="field-label">Status</label>
              <select className="field-select" value={ativo ? "ativo" : "inativo"} onChange={(e) => setAtivo(e.target.value === "ativo")}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="field-label">Descrição</label>
              <textarea className="field-input min-h-[80px] resize-y" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição do serviço..." />
            </div>
          </div>
          <button className="btn-primary w-full btn-lg" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar serviço"}
          </button>
        </div>
      )}

      {!showForm && (
        <button className="btn-primary text-xs px-3 py-2 mb-4" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Novo Serviço
        </button>
      )}

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input className="field-input pl-9" placeholder="Buscar serviço..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p className="empty-state-text">Nenhum serviço cadastrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div key={s.id} className={`app-card ${!s.ativo ? "opacity-40" : ""}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-foreground">{s.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {tipoLabel[s.tipo_cobranca] || s.tipo_cobranca} • <span className="font-mono text-primary">R$ {Number(s.preco_unitario).toFixed(2)}</span>
                  </div>
                  {s.descricao && <div className="text-xs text-muted-foreground mt-0.5">{s.descricao}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleAtivo(s)} className={s.ativo ? "badge-success" : "badge-neutral"}>
                    {s.ativo ? "Ativo" : "Inativo"}
                  </button>
                  <button onClick={() => openEdit(s)} className="btn-ghost text-xs px-2 py-1.5" title="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(s)} className="btn-ghost text-xs px-2 py-1.5 text-destructive" title="Excluir">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm text-center space-y-4 animate-fade-in">
            <p className="text-sm font-bold text-foreground">Excluir serviço</p>
            <p className="text-xs text-muted-foreground">Tem certeza que deseja excluir "{deleteTarget.nome}"? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn-danger flex-1" onClick={handleDelete}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Servicos;
