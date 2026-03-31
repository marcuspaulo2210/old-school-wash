import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Client { id: string; name: string; type: string; observation: string | null; }

const Clientes = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"hospital" | "clinica">("hospital");
  const [observation, setObservation] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("*").order("name");
    setClients(data || []);
  };

  useEffect(() => { fetchClients(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from("clients").insert({ name: name.trim(), type, observation: observation.trim() || null });
    setName(""); setObservation(""); setShowForm(false); setSaving(false);
    fetchClients();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir este cliente?")) return;
    await supabase.from("clients").delete().eq("id", id);
    fetchClients();
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="app-header-title">Clientes</h1>
            <p className="app-header-subtitle">Hospitais e clínicas</p>
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
              <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do hospital/clínica" />
            </div>
            <div>
              <label className="field-label">Tipo</label>
              <select className="field-select" value={type} onChange={(e) => setType(e.target.value as "hospital" | "clinica")}>
                <option value="hospital">Hospital</option>
                <option value="clinica">Clínica</option>
              </select>
            </div>
            <div>
              <label className="field-label">Observação</label>
              <input className="field-input" value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Opcional" />
            </div>
            <button className="btn-success w-full btn-lg" onClick={handleAdd} disabled={saving}>
              {saving ? "Salvando..." : "Salvar cliente"}
            </button>
          </div>
        )}

        {clients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏥</div>
            <p className="empty-state-text">Nenhum cliente cadastrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {clients.map((c) => (
              <div key={c.id} className="list-item">
                <div>
                  <div className="text-sm font-bold text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.type === "hospital" ? "Hospital" : "Clínica"}</div>
                </div>
                <button className="btn-ghost text-destructive text-xs px-3 py-1" onClick={() => handleDelete(c.id)}>
                  Excluir
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center">
          <button className="btn-ghost text-sm" onClick={() => navigate("/admin")}>← Voltar</button>
        </div>
      </div>
    </div>
  );
};

export default Clientes;
