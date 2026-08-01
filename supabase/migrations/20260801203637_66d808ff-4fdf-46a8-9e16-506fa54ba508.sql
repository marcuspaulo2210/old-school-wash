-- Helper: can the current driver see this client?
CREATE OR REPLACE FUNCTION public.motorista_pode_ver_cliente(_cliente_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = _cliente_id
      AND (
        c.motorista_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.rotas r WHERE r.id = c.rota_id AND r.motorista_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.rotas_clientes rc
          JOIN public.rotas r2 ON r2.id = rc.rota_id
          WHERE rc.cliente_id = c.id AND r2.motorista_id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM public.pedidos p WHERE p.cliente_id = c.id AND p.motorista_id = auth.uid())
      )
  )
$$;

-- Helper: does this client have any orders (production scope)?
CREATE OR REPLACE FUNCTION public.cliente_tem_pedidos(_cliente_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.pedidos p WHERE p.cliente_id = _cliente_id)
$$;

-- Helper: driver linked to the current client user
CREATE OR REPLACE FUNCTION public.meu_motorista_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    c.motorista_id,
    (SELECT r.motorista_id FROM public.rotas r WHERE r.id = c.rota_id)
  )
  FROM public.clientes c
  WHERE c.id = public.meu_cliente_id()
$$;

-- Helper: fallback active driver (returns id only, no PII)
CREATE OR REPLACE FUNCTION public.motorista_fallback_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.usuarios
  WHERE perfil = 'motorista' AND ativo = true
  ORDER BY criado_em
  LIMIT 1
$$;

-- Helper: driver display name only
CREATE OR REPLACE FUNCTION public.nome_motorista(_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT nome FROM public.usuarios
  WHERE id = _id AND perfil = 'motorista' AND ativo = true
$$;

-- Helper: active admin ids (for operational notifications, no PII)
CREATE OR REPLACE FUNCTION public.admin_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.usuarios WHERE perfil = 'admin' AND ativo = true
$$;

-- Scope clientes visibility
DROP POLICY IF EXISTS "Motorista ve clientes" ON public.clientes;
CREATE POLICY "Motorista ve clientes da sua rota" ON public.clientes
FOR SELECT TO authenticated
USING (
  public.tem_perfil(auth.uid(), 'motorista')
  AND public.motorista_pode_ver_cliente(id)
);

DROP POLICY IF EXISTS "Producao ve clientes" ON public.clientes;
CREATE POLICY "Producao ve clientes com pedidos" ON public.clientes
FOR SELECT TO authenticated
USING (
  public.tem_perfil(auth.uid(), 'producao')
  AND public.cliente_tem_pedidos(id)
);

-- Scope driver enumeration
DROP POLICY IF EXISTS "Ver motoristas ativos" ON public.usuarios;
CREATE POLICY "Ver motoristas relacionados" ON public.usuarios
FOR SELECT TO authenticated
USING (
  perfil = 'motorista'
  AND ativo = true
  AND (
    id = public.meu_motorista_id()
    OR public.tem_perfil(auth.uid(), 'producao')
    OR public.tem_perfil(auth.uid(), 'motorista')
  )
);

-- Lock down internal-only functions from the public API
REVOKE ALL ON FUNCTION public.gerar_notificacao_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.gerar_username() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_clientes_atualizado_em() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.criar_perfil_usuario(text, text, perfil_usuario) FROM PUBLIC, anon, authenticated;

-- These are used inside RLS policies by signed-in users only
REVOKE ALL ON FUNCTION public.tem_perfil(uuid, perfil_usuario) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.meu_cliente_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tem_perfil(uuid, perfil_usuario) TO authenticated;
GRANT EXECUTE ON FUNCTION public.meu_cliente_id() TO authenticated;

-- New helpers: signed-in users only
REVOKE ALL ON FUNCTION public.motorista_pode_ver_cliente(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cliente_tem_pedidos(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.meu_motorista_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.motorista_fallback_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.nome_motorista(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.motorista_pode_ver_cliente(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cliente_tem_pedidos(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.meu_motorista_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.motorista_fallback_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.nome_motorista(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_ids() TO authenticated;