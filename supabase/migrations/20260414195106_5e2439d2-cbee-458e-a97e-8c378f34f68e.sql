
-- Add new columns to pedidos
ALTER TABLE public.pedidos 
  ADD COLUMN IF NOT EXISTS peso_informado_cliente numeric NULL,
  ADD COLUMN IF NOT EXISTS peso_recebido_producao numeric NULL,
  ADD COLUMN IF NOT EXISTS tipo_registro_producao text NULL,
  ADD COLUMN IF NOT EXISTS status_entrada text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS rascunho boolean NOT NULL DEFAULT false;

-- Add origem column to itens_pedido
ALTER TABLE public.itens_pedido 
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'cliente';

-- Allow clients to update their own draft orders
CREATE POLICY "Cliente edita rascunho"
ON public.pedidos
FOR UPDATE
TO authenticated
USING (cliente_id = meu_cliente_id() AND rascunho = true)
WITH CHECK (cliente_id = meu_cliente_id());
