
-- Allow motoristas to SELECT any pedido in delivery-ready statuses
DROP POLICY IF EXISTS "Motorista ve pedidos prontos entrega" ON public.pedidos;
CREATE POLICY "Motorista ve pedidos prontos entrega"
ON public.pedidos
FOR SELECT
TO authenticated
USING (
  tem_perfil(auth.uid(), 'motorista'::perfil_usuario)
  AND status IN ('pronto_para_entrega'::status_pedido, 'saiu_para_entrega'::status_pedido)
);

-- Allow motoristas to update pronto_para_entrega -> saiu_para_entrega even if motorista_id is null,
-- claiming the order in the process.
DROP POLICY IF EXISTS "Motorista atualiza para saiu_entrega" ON public.pedidos;
CREATE POLICY "Motorista atualiza para saiu_entrega"
ON public.pedidos
FOR UPDATE
TO authenticated
USING (
  tem_perfil(auth.uid(), 'motorista'::perfil_usuario)
  AND status IN ('pronto_para_entrega'::status_pedido, 'saiu_para_entrega'::status_pedido)
  AND (motorista_id = auth.uid() OR motorista_id IS NULL)
)
WITH CHECK (
  motorista_id = auth.uid()
  AND status IN ('saiu_para_entrega'::status_pedido, 'entregue'::status_pedido)
);
