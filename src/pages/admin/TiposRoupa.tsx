import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ClothingType { id: string; name: string; unit: string; sort_order: number; active: boolean; }

const TiposRoupa = () => {
  const navigate = useNavigate();
  const [types, setTypes] = useState<ClothingType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<"PEÇA" | "CONJUNTO">("PEÇA");
  const [saving, setSaving] = useState(false);

  const fetchTypes = async () => {
    const { data } = await supabase.from("clothing_types").select("*").order("sort_order");
    setTypes(data || []);
  };

  useEffect(() => { fetchTypes(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const maxOrder = types.reduce((m, t) => Math.max(m, t.sort_order), 0);
    await supabase.from("clothing_types").insert({ name: name.trim(), unit, sort_order: maxOrder + 1 });
    setName(""); setShowForm(false); setSaving(false);
    fetchTypes();
  };

  const toggleActive = async (type: ClothingType) => {
    await supabase.from("clothing_types").update({ active: !type.active }).eq("id", type.id);
    fetchTypes();
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="app-header-title">Tipos de Roupa</h1>
            <p className="app-header-subtitle">Catálogo de itens</p>
          </div>
          <button className="btn-primary text-sm px-4 py-2" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancelar" : "+ Novo"}
          </button>
        </div>
      </div>

      <div className="page-content animate-fade-in">
        {showForm && (
          <div className="app-card-elevated mb-4 space-y-4">
            <div>
              <label className="field-label">Nome</label>
              <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do tipo de roupa" />
            </div>
            <div>
              <label className="field-label">Unidade</label>
              <select className="field-select" value={unit} onChange={(e) => setUnit(e.target.value as "PEÇA" | "CONJUNTO")}>
                <option value="PEÇA">Peça</option>
                <option value="CONJUNTO">Conjunto</option>
              </select>
            </div>
            <button className="btn-success w-full btn-lg" onClick={handleAdd} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        )}

        <div className="space-y-2">
          {types.map((t) => (
            <div key={t.id} className={`list-item ${!t.active ? "opacity-50" : ""}`}>
              <div>
                <div className="text-sm font-bold text-foreground">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.unit}</div>
              </div>
              <button
                className={`text-xs font-bold px-3 py-1 rounded-full ${t.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}
                onClick={() => toggleActive(t)}
              >
                {t.active ? "Ativo" : "Inativo"}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <button className="btn-ghost text-sm" onClick={() => navigate("/admin")}>← Voltar</button>
        </div>
      </div>
    </div>
  );
};

export default TiposRoupa;
