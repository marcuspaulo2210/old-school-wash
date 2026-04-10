import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

interface ImpersonationData {
  usuario_id: string;
  usuario_nome: string;
  usuario_perfil: string;
  usuario_cliente_id: string | null;
}

const ImpersonationBar = () => {
  const [data, setData] = useState<ImpersonationData | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("amana_impersonating");
    if (stored) {
      try { setData(JSON.parse(stored)); } catch { /* ignore */ }
    }

    const handler = () => {
      const s = localStorage.getItem("amana_impersonating");
      setData(s ? JSON.parse(s) : null);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  if (!data) return null;

  const handleBack = () => {
    localStorage.removeItem("amana_impersonating");
    setData(null);
    navigate("/admin/usuarios");
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-4 px-4 py-2 text-sm font-semibold"
      style={{ background: "hsl(var(--warning))", color: "#000" }}
    >
      <span>Você está visualizando como <strong>{data.usuario_nome}</strong> ({data.usuario_perfil})</span>
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold text-white"
        style={{ background: "hsl(var(--destructive))" }}
      >
        <X className="w-3.5 h-3.5" /> Voltar para Admin
      </button>
    </div>
  );
};

export default ImpersonationBar;
