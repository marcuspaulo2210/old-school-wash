DROP POLICY "Motorista atualiza para coletado" ON public.pedidos;

CREATE POLICY "Motorista atualiza para coletado"
ON public.pedidos
FOR UPDATE
TO authenticated
USING (
  motorista_id = auth.uid()
  AND status = 'aguardando_coleta'::status_pedido
)
WITH CHECK (
  motorista_id = auth.uid()
  AND status = 'coletado'::status_pedido
);