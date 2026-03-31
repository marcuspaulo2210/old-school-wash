import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ClothingType { id: string; name: string; unit: string; sort_order: number; }
interface ProductionEntry { clothing_type_id: string; mesa: string; quantity: number; }
interface PackagingEntry { clothing_type_id: string; quantity_packed: number; }

const LoteStatus = () => {
  const { lotId } = useParams<{ lotId: string }>();
  const navigate = useNavigate();

  const [lotInfo, setLotInfo] = useState<{ lot_number: number; status: string; clientName: string; created_at: string } | null>(null);
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
        setLotInfo({ lot_number: lotRes.data.lot_number, status: lotRes.data.status, clientName: client?.name || "—", created_at: lotRes.data.created_at });
      }
      setClothingTypes(typesRes.data || []);
      setEntries((entriesRes.data as ProductionEntry[]) || []);
      setPackaging((packRes.data as PackagingEntry[]) || []);
    };
    fetchData();
  }, [lotId]);

  const aggregated = useMemo(() => {
    const map: Record<string, { produced: number; packed: number }> = {};
    entries.forEach((e) => {
      if (!map[e.clothing_type_id]) map[e.clothing_type_id] = { produced: 0, packed: 0 };
      map[e.clothing_type_id].produced += e.quantity;
    });
    packaging.forEach((p) => {
      if (!map[p.clothing_type_id]) map[p.clothing_type_id] = { produced: 0, packed: 0 };
      map[p.clothing_type_id].packed += p.quantity_packed;
    });
    return map;
  }, [entries, packaging]);

  const totalProduced = useMemo(() => Object.values(aggregated).reduce((s, v) => s + v.produced, 0), [aggregated]);
  const totalPacked = useMemo(() => Object.values(aggregated).reduce((s, v) => s + v.packed, 0), [aggregated]);
  const progressPercent = totalProduced > 0 ? Math.round((totalPacked / totalProduced) * 100) : 0;

  const handleFinalize = async () => {
    if (totalProduced > 0 && totalPacked < totalProduced) {
      const justification = window.prompt("Há peças pendentes. Informe a justificativa:");
      if (!justification) return;
      await supabase.from("lots").update({ status: "finalizado" as const, finalized_at: new Date().toISOString(), notes: justification }).eq("id", lotId!);
    } else {
      await supabase.from("lots").update({ status: "finalizado" as const, finalized_at: new Date().toISOString() }).eq("id", lotId!);
    }
    navigate("/admin");
  };

  if (!lotInfo) {
    return <div className="app-container flex items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  const statusBadge = (s: string) => {
    switch (s) {
      case "em_producao": return <span className="badge-primary">Em produção</span>;
      case "finalizado": return <span className="badge-warning">Finalizado</span>;
      case "conferido": return <span className="badge-success">Conferido</span>;
      default: return <span className="badge-neutral">{s}</span>;
    }
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="app-header-title">Lote #{lotInfo.lot_number}</h1>
            <p className="app-header-subtitle">{lotInfo.clientName} · {new Date(lotInfo.created_at).toLocaleDateString("pt-BR")}</p>
          </div>
          {statusBadge(lotInfo.status)}
        </div>
      </div>

      <div className="page-content animate-fade-in">
        {/* Progress */}
        <div className="app-card-elevated mb-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-bold text-foreground">Progresso da embalagem</p>
            <span className="text-lg font-extrabold text-primary">{progressPercent}%</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: progressPercent === 100 ? "hsl(var(--success))" : "hsl(var(--primary))",
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Produzido: {totalProduced}</span>
            <span>Embalado: {totalPacked}</span>
          </div>
          {totalProduced > totalPacked && totalProduced > 0 && (
            <div className="mt-3 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold px-4 py-2 text-center">
              ⚠ Faltam {totalProduced - totalPacked} peças
            </div>
          )}
          {totalProduced > 0 && totalPacked >= totalProduced && (
            <div className="mt-3 rounded-xl bg-success/10 text-success text-sm font-semibold px-4 py-2 text-center">
              ✓ Pacote completo
            </div>
          )}
        </div>

        {/* Detail table */}
        <div className="app-card overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th className="text-center">Produzido</th>
                <th className="text-center">Embalado</th>
                <th className="text-center">Faltam</th>
              </tr>
            </thead>
            <tbody>
              {clothingTypes.map((type) => {
                const data = aggregated[type.id];
                if (!data || data.produced === 0) return null;
                const faltam = data.produced - data.packed;
                return (
                  <tr key={type.id}>
                    <td className="text-sm font-medium">{type.name}</td>
                    <td className="text-center font-bold">{data.produced}</td>
                    <td className="text-center">{data.packed}</td>
                    <td className={`text-center font-bold ${faltam > 0 ? "text-destructive" : "text-success"}`}>
                      {faltam > 0 ? faltam : "✓"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="text-right font-bold text-xs uppercase">Total</td>
                <td className="text-center font-bold">{totalProduced}</td>
                <td className="text-center font-bold">{totalPacked}</td>
                <td className="text-center font-bold">{totalProduced - totalPacked}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 flex-wrap">
          <button className="btn-ghost flex-1" onClick={() => navigate("/admin")}>← Voltar</button>
          <button className="btn-secondary flex-1" onClick={() => navigate(`/admin/lote/${lotId}/embalar`)}>
            📦 Embalar
          </button>
          {lotInfo.status === "em_producao" && (
            <button className="btn-success flex-1" onClick={handleFinalize}>
              ✓ Finalizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoteStatus;
