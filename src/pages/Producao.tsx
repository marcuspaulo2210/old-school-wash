import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ClothingType {
  id: string;
  name: string;
  unit: string;
  sort_order: number;
}

interface ProductionEntry {
  id: string;
  clothing_type_id: string;
  mesa: string;
  quantity: number;
}

const Producao = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const navigate = useNavigate();
  const mesa = localStorage.getItem("amana_mesa") || "Mesa ?";

  const [clothingTypes, setClothingTypes] = useState<ClothingType[]>([]);
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [lotInfo, setLotInfo] = useState<{ lot_number: number; clientName: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [typesRes, lotRes, entriesRes] = await Promise.all([
        supabase.from("clothing_types").select("*").eq("active", true).order("sort_order"),
        supabase.from("lots").select("lot_number, clients(name)").eq("id", lotId!).single(),
        supabase.from("production_entries").select("*").eq("lot_id", lotId!).eq("mesa", mesa),
      ]);

      setClothingTypes(typesRes.data || []);
      if (lotRes.data) {
        const client = lotRes.data.clients as unknown as { name: string } | null;
        setLotInfo({
          lot_number: lotRes.data.lot_number,
          clientName: client?.name || "—",
        });
      }

      const existingEntries = entriesRes.data || [];
      setEntries(existingEntries as ProductionEntry[]);

      const qtyMap: Record<string, number> = {};
      existingEntries.forEach((e: ProductionEntry) => {
        qtyMap[e.clothing_type_id] = e.quantity;
      });
      setQuantities(qtyMap);
    };
    fetchData();
  }, [lotId, mesa]);

  const handleIncrement = (typeId: string) => {
    setQuantities((prev) => ({ ...prev, [typeId]: (prev[typeId] || 0) + 1 }));
    setSaved(false);
  };

  const handleDecrement = (typeId: string) => {
    setQuantities((prev) => ({
      ...prev,
      [typeId]: Math.max(0, (prev[typeId] || 0) - 1),
    }));
    setSaved(false);
  };

  const handleManualChange = (typeId: string, value: string) => {
    const num = parseInt(value) || 0;
    setQuantities((prev) => ({ ...prev, [typeId]: Math.max(0, num) }));
    setSaved(false);
  };

  const totalPecas = useMemo(
    () => Object.values(quantities).reduce((s, v) => s + v, 0),
    [quantities]
  );

  const handleSave = async () => {
    setSaving(true);
    // Upsert: for each clothing type with quantity > 0, create or update entry
    for (const type of clothingTypes) {
      const qty = quantities[type.id] || 0;
      const existing = entries.find((e) => e.clothing_type_id === type.id);

      if (existing) {
        if (qty !== existing.quantity) {
          await supabase
            .from("production_entries")
            .update({ quantity: qty })
            .eq("id", existing.id);
        }
      } else if (qty > 0) {
        await supabase.from("production_entries").insert({
          lot_id: lotId!,
          clothing_type_id: type.id,
          mesa,
          quantity: qty,
        });
      }
    }

    // Refresh entries
    const { data } = await supabase
      .from("production_entries")
      .select("*")
      .eq("lot_id", lotId!)
      .eq("mesa", mesa);
    setEntries((data as ProductionEntry[]) || []);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background p-2 pb-8">
      <div className="paper-sheet p-4 mb-4">
        {/* Header */}
        <div className="text-center mb-4 border-b border-foreground pb-3">
          <h1 className="text-lg font-bold tracking-wide">AMANÁ</h1>
          <p className="text-xs text-muted-foreground">CONTROLE DE PRODUÇÃO</p>
        </div>

        {/* Lot info */}
        {lotInfo && (
          <div className="space-y-1 mb-4 text-sm border-b border-border pb-3">
            <p><span className="font-bold">Cliente:</span> {lotInfo.clientName}</p>
            <p><span className="font-bold">Lote:</span> #{lotInfo.lot_number}</p>
            <p><span className="font-bold">Mesa:</span> <span className="text-primary font-bold">{mesa}</span></p>
          </div>
        )}

        {/* Table */}
        <table className="paper-table">
          <thead>
            <tr>
              <th className="text-left" style={{ width: "45%" }}>Tipo de Roupa</th>
              <th style={{ width: "15%" }}>Unid.</th>
              <th style={{ width: "40%" }}>Quantidade</th>
            </tr>
          </thead>
          <tbody>
            {clothingTypes.map((type) => {
              const qty = quantities[type.id] || 0;
              return (
                <tr key={type.id}>
                  <td className="text-left text-xs">{type.name}</td>
                  <td className="text-center text-[10px] text-muted-foreground">{type.unit}</td>
                  <td>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        className="btn-qty"
                        onClick={() => handleDecrement(type.id)}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        className="paper-input"
                        style={{ width: "50px" }}
                        value={qty || ""}
                        onChange={(e) => handleManualChange(type.id, e.target.value)}
                      />
                      <button
                        className="btn-qty btn-qty-plus"
                        onClick={() => handleIncrement(type.id)}
                      >
                        +
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="text-right font-bold text-xs">TOTAL DE PEÇAS</td>
              <td className="text-center font-bold text-lg">{totalPecas}</td>
            </tr>
          </tfoot>
        </table>

        {/* Buttons */}
        <div className="flex gap-3 mt-6 justify-center flex-wrap">
          <button className="btn-paper text-xs" onClick={() => navigate("/producao/lotes")}>
            ← VOLTAR
          </button>
          <button
            className={`btn-paper ${saved ? "btn-paper-success" : "btn-paper-primary"}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "SALVANDO..." : saved ? "✓ SALVO" : "CONFIRMAR ITEM"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Producao;
