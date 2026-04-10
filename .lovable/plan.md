

## Diagnóstico: Motorista nao consegue dar baixa como "coletado"

### Causa raiz

A politica de seguranca (RLS) **"Motorista atualiza para coletado"** na tabela `pedidos` tem apenas a clausula `USING` sem `WITH CHECK` explicito:

```sql
USING: (motorista_id = auth.uid()) AND (status = 'aguardando_coleta')
```

Quando `WITH CHECK` e omitido, o banco usa a mesma expressao do `USING` para validar a linha **apos** a atualizacao. Como o motorista muda o status para `coletado`, a linha atualizada nao satisfaz mais `status = 'aguardando_coleta'`, e o UPDATE e rejeitado silenciosamente.

### Correcao

1. **Migração SQL**: Remover a politica atual e recria-la com `WITH CHECK` adequado:

```sql
DROP POLICY "Motorista atualiza para coletado" ON public.pedidos;

CREATE POLICY "Motorista atualiza para coletado"
ON public.pedidos
FOR UPDATE
TO authenticated
USING (
  motorista_id = auth.uid()
  AND status = 'aguardando_coleta'::status_pedido
)
WITH CHECK (
  motorista_id = auth.uid()
  AND status = 'coletado'::status_pedido
);
```

Isso permite que o motorista leia linhas com status `aguardando_coleta` (USING) e grave com status `coletado` (WITH CHECK).

2. **Nenhuma alteracao de codigo** e necessaria -- o `MotoristaDashboard.tsx` ja envia os dados corretos.

