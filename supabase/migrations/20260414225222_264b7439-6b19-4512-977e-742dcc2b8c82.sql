
CREATE TABLE public.solicitacoes_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id uuid NOT NULL,
  nome text NOT NULL,
  email text,
  telefone text,
  tipo text NOT NULL DEFAULT 'clinica',
  observacoes text,
  status text NOT NULL DEFAULT 'pendente',
  motivo_recusa text,
  resolvido_em timestamp with time zone,
  resolvido_por uuid,
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacoes_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Motorista insere solicitacao"
  ON public.solicitacoes_clientes FOR INSERT
  TO authenticated
  WITH CHECK (motorista_id = auth.uid() AND tem_perfil(auth.uid(), 'motorista'));

CREATE POLICY "Motorista ve proprias solicitacoes"
  ON public.solicitacoes_clientes FOR SELECT
  TO authenticated
  USING (motorista_id = auth.uid());

CREATE POLICY "Admin acesso total solicitacoes_clientes"
  ON public.solicitacoes_clientes FOR ALL
  TO authenticated
  USING (tem_perfil(auth.uid(), 'admin'))
  WITH CHECK (tem_perfil(auth.uid(), 'admin'));

-- Add Producao insert policy for itens_pedido (needed for delivery flow)
CREATE POLICY "Producao insere itens"
  ON public.itens_pedido FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = itens_pedido.pedido_id
        AND pedidos.status = ANY(ARRAY['coletado'::status_pedido, 'em_producao'::status_pedido])
        AND tem_perfil(auth.uid(), 'producao')
    )
  );

-- Add Motorista update policy for delivery statuses
CREATE POLICY "Motorista atualiza para saiu_entrega"
  ON public.pedidos FOR UPDATE
  TO authenticated
  USING (motorista_id = auth.uid() AND status IN ('pronto_para_entrega'::status_pedido, 'saiu_para_entrega'::status_pedido))
  WITH CHECK (motorista_id = auth.uid() AND status IN ('saiu_para_entrega'::status_pedido, 'entregue'::status_pedido));

-- Motorista can see orders assigned to them in delivery statuses too
CREATE POLICY "Motorista ve pedidos entrega"
  ON public.pedidos FOR SELECT
  TO authenticated
  USING (motorista_id = auth.uid() AND status IN ('pronto_para_entrega'::status_pedido, 'saiu_para_entrega'::status_pedido, 'entregue'::status_pedido));
