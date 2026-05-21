
-- Motorista insere pedido (coleta sem pedido prévio)
CREATE POLICY "Motorista insere pedido coleta"
ON public.pedidos
FOR INSERT
TO authenticated
WITH CHECK (
  public.tem_perfil(auth.uid(), 'motorista'::perfil_usuario)
  AND motorista_id = auth.uid()
  AND status = 'aguardando_coleta'::status_pedido
);
