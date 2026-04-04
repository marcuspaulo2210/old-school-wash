
-- ============================================
-- LIMPAR SCHEMA ANTIGO
-- ============================================
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.clothing_types CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.charge_type CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;

DROP FUNCTION IF EXISTS public.has_role CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;

-- ============================================
-- NOVOS ENUMS
-- ============================================
CREATE TYPE public.tipo_cliente AS ENUM ('clinica', 'hospital');
CREATE TYPE public.perfil_usuario AS ENUM ('admin', 'cliente', 'motorista', 'producao');
CREATE TYPE public.tipo_cobranca AS ENUM ('peca', 'peso');
CREATE TYPE public.status_pedido AS ENUM (
  'aguardando_coleta', 'coletado', 'em_producao', 'embalado', 'entregue', 'divergencia'
);
CREATE TYPE public.quem_contou_enum AS ENUM ('cliente', 'lavanderia');

-- ============================================
-- TABELA: clientes
-- ============================================
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo tipo_cliente NOT NULL DEFAULT 'clinica',
  endereco text,
  telefone text,
  email text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABELA: usuarios
-- ============================================
CREATE TABLE public.usuarios (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  perfil perfil_usuario NOT NULL DEFAULT 'cliente',
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FUNÇÃO: verificar perfil (SECURITY DEFINER)
-- ============================================
CREATE OR REPLACE FUNCTION public.tem_perfil(_user_id uuid, _perfil perfil_usuario)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = _user_id AND perfil = _perfil AND ativo = true
  )
$$;

-- ============================================
-- FUNÇÃO: obter cliente_id do usuário logado
-- ============================================
CREATE OR REPLACE FUNCTION public.meu_cliente_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cliente_id FROM public.usuarios WHERE id = auth.uid()
$$;

-- ============================================
-- TABELA: tipos_roupa
-- ============================================
CREATE TABLE public.tipos_roupa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
  criado_por_admin boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true
);

ALTER TABLE public.tipos_roupa ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABELA: pedidos
-- ============================================
CREATE SEQUENCE IF NOT EXISTS public.pedido_seq START 1;

CREATE TABLE public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido text NOT NULL DEFAULT '#' || lpad(nextval('public.pedido_seq')::text, 4, '0'),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  motorista_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  tipo_cobranca tipo_cobranca NOT NULL DEFAULT 'peca',
  status status_pedido NOT NULL DEFAULT 'aguardando_coleta',
  quem_contou quem_contou_enum NOT NULL DEFAULT 'cliente',
  peso_kg numeric,
  valor_total numeric,
  obs_cliente text,
  obs_motorista text,
  obs_producao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  coletado_em timestamptz,
  embalado_em timestamptz,
  entregue_em timestamptz
);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABELA: itens_pedido
-- ============================================
CREATE TABLE public.itens_pedido (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  tipo_roupa_id uuid REFERENCES public.tipos_roupa(id) ON DELETE SET NULL,
  descricao_livre text,
  quantidade_original integer NOT NULL DEFAULT 0,
  quantidade_conferida integer,
  diferenca integer GENERATED ALWAYS AS (
    CASE WHEN quantidade_conferida IS NOT NULL
         THEN quantidade_conferida - quantidade_original
         ELSE NULL
    END
  ) STORED
);

ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TABELA: historico_status
-- ============================================
CREATE TABLE public.historico_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  status_anterior status_pedido,
  status_novo status_pedido NOT NULL,
  alterado_por uuid NOT NULL REFERENCES public.usuarios(id),
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.historico_status ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS: clientes
-- ============================================
CREATE POLICY "Admin acesso total clientes" ON public.clientes
  FOR ALL TO authenticated
  USING (public.tem_perfil(auth.uid(), 'admin'))
  WITH CHECK (public.tem_perfil(auth.uid(), 'admin'));

CREATE POLICY "Cliente ve proprio cliente" ON public.clientes
  FOR SELECT TO authenticated
  USING (id = public.meu_cliente_id());

-- ============================================
-- RLS: usuarios
-- ============================================
CREATE POLICY "Admin acesso total usuarios" ON public.usuarios
  FOR ALL TO authenticated
  USING (public.tem_perfil(auth.uid(), 'admin'))
  WITH CHECK (public.tem_perfil(auth.uid(), 'admin'));

CREATE POLICY "Usuario ve proprio registro" ON public.usuarios
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Usuario insere proprio registro" ON public.usuarios
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================
-- RLS: tipos_roupa
-- ============================================
CREATE POLICY "Todos veem tipos_roupa ativos" ON public.tipos_roupa
  FOR SELECT TO authenticated
  USING (ativo = true);

