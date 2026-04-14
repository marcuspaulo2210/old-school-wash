import { supabase } from "@/integrations/supabase/client";

type StatusPedido = "aguardando_coleta" | "coletado" | "em_producao" | "embalado" | "entregue" | "divergencia" | "pronto_para_entrega" | "saiu_para_entrega";

export async function registrarMudancaStatus(
  pedidoId: string,
  statusAnterior: StatusPedido | null,
  statusNovo: StatusPedido,
  userId: string,
  observacao?: string | null
) {
  await supabase.from("historico_status").insert({
    pedido_id: pedidoId,
    status_anterior: statusAnterior,
    status_novo: statusNovo,
    alterado_por: userId,
    observacao: observacao || null,
  } as any);
}
