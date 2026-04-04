import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Plus } from "lucide-react";

interface TipoRoupa {
  id: string;
  nome: string;
  ativo: boolean;
  criado_por_admin: boolean;
  cliente_id: string | null;
}

const TiposRoupa = () => {
  const [types, setTypes] = useState<TipoRoupa[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTypes = async () => {
    const { data } = await supabase.from("tipos_roupa").select("*").order("nome");
    setTypes((data as unknown as TipoRoupa[]) || []);
  };

  useEffect(() => { fetchTypes(); }, []);

  const handleAdd = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    await supabase.from("tipos_roupa").insert({ nome: nome.trim(), criado_por_admin: true } as any);
    setNome("");
    setShowForm(false);
    setSaving(false);
    fetchTypes();
  };

  const toggleActive = async (type: TipoRoupa) => {
    await supabase.from("tipos_roupa").update({ ativo: !type.ativo } as any).eq("id", type.id);
    fetchTypes();
  };

  return (
    <AppLayout
      title="Tipos de Roupa"
      subtitle="Cadastro exclusivo do administrador"
      backTo="/admin"
      actions={
        <button className="btn-primary text-xs px-3 py-2" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" /> {showForm ? "Cancelar" : "Novo"}
        </button>
      }
    >
      {showForm && (
        <div className="app-card-elevated mb-4 space-y-4">
          <div>
            <label className="field-label">Nome</label>
            <input className="field-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Lençol, Toalha..." />
          </div>
          <button className="btn-success w-full btn-lg" onClick={handleAdd} disabled={saving}>
            {saving ? "Salvando..." : "Salvar tipo de roupa"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {types.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">👕</div>
            <p className="empty-state-text">Nenhum tipo cadastrado</p>
          </div>
        )}
        {types.map((t) => (
          <div key={t.id} className={`list-item ${!t.ativo ? "opacity-40" : ""}`}>
            <div>
              <div className="text-sm font-bold text-foreground">{t.nome}</div>
            </div>
            <button
              className={t.ativo ? "badge-success" : "badge-neutral"}
              onClick={() => toggleActive(t)}
            >
              {t.ativo ? "Ativo" : "Inativo"}
            </button>
          </div>
        ))}
      </div>
    </AppLayout>
  );
};

export default TiposRoupa;
