ALTER TABLE public.clientes
  ALTER COLUMN preco_kg TYPE decimal(10,2),
  ALTER COLUMN preco_peca TYPE decimal(10,2),
  ALTER COLUMN valor_por_kg TYPE decimal(10,2);