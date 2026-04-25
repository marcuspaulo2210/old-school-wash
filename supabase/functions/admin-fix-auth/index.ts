import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const log: string[] = [];
    const ADMIN_ID = "9feabb00-3ddd-4167-8a60-62e41c18d272";
    const NEW_EMAIL = "admin@amana.com";
    const NEW_PASS = "Amana@2026";

    // Apaga qualquer auth.user que NÃO seja o admin nem a Maria Produção
    const KEEP = new Set([ADMIN_ID, "46e17032-cf74-427a-8c6d-49da378c2e81"]);
    let page = 1;
    let deleted = 0;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) { log.push("listUsers err: " + error.message); break; }
      const users = data.users || [];
      for (const u of users) {
        if (!KEEP.has(u.id)) {
          const { error: dErr } = await admin.auth.admin.deleteUser(u.id);
          if (dErr) log.push(`del ${u.email}: ${dErr.message}`); else deleted++;
        }
      }
      if (users.length < 1000) break;
      page++;
    }
    log.push(`auth users apagados: ${deleted}`);

    // Tenta primeiro só atualizar email
    const r1 = await admin.auth.admin.updateUserById(ADMIN_ID, { email: NEW_EMAIL, email_confirm: true });
    log.push("upd email: " + (r1.error ? r1.error.message : "ok"));

    // Depois senha
    const r2 = await admin.auth.admin.updateUserById(ADMIN_ID, { password: NEW_PASS });
    log.push("upd pass: " + (r2.error ? r2.error.message : "ok"));

    // Garante linha em usuarios
    await admin.from("usuarios").update({ email: NEW_EMAIL, primeiro_acesso: false, quantidade_trocas_senha: 0 }).eq("id", ADMIN_ID);
    await admin.from("usuarios").update({ primeiro_acesso: false, quantidade_trocas_senha: 0 }).eq("id", "46e17032-cf74-427a-8c6d-49da378c2e81");

    return new Response(JSON.stringify({ success: true, log }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});