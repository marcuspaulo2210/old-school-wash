CREATE OR REPLACE FUNCTION public.notificar_motorista_pedido(_pedido_id uuid, _titulo text, _mensagem text, _tipo text DEFAULT 'sucesso')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_motorista uuid;
BEGIN
  IF NOT (public.tem_perfil(auth.uid(), 'admin') OR public.tem_perfil(auth.uid(), 'producao')) THEN
    RAISE EXCEPTION 'nao autorizado';
  END IF;

  SELECT p.motorista_id INTO v_motorista FROM public.pedidos p WHERE p.id = _pedido_id;

  IF v_motorista IS NULL THEN
    SELECT COALESCE(c.motorista_id, (SELECT r.motorista_id FROM public.rotas r WHERE r.id = c.rota_id))
    INTO v_motorista
    FROM public.pedidos p JOIN public.clientes c ON c.id = p.cliente_id
    WHERE p.id = _pedido_id;
  END IF;

  IF v_motorista IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.notificacoes (user_id, pedido_id, tipo, titulo, mensagem)
  VALUES (v_motorista, _pedido_id, COALESCE(_tipo, 'sucesso'), _titulo, _mensagem);
END;
$$;

REVOKE ALL ON FUNCTION public.notificar_motorista_pedido(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.notificar_motorista_pedido(uuid, text, text, text) TO authenticated;