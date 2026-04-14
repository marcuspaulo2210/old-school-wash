
-- Drop and recreate production policies to include embalado status
DROP POLICY IF EXISTS "Producao ve pedidos em producao" ON public.pedidos;
CREATE POLICY "Producao ve pedidos em producao"
  ON public.pedidos FOR SELECT
  TO authenticated
  USING (tem_perfil(auth.uid(), 'producao') AND status IN ('coletado'::status_pedido, 'em_producao'::status_pedido, 'embalado'::status_pedido));

DROP POLICY IF EXISTS "Producao atualiza pedidos" ON public.pedidos;
CREATE POLICY "Producao atualiza pedidos"
  ON public.pedidos FOR UPDATE
  TO authenticated
  USING (tem_perfil(auth.uid(), 'producao') AND status IN ('coletado'::status_pedido, 'em_producao'::status_pedido, 'embalado'::status_pedido))
  WITH CHECK (tem_perfil(auth.uid(), 'producao') AND status IN ('em_producao'::status_pedido, 'embalado'::status_pedido, 'pronto_para_entrega'::status_pedido, 'divergencia'::status_pedido));

-- Also expand itens_pedido policies for production to see embalado items
DROP POLICY IF EXISTS "Producao ve itens em producao" ON public.itens_pedido;
CREATE POLICY "Producao ve itens em producao"
  ON public.itens_pedido FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = itens_pedido.pedido_id
      AND pedidos.status IN ('coletado'::status_pedido, 'em_producao'::status_pedido, 'embalado'::status_pedido)
      AND tem_perfil(auth.uid(), 'producao')
  ));

DROP POLICY IF EXISTS "Producao atualiza conferencia" ON public.itens_pedido;
CREATE POLICY "Producao atualiza conferencia"
  ON public.itens_pedido FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = itens_pedido.pedido_id
      AND pedidos.status IN ('coletado'::status_pedido, 'em_producao'::status_pedido, 'embalado'::status_pedido)
      AND tem_perfil(auth.uid(), 'producao')
  ));

-- Expand historico_status for production to see embalado
DROP POLICY IF EXISTS "Producao ve historico producao" ON public.historico_status;
CREATE POLICY "Producao ve historico producao"
  ON public.historico_status FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = historico_status.pedido_id
      AND pedidos.status IN ('coletado'::status_pedido, 'em_producao'::status_pedido, 'embalado'::status_pedido)
      AND tem_perfil(auth.uid(), 'producao')
  ));
