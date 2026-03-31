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
        setLotInfo({ lot_number: lotRes.data.lot_number, clientName: client?.name || "—" });
      }

      const existingEntries = entriesRes.data || [];
      setEntries(existingEntries as ProductionEntry[]);

      const qtyMap: Record<string, number> = {};
      existingEntries.forEach((e: ProductionEntry) => { qtyMap[e.clothing_type_id] = e.quantity; });
      setQuantities(qtyMap);
    };
    fetchData();
  }, [lotId, mesa]);

  const handleIncrement = (typeId: string) => {
    setQuantities((prev) => ({ ...prev, [typeId]: (prev[typeId] || 0) + 1 }));
    setSaved(false);
  };

  const handleDecrement = (typeId: string) => {
    setQuantities((prev) => ({ ...prev, [typeId]: Math.max(0, (prev[typeId] || 0) - 1) }));
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
    for (const type of clothingTypes) {
      const qty = quantities[type.id] || 0;
      const existing = entries.find((e) => e.clothing_type_id === type.id);

      if (existing) {
        if (qty !== existing.quantity) {
          await supabase.from("production_entries").update({ quantity: qty }).eq("id", existing.id);
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

    const { data } = await supabase
      .from("production_entries").select("*").eq("lot_id", lotId!).eq("mesa", mesa);
    setEntries((data as ProductionEntry[]) || []);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="app-header">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="app-header-title">Produção</h1>
              <p className="app-header-subtitle">
                {lotInfo ? `Lote #${lotInfo.lot_number} · ${lotInfo.clientName}` : "Carregando..."}
              </p>
            </div>
            <div className="badge-primary">{mesa}</div>
          </div>
        </div>
      </div>

      <div className="page-content animate-fade-in">
        {/* Total card */}
        <div className="app-card bg-primary/5 border-primary/20 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total de peças</p>
            <p className="text-3xl font-extrabold text-primary">{totalPecas}</p>
          </div>
          <div className="text-4xl">📦</div>
        </div>

        {/* Items */}
        <div className="space-y-2">
          {clothingTypes.map((type) => {
            const qty = quantities[type.id] || 0;
            return (
              <div key={type.id} className="app-card flex items-center justify-between gap-3 py-3 px-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{type.name}</p>
                  <p className="text-[11px] text-muted-foreground">{type.unit}</p>
                </div>
                <div className="qty-control">
                  <button className="qty-btn-minus" onClick={() => handleDecrement(type.id)}>−</button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    className="qty-input"
                    value={qty || ""}
                    onChange={(e) => handleManualChange(type.id, e.target.value)}
                  />
                  <button className="qty-btn-plus" onClick={() => handleIncrement(type.id)}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bottom-bar">
        <button className="btn-ghost text-sm flex-1" onClick={() => navigate("/producao/lotes")}>
          ← Voltar
        </button>
        <button
          className={`flex-[2] ${saved ? "btn-success" : "btn-primary"} btn-lg`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Salvando..." : saved ? "✓ Salvo!" : "Confirmar"}
        </button>
      </div>
    </div>
  );
};

export default Producao;
