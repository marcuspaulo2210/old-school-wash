CREATE POLICY "cliente_deletar_rascunho" ON public.pedidos
FOR DELETE TO authenticated
USING (cliente_id = public.meu_cliente_id() AND rascunho = true);

CREATE POLICY "cliente_deletar_itens_rascunho" ON public.itens_pedido
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pedidos p
  WHERE p.id = itens_pedido.pedido_id
    AND p.cliente_id = public.meu_cliente_id()
    AND p.rascunho = true
));