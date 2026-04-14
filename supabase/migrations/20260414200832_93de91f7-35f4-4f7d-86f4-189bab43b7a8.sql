
-- Create solicitacoes_troca_senha table
CREATE TABLE public.solicitacoes_troca_senha (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  criado_em timestamp with time zone NOT NULL DEFAULT now(),
  resolvido_em timestamp with time zone,
  resolvido_por uuid
);

ALTER TABLE public.solicitacoes_troca_senha ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admin acesso total solicitacoes_senha"
ON public.solicitacoes_troca_senha
FOR ALL
TO authenticated
USING (tem_perfil(auth.uid(), 'admin'::perfil_usuario))
WITH CHECK (tem_perfil(auth.uid(), 'admin'::perfil_usuario));

-- Users can insert their own requests
CREATE POLICY "Usuario cria solicitacao propria"
ON public.solicitacoes_troca_senha
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can see their own requests
CREATE POLICY "Usuario ve solicitacao propria"
ON public.solicitacoes_troca_senha
FOR SELECT
TO authenticated
USING (user_id = auth.uid());
