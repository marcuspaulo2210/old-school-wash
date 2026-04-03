import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Plus } from "lucide-react";

interface ClothingType {
  id: string;
  name: string;
  unit: string;
  sort_order: number;
  active: boolean;
}

const TiposRoupa = () => {
  const [types, setTypes] = useState<ClothingType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<"PEÇA" | "CONJUNTO">("PEÇA");
  const [saving, setSaving] = useState(false);

  const fetchTypes = async () => {
    const { data } = await supabase.from("clothing_types").select("*").order("sort_order");
    setTypes((data as ClothingType[]) || []);
  };

  useEffect(() => { fetchTypes(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const maxOrder = types.reduce((m, t) => Math.max(m, t.sort_order), 0);
    await supabase.from("clothing_types").insert({ name: name.trim(), unit, sort_order: maxOrder + 1 });
    setName("");
    setShowForm(false);
    setSaving(false);
    fetchTypes();
  };

  const toggleActive = async (type: ClothingType) => {
    await supabase.from("clothing_types").update({ active: !type.active }).eq("id", type.id);
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
            <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Lençol, Toalha..." />
          </div>
          <div>
            <label className="field-label">Unidade</label>
            <select className="field-select" value={unit} onChange={(e) => setUnit(e.target.value as "PEÇA" | "CONJUNTO")}>
              <option value="PEÇA">Peça</option>
              <option value="CONJUNTO">Conjunto</option>
            </select>
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
          <div key={t.id} className={`list-item ${!t.active ? "opacity-40" : ""}`}>
            <div>
              <div className="text-sm font-bold text-foreground">{t.name}</div>
              <div className="text-xs text-muted-foreground">{t.unit}</div>
            </div>
            <button
              className={t.active ? "badge-success" : "badge-neutral"}
              onClick={() => toggleActive(t)}
            >
              {t.active ? "Ativo" : "Inativo"}
            </button>
          </div>
        ))}
      </div>
    </AppLayout>
  );
};

export default TiposRoupa;
