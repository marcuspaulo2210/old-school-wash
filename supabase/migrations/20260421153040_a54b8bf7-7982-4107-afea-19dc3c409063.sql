-- Tabela de notificações
CREATE TABLE public.notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pedido_id uuid REFERENCES public.pedidos(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'info', -- 'sucesso', 'alerta', 'info'
  titulo text NOT NULL,
  mensagem text NOT NULL,
  lida boolean NOT NULL DEFAULT false,
  criado_em timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificacoes_user_lida ON public.notificacoes(user_id, lida, criado_em DESC);

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario ve proprias notificacoes"
  ON public.notificacoes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Usuario atualiza proprias notificacoes"
  ON public.notificacoes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin acesso total notificacoes"
  ON public.notificacoes FOR ALL
  TO authenticated
  USING (tem_perfil(auth.uid(), 'admin'::perfil_usuario))
  WITH CHECK (tem_perfil(auth.uid(), 'admin'::perfil_usuario));

CREATE POLICY "Sistema insere notificacoes"
  ON public.notificacoes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger para gerar notificações automaticamente baseadas no histórico de status
CREATE OR REPLACE FUNCTION public.gerar_notificacao_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_user_id uuid;
  v_numero_pedido text;
  v_titulo text;
  v_mensagem text;
  v_tipo text := 'sucesso';
BEGIN
  -- Buscar usuário cliente do pedido
  SELECT u.id, p.numero_pedido
  INTO v_cliente_user_id, v_numero_pedido
  FROM public.pedidos p
  JOIN public.usuarios u ON u.cliente_id = p.cliente_id AND u.perfil = 'cliente'
  WHERE p.id = NEW.pedido_id
  LIMIT 1;

  IF v_cliente_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  CASE NEW.status_novo
    WHEN 'coletado' THEN
      v_titulo := 'Pedido coletado';
      v_mensagem := 'Seu pedido ' || v_numero_pedido || ' foi coletado pelo motorista.';
    WHEN 'em_producao' THEN
      v_titulo := 'Pedido em produção';
      v_mensagem := 'Seu pedido ' || v_numero_pedido || ' está sendo processado na lavanderia.';
    WHEN 'pronto_para_entrega' THEN
      v_titulo := 'Pedido finalizado';
      v_mensagem := 'Seu pedido ' || v_numero_pedido || ' foi finalizado e está pronto para entrega.';
    WHEN 'saiu_para_entrega' THEN
      v_titulo := 'Saiu para entrega';
      v_mensagem := 'Seu pedido ' || v_numero_pedido || ' saiu para entrega.';
    WHEN 'entregue' THEN
      v_titulo := 'Pedido entregue';
      v_mensagem := 'Seu pedido ' || v_numero_pedido || ' foi entregue. Obrigado!';
    WHEN 'divergencia' THEN
      v_titulo := 'Divergência no pedido';
      v_mensagem := 'Há uma divergência registrada no pedido ' || v_numero_pedido || '.';
      v_tipo := 'alerta';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.notificacoes (user_id, pedido_id, tipo, titulo, mensagem)
  VALUES (v_cliente_user_id, NEW.pedido_id, v_tipo, v_titulo, v_mensagem);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notificacao_status
  AFTER INSERT ON public.historico_status
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_notificacao_status();