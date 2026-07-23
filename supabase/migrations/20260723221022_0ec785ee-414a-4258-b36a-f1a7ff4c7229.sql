DROP POLICY IF EXISTS "producao_pode_finalizar_pedido" ON public.pedidos;
DROP POLICY IF EXISTS "producao_atualizar_pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "usuarios_podem_atualizar_pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "perfis_podem_atualizar_pedidos" ON public.pedidos;

CREATE POLICY "perfis_podem_atualizar_pedidos" ON public.pedidos
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT id
    FROM public.usuarios
    WHERE perfil IN ('producao', 'admin', 'motorista')
      AND ativo = true
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id
    FROM public.usuarios
    WHERE perfil IN ('producao', 'admin', 'motorista')
      AND ativo = true
  )
);

DROP POLICY IF EXISTS "producao_ver_pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "todos_perfis_ver_pedidos" ON public.pedidos;

CREATE POLICY "todos_perfis_ver_pedidos" ON public.pedidos
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id
    FROM public.usuarios
    WHERE perfil IN ('producao', 'admin', 'motorista', 'cliente')
      AND ativo = true
  )
  OR
  auth.uid() IN (
    SELECT auth_user_id
    FROM public.clientes
    WHERE ativo = true
      AND auth_user_id IS NOT NULL
  )
);