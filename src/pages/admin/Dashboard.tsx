import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LotWithClient {
  id: string;
  lot_number: number;
  status: string;
  created_at: string;
  clients: { name: string } | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [lots, setLots] = useState<LotWithClient[]>([]);
  const [stats, setStats] = useState({ total: 0, emProducao: 0, finalizado: 0, conferido: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("lots")
        .select("id, lot_number, status, created_at, clients(name)")
        .order("created_at", { ascending: false })
        .limit(20);

      const lotsList = (data as unknown as LotWithClient[]) || [];
      setLots(lotsList);
      setStats({
        total: lotsList.length,
        emProducao: lotsList.filter((l) => l.status === "em_producao").length,
        finalizado: lotsList.filter((l) => l.status === "finalizado").length,
        conferido: lotsList.filter((l) => l.status === "conferido").length,
      });
    };
    fetchData();
  }, []);

  const statusLabel = (s: string) => {
    switch (s) {
      case "em_producao": return "EM PRODUÇÃO";
      case "finalizado": return "FINALIZADO";
      case "conferido": return "CONFERIDO";
      default: return s;
    }
  };

  const statusClass = (s: string) => {
    switch (s) {
      case "em_producao": return "text-primary";
      case "finalizado": return "text-accent-foreground bg-accent";
      case "conferido": return "text-foreground bg-secondary";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-background p-2 pb-20">
      <div className="paper-sheet p-4 mb-4">
        <div className="text-center mb-4 border-b border-foreground pb-3">
          <h1 className="text-lg font-bold tracking-wide">AMANÁ</h1>
          <p className="text-xs text-muted-foreground">PAINEL ADMINISTRATIVO</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="border border-border p-2 text-center">
            <div className="text-lg font-bold text-primary">{stats.emProducao}</div>
            <div className="text-[10px] text-muted-foreground">EM PRODUÇÃO</div>
          </div>
          <div className="border border-border p-2 text-center">
            <div className="text-lg font-bold text-accent-foreground">{stats.finalizado}</div>
            <div className="text-[10px] text-muted-foreground">FINALIZADOS</div>
          </div>
          <div className="border border-border p-2 text-center">
            <div className="text-lg font-bold">{stats.conferido}</div>
            <div className="text-[10px] text-muted-foreground">CONFERIDOS</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button className="btn-paper btn-paper-primary py-3 text-xs" onClick={() => navigate("/admin/lote/novo")}>
            + NOVO LOTE
          </button>
          <button className="btn-paper py-3 text-xs" onClick={() => navigate("/admin/clientes")}>
            CLIENTES
          </button>
          <button className="btn-paper py-3 text-xs" onClick={() => navigate("/admin/roupas")}>
            TIPOS DE ROUPA
          </button>
          <button className="btn-paper py-3 text-xs" onClick={() => navigate("/admin/relatorios")}>
            RELATÓRIOS
          </button>
        </div>

        {/* Recent lots */}
        <div className="border-t border-foreground pt-3">
          <p className="font-bold text-sm mb-2">LOTES RECENTES</p>
          {lots.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">Nenhum lote criado.</p>
          ) : (
            <table className="paper-table">
              <thead>
                <tr>
                  <th className="text-left">Lote</th>
                  <th className="text-left">Cliente</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => (
                  <tr
                    key={lot.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/lote/${lot.id}`)}
                  >
                    <td className="text-left text-xs font-bold">#{lot.lot_number}</td>
                    <td className="text-left text-xs">{lot.clients?.name || "—"}</td>
                    <td className="text-center">
                      <span className={`text-[10px] font-bold px-2 py-1 ${statusClass(lot.status)}`}>
                        {statusLabel(lot.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 text-center">
          <button className="btn-paper text-xs" onClick={signOut}>
            SAIR
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
