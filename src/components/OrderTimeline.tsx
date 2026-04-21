import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStatusConfig } from "@/components/StatusBadge";

interface HistoricoItem {
  id: string;
  status_novo: string;
  status_anterior: string | null;
  observacao: string | null;
  criado_em: string;
}

interface OrderTimelineProps {
  pedidoId: string;
}

const OrderTimeline = ({ pedidoId }: OrderTimelineProps) => {
  const [items, setItems] = useState<HistoricoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("historico_status")
      .select("id, status_novo, status_anterior, observacao, criado_em")
      .eq("pedido_id", pedidoId)
      .order("criado_em", { ascending: true })
      .then(({ data }) => {
        setItems((data as unknown as HistoricoItem[]) || []);
        setLoading(false);
      });
  }, [pedidoId]);

  if (loading) return <p className="text-xs text-muted-foreground">Carregando histórico...</p>;
  if (items.length === 0) return <p className="text-xs text-muted-foreground">Sem registros ainda.</p>;

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const cfg = getStatusConfig(item.status_novo);
        return (
          <div key={item.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full mt-1" style={{ background: cfg.color }} />
              {idx < items.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold" style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {new Date(item.criado_em).toLocaleString("pt-BR")}
                </span>
              </div>
              {item.observacao && (
                <div
                  className="mt-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium"
                  style={{ background: "rgba(240,160,32,0.12)", color: "#f0a020" }}
                >
                  {item.observacao}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrderTimeline;
