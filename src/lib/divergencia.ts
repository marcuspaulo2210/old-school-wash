import { supabase } from "@/integrations/supabase/client";
import { registrarMudancaStatus } from "@/lib/statusHistory";

/**
 * Resolve uma divergência liberando o pedido para entrega.
 * Status -> pronto_para_entrega + histórico + notificação ao motorista.
 */
export async function liberarDivergenciaParaEntrega(
  pedidoId: string,
  numeroPedido: string,
  userId: string,
  observacao?: string | null
) {
  const agora = new Date().toISOString();
  const { error } = await supabase
    .from("pedidos")
    .update({
      status: "pronto_para_entrega" as any,
      divergencia_resolvida: true,
      pronto_em: agora,
    } as any)
    .eq("id", pedidoId);

  if (error) return { error };

  await registrarMudancaStatus(
    pedidoId,
    "divergencia",
    "pronto_para_entrega",
    userId,
    observacao ? `Divergência resolvida — liberado para entrega. ${observacao}` : "Divergência resolvida — liberado para entrega"
  );

  await supabase.rpc("notificar_motorista_pedido" as any, {
    _pedido_id: pedidoId,
    _titulo: "Pedido liberado para entrega",
    _mensagem: `O pedido ${numeroPedido} teve a divergência resolvida e está pronto para entrega.`,
    _tipo: "sucesso",
  } as any);

  return { error: null };
}

/**
 * Devolve o pedido com divergência para a produção corrigir a conferência.
 */
export async function devolverDivergenciaParaProducao(
  pedidoId: string,
  userId: string,
  observacao?: string | null
) {
  const { error } = await supabase
    .from("pedidos")
    .update({
      status: "em_producao" as any,
      status_entrada: "salvo",
      embalado_em: null,
    } as any)
    .eq("id", pedidoId);

  if (error) return { error };

  await registrarMudancaStatus(
    pedidoId,
    "divergencia",
    "em_producao",
    userId,
    observacao ? `Devolvido para produção. ${observacao}` : "Devolvido para produção para correção da conferência"
  );

  return { error: null };
}
