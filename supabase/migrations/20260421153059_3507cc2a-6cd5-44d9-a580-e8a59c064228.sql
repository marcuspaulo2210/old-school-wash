DROP POLICY IF EXISTS "Sistema insere notificacoes" ON public.notificacoes;

CREATE POLICY "Usuario insere proprias notificacoes"
  ON public.notificacoes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());