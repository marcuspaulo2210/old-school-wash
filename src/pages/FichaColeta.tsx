import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { laundryItems, ItemQuantities } from "@/data/laundryItems";
import { Collection } from "@/types/collection";
import { useLaundryStore } from "@/store/laundryStore";

const FichaColeta = () => {
  const navigate = useNavigate();
  const addCollection = useLaundryStore((s) => s.addCollection);

  const [cliente, setCliente] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [motorista, setMotorista] = useState("");
  const [quantities, setQuantities] = useState<ItemQuantities>({});
  const [pesoTotal, setPesoTotal] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const totalPecas = useMemo(
    () => Object.values(quantities).reduce((sum, v) => sum + (v || 0), 0),
    [quantities]
  );

  const handleQtyChange = (id: string, value: string) => {
    const num = parseInt(value) || 0;
    setQuantities((prev) => ({ ...prev, [id]: num }));
  };

  const handleSave = (finalize = false) => {
    const collection: Collection = {
      id: crypto.randomUUID(),
      cliente,
      responsavel,
      data,
      motorista,
      quantities,
      pesoTotal,
      observacoes,
      status: finalize ? "entrega" : "coleta",
      createdAt: new Date().toISOString(),
    };
    addCollection(collection);
    if (finalize) {
      navigate(`/entrega/${collection.id}`);
    } else {
      navigate("/historico");
    }
  };

  return (
    <div className="min-h-screen bg-background p-2 pb-8">
      <div className="paper-sheet p-4 mb-4">
        {/* Header */}
        <div className="text-center mb-4 border-b border-foreground pb-3">
          <h1 className="text-lg font-bold tracking-wide">AMANÁ</h1>
          <p className="text-xs text-muted-foreground">LAVANDERIA HOSPITALAR</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            ESPECIALIZADA EM CLÍNICAS MÉDICAS E HOSPITAIS
          </p>
        </div>

        {/* Fields */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap">Cliente:</span>
            <div className="paper-field flex-1">
              <input value={cliente} onChange={(e) => setCliente(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap">Responsável:</span>
            <div className="paper-field flex-1">
              <input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap">Data:</span>
            <div className="paper-field">
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap">Motorista:</span>
            <div className="paper-field flex-1">
              <input value={motorista} onChange={(e) => setMotorista(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Table */}
        <table className="paper-table">
          <thead>
            <tr>
              <th className="text-left" style={{ width: "60%" }}>Descrição</th>
              <th style={{ width: "20%" }}>Unidade</th>
              <th style={{ width: "20%" }}>Quant.</th>
            </tr>
          </thead>
          <tbody>
            {laundryItems.map((item) => (
              <tr key={item.id}>
                <td className="text-left text-xs">{item.name}</td>
                <td className="text-center text-[10px] text-muted-foreground">{item.unit}</td>
                <td>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    className="paper-input"
                    value={quantities[item.id] || ""}
                    onChange={(e) => handleQtyChange(item.id, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="text-right font-bold text-xs">TOTAL DE PEÇAS</td>
              <td className="text-center font-bold">{totalPecas}</td>
            </tr>
          </tfoot>
        </table>

        {/* Footer fields */}
        <div className="space-y-2 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap">Peso Total (kg):</span>
            <div className="paper-field" style={{ width: "100px" }}>
              <input
                type="number"
                inputMode="decimal"
                value={pesoTotal}
                onChange={(e) => setPesoTotal(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap">Observações:</span>
            <div className="paper-field flex-1">
              <input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-6 justify-center">
          <button className="btn-paper" onClick={() => handleSave(false)}>
            Salvar
          </button>
          <button className="btn-paper btn-paper-primary" onClick={() => handleSave(true)}>
            Finalizar Coleta
          </button>
        </div>
      </div>
    </div>
  );
};

export default FichaColeta;
