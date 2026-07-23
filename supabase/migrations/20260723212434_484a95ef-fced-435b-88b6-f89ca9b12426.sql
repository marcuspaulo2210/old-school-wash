ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS saida_registrada boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS saida_em timestamp with time zone;

COMMENT ON COLUMN public.pedidos.saida_registrada IS 'Indica se a saída/liberação para entrega foi registrada pela produção';
COMMENT ON COLUMN public.pedidos.saida_em IS 'Data/hora em que a produção registrou a saída/liberação para entrega';