import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: adminCheck } = await callerClient.rpc("tem_perfil", { _user_id: caller.id, _perfil: "admin" });
    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "Acesso restrito a administradores" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const log: string[] = [];

    // 1) Coletar IDs auth a apagar (perfis cliente e motorista, e auth_user_id de clientes)
    const { data: usersDelete } = await admin
      .from("usuarios")
      .select("id")
      .in("perfil", ["cliente", "motorista"]);
    const authIdsUsuarios = (usersDelete || []).map((u: any) => u.id);

    const { data: clientesAuth } = await admin
      .from("clientes")
      .select("auth_user_id")
      .not("auth_user_id", "is", null);
    const authIdsClientes = (clientesAuth || []).map((c: any) => c.auth_user_id).filter(Boolean);

    // 2) Apagar dados operacionais (ordem para respeitar dependências)
    const tables = [
      "notificacoes",
      "historico_status",
      "itens_pedido",
      "pedidos",
      "rotas_clientes",
      "rotas",
      "tipos_roupa",
      "historico_precos",
      "solicitacoes_clientes",
      "solicitacoes_troca_senha",
      "log_impersonacao",
    ];
    for (const t of tables) {
      const { error } = await admin.from(t).delete().not("id", "is", null);
      log.push(`tabela ${t}: ${error ? "ERRO " + error.message : "ok"}`);
    }

    // 3) Apagar registros de clientes (clínicas/hospitais)
    const { error: errClientes } = await admin.from("clientes").delete().not("id", "is", null);
    log.push(`clientes: ${errClientes ? "ERRO " + errClientes.message : "ok"}`);

    // 4) Apagar usuarios cliente/motorista
    const { error: errUsuarios } = await admin
      .from("usuarios")
      .delete()
      .in("perfil", ["cliente", "motorista"]);
    log.push(`usuarios cliente/motorista: ${errUsuarios ? "ERRO " + errUsuarios.message : "ok"}`);

    // 5) Apagar auth users correspondentes
    const allAuthIds = Array.from(new Set([...authIdsUsuarios, ...authIdsClientes]));
    let authDeleted = 0;
    for (const id of allAuthIds) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (!error) authDeleted++;
      else log.push(`auth ${id}: ${error.message}`);
    }
    log.push(`auth users apagados: ${authDeleted}/${allAuthIds.length}`);

    // 6) Renomear admin atual e redefinir senha
    const { data: adminUser } = await admin
      .from("usuarios")
      .select("id, email")
      .eq("perfil", "admin")
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    if (adminUser) {
      const novoEmail = "admin@amana.com";
      const novaSenha = "Amana@2026";
      const { error: updAuth } = await admin.auth.admin.updateUserById(adminUser.id, {
        email: novoEmail,
        password: novaSenha,
        email_confirm: true,
      });
      log.push(`auth admin update: ${updAuth ? "ERRO " + updAuth.message : "ok"}`);

      const { error: updRow } = await admin
        .from("usuarios")
        .update({ email: novoEmail, primeiro_acesso: false, quantidade_trocas_senha: 0 })
        .eq("id", adminUser.id);
      log.push(`tabela usuarios admin: ${updRow ? "ERRO " + updRow.message : "ok"}`);
    } else {
      log.push("admin nao encontrado");
    }

    return new Response(JSON.stringify({ success: true, log }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});