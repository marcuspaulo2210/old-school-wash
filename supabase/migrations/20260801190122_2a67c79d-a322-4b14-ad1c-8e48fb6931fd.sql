-- Clientes/usuários autenticados podem ler rotas (necessário para calcular data de coleta e motorista)
CREATE POLICY "Autenticados podem ver rotas"
ON public.rotas
FOR SELECT
TO authenticated
USING (true);

-- Autenticados podem ver motoristas ativos (nome/id) para atribuição e exibição
CREATE POLICY "Ver motoristas ativos"
ON public.usuarios
FOR SELECT
TO authenticated
USING (perfil = 'motorista'::perfil_usuario AND ativo = true);