import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shirt } from "lucide-react";

interface Row {
  id: string;
  descricao: string;
  saldo: number;
}

const ClienteSaldoRoupas = ({ clienteId }: { clienteId: string }) => {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("saldo_roupas" as any)
        .select("id, descricao, saldo")
        .eq("cliente_id", clienteId)
        .neq("saldo", 0)
        .order("descricao");
      if (mounted) setRows(((data as unknown) as Row[]) || []);
    })();
    return () => { mounted = false; };
  }, [clienteId]);

  if (rows.length === 0) return null;

  return (
    <div
      className="mb-5 rounded-xl border p-3"
      style={{ background: "rgba(240,160,32,0.06)", borderColor: "rgba(240,160,32,0.25)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Shirt className="w-3.5 h-3.5" style={{ color: "#f0a020" }} />
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "#f0a020" }}>
          Roupas na lavanderia
        </span>
      </div>
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.id} className="text-[11px]" style={{ color: "#f0a020" }}>
            {r.saldo > 0
              ? `${r.saldo} ${r.descricao} ainda na lavanderia`
              : `${Math.abs(r.saldo)} ${r.descricao} — a verificar (devolvido a mais)`}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ClienteSaldoRoupas;