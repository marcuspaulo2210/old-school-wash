import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function slugify(nome: string) {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .replace(/^-+|-+$/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Não autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return jsonResponse({ error: "Não autorizado" }, 401);

    const { data: adminCheck } = await callerClient.rpc("tem_perfil", {
      _user_id: caller.id,
      _perfil: "admin",
    });
    if (!adminCheck) return jsonResponse({ error: "Acesso restrito a administradores" }, 403);

    const body = await req.json().catch(() => ({}));
    const {
      id, // optional: if provided, update existing cliente (and create auth if missing)
      nome,
      tipo,
      senha,
      endereco,
      telefone,
      email,
      responsavel,
      tipo_cobranca,
      preco_peca,
      preco_kg,
      dias_coleta,
      observacoes,
      ativo,
      rota_id,
    } = body || {};

    if (!nome || !String(nome).trim()) return jsonResponse({ error: "Nome é obrigatório" }, 400);
    if (!tipo) return jsonResponse({ error: "Tipo é obrigatório" }, 400);
    if (!id && (!senha || String(senha).length < 6)) {
      return jsonResponse({ error: "Senha de pelo menos 6 caracteres é obrigatória" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const nomeTrim = String(nome).trim();

    // Check duplicate (case-insensitive) when creating
    if (!id) {
      const { data: existing } = await admin
        .from("clientes")
        .select("id")
        .ilike("nome", nomeTrim)
        .maybeSingle();
      if (existing) return jsonResponse({ error: "Já existe um cliente com este nome." }, 409);
    }

    const payload: Record<string, unknown> = {
      nome: nomeTrim,
      tipo,
      endereco: endereco || null,
      telefone: telefone || null,
      email: email && String(email).trim() ? String(email).trim() : null,
      responsavel: responsavel || null,
      tipo_cobranca: tipo_cobranca || "peca",
      preco_peca: preco_peca != null && preco_peca !== "" ? Number(preco_peca) : 0,
      preco_kg: preco_kg != null && preco_kg !== "" ? Number(preco_kg) : 0,
      dias_coleta: Array.isArray(dias_coleta) ? dias_coleta : [],
      observacoes: observacoes || null,
      ativo: ativo !== false,
      rota_id: rota_id || null,
    };

    if (id) {
      const { error: updErr } = await admin.from("clientes").update(payload).eq("id", id);
      if (updErr) return jsonResponse({ error: updErr.message }, 500);
      return jsonResponse({ success: true, id });
    }

    // Create auth user (synthetic email so admin session is preserved)
    const slug = slugify(nomeTrim) || `cliente${Date.now()}`;
    const authEmail = `${slug}@amana.internal`;

    const { data: created, error: authErr } = await admin.auth.admin.createUser({
      email: authEmail,
      password: String(senha),
      email_confirm: true,
      user_metadata: { nome: nomeTrim, role: "cliente" },
    });
    if (authErr || !created.user) {
      return jsonResponse({ error: authErr?.message || "Erro ao criar conta de autenticação" }, 500);
    }

    const insertPayload = {
      ...payload,
      auth_user_id: created.user.id,
      primeiro_acesso: false,
      tentativas_login: 0,
      bloqueado_ate: null,
    };

    const { data: inserted, error: insErr } = await admin
      .from("clientes")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insErr) {
      // Rollback auth user
      await admin.auth.admin.deleteUser(created.user.id);
      return jsonResponse({ error: insErr.message }, 500);
    }

    return jsonResponse({ success: true, id: inserted.id, auth_email: authEmail });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno";
    return jsonResponse({ error: msg }, 500);
  }
});