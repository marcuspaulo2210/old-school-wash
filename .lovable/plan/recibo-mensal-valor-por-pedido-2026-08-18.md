# Recibo Mensal + Valor por Pedido

## Parte 1 — Valor editável por pedido
Na tabela de pedidos do admin (`src/pages/admin/Pedidos.tsx`), a coluna "Valor" passa a ser editável inline:
- Clique na célula abre um input numérico com o valor atual.
- Enter ou clique fora salva em `pedidos.valor_total`; Esc cancela.
- Sem valor: "—" em cinza com ícone de lápis. Com valor: "R$ XX,XX" em verde.
- Toast de confirmação/erro. O clique na célula não abre o modal de detalhe do pedido.

O campo `valor_total` já existe na tabela `pedidos` (numérico) — nenhuma alteração de banco é necessária.

## Parte 2 — Seção "Recibo Mensal" na Análise
Em `src/pages/admin/Analise.tsx`, nova seção abaixo do saldo de roupas:
- Seletor de cliente (obrigatório), seletor de mês/ano e botão "Gerar recibo" (desabilitado sem cliente).
- Abre modal em tela cheia, fundo branco e texto escuro, com o recibo formatado para A4.

Conteúdo do recibo:
- Cabeçalho: logo Amaná centralizado, linha azul, "AMANA LAVANDERIA HOSPITALAR", "Comprovante de Serviços Prestados".
- Dados: cliente, período por extenso (ex.: Julho de 2026), emitido em (data por extenso).
- Tabela: Data da coleta | Pedido | Descrição | Qtd/Peso | Valor (R$), com linhas alternadas. Somente pedidos com status `entregue` no mês.
  - Descrição: resumo das peças (tipos de roupa/descrição livre) ou "X kg lavados" quando cobrança por peso.
- Totalizador: TOTAL DO PERÍODO em bold, total de peças lavadas e peso total lavado.
- Rodapé: nome da empresa, aviso de documento sem valor fiscal, agradecimento.
- Botão azul "Imprimir recibo" fora da área impressa, chamando `window.print()`.

Dados buscados na geração: pedidos entregues do cliente no mês + itens de cada pedido para montar a descrição e os subtotais.

## Parte 3 — CSS de impressão
Adicionar em `src/index.css` o bloco `@media print` que esconde tudo exceto `.recibo-print` (aplicada ao container do recibo) e oculta `.btn-imprimir`.
