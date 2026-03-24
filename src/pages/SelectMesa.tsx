import { useState } from "react";
import { useNavigate } from "react-router-dom";

const mesas = ["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Mesa 5", "Mesa 6"];

const SelectMesa = () => {
  const navigate = useNavigate();
  const [selectedMesa, setSelectedMesa] = useState(() =>
    localStorage.getItem("amana_mesa") || ""
  );

  const handleSelect = (mesa: string) => {
    localStorage.setItem("amana_mesa", mesa);
    setSelectedMesa(mesa);
    navigate("/producao/lotes");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="paper-sheet p-6 w-full max-w-md">
        <div className="text-center mb-6 border-b border-foreground pb-3">
          <h1 className="text-xl font-bold tracking-wide">AMANÁ</h1>
          <p className="text-xs text-muted-foreground">LAVANDERIA HOSPITALAR</p>
          <p className="text-sm font-bold mt-2">SELECIONE SUA MESA</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {mesas.map((mesa) => (
            <button
              key={mesa}
              onClick={() => handleSelect(mesa)}
              className={`btn-paper text-lg py-6 ${
                selectedMesa === mesa ? "btn-paper-primary" : ""
              }`}
            >
              {mesa.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="text-center mt-6 pt-3 border-t border-border">
          <button
            className="btn-paper text-xs"
            onClick={() => navigate("/")}
          >
            ← VOLTAR AO LOGIN
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectMesa;
