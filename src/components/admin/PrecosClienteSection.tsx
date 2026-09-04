import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Props {
  clienteId: string;
  tarifaMinimaInicial: number | null;
  valorPorKgInicial?: number | null;
}

interface TipoRow {
  id: string;
  nome: string;
}

const db = supabase as any;

const PrecosClienteSection = ({ clienteId, tarifaMinimaInicial, valorPorKgInicial }: Props) => {
  const [tipos, setTipos] = useState<TipoRow[]>([]);
  const [precos, setPrecos] = useState<Record<string, string>>({});
  const [tarifaMinima, setTarifaMinima] = useState(
    tarifaMinimaInicial != null ? String(tarifaMinimaInicial) : ""
  );
  const [valorPorKg, setValorPorKg] = useState(
    valorPorKgInicial != null ? String(valorPorKgInicial).replace(".", ",") : ""
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [{ data: tps }, { data: prs }, { data: cli }] = await Promise.all([
        db.from("tipos_roupa").select("id, nome").eq("ativo", true).order("nome"),
        db.from("precos_cliente").select("tipo_roupa_id, preco_unitario").eq("cliente_id", clienteId),
        db.from("clientes").select("valor_por_kg, tarifa_minima").eq("id", clienteId).maybeSingle(),
      ]);
      if (!alive) return;
      setTipos((tps as TipoRow[]) || []);
      const map: Record<string, string> = {};
      for (const p of (prs as any[]) || []) {
        const n = Number(p.preco_unitario);
        if (!Number.isFinite(n) || n <= 0) continue;
        map[p.tipo_roupa_id] = String(n).replace(".", ",");
      }
      setPrecos(map);
      if (cli) {
        const vk = (cli as any).valor_por_kg;
        const tm = (cli as any).tarifa_minima;
        setValorPorKg(vk != null ? String(Number(vk)).replace(".", ",") : "");
        setTarifaMinima(tm != null ? String(Number(tm)).replace(".", ",") : "");
      }
      setLoading(false);

    })();
    return () => {
      alive = false;
    };
  }, [clienteId]);

  const parse = (v: string) => {
    const n = Number(String(v).replace(",", ".").trim());
    return Number.isFinite(n) ? n : NaN;
  };

  const salvar = async () => {
    setSaving(true);
    try {
      const upserts: any[] = [];
      const deletes: string[] = [];
      for (const t of tipos) {
        const raw = (precos[t.id] ?? "").trim();
        if (!raw) {
          deletes.push(t.id);
          continue;
        }
        const n = parse(raw);
        if (Number.isNaN(n) || n < 0) {
          toast.error(`Preço inválido em "${t.nome}"`);
          setSaving(false);
          return;
        }
        if (n === 0) {
          deletes.push(t.id);
          continue;
        }
        upserts.push({ cliente_id: clienteId, tipo_roupa_id: t.id, preco_unitario: n });
      }

      if (upserts.length) {
        const { error } = await db
          .from("precos_cliente")
          .upsert(upserts, { onConflict: "cliente_id,tipo_roupa_id" });
        if (error) throw error;
      }
      if (deletes.length) {
        const { error } = await db
          .from("precos_cliente")
          .delete()
          .eq("cliente_id", clienteId)
          .in("tipo_roupa_id", deletes);
        if (error) throw error;
      }

      const tm = tarifaMinima.trim() ? parse(tarifaMinima) : null;
      if (tm !== null && (Number.isNaN(tm) || tm < 0)) {
        toast.error("Tarifa mínima inválida");
        setSaving(false);
        return;
      }
      const vk = valorPorKg.trim() ? parse(valorPorKg) : null;
      if (vk !== null && (Number.isNaN(vk) || vk < 0)) {
        toast.error("Valor por kg inválido");
        setSaving(false);
        return;
      }
      const { error: errCli } = await db
        .from("clientes")
        .update({ tarifa_minima: tm, valor_por_kg: vk })
        .eq("id", clienteId);
      if (errCli) throw errCli;

      toast.success("Tabela de preços salva!");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar tabela de preços");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando tipos de roupa...</p>
      ) : tipos.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum tipo de roupa ativo cadastrado.</p>
      ) : (
        <div className="max-h-[240px] overflow-y-auto rounded-lg border border-[rgba(255,255,255,0.07)] divide-y divide-[rgba(255,255,255,0.05)]">
          {tipos.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-2">
              <span className="text-sm text-foreground flex-1 truncate">{t.nome}</span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-muted-foreground">R$</span>
                <input
                  className="field-input font-mono w-24 text-right"
                  inputMode="decimal"
                  placeholder="—"
                  value={precos[t.id] ?? ""}
                  onChange={(e) => setPrecos((p) => ({ ...p, [t.id]: e.target.value }))}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="field-label">Valor por kg lavado (R$)</label>
        <input
          className="field-input font-mono"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="Ex: 12,00"
          value={valorPorKg}
          onChange={(e) => setValorPorKg(e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Para clientes cobrados por peso. Deixe em branco se a cobrança for por peça.
        </p>
      </div>

      <div>
        <label className="field-label">Tarifa mínima mensal (R$)</label>
        <input
          className="field-input font-mono"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="Opcional"
          value={tarifaMinima}
          onChange={(e) => setTarifaMinima(e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          Se o total do mês ficar abaixo deste valor, será cobrada a tarifa mínima.
        </p>
      </div>

      <button className="btn-primary w-full" onClick={salvar} disabled={saving}>
        <DollarSign className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar tabela de preços"}
      </button>
    </div>
  );
};

export default PrecosClienteSection;
