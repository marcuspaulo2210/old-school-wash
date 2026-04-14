

## Plano: Implementar funcionalidades pendentes

### 1. Limite de trocas de senha (2 trocas livres)

**Lógica:**
- Na tela de troca de senha (`PrimeiroAcesso.tsx` e futura tela de "Alterar senha"), verificar `quantidade_trocas_senha` do usuário
- Se >= 2: bloquear e exibir mensagem "Limite de trocas atingido. Solicite ao administrador."
- Criar tabela `solicitacoes_troca_senha` (user_id, status: pendente/aprovada/rejeitada, criado_em)
- Incrementar `quantidade_trocas_senha` após cada troca (exceto primeiro acesso)

**Painel Admin:**
- Nova seção ou badge no dashboard: "Solicitações de senha pendentes"
- Admin pode: redefinir senha via edge function, autorizar +1 troca, ou zerar contador
- Migração SQL para criar a tabela + RLS

### 2. Impersonação de usuários (Acessar como)

**Já existe parcialmente:** `ImpersonationBar.tsx` e lógica em `App.tsx` com `localStorage`.

**Falta implementar:**
- Botão "Acessar como" em cada linha de `Usuarios.tsx`
- Ao clicar: salvar dados no `localStorage`, registrar log na tabela `log_impersonacao`, redirecionar ao dashboard do perfil do usuário
- A tabela `log_impersonacao` já foi criada na migração anterior — verificar se existe no banco

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `supabase/migrations/new.sql` | Criar `solicitacoes_troca_senha`, verificar `log_impersonacao` |
| `src/pages/admin/Usuarios.tsx` | Adicionar botão "Acessar como" + seção de solicitações |
| `src/pages/PrimeiroAcesso.tsx` | Incrementar contador (excluindo primeiro acesso) |
| `src/pages/admin/Dashboard.tsx` | Badge de solicitações pendentes |

### Nenhuma função existente será removida.

