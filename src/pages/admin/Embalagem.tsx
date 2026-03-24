import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ClothingType {
  id: string;
  name: string;
  unit: string;
  sort_order: number;
}

interface AggregatedProd {
  [clothingTypeId: string]: number;
}

interface PackagingEntry {
  id: string;
  clothing_type_id: string;
  quantity_packed: number;
}

const Embalagem = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const navigate = useNavigate();

  const [clothingTypes, setClothingTypes] = useState<ClothingType[]>([]);
  const [produced, setProduced] = useState<AggregatedProd>({});
  const [packEntries, setPackEntries] = useState<PackagingEntry[]>([]);
  const [packed, setPacked] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lotNumber, setLotNumber] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const [typesRes, entriesRes, packRes, lotRes] = await Promise.all([
        supabase.from("clothing_types").select("*").eq("active", true).order("sort_order"),
        supabase.from("production_entries").select("clothing_type_id, quantity").eq("lot_id", lotId!),
        supabase.from("packaging_entries").select("*").eq("lot_id", lotId!),
        supabase.from("lots").select("lot_number").eq("id", lotId!).single(),
      ]);

      setClothingTypes(typesRes.data || []);
      setLotNumber(lotRes.data?.lot_number || 0);

      // Aggregate production
      const prodMap: AggregatedProd = {};
      (entriesRes.data || []).forEach((e: { clothing_type_id: string; quantity: number }) => {
        prodMap[e.clothing_type_id] = (prodMap[e.clothing_type_id] || 0) + e.quantity;
      });
      setProduced(prodMap);

      // Packaging entries
      const pEntries = (packRes.data as PackagingEntry[]) || [];
      setPackEntries(pEntries);
      const packMap: Record<string, number> = {};
      pEntries.forEach((p) => {
        packMap[p.clothing_type_id] = p.quantity_packed;
      });
      setPacked(packMap);
    };
    fetchData();
  }, [lotId]);

  const handleChange = (typeId: string, value: string) => {
    const num = parseInt(value) || 0;
    setPacked((prev) => ({ ...prev, [typeId]: Math.max(0, num) }));
    setSaved(false);
  };

  const totalProd = useMemo(() => Object.values(produced).reduce((s, v) => s + v, 0), [produced]);
  const totalPacked = useMemo(() => Object.values(packed).reduce((s, v) => s + v, 0), [packed]);

  const handleSave = async () => {
    setSaving(true);
    for (const type of clothingTypes) {
      const qty = packed[type.id] || 0;
      const existing = packEntries.find((e) => e.clothing_type_id === type.id);

      if (existing) {
        if (qty !== existing.quantity_packed) {
          await supabase.from("packaging_entries").update({ quantity_packed: qty }).eq("id", existing.id);
        }
      } else if (qty > 0) {
        await supabase.from("packaging_entries").insert({
          lot_id: lotId!,
          clothing_type_id: type.id,
          quantity_packed: qty,
        });
      }
    }

    const { data } = await supabase.from("packaging_entries").select("*").eq("lot_id", lotId!);
    setPackEntries((data as PackagingEntry[]) || []);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleConfirm = async () => {
    await handleSave();
    await supabase.from("lots").update({ status: "conferido" as const }).eq("id", lotId!);
    navigate(`/admin/lote/${lotId}`);
  };

  return (
    <div className="min-h-screen bg-background p-2 pb-8">
      <div className="paper-sheet p-4 mb-4">
        <div className="text-center mb-4 border-b border-foreground pb-3">
          <h1 className="text-lg font-bold tracking-wide">AMANÁ</h1>
          <p className="text-xs text-muted-foreground">CONFERÊNCIA / EMBALAGEM</p>
          <p className="text-sm font-bold mt-1">LOTE #{lotNumber}</p>
        </div>

        <table className="paper-table">
          <thead>
            <tr>
              <th className="text-left" style={{ width: "40%" }}>Tipo</th>
              <th style={{ width: "20%" }}>Produzido</th>
              <th style={{ width: "20%" }}>Embalado</th>
              <th style={{ width: "20%" }}>Dif.</th>
            </tr>
          </thead>
          <tbody>
            {clothingTypes.map((type) => {
              const prod = produced[type.id] || 0;
              if (prod === 0) return null;
              const pack = packed[type.id] || 0;
              const diff = prod - pack;
              return (
                <tr key={type.id}>
                  <td className="text-left text-xs">{type.name}</td>
                  <td className="text-center text-sm font-bold">{prod}</td>
                  <td>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      className="paper-input"
                      value={packed[type.id] || ""}
                      onChange={(e) => handleChange(type.id, e.target.value)}
                    />
                  </td>
                  <td className={`text-center text-sm font-bold ${diff > 0 ? "text-destructive" : diff < 0 ? "text-primary" : ""}`}>
                    {diff !== 0 ? diff : "✓"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="text-right font-bold text-xs">TOTAL</td>
              <td className="text-center font-bold">{totalProd}</td>
              <td className="text-center font-bold">{totalPacked}</td>
              <td className="text-center font-bold">{totalProd - totalPacked}</td>
            </tr>
          </tfoot>
        </table>

        {totalProd !== totalPacked && totalProd > 0 && (
          <p className="text-destructive text-xs font-bold mt-3 text-center border border-destructive p-2">
            ⚠ DIVERGÊNCIA: {Math.abs(totalProd - totalPacked)} peças
          </p>
        )}

        <div className="flex gap-3 mt-6 justify-center flex-wrap">
          <button className="btn-paper text-xs" onClick={() => navigate(`/admin/lote/${lotId}`)}>
            ← VOLTAR
          </button>
          <button
            className={`btn-paper ${saved ? "btn-paper-success" : ""}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "SALVANDO..." : saved ? "✓ SALVO" : "SALVAR"}
          </button>
          <button className="btn-paper btn-paper-success" onClick={handleConfirm}>
            CONFIRMAR EMBALAGEM
          </button>
        </div>
      </div>
    </div>
  );
};

export default Embalagem;
