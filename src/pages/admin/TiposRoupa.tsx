import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ClothingType {
  id: string;
  name: string;
  unit: string;
  sort_order: number;
  active: boolean;
}

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
    await supabase.from("clothing_types").insert({
      name: name.trim(),
      unit,
      sort_order: maxOrder + 1,
    });
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
    <div className="min-h-screen bg-background p-2 pb-8">
      <div className="paper-sheet p-4 mb-4">
        <div className="text-center mb-4 border-b border-foreground pb-3">
          <h1 className="text-lg font-bold tracking-wide">AMANÁ</h1>
          <p className="text-xs text-muted-foreground">TIPOS DE ROUPA</p>
        </div>

        <button
          className="btn-paper btn-paper-primary w-full mb-4 text-xs"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "CANCELAR" : "+ NOVO TIPO"}
        </button>

        {showForm && (
          <div className="border border-border p-3 mb-4 space-y-3">
            <div>
              <span className="font-bold text-xs block mb-1">Nome:</span>
              <div className="paper-field w-full">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do tipo de roupa" />
              </div>
            </div>
            <div>
              <span className="font-bold text-xs block mb-1">Unidade:</span>
              <select
                className="w-full border border-border p-2 bg-card font-mono text-sm"
                value={unit}
                onChange={(e) => setUnit(e.target.value as "PEÇA" | "CONJUNTO")}
              >
                <option value="PEÇA">Peça</option>
                <option value="CONJUNTO">Conjunto</option>
              </select>
            </div>
            <button className="btn-paper btn-paper-success w-full" onClick={handleAdd} disabled={saving}>
              {saving ? "SALVANDO..." : "SALVAR"}
            </button>
          </div>
        )}

        <table className="paper-table">
          <thead>
            <tr>
              <th className="text-left">Nome</th>
              <th>Unid.</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {types.map((t) => (
              <tr key={t.id} className={!t.active ? "opacity-50" : ""}>
                <td className="text-left text-xs">{t.name}</td>
                <td className="text-center text-[10px]">{t.unit}</td>
                <td className="text-center">
                  <button
                    className={`text-[10px] font-bold ${t.active ? "text-primary" : "text-muted-foreground"}`}
                    onClick={() => toggleActive(t)}
                  >
                    {t.active ? "ATIVO" : "INATIVO"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 text-center">
          <button className="btn-paper text-xs" onClick={() => navigate("/admin")}>← VOLTAR</button>
        </div>
      </div>
    </div>
  );
};

export default TiposRoupa;
