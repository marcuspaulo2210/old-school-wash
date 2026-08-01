CREATE POLICY "Motorista insere itens dos seus pedidos"
ON public.itens_pedido FOR INSERT TO authenticated
WITH CHECK (
  public.tem_perfil(auth.uid(), 'motorista') AND EXISTS (
    SELECT 1 FROM public.pedidos p
    WHERE p.id = itens_pedido.pedido_id AND p.motorista_id = auth.uid()
  )
);

CREATE POLICY "Motorista notifica admins"
ON public.notificacoes FOR INSERT TO authenticated
WITH CHECK (
  public.tem_perfil(auth.uid(), 'motorista')
  AND public.tem_perfil(user_id, 'admin')
);