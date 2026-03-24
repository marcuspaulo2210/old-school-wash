import { useNavigate } from "react-router-dom";
import { useLaundryStore } from "@/store/laundryStore";

const Historico = () => {
  const collections = useLaundryStore((s) => s.collections);
  const navigate = useNavigate();

  const sorted = [...collections].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const statusLabel = (s: string) => {
    switch (s) {
      case "coleta": return "COLETA";
      case "entrega": return "AGUARD. ENTREGA";
      case "finalizado": return "FINALIZADO";
      default: return s;
    }
  };

  return (
    <div className="min-h-screen bg-background p-2 pb-8">
      <div className="paper-sheet p-4 mb-4">
        <div className="text-center mb-4 border-b border-foreground pb-3">
          <h1 className="text-lg font-bold tracking-wide">AMANÁ</h1>
          <p className="text-xs text-muted-foreground">HISTÓRICO DE FICHAS</p>
        </div>

        <button
          className="btn-paper btn-paper-primary w-full mb-4"
          onClick={() => navigate("/")}
        >
          + Nova Coleta
        </button>

        {sorted.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">
            Nenhuma ficha registrada.
          </p>
        ) : (
          <table className="paper-table">
            <thead>
              <tr>
                <th className="text-left">Cliente</th>
                <th>Data</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const total = Object.values(c.quantities).reduce(
                  (s, v) => s + (v || 0),
                  0
                );
                return (
                  <tr
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => {
                      if (c.status === "entrega") {
                        navigate(`/entrega/${c.id}`);
                      }
                    }}
                  >
                    <td className="text-left text-xs">
                      <div className="font-bold">{c.cliente || "—"}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {total} peças
                      </div>
                    </td>
                    <td className="text-center text-xs">{c.data}</td>
                    <td className="text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 ${
                          c.status === "finalizado"
                            ? "text-accent-foreground bg-accent"
                            : c.status === "entrega"
                            ? "text-primary bg-accent"
                            : "text-muted-foreground"
                        }`}
                      >
                        {statusLabel(c.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Historico;
