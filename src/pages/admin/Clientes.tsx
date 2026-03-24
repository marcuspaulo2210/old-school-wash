import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string;
  name: string;
  type: string;
  observation: string | null;
}

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
    await supabase.from("clients").insert({
      name: name.trim(),
      type,
      observation: observation.trim() || null,
    });
    setName("");
    setObservation("");
    setShowForm(false);
    setSaving(false);
    fetchClients();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir este cliente?")) return;
    await supabase.from("clients").delete().eq("id", id);
    fetchClients();
  };

  return (
    <div className="min-h-screen bg-background p-2 pb-8">
      <div className="paper-sheet p-4 mb-4">
        <div className="text-center mb-4 border-b border-foreground pb-3">
          <h1 className="text-lg font-bold tracking-wide">AMANÁ</h1>
          <p className="text-xs text-muted-foreground">CADASTRO DE CLIENTES</p>
        </div>

        <button
          className="btn-paper btn-paper-primary w-full mb-4 text-xs"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "CANCELAR" : "+ NOVO CLIENTE"}
        </button>

        {showForm && (
          <div className="border border-border p-3 mb-4 space-y-3">
            <div>
              <span className="font-bold text-xs block mb-1">Nome:</span>
              <div className="paper-field w-full">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do hospital/clínica" />
              </div>
            </div>
            <div>
              <span className="font-bold text-xs block mb-1">Tipo:</span>
              <select
                className="w-full border border-border p-2 bg-card font-mono text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as "hospital" | "clinica")}
              >
                <option value="hospital">Hospital</option>
                <option value="clinica">Clínica</option>
              </select>
            </div>
            <div>
              <span className="font-bold text-xs block mb-1">Observação:</span>
              <div className="paper-field w-full">
                <input value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Opcional" />
              </div>
            </div>
            <button className="btn-paper btn-paper-success w-full" onClick={handleAdd} disabled={saving}>
              {saving ? "SALVANDO..." : "SALVAR CLIENTE"}
            </button>
          </div>
        )}

        {clients.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">Nenhum cliente cadastrado.</p>
        ) : (
          <table className="paper-table">
            <thead>
              <tr>
                <th className="text-left">Nome</th>
                <th>Tipo</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td className="text-left text-xs">{c.name}</td>
                  <td className="text-center text-[10px]">{c.type === "hospital" ? "HOSP." : "CLÍN."}</td>
                  <td className="text-center">
                    <button className="text-destructive text-[10px] font-bold" onClick={() => handleDelete(c.id)}>
                      EXCLUIR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-6 text-center">
          <button className="btn-paper text-xs" onClick={() => navigate("/admin")}>← VOLTAR</button>
        </div>
      </div>
    </div>
  );
};

export default Clientes;
