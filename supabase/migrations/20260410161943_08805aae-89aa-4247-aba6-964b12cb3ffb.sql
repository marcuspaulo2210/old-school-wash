
-- Enum for service billing type
CREATE TYPE public.tipo_cobranca_servico AS ENUM ('peca', 'peso', 'pacote');

-- Table: servicos
CREATE TABLE public.servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo_cobranca tipo_cobranca_servico NOT NULL DEFAULT 'peca',
  preco_unitario NUMERIC NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin gerencia servicos"
ON public.servicos FOR ALL TO authenticated
USING (tem_perfil(auth.uid(), 'admin'::perfil_usuario))
WITH CHECK (tem_perfil(auth.uid(), 'admin'::perfil_usuario));

CREATE POLICY "Todos veem servicos ativos"
ON public.servicos FOR SELECT TO authenticated
USING (ativo = true);

-- Table: log_impersonacao
CREATE TABLE public.log_impersonacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  usuario_alvo_id UUID NOT NULL,
  acessado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.log_impersonacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin acesso total log_impersonacao"
ON public.log_impersonacao FOR ALL TO authenticated
USING (tem_perfil(auth.uid(), 'admin'::perfil_usuario))
WITH CHECK (tem_perfil(auth.uid(), 'admin'::perfil_usuario));

-- New columns on usuarios
ALTER TABLE public.usuarios
ADD COLUMN permite_cobranca_peca BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN permite_cobranca_peso BOOLEAN NOT NULL DEFAULT true;
