import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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

    const { data: adminCheck } = await callerClient.rpc("tem_perfil", { _user_id: caller.id, _perfil: "admin" });
    if (!adminCheck) {
      return new Response(JSON.stringify({ error: "Acesso restrito a administradores" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const password: string = body.password || "Teste@2026";

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Pegar clientes sem auth_user_id
    const { data: clientes, error: fetchError } = await adminClient
      .from("clientes")
      .select("id, nome, email")
      .is("auth_user_id", null)
      .eq("ativo", true);

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: any[] = [];

    for (const c of clientes || []) {
      const slug = c.nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.|\.$/g, "");
      const email = c.email && c.email.length > 0 ? c.email : `${slug}@clientes.amana.local`;

      // Criar auth user
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { cliente_id: c.id, nome: c.nome },
      });

      if (createError || !created.user) {
        results.push({ cliente: c.nome, ok: false, error: createError?.message });
        continue;
      }

      // Vincular auth_user_id e email ao cliente
      const { error: updateError } = await adminClient
        .from("clientes")
        .update({ auth_user_id: created.user.id, email, primeiro_acesso: false })
        .eq("id", c.id);

      if (updateError) {
        results.push({ cliente: c.nome, ok: false, error: updateError.message });
      } else {
        results.push({ cliente: c.nome, ok: true, email });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});