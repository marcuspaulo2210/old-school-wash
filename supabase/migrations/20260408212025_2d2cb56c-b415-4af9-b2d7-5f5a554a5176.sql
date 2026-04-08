CREATE TABLE public.conexao_ok (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.conexao_ok ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin acesso conexao_ok" ON public.conexao_ok FOR ALL TO authenticated USING (tem_perfil(auth.uid(), 'admin'::perfil_usuario)) WITH CHECK (tem_perfil(auth.uid(), 'admin'::perfil_usuario));