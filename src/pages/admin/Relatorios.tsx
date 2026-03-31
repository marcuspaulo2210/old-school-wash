import { useNavigate } from "react-router-dom";

const Relatorios = () => {
  const navigate = useNavigate();

  const reports = [
    { icon: "📊", label: "Por Cliente", desc: "Produção agrupada por cliente", route: "/admin/relatorios/cliente" },
    { icon: "📅", label: "Por Período", desc: "Filtre por intervalo de datas", route: "/admin/relatorios/periodo" },
    { icon: "👕", label: "Por Tipo de Roupa", desc: "Totais por categoria de item", route: "/admin/relatorios/roupa" },
    { icon: "🪑", label: "Por Mesa", desc: "Produtividade por mesa", route: "/admin/relatorios/mesa" },
  ];

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="max-w-2xl mx-auto">
          <h1 className="app-header-title">Relatórios</h1>
          <p className="app-header-subtitle">Análises e exportações</p>
        </div>
      </div>

      <div className="page-content animate-fade-in">
        <div className="space-y-3">
          {reports.map((r) => (
            <button key={r.route} className="list-item w-full text-left" onClick={() => navigate(r.route)}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{r.icon}</span>
                <div>
                  <div className="text-sm font-bold text-foreground">{r.label}</div>
                  <div className="text-xs text-muted-foreground">{r.desc}</div>
                </div>
              </div>
              <span className="text-muted-foreground">→</span>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Exportação em PDF e Excel em breve.
        </p>

        <div className="mt-4 text-center">
          <button className="btn-ghost text-sm" onClick={() => navigate("/admin")}>← Voltar</button>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