CREATE POLICY "Admin gerencia tipos_roupa" ON public.tipos_roupa
  FOR ALL TO authenticated
  USING (public.tem_perfil(auth.uid(), 'admin'))
  WITH CHECK (public.tem_perfil(auth.uid(), 'admin'));

-- ============================================
-- RLS: pedidos
-- ============================================
CREATE POLICY "Admin acesso total pedidos" ON public.pedidos
  FOR ALL TO authenticated
  USING (public.tem_perfil(auth.uid(), 'admin'))
  WITH CHECK (public.tem_perfil(auth.uid(), 'admin'));

CREATE POLICY "Cliente ve proprios pedidos" ON public.pedidos
  FOR SELECT TO authenticated
  USING (cliente_id = public.meu_cliente_id());

CREATE POLICY "Cliente cria pedidos" ON public.pedidos
  FOR INSERT TO authenticated
  WITH CHECK (cliente_id = public.meu_cliente_id());

CREATE POLICY "Cliente edita pedidos aguardando" ON public.pedidos
  FOR UPDATE TO authenticated
  USING (cliente_id = public.meu_cliente_id() AND status = 'aguardando_coleta');

CREATE POLICY "Motorista ve pedidos atribuidos" ON public.pedidos
  FOR SELECT TO authenticated
  USING (motorista_id = auth.uid());

CREATE POLICY "Motorista atualiza para coletado" ON public.pedidos
  FOR UPDATE TO authenticated
  USING (motorista_id = auth.uid() AND status = 'aguardando_coleta');

CREATE POLICY "Producao ve pedidos em producao" ON public.pedidos
  FOR SELECT TO authenticated
  USING (
    public.tem_perfil(auth.uid(), 'producao') 
    AND status IN ('coletado', 'em_producao')
  );

CREATE POLICY "Producao atualiza pedidos" ON public.pedidos
  FOR UPDATE TO authenticated
  USING (
    public.tem_perfil(auth.uid(), 'producao') 
    AND status IN ('coletado', 'em_producao')
  );

-- ============================================
-- RLS: itens_pedido
-- ============================================
CREATE POLICY "Admin acesso total itens" ON public.itens_pedido
  FOR ALL TO authenticated
  USING (public.tem_perfil(auth.uid(), 'admin'))
  WITH CHECK (public.tem_perfil(auth.uid(), 'admin'));

CREATE POLICY "Cliente ve proprios itens" ON public.itens_pedido
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = itens_pedido.pedido_id
      AND pedidos.cliente_id = public.meu_cliente_id()
  ));

CREATE POLICY "Cliente insere itens" ON public.itens_pedido
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = itens_pedido.pedido_id
      AND pedidos.cliente_id = public.meu_cliente_id()
  ));

CREATE POLICY "Producao ve itens em producao" ON public.itens_pedido
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = itens_pedido.pedido_id
      AND pedidos.status IN ('coletado', 'em_producao')
      AND public.tem_perfil(auth.uid(), 'producao')
  ));

CREATE POLICY "Producao atualiza conferencia" ON public.itens_pedido
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = itens_pedido.pedido_id
      AND pedidos.status IN ('coletado', 'em_producao')
      AND public.tem_perfil(auth.uid(), 'producao')
  ));

-- ============================================
-- RLS: historico_status
-- ============================================
CREATE POLICY "Admin ve todo historico" ON public.historico_status
  FOR ALL TO authenticated
  USING (public.tem_perfil(auth.uid(), 'admin'))
  WITH CHECK (public.tem_perfil(auth.uid(), 'admin'));

CREATE POLICY "Usuarios inserem historico" ON public.historico_status
  FOR INSERT TO authenticated
  WITH CHECK (alterado_por = auth.uid());

CREATE POLICY "Cliente ve historico proprio pedido" ON public.historico_status
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = historico_status.pedido_id
      AND pedidos.cliente_id = public.meu_cliente_id()
  ));

CREATE POLICY "Motorista ve historico atribuido" ON public.historico_status
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = historico_status.pedido_id
      AND pedidos.motorista_id = auth.uid()
  ));

CREATE POLICY "Producao ve historico producao" ON public.historico_status
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = historico_status.pedido_id
      AND pedidos.status IN ('coletado', 'em_producao')
      AND public.tem_perfil(auth.uid(), 'producao')
  ));

-- ============================================
-- FUNÇÃO: criar perfil no cadastro
-- ============================================
CREATE OR REPLACE FUNCTION public.criar_perfil_usuario(_nome text, _email text, _perfil perfil_usuario DEFAULT 'cliente')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO usuarios (id, nome, email, perfil)
  VALUES (auth.uid(), _nome, _email, _perfil)
  ON CONFLICT (id) DO NOTHING;
END;
$$;
