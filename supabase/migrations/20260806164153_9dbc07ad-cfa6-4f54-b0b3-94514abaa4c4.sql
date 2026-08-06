-- 1) Revoke blanket PUBLIC execute on all public functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
  END LOOP;
END $$;

-- 2) Re-grant only what the app needs
-- Pre-login (anon) functions used by the login screen
GRANT EXECUTE ON FUNCTION public.buscar_cliente_por_nome(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_funcionario_login(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_tentativa_login(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resetar_tentativas_login(text) TO anon, authenticated;

-- Functions used inside RLS policies / app RPCs (signed-in only)
GRANT EXECUTE ON FUNCTION public.tem_perfil(uuid, perfil_usuario) TO authenticated;
GRANT EXECUTE ON FUNCTION public.meu_cliente_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.meu_motorista_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.motorista_pode_ver_cliente(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cliente_tem_pedidos(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.nome_motorista(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.motorista_fallback_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_perfil_usuario(text, text, perfil_usuario) TO authenticated;

-- service_role keeps full access for edge functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 3) Restrict motorista visibility on usuarios
DROP POLICY IF EXISTS "Ver motoristas relacionados" ON public.usuarios;
CREATE POLICY "Ver motoristas relacionados"
ON public.usuarios
FOR SELECT
TO authenticated
USING (
  perfil = 'motorista'
  AND ativo = true
  AND (
    id = auth.uid()
    OR id = public.meu_motorista_id()
    OR public.tem_perfil(auth.uid(), 'producao')
  )
);

-- 4) Make admin-only write access on clientes explicit
DROP POLICY IF EXISTS "Somente admin exclui clientes" ON public.clientes;
CREATE POLICY "Somente admin exclui clientes"
ON public.clientes
FOR DELETE
TO authenticated
USING (public.tem_perfil(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Somente admin edita clientes" ON public.clientes;
CREATE POLICY "Somente admin edita clientes"
ON public.clientes
FOR UPDATE
TO authenticated
USING (public.tem_perfil(auth.uid(), 'admin'))
WITH CHECK (public.tem_perfil(auth.uid(), 'admin'));