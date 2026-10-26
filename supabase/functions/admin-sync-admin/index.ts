import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async () => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const ADMIN_ID = "9feabb00-3ddd-4167-8a60-62e41c18d272";
  const EMAIL = "amanalavanderia.adm@gmail.com";
  const r = await admin.auth.admin.updateUserById(ADMIN_ID, { email: EMAIL, email_confirm: true, password: "Amana@2026" });
  const u = await admin.from("usuarios").update({ email: EMAIL, ativo: true, primeiro_acesso: false }).eq("id", ADMIN_ID).select("email, username");
  return new Response(JSON.stringify({ auth: r.error?.message ?? "ok", usuarios: u.error?.message ?? u.data }), { headers: { "Content-Type": "application/json" } });
});
