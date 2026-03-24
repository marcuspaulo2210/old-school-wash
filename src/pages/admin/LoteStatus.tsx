import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ClothingType {
  id: string;
  name: string;
  unit: string;
  sort_order: number;
}

interface ProductionEntry {
  clothing_type_id: string;
  mesa: string;
  quantity: number;
}

interface PackagingEntry {
  clothing_type_id: string;
  quantity_packed: number;
}

const LoteStatus = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const navigate = useNavigate();

  const [lotInfo, setLotInfo] = useState<{
    lot_number: number;
    status: string;
    clientName: string;
    created_at: string;
  } | null>(null);
  const [clothingTypes, setClothingTypes] = useState<ClothingType[]>([]);
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [packaging, setPackaging] = useState<PackagingEntry[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [lotRes, typesRes, entriesRes, packRes] = await Promise.all([
        supabase.from("lots").select("lot_number, status, created_at, clients(name)").eq("id", lotId!).single(),
        supabase.from("clothing_types").select("*").eq("active", true).order("sort_order"),
        supabase.from("production_entries").select("clothing_type_id, mesa, quantity").eq("lot_id", lotId!),
        supabase.from("packaging_entries").select("clothing_type_id, quantity_packed").eq("lot_id", lotId!),
      ]);

      if (lotRes.data) {
        const client = lotRes.data.clients as unknown as { name: string } | null;
        setLotInfo({
          lot_number: lotRes.data.lot_number,
          status: lotRes.data.status,
          clientName: client?.name || "—",
          created_at: lotRes.data.created_at,
        });
      }
      setClothingTypes(typesRes.data || []);
      setEntries((entriesRes.data as ProductionEntry[]) || []);
      setPackaging((packRes.data as PackagingEntry[]) || []);
    };
    fetchData();
  }, [lotId]);

  // Aggregate quantities by clothing type
  const aggregated = useMemo(() => {
    const map: Record<string, { produced: number; packed: number; byMesa: Record<string, number> }> = {};
    entries.forEach((e) => {
      if (!map[e.clothing_type_id]) map[e.clothing_type_id] = { produced: 0, packed: 0, byMesa: {} };
      map[e.clothing_type_id].produced += e.quantity;
      map[e.clothing_type_id].byMesa[e.mesa] = (map[e.clothing_type_id].byMesa[e.mesa] || 0) + e.quantity;
    });
    packaging.forEach((p) => {
      if (!map[p.clothing_type_id]) map[p.clothing_type_id] = { produced: 0, packed: 0, byMesa: {} };
      map[p.clothing_type_id].packed += p.quantity_packed;
    });
    return map;
  }, [entries, packaging]);

  const totalProduced = useMemo(() => Object.values(aggregated).reduce((s, v) => s + v.produced, 0), [aggregated]);
  const totalPacked = useMemo(() => Object.values(aggregated).reduce((s, v) => s + v.packed, 0), [aggregated]);
  const progressPercent = totalProduced > 0 ? Math.round((totalPacked / totalProduced) * 100) : 0;

  const handleFinalize = async () => {
    if (totalProduced > 0 && totalPacked < totalProduced) {
      const justification = window.prompt("Há peças pendentes. Informe a justificativa para finalizar:");
      if (!justification) return;
      await supabase.from("lots").update({
        status: "finalizado" as const,
        finalized_at: new Date().toISOString(),
        notes: justification,
      }).eq("id", lotId!);
    } else {
      await supabase.from("lots").update({
        status: "finalizado" as const,
        finalized_at: new Date().toISOString(),
      }).eq("id", lotId!);
    }
    navigate("/admin");
  };

  if (!lotInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-2 pb-8">
      <div className="paper-sheet p-4 mb-4">
        <div className="text-center mb-4 border-b border-foreground pb-3">
          <h1 className="text-lg font-bold tracking-wide">AMANÁ</h1>
          <p className="text-xs text-muted-foreground">STATUS DO LOTE</p>
        </div>

        <div className="space-y-1 mb-4 text-sm">
          <p><span className="font-bold">Cliente:</span> {lotInfo.clientName}</p>
          <p><span className="font-bold">Lote:</span> #{lotInfo.lot_number}</p>
          <p><span className="font-bold">Data:</span> {new Date(lotInfo.created_at).toLocaleDateString("pt-BR")}</p>
        </div>

        {/* Progress bar */}
        <div className="mb-4 border border-border p-3">
          <div className="flex justify-between text-xs font-bold mb-1">
            <span>PROGRESSO DA EMBALAGEM</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-secondary h-4 border border-border">
            <div
              className="h-full transition-all"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: progressPercent === 100
                  ? "hsl(var(--success))"
                  : "hsl(var(--primary))",
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>Produzido: {totalProduced} peças</span>
            <span>Embalado: {totalPacked} peças</span>
          </div>
          {totalProduced > totalPacked && totalProduced > 0 && (
            <p className="text-destructive text-xs font-bold mt-2 text-center">
              ⚠ FALTAM {totalProduced - totalPacked} PEÇAS
            </p>
          )}
          {totalProduced > 0 && totalPacked >= totalProduced && (
            <p className="text-xs font-bold mt-2 text-center" style={{ color: "hsl(var(--success))" }}>
              ✓ PACOTE COMPLETO
            </p>
          )}
        </div>

        {/* Detail table */}
        <table className="paper-table">
          <thead>
            <tr>
              <th className="text-left" style={{ width: "40%" }}>Tipo</th>
              <th style={{ width: "20%" }}>Produzido</th>
              <th style={{ width: "20%" }}>Embalado</th>
              <th style={{ width: "20%" }}>Faltam</th>
            </tr>
          </thead>
          <tbody>
            {clothingTypes.map((type) => {
              const data = aggregated[type.id];
              if (!data || data.produced === 0) return null;
              const faltam = data.produced - data.packed;
              return (
                <tr key={type.id}>
                  <td className="text-left text-xs">{type.name}</td>
                  <td className="text-center text-sm font-bold">{data.produced}</td>
                  <td className="text-center text-sm">{data.packed}</td>
                  <td className={`text-center text-sm font-bold ${faltam > 0 ? "text-destructive" : ""}`}>
                    {faltam}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className="text-right font-bold text-xs">TOTAL</td>
              <td className="text-center font-bold">{totalProduced}</td>
              <td className="text-center font-bold">{totalPacked}</td>
              <td className="text-center font-bold">{totalProduced - totalPacked}</td>
            </tr>
          </tfoot>
        </table>

        <div className="flex gap-3 mt-6 justify-center flex-wrap">
          <button className="btn-paper text-xs" onClick={() => navigate("/admin")}>
            ← VOLTAR
          </button>
          <button
            className="btn-paper text-xs"
            onClick={() => navigate(`/admin/lote/${lotId}/embalar`)}
          >
            EMBALAR
          </button>
          {lotInfo.status === "em_producao" && (
            <button className="btn-paper btn-paper-success" onClick={handleFinalize}>
              FINALIZAR LOTE
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoteStatus;
