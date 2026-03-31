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

  const statusBadge = (s: string) => {
    switch (s) {
      case "em_producao": return <span className="badge-primary">Em produção</span>;
      case "finalizado": return <span className="badge-warning">Finalizado</span>;
      case "conferido": return <span className="badge-success">Conferido</span>;
      default: return <span className="badge-neutral">{s}</span>;
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="app-header">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-sm font-black text-primary-foreground">A</span>
            </div>
            <div>
              <h1 className="app-header-title">Amaná</h1>
              <p className="app-header-subtitle">Painel administrativo</p>
            </div>
          </div>
          <button className="btn-ghost text-xs px-3 py-2" onClick={signOut}>
            Sair
          </button>
        </div>
      </div>

      <div className="page-content animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="stat-card bg-accent border border-primary/20 rounded-2xl">
            <div className="stat-value text-primary">{stats.emProducao}</div>
            <div className="stat-label text-muted-foreground">Em produção</div>
          </div>
          <div className="stat-card bg-warning/10 border border-warning/20 rounded-2xl">
            <div className="stat-value text-warning">{stats.finalizado}</div>
            <div className="stat-label text-muted-foreground">Finalizados</div>
          </div>
          <div className="stat-card bg-success/10 border border-success/20 rounded-2xl">
            <div className="stat-value text-success">{stats.conferido}</div>
            <div className="stat-label text-muted-foreground">Conferidos</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button className="btn-primary btn-lg w-full" onClick={() => navigate("/admin/lote/novo")}>
            + Novo Lote
          </button>
          <button className="btn-secondary btn-lg w-full" onClick={() => navigate("/admin/clientes")}>
            🏥 Clientes
          </button>
          <button className="btn-secondary btn-lg w-full" onClick={() => navigate("/admin/roupas")}>
            👕 Tipos de Roupa
          </button>
          <button className="btn-secondary btn-lg w-full" onClick={() => navigate("/admin/relatorios")}>
            📊 Relatórios
          </button>
        </div>

        {/* Recent lots */}
        <div className="app-card-elevated">
          <h2 className="text-base font-bold text-foreground mb-4">Lotes recentes</h2>

          {lots.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-state-icon">📋</div>
              <p className="empty-state-text">Nenhum lote criado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lots.map((lot) => (
                <button
                  key={lot.id}
                  className="list-item w-full text-left"
                  onClick={() => navigate(`/admin/lote/${lot.id}`)}
                >
                  <div>
                    <div className="text-sm font-bold text-foreground">Lote #{lot.lot_number}</div>
                    <div className="text-xs text-muted-foreground">{lot.clients?.name || "—"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(lot.status)}
                    <span className="text-muted-foreground">→</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
