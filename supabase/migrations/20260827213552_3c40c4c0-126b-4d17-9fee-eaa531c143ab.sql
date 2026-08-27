CREATE TABLE IF NOT EXISTS public.precos_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo_roupa_id uuid NOT NULL REFERENCES public.tipos_roupa(id) ON DELETE CASCADE,
  preco_unitario numeric(10,2) NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cliente_id, tipo_roupa_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.precos_cliente TO authenticated;
GRANT ALL ON public.precos_cliente TO service_role;

ALTER TABLE public.precos_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia precos_cliente" ON public.precos_cliente
  FOR ALL TO authenticated
  USING (public.tem_perfil(auth.uid(), 'admin'))
  WITH CHECK (public.tem_perfil(auth.uid(), 'admin'));

CREATE POLICY "Producao e motorista veem precos" ON public.precos_cliente
  FOR SELECT TO authenticated
  USING (public.tem_perfil(auth.uid(), 'producao') OR public.tem_perfil(auth.uid(), 'motorista'));

CREATE POLICY "Cliente ve seus precos" ON public.precos_cliente
  FOR SELECT TO authenticated
  USING (cliente_id = public.meu_cliente_id());

ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tarifa_minima numeric(10,2);