-- Rotas
ALTER TABLE public.rotas
  ADD COLUMN IF NOT EXISTS periodo text CHECK (periodo IN ('manha','tarde','livre')),
  ADD COLUMN IF NOT EXISTS horario_corte time;

-- Clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS rota_id uuid REFERENCES public.rotas(id);

-- Pedidos
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS data_coleta_prevista date,
  ADD COLUMN IF NOT EXISTS peso_motorista_kg numeric,
  ADD COLUMN IF NOT EXISTS peso_motorista_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS peso_motorista_obs text;

-- lancamentos_peso
CREATE TABLE IF NOT EXISTS public.lancamentos_peso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  motorista_id uuid NOT NULL,
  peso_kg numeric NOT NULL,
  observacao text,
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lancamentos_peso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin acesso total lancamentos_peso"
  ON public.lancamentos_peso FOR ALL TO authenticated
  USING (tem_perfil(auth.uid(), 'admin'::perfil_usuario))
  WITH CHECK (tem_perfil(auth.uid(), 'admin'::perfil_usuario));

CREATE POLICY "Motorista insere proprio lancamento"
  ON public.lancamentos_peso FOR INSERT TO authenticated
  WITH CHECK (motorista_id = auth.uid() AND tem_perfil(auth.uid(), 'motorista'::perfil_usuario));

CREATE POLICY "Motorista ve proprios lancamentos"
  ON public.lancamentos_peso FOR SELECT TO authenticated
  USING (motorista_id = auth.uid());

CREATE POLICY "Producao ve lancamentos"
  ON public.lancamentos_peso FOR SELECT TO authenticated
  USING (tem_perfil(auth.uid(), 'producao'::perfil_usuario));

-- itens_saida
CREATE TABLE IF NOT EXISTS public.itens_saida (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  tipo_roupa_id uuid REFERENCES public.tipos_roupa(id),
  descricao_livre text,
  quantidade integer NOT NULL DEFAULT 0,
  observacao text,
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  criado_por uuid
);

ALTER TABLE public.itens_saida ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin acesso total itens_saida"
  ON public.itens_saida FOR ALL TO authenticated
  USING (tem_perfil(auth.uid(), 'admin'::perfil_usuario))
  WITH CHECK (tem_perfil(auth.uid(), 'admin'::perfil_usuario));

CREATE POLICY "Producao gerencia itens_saida"
  ON public.itens_saida FOR ALL TO authenticated
  USING (tem_perfil(auth.uid(), 'producao'::perfil_usuario))
  WITH CHECK (tem_perfil(auth.uid(), 'producao'::perfil_usuario));

CREATE POLICY "Cliente ve itens_saida proprios"
  ON public.itens_saida FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = itens_saida.pedido_id
      AND pedidos.cliente_id = meu_cliente_id()
  ));

CREATE POLICY "Motorista ve itens_saida entrega"
  ON public.itens_saida FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = itens_saida.pedido_id
      AND pedidos.status IN ('pronto_para_entrega'::status_pedido, 'saiu_para_entrega'::status_pedido, 'entregue'::status_pedido)
      AND tem_perfil(auth.uid(), 'motorista'::perfil_usuario)
  ));