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

  const statusLabel = (s: string) => {
    switch (s) {
      case "em_producao": return "EM PRODUÇÃO";
      case "finalizado": return "FINALIZADO";
      case "conferido": return "CONFERIDO";
      default: return s;
    }
  };

  return (
    <div className="min-h-screen bg-background p-2 pb-8">
      <div className="paper-sheet p-4 mb-4">
        <div className="text-center mb-4 border-b border-foreground pb-3">
          <h1 className="text-lg font-bold tracking-wide">AMANÁ</h1>
          <p className="text-xs text-muted-foreground">LOTES EM PRODUÇÃO</p>
          <p className="text-sm font-bold text-primary mt-1">{mesa}</p>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground text-sm py-8">Carregando...</p>
        ) : lots.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            Nenhum lote em produção.<br />
            Peça ao administrador para criar um lote.
          </p>
        ) : (
          <div className="space-y-2">
            {lots.map((lot) => (
              <button
                key={lot.id}
                onClick={() => navigate(`/producao/lote/${lot.id}`)}
                className="btn-paper w-full text-left py-3 px-4 flex justify-between items-center"
              >
                <div>
                  <div className="font-bold text-sm">
                    LOTE #{lot.lot_number}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {lot.clients?.name || "—"}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-primary">
                  {statusLabel(lot.status)}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-6 justify-center">
          <button className="btn-paper text-xs" onClick={() => navigate("/producao")}>
            ← TROCAR MESA
          </button>
        </div>
      </div>
    </div>
  );
};

export default LotesProducao;
