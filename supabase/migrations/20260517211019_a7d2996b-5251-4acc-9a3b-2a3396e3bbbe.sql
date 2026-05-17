CREATE OR REPLACE FUNCTION public.gerar_username()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base_name text;
  candidate text;
  counter int := 1;
BEGIN
  IF NEW.username IS NOT NULL AND NEW.username <> '' THEN
    RETURN NEW;
  END IF;

  base_name := REGEXP_REPLACE(LOWER(SPLIT_PART(NEW.nome, ' ', 1)), '[^a-z0-9]', '', 'g');
  IF base_name = '' THEN base_name := 'user'; END IF;

  LOOP
    candidate := base_name || '.' || LPAD(counter::text, 2, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.usuarios WHERE username = candidate);
    counter := counter + 1;
  END LOOP;

  NEW.username := candidate;
  RETURN NEW;
END;
$function$;