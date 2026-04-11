
-- Add new status values
ALTER TYPE public.status_pedido ADD VALUE IF NOT EXISTS 'pronto_para_entrega';
ALTER TYPE public.status_pedido ADD VALUE IF NOT EXISTS 'saiu_para_entrega';

-- Clientes: new columns
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS primeiro_acesso boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quantidade_trocas_senha int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tentativas_login int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bloqueado_ate timestamptz,
  ADD COLUMN IF NOT EXISTS atualizado_em timestamptz NOT NULL DEFAULT now();

-- Usuarios: new columns (without unique constraint first)
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS primeiro_acesso boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS quantidade_trocas_senha int NOT NULL DEFAULT 0;

-- Generate unique usernames for existing usuarios
DO $$
DECLARE
  r RECORD;
  base_name text;
  candidate text;
  counter int;
BEGIN
  FOR r IN SELECT id, nome FROM public.usuarios WHERE username IS NULL ORDER BY criado_em LOOP
    base_name := LOWER(REGEXP_REPLACE(SPLIT_PART(r.nome, ' ', 1), '[^a-z]', '', 'g'));
    IF base_name = '' THEN base_name := 'user'; END IF;
    counter := 1;
    LOOP
      candidate := base_name || '.' || LPAD(counter::text, 2, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.usuarios WHERE username = candidate);
      counter := counter + 1;
    END LOOP;
    UPDATE public.usuarios SET username = candidate WHERE id = r.id;
  END LOOP;
END;
$$;

-- Now add unique constraint
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_username_unique UNIQUE (username);

-- Tipos roupa: preco_unitario
ALTER TABLE public.tipos_roupa
  ADD COLUMN IF NOT EXISTS preco_unitario numeric;

-- Pedidos: new timestamp columns
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS pronto_em timestamptz,
  ADD COLUMN IF NOT EXISTS saiu_em timestamptz;

-- Function to generate unique username on insert
CREATE OR REPLACE FUNCTION public.gerar_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_name text;
  candidate text;
  counter int := 1;
BEGIN
  IF NEW.username IS NOT NULL AND NEW.username <> '' THEN
    RETURN NEW;
  END IF;
  
  base_name := LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.nome, ' ', 1), '[^a-z]', '', 'g'));
  IF base_name = '' THEN base_name := 'user'; END IF;
  
  LOOP
    candidate := base_name || '.' || LPAD(counter::text, 2, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.usuarios WHERE username = candidate);
    counter := counter + 1;
  END LOOP;
  
  NEW.username := candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gerar_username ON public.usuarios;
CREATE TRIGGER trg_gerar_username
  BEFORE INSERT ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.gerar_username();

-- Function to update atualizado_em on clientes
CREATE OR REPLACE FUNCTION public.update_clientes_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clientes_atualizado_em ON public.clientes;
CREATE TRIGGER trg_clientes_atualizado_em
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_clientes_atualizado_em();

-- Function: client login lookup
CREATE OR REPLACE FUNCTION public.buscar_cliente_por_nome(_nome text)
RETURNS TABLE(auth_email text, bloqueado boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.email as auth_email,
    (c.bloqueado_ate IS NOT NULL AND c.bloqueado_ate > now()) as bloqueado
  FROM public.clientes c
  JOIN auth.users u ON u.id = c.auth_user_id
  WHERE LOWER(c.nome) = LOWER(_nome)
    AND c.ativo = true
  LIMIT 1;
$$;

-- Function: employee login lookup
CREATE OR REPLACE FUNCTION public.buscar_funcionario_login(_identificador text)
RETURNS TABLE(auth_email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email as auth_email
  FROM public.usuarios
  WHERE ativo = true
    AND perfil IN ('admin', 'motorista', 'producao')
    AND (LOWER(email) = LOWER(_identificador) OR LOWER(username) = LOWER(_identificador))
  LIMIT 1;
$$;

-- Function: register failed login attempt
CREATE OR REPLACE FUNCTION public.registrar_tentativa_login(_nome_clinica text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clientes
  SET tentativas_login = tentativas_login + 1,
      bloqueado_ate = CASE 
        WHEN tentativas_login + 1 >= 5 THEN now() + interval '10 minutes'
        ELSE bloqueado_ate
      END
  WHERE LOWER(nome) = LOWER(_nome_clinica);
END;
$$;

-- Function: reset login attempts
CREATE OR REPLACE FUNCTION public.resetar_tentativas_login(_nome_clinica text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clientes
  SET tentativas_login = 0, bloqueado_ate = NULL
  WHERE LOWER(nome) = LOWER(_nome_clinica);
END;
$$;
