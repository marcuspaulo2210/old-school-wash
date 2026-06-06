DROP POLICY IF EXISTS "motorista_ver_entregas_rota" ON public.pedidos;
CREATE POLICY "motorista_ver_entregas_rota" ON public.pedidos
FOR SELECT TO authenticated
USING (
  public.tem_perfil(auth.uid(), 'motorista'::perfil_usuario)
  AND EXISTS (
    SELECT 1 FROM public.rotas_clientes rc
    JOIN public.rotas r ON r.id = rc.rota_id
    WHERE rc.cliente_id = pedidos.cliente_id
      AND r.motorista_id = auth.uid()
      AND r.ativo = true
  )
);