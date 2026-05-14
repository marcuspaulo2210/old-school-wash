CREATE OR REPLACE FUNCTION public.meu_cliente_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT cliente_id FROM public.usuarios WHERE id = auth.uid()),
    (SELECT id FROM public.clientes WHERE auth_user_id = auth.uid() AND ativo = true LIMIT 1)
  )
$function$;