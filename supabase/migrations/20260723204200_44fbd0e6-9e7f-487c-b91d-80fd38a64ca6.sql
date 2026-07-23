
CREATE TABLE public.saldo_roupas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  total_enviado int NOT NULL DEFAULT 0,
  total_devolvido int NOT NULL DEFAULT 0,
  saldo int GENERATED ALWAYS AS (total_enviado - total_devolvido) STORED,
  ultima_atualizacao timestamptz NOT NULL DEFAULT now(),
  obs_admin text,
  UNIQUE (cliente_id, descricao)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saldo_roupas TO authenticated;
GRANT ALL ON public.saldo_roupas TO service_role;
ALTER TABLE public.saldo_roupas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia saldo_roupas"
  ON public.saldo_roupas FOR ALL TO authenticated
  USING (public.tem_perfil(auth.uid(), 'admin'))
  WITH CHECK (public.tem_perfil(auth.uid(), 'admin'));

CREATE POLICY "Cliente ve seu saldo"
  ON public.saldo_roupas FOR SELECT TO authenticated
  USING (cliente_id = public.meu_cliente_id());

CREATE TABLE public.historico_saldo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  pedido_id uuid REFERENCES public.pedidos(id) ON DELETE SET NULL,
  descricao text NOT NULL,
  quantidade_enviada int NOT NULL DEFAULT 0,
  quantidade_devolvida int NOT NULL DEFAULT 0,
  saldo_anterior int NOT NULL DEFAULT 0,
  saldo_novo int NOT NULL DEFAULT 0,
  tipo text NOT NULL DEFAULT 'automatico' CHECK (tipo IN ('automatico','manual')),
  editado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  obs text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.historico_saldo TO authenticated;
GRANT ALL ON public.historico_saldo TO service_role;
ALTER TABLE public.historico_saldo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia historico_saldo"
  ON public.historico_saldo FOR ALL TO authenticated
  USING (public.tem_perfil(auth.uid(), 'admin'))
  WITH CHECK (public.tem_perfil(auth.uid(), 'admin'));

CREATE POLICY "Cliente ve seu historico_saldo"
  ON public.historico_saldo FOR SELECT TO authenticated
  USING (cliente_id = public.meu_cliente_id());

CREATE INDEX idx_saldo_roupas_cliente ON public.saldo_roupas(cliente_id);
CREATE INDEX idx_historico_saldo_cliente_desc ON public.historico_saldo(cliente_id, descricao);
