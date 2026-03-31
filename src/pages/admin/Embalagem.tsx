import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ClothingType { id: string; name: string; unit: string; sort_order: number; }
interface PackagingEntry { id: string; clothing_type_id: string; quantity_packed: number; }

const Embalagem = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const navigate = useNavigate();

  const [clothingTypes, setClothingTypes] = useState<ClothingType[]>([]);
  const [produced, setProduced] = useState<Record<string, number>>({});
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

      const prodMap: Record<string, number> = {};
      (entriesRes.data || []).forEach((e: { clothing_type_id: string; quantity: number }) => {
        prodMap[e.clothing_type_id] = (prodMap[e.clothing_type_id] || 0) + e.quantity;
      });
      setProduced(prodMap);

      const pEntries = (packRes.data as PackagingEntry[]) || [];
      setPackEntries(pEntries);
      const packMap: Record<string, number> = {};
      pEntries.forEach((p) => { packMap[p.clothing_type_id] = p.quantity_packed; });
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
        if (qty !== existing.quantity_packed) await supabase.from("packaging_entries").update({ quantity_packed: qty }).eq("id", existing.id);
      } else if (qty > 0) {
        await supabase.from("packaging_entries").insert({ lot_id: lotId!, clothing_type_id: type.id, quantity_packed: qty });
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
    <div className="app-container">
      <div className="app-header">
        <div className="max-w-2xl mx-auto">
          <h1 className="app-header-title">Embalagem</h1>
          <p className="app-header-subtitle">Lote #{lotNumber} · Conferência</p>
        </div>
      </div>

      <div className="page-content animate-fade-in">
        {/* Summary */}
        {totalProd !== totalPacked && totalProd > 0 && (
          <div className="rounded-2xl bg-destructive/10 text-destructive text-sm font-semibold px-4 py-3 text-center mb-4">
            ⚠ Divergência: {Math.abs(totalProd - totalPacked)} peças
          </div>
        )}

        {/* Table */}
        <div className="app-card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th className="text-center">Produzido</th>
                <th className="text-center">Embalado</th>
                <th className="text-center">Dif.</th>
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
                    <td className="text-sm font-medium">{type.name}</td>
                    <td className="text-center font-bold">{prod}</td>
                    <td className="text-center">
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        className="qty-input w-16 mx-auto"
                        value={packed[type.id] || ""}
                        onChange={(e) => handleChange(type.id, e.target.value)}
                      />
                    </td>
                    <td className={`text-center font-bold ${diff > 0 ? "text-destructive" : diff < 0 ? "text-primary" : "text-success"}`}>
                      {diff !== 0 ? diff : "✓"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="text-right font-bold text-xs uppercase">Total</td>
                <td className="text-center font-bold">{totalProd}</td>
                <td className="text-center font-bold">{totalPacked}</td>
                <td className="text-center font-bold">{totalProd - totalPacked}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bottom-bar">
        <button className="btn-ghost text-sm" onClick={() => navigate(`/admin/lote/${lotId}`)}>← Voltar</button>
        <button className={`flex-1 ${saved ? "btn-success" : "btn-secondary"}`} onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : saved ? "✓ Salvo!" : "Salvar"}
        </button>
        <button className="btn-success flex-1" onClick={handleConfirm}>
          ✓ Confirmar
        </button>
      </div>
    </div>
  );
};

export default Embalagem;
