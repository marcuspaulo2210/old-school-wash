import { useState } from "react";
import { useNavigate } from "react-router-dom";

const mesas = ["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Mesa 5", "Mesa 6"];

const SelectMesa = () => {
  const navigate = useNavigate();
  const [selectedMesa] = useState(() => localStorage.getItem("amana_mesa") || "");

  const handleSelect = (mesa: string) => {
    localStorage.setItem("amana_mesa", mesa);
    navigate("/producao/lotes");
  };

  return (
    <div className="app-container flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-xl font-black text-primary-foreground">A</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">Selecione sua mesa</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">Escolha o posto de trabalho</p>
        </div>

        {/* Mesa grid */}
        <div className="grid grid-cols-2 gap-3">
          {mesas.map((mesa) => (
            <button
              key={mesa}
              onClick={() => handleSelect(mesa)}
              className={`app-card text-center py-8 transition-all active:scale-[0.97] ${
                selectedMesa === mesa
                  ? "border-primary bg-accent shadow-md"
                  : "hover:shadow-md hover:border-primary/30"
              }`}
            >
              <div className="text-3xl mb-2">🪑</div>
              <div className="text-base font-bold text-foreground">{mesa}</div>
            </button>
          ))}
        </div>

        {/* Back */}
        <div className="mt-6 text-center">
          <button className="btn-ghost text-sm" onClick={() => navigate("/")}>
            ← Voltar ao login
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectMesa;
