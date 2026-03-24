import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { laundryItems, ItemQuantities } from "@/data/laundryItems";
import { useLaundryStore } from "@/store/laundryStore";

const FichaEntrega = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const collection = useLaundryStore((s) => s.getCollection(id || ""));
  const updateCollection = useLaundryStore((s) => s.updateCollection);

  const [delivered, setDelivered] = useState<ItemQuantities>(
    collection?.delivered || {}
  );

  if (!collection) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Coleta não encontrada.</p>
      </div>
    );
  }

  const handleDeliveredChange = (itemId: string, value: string) => {
    const num = parseInt(value) || 0;
    setDelivered((prev) => ({ ...prev, [itemId]: num }));
  };

  const totalColetado = Object.values(collection.quantities).reduce(
    (s: number, v: unknown) => s + (Number(v) || 0),
    0
  );
  const totalEntregue = Object.values(delivered).reduce(
    (s: number, v: unknown) => s + (Number(v) || 0),
    0
  );

  const handleSave = () => {
    updateCollection(collection.id, { delivered });
    navigate("/historico");
  };

  const handleFinalize = () => {
    updateCollection(collection.id, { delivered, status: "finalizado" });
    navigate("/historico");
  };

  return (
    <div className="min-h-screen bg-background p-2 pb-8">
      <div className="paper-sheet p-4 mb-4">
        <div className="text-center mb-4 border-b border-foreground pb-3">
          <h1 className="text-lg font-bold tracking-wide">AMANÁ</h1>
          <p className="text-xs text-muted-foreground">CONTROLE DE ENTREGA</p>
        </div>

        <div className="space-y-1 mb-4 text-sm">
          <p><span className="font-bold">Cliente:</span> {collection.cliente}</p>
          <p><span className="font-bold">Data:</span> {collection.data}</p>
          <p><span className="font-bold">Motorista:</span> {collection.motorista}</p>
        </div>

        <table className="paper-table">
          <thead>
            <tr>
              <th className="text-left" style={{ width: "40%" }}>Descrição</th>
              <th style={{ width: "18%" }}>Coletado</th>
              <th style={{ width: "22%" }}>Entregue</th>
              <th style={{ width: "20%" }}>Faltam</th>
            </tr>
          </thead>
          <tbody>
            {laundryItems.map((item) => {
              const coletado = collection.quantities[item.id] || 0;
              if (coletado === 0) return null;
              const entregue = delivered[item.id] || 0;
              const faltam = coletado - entregue;
              return (
                <tr key={item.id}>
                  <td className="text-left text-xs">{item.name}</td>
                  <td className="text-center text-sm font-bold">{coletado}</td>
                  <td>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max={coletado}
                      className="paper-input"
                      value={delivered[item.id] || ""}
                      onChange={(e) =>
                        handleDeliveredChange(item.id, e.target.value)
                      }
                    />
                  </td>
                  <td
                    className={`text-center text-sm font-bold ${
                      faltam > 0 ? "text-destructive" : ""
                    }`}
                  >
                    {faltam}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="text-right font-bold text-xs">TOTAL</td>
              <td className="text-center font-bold">{totalColetado}</td>
              <td className="text-center font-bold">{totalEntregue}</td>
              <td className="text-center font-bold">{totalColetado - totalEntregue}</td>
            </tr>
          </tfoot>
        </table>

        <div className="flex gap-3 mt-6 justify-center">
          <button className="btn-paper" onClick={handleSave}>
            Salvar
          </button>
          <button className="btn-paper btn-paper-success" onClick={handleFinalize}>
            Finalizar Entrega
          </button>
        </div>
      </div>
    </div>
  );
};

export default FichaEntrega;
