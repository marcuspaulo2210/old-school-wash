import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface LotWithClient {
  id: string;
  lot_number: number;
  status: string;
  created_at: string;
  clients: { name: string } | null;
}

const LotesProducao = () => {
  const navigate = useNavigate();
  const mesa = localStorage.getItem("amana_mesa") || "Mesa ?";
  const [lots, setLots] = useState<LotWithClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLots = async () => {
      const { data } = await supabase
        .from("lots")
        .select("id, lot_number, status, created_at, clients(name)")
        .eq("status", "em_producao")
        .order("created_at", { ascending: false });
      setLots((data as unknown as LotWithClient[]) || []);
      setLoading(false);
    };
    fetchLots();
  }, []);

  return (
    <div className="app-container">
      {/* Header */}
      <div className="app-header">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="app-header-title">Lotes em Produção</h1>
            <p className="app-header-subtitle">{mesa}</p>
          </div>
          <div className="badge-primary">{mesa}</div>
        </div>
      </div>

      <div className="page-content animate-fade-in">
        {loading ? (
          <div className="empty-state">
            <div className="empty-state-icon">⏳</div>
            <p className="empty-state-text">Carregando...</p>
          </div>
        ) : lots.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p className="empty-state-text">Nenhum lote em produção</p>
            <p className="text-xs text-muted-foreground mt-1">Peça ao administrador para criar um lote.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lots.map((lot) => (
              <button
                key={lot.id}
                onClick={() => navigate(`/producao/lote/${lot.id}`)}
                className="list-item w-full text-left"
              >
                <div>
                  <div className="text-base font-bold text-foreground">
                    Lote #{lot.lot_number}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {lot.clients?.name || "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-primary">Em produção</span>
                  <span className="text-muted-foreground">→</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <button className="btn-ghost text-sm" onClick={() => navigate("/producao")}>
            ← Trocar mesa
          </button>
        </div>
      </div>
    </div>
  );
};

export default LotesProducao;
