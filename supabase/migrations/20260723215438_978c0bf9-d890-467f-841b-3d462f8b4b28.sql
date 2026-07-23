DROP POLICY IF EXISTS "producao_pode_finalizar_pedido" ON public.pedidos;
CREATE POLICY "producao_pode_finalizar_pedido" ON public.pedidos
FOR UPDATE
USING (public.tem_perfil(auth.uid(), 'producao'::perfil_usuario) OR public.tem_perfil(auth.uid(), 'admin'::perfil_usuario))
WITH CHECK (public.tem_perfil(auth.uid(), 'producao'::perfil_usuario) OR public.tem_perfil(auth.uid(), 'admin'::perfil_usuario));