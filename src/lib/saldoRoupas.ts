import { supabase } from "@/integrations/supabase/client";

const norm = (s: string | null | undefined) =>
  (s || "").trim().toLowerCase().replace(/\s+/g, " ");

interface ItemEnviado {
  descricao_livre: string | null;
  quantidade_original: number | null;
  tipos_roupa: { nome: string } | null;
}
interface ItemSaida {
  descricao_livre: string | null;
  quantidade: number | null;
  tipos_roupa: { nome: string } | null;
}

const descOf = (i: { descricao_livre: string | null; tipos_roupa: { nome: string } | null }) =>
  (i.tipos_roupa?.nome || i.descricao_livre || "").trim();

/**
 * Atualiza saldo_roupas + registra historico_saldo quando um pedido é entregue.
 * Idempotência: verifica se já existe histórico automático para o pedido antes de aplicar.
 */
export async function atualizarSaldo(pedidoId: string): Promise<void> {
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id, cliente_id")
    .eq("id", pedidoId)
    .maybeSingle();
  if (!pedido?.cliente_id) return;
  const clienteId = pedido.cliente_id;

  // Idempotência
  const { data: jaProcessado } = await supabase
    .from("historico_saldo" as any)
    .select("id")
    .eq("pedido_id", pedidoId)
    .eq("tipo", "automatico")
    .limit(1);
  if (jaProcessado && jaProcessado.length > 0) return;

  const [{ data: enviados }, { data: saidas }] = await Promise.all([
    supabase
      .from("itens_pedido")
      .select("descricao_livre, quantidade_original, tipos_roupa(nome)")
      .eq("pedido_id", pedidoId),
    supabase
      .from("itens_saida")
      .select("descricao_livre, quantidade, tipos_roupa(nome)")
      .eq("pedido_id", pedidoId),
  ]);

  const agrupado: Record<string, { descricao: string; enviado: number; devolvido: number }> = {};
  for (const i of (enviados as unknown as ItemEnviado[]) || []) {
    const desc = descOf(i as any);
    if (!desc) continue;
    const key = norm(desc);
    if (!agrupado[key]) agrupado[key] = { descricao: desc, enviado: 0, devolvido: 0 };
    agrupado[key].enviado += Number(i.quantidade_original || 0);
  }
  for (const i of (saidas as unknown as ItemSaida[]) || []) {
    const desc = descOf(i as any);
    if (!desc) continue;
    const key = norm(desc);
    if (!agrupado[key]) agrupado[key] = { descricao: desc, enviado: 0, devolvido: 0 };
    agrupado[key].devolvido += Number(i.quantidade || 0);
  }

  for (const key of Object.keys(agrupado)) {
    const { descricao, enviado, devolvido } = agrupado[key];
    if (enviado === 0 && devolvido === 0) continue;

    // Buscar linha existente comparando descrição normalizada
    const { data: existentes } = await supabase
      .from("saldo_roupas" as any)
      .select("id, descricao, total_enviado, total_devolvido, saldo")
      .eq("cliente_id", clienteId);

    const linha: any = ((existentes as any[]) || []).find((r: any) => norm(r.descricao) === key);

    let saldoAnterior = 0;
    let saldoNovo = 0;
    if (!linha) {
      saldoAnterior = 0;
      saldoNovo = enviado - devolvido;
      const obs = saldoNovo < 0 ? "Devolvido maior que enviado — verificar contagem" : null;
      await supabase.from("saldo_roupas" as any).insert({
        cliente_id: clienteId,
        descricao,
        total_enviado: enviado,
        total_devolvido: devolvido,
        ultima_atualizacao: new Date().toISOString(),
        obs_admin: obs,
      });
    } else {
      saldoAnterior = Number(linha.saldo || 0);
      const novoEnv = Number(linha.total_enviado || 0) + enviado;
      const novoDev = Number(linha.total_devolvido || 0) + devolvido;
      saldoNovo = novoEnv - novoDev;
      const obs = saldoNovo < 0 ? "Devolvido maior que enviado — verificar contagem" : null;
      await supabase
        .from("saldo_roupas" as any)
        .update({
          total_enviado: novoEnv,
          total_devolvido: novoDev,
          ultima_atualizacao: new Date().toISOString(),
          ...(obs ? { obs_admin: obs } : {}),
        })
        .eq("id", linha.id);
    }

    await supabase.from("historico_saldo" as any).insert({
      cliente_id: clienteId,
      pedido_id: pedidoId,
      descricao,
      quantidade_enviada: enviado,
      quantidade_devolvida: devolvido,
      saldo_anterior: saldoAnterior,
      saldo_novo: saldoNovo,
      tipo: "automatico",
    });
  }
}