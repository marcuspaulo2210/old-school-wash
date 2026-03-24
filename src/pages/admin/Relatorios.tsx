import { useNavigate } from "react-router-dom";

const Relatorios = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-2 pb-8">
      <div className="paper-sheet p-4 mb-4">
        <div className="text-center mb-4 border-b border-foreground pb-3">
          <h1 className="text-lg font-bold tracking-wide">AMANÁ</h1>
          <p className="text-xs text-muted-foreground">RELATÓRIOS</p>
        </div>

        <div className="space-y-3">
          <button className="btn-paper w-full py-3 text-xs" onClick={() => navigate("/admin/relatorios/cliente")}>
            📊 RELATÓRIO POR CLIENTE
          </button>
          <button className="btn-paper w-full py-3 text-xs" onClick={() => navigate("/admin/relatorios/periodo")}>
            📅 RELATÓRIO POR PERÍODO
          </button>
          <button className="btn-paper w-full py-3 text-xs" onClick={() => navigate("/admin/relatorios/roupa")}>
            👕 RELATÓRIO POR TIPO DE ROUPA
          </button>
          <button className="btn-paper w-full py-3 text-xs" onClick={() => navigate("/admin/relatorios/mesa")}>
            🪑 RELATÓRIO POR MESA
          </button>
        </div>

        <p className="text-center text-muted-foreground text-[10px] mt-4">
          Os relatórios com exportação em PDF e Excel serão implementados em breve.
        </p>

        <div className="mt-6 text-center">
          <button className="btn-paper text-xs" onClick={() => navigate("/admin")}>← VOLTAR</button>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
