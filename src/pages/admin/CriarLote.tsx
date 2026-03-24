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
    supabase
      .from("clients")
      .select("id, name, type")
      .order("name")
      .then(({ data }) => setClients(data || []));
  }, []);

  const handleCreate = async () => {
    if (!selectedClient) {
      setError("Selecione um cliente.");
      return;
    }
    setLoading(true);
    setError("");

    const { data, error: err } = await supabase
      .from("lots")
      .insert({
        client_id: selectedClient,
        created_by: user?.id || null,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (err) {
      setError("Erro ao criar lote. Tente novamente.");
      setLoading(false);
      return;
    }

    navigate(`/admin/lote/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-background p-2 pb-8">
      <div className="paper-sheet p-4 mb-4">
        <div className="text-center mb-4 border-b border-foreground pb-3">
          <h1 className="text-lg font-bold tracking-wide">AMANÁ</h1>
          <p className="text-xs text-muted-foreground">CRIAR NOVO LOTE</p>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <span className="font-bold block mb-1">Cliente:</span>
            <select
              className="w-full border border-border p-2 bg-card font-mono text-sm"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">Selecione...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === "hospital" ? "Hospital" : "Clínica"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="font-bold block mb-1">Data:</span>
            <div className="paper-field">
              <input
                type="text"
                readOnly
                value={new Date().toLocaleDateString("pt-BR")}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Data automática</p>
          </div>

          <div>
            <span className="font-bold block mb-1">Observações:</span>
            <div className="paper-field w-full">
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Opcional..."
              />
            </div>
          </div>

          {error && <p className="text-destructive text-xs text-center">{error}</p>}

          <div className="flex gap-3 mt-6 justify-center">
            <button className="btn-paper text-xs" onClick={() => navigate("/admin")}>
              ← VOLTAR
            </button>
            <button
              className="btn-paper btn-paper-primary"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? "CRIANDO..." : "CRIAR LOTE"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CriarLote;
