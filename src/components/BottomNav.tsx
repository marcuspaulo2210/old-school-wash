import { useNavigate, useLocation } from "react-router-dom";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="fixed bottom-0 left-0 right-0 border-t bg-card flex justify-around py-2 text-xs font-bold"
      style={{ maxWidth: "600px", margin: "0 auto", borderColor: "hsl(var(--border))" }}
    >
      <button
        className={`flex flex-col items-center gap-1 px-4 py-1 ${
          location.pathname === "/" ? "text-primary" : "text-muted-foreground"
        }`}
        onClick={() => navigate("/")}
      >
        <span className="text-lg">📋</span>
        <span>Nova Coleta</span>
      </button>
      <button
        className={`flex flex-col items-center gap-1 px-4 py-1 ${
          location.pathname === "/historico" ? "text-primary" : "text-muted-foreground"
        }`}
        onClick={() => navigate("/historico")}
      >
        <span className="text-lg">📁</span>
        <span>Histórico</span>
      </button>
    </div>
  );
};

export default BottomNav;
