import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Client {
  id: string;
  name: string;
  type: string;
}

const CriarLote = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("clients").select("id, name, type").order("name")
      .then(({ data }) => setClients(data || []));
  }, []);

  const handleCreate = async () => {
    if (!selectedClient) { setError("Selecione um cliente."); return; }
    setLoading(true);
    setError("");

    const { data, error: err } = await supabase
      .from("lots")
      .insert({ client_id: selectedClient, created_by: user?.id || null, notes: notes || null })
      .select("id")
      .single();

    if (err) { setError("Erro ao criar lote. Tente novamente."); setLoading(false); return; }
    navigate(`/admin/lote/${data.id}`);
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="max-w-2xl mx-auto">
          <h1 className="app-header-title">Novo Lote</h1>
          <p className="app-header-subtitle">Criar um novo lote de produção</p>
        </div>
      </div>

      <div className="page-content animate-fade-in">
        <div className="app-card-elevated space-y-5">
          <div>
            <label className="field-label">Cliente</label>
            <select className="field-select" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
              <option value="">Selecione o cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === "hospital" ? "Hospital" : "Clínica"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Data</label>
            <input type="text" readOnly className="field-input bg-muted" value={new Date().toLocaleDateString("pt-BR")} />
            <p className="text-[11px] text-muted-foreground mt-1">Data definida automaticamente</p>
          </div>

          <div>
            <label className="field-label">Observações</label>
            <input
              className="field-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional..."
            />
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 text-destructive text-sm font-medium px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button className="btn-ghost flex-1" onClick={() => navigate("/admin")}>← Voltar</button>
            <button className="btn-primary flex-[2] btn-lg" onClick={handleCreate} disabled={loading}>
              {loading ? "Criando..." : "Criar Lote"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CriarLote;
