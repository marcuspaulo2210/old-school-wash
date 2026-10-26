import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: claims, error: cErr } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
  if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: isAdmin } = await admin.rpc("tem_perfil", { _user_id: claims.claims.sub, _perfil: "admin" });
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  const ADMIN_ID = "9feabb00-3ddd-4167-8a60-62e41c18d272";
  const EMAIL = "amanalavanderia.adm@gmail.com";
  const r = await admin.auth.admin.updateUserById(ADMIN_ID, { email: EMAIL, email_confirm: true });
  if (r.error) return json({ error: r.error.message }, 500);
  const u = await admin.from("usuarios").update({ email: EMAIL, ativo: true }).eq("id", ADMIN_ID);
  if (u.error) return json({ error: u.error.message }, 500);
  return json({ success: true });
});
