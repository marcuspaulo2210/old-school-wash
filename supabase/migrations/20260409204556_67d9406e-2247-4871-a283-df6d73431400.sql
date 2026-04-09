
-- Novos campos em clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS responsavel text,
  ADD COLUMN IF NOT EXISTS preco_peca numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_kg numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo_cobranca tipo_cobranca NOT NULL DEFAULT 'peca',
  ADD COLUMN IF NOT EXISTS dias_coleta text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS observacoes text;

-- Novos campos em pedidos
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS obs_admin text,
  ADD COLUMN IF NOT EXISTS divergencia_resolvida boolean NOT NULL DEFAULT false;

-- Tabela rotas
CREATE TABLE public.rotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  motorista_id uuid REFERENCES public.usuarios(id),
  dias_semana text[] DEFAULT '{}',
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin acesso total rotas"
  ON public.rotas FOR ALL TO authenticated
  USING (tem_perfil(auth.uid(), 'admin'::perfil_usuario))
  WITH CHECK (tem_perfil(auth.uid(), 'admin'::perfil_usuario));

CREATE POLICY "Motorista ve propria rota"
  ON public.rotas FOR SELECT TO authenticated
  USING (motorista_id = auth.uid());

-- Tabela rotas_clientes
CREATE TABLE public.rotas_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rota_id uuid NOT NULL REFERENCES public.rotas(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  UNIQUE(rota_id, cliente_id)
);

ALTER TABLE public.rotas_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin acesso total rotas_clientes"
  ON public.rotas_clientes FOR ALL TO authenticated
  USING (tem_perfil(auth.uid(), 'admin'::perfil_usuario))
  WITH CHECK (tem_perfil(auth.uid(), 'admin'::perfil_usuario));

CREATE POLICY "Motorista ve clientes da rota"
  ON public.rotas_clientes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.rotas
    WHERE rotas.id = rotas_clientes.rota_id
    AND rotas.motorista_id = auth.uid()
  ));

-- Tabela historico_precos
CREATE TABLE public.historico_precos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo_roupa_id uuid REFERENCES public.tipos_roupa(id) ON DELETE SET NULL,
  preco_anterior numeric NOT NULL,
  preco_novo numeric NOT NULL,
  alterado_por uuid NOT NULL REFERENCES public.usuarios(id),
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_precos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin acesso total historico_precos"
  ON public.historico_precos FOR ALL TO authenticated
  USING (tem_perfil(auth.uid(), 'admin'::perfil_usuario))
  WITH CHECK (tem_perfil(auth.uid(), 'admin'::perfil_usuario));
