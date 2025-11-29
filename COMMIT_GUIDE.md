# 📝 Guia de Commits Organizados

Este guia contém os comandos para fazer commits organizados das mudanças não commitadas.

## 🚀 Opção 1: Script Automático (Recomendado)

Execute o script que criará todos os commits automaticamente:

```bash
bash commit-changes.sh
```

## 📋 Opção 2: Commits Manuais

Se preferir fazer os commits manualmente, siga os passos abaixo:

### 1. Estrutura do Monorepo - Migração

```bash
git add packages/backend/ packages/web/ packages/shared/
git add .gitignore package.json
git commit -m "feat: migração para estrutura monorepo

- Move backend/ para packages/backend/
- Move web/ para packages/web/
- Cria packages/shared/ com código compartilhado
- Configura npm workspaces no package.json
- Atualiza .gitignore para estrutura monorepo

BREAKING CHANGE: Estrutura de diretórios alterada para monorepo"
```

### 2. Melhorias em Transações

```bash
git add packages/web/components/TransactionModal.jsx
git add packages/web/components/EditExpenseModal.jsx
git add packages/web/pages/dashboard/transactions.jsx
git commit -m "feat(transactions): melhorias na edição e salvamento de transações

- Implementa edição de parcelas de cartão de crédito
- Adiciona função RPC para atualizar grupos de parcelas
- Melhora normalização de nomes ao editar transações
- Adiciona validação de categoria antes de salvar
- Implementa exclusão em massa de transações
- Adiciona paginação (20 itens por página)
- Melhora filtros e ordenação
- Atualiza cálculo de totais considerando splits
- Adiciona tooltips com divisão de despesas compartilhadas"
```

### 3. Banco de Dados - Migration SQL

```bash
git add docs/migrations/2025-11-21-update-installments-function.sql
git commit -m "feat(db): adiciona função para atualizar grupos de parcelas

- Cria função update_installment_group para atualizar parcelas
- Permite atualizar descrição, categoria, cartão, owner sem alterar datas
- Valida permissões de usuário e organização
- Mantém datas originais de cada parcela
- Atualiza installment_info corretamente"
```

### 4. Documentação

```bash
git add MONOREPO_SETUP.md
git add README.md
git add STATUS_NOTIFICACOES.md
git commit -m "docs: atualiza documentação do projeto

- Adiciona MONOREPO_SETUP.md com guia completo do monorepo
- Atualiza README.md com informações da nova estrutura
- Atualiza STATUS_NOTIFICACOES.md"
```

### 5. Scripts e Utilitários

```bash
git add scripts/setup-mobile-env.sh
git add scripts/README.md
git add scripts/list-templates.js
git add scripts/monitor-template-approval.js
git commit -m "chore: adiciona scripts de configuração e atualiza existentes

- Adiciona setup-mobile-env.sh para configurar .env do mobile
- Atualiza scripts de templates do WhatsApp
- Atualiza documentação de scripts"
```

### 6. Remover Arquivos Antigos (Deletados)

```bash
git add backend/ web/
git commit -m "chore: remove diretórios antigos após migração para monorepo

- Remove backend/ (movido para packages/backend/)
- Remove web/ (movido para packages/web/)
- Arquivos foram migrados, não deletados"
```

## ✅ Verificação

Após fazer os commits, verifique:

```bash
# Ver últimos commits
git log --oneline -6

# Ver status (deve estar limpo, exceto mobile)
git status

# Ver diferenças (se houver)
git diff
```

## 🚢 Push para o Repositório

Quando estiver satisfeito com os commits:

```bash
git push origin main
```

Ou, se preferir revisar antes:

```bash
# Ver commits que serão enviados
git log origin/main..HEAD

# Fazer push
git push origin main
```

## 🔄 Ajustar Commits (se necessário)

Se precisar ajustar os commits:

```bash
# Rebase interativo dos últimos 6 commits
git rebase -i HEAD~6

# Ou editar mensagem do último commit
git commit --amend
```

## 📊 Resumo dos Commits

1. **feat: migração para estrutura monorepo** - Estrutura base
2. **feat(transactions): melhorias na edição e salvamento** - Funcionalidades de transações
3. **feat(db): função para atualizar parcelas** - Banco de dados
4. **docs: atualiza documentação** - Documentação
5. **chore: scripts e utilitários** - Scripts
6. **chore: remove diretórios antigos** - Limpeza

---

**Nota:** Os commits seguem o padrão [Conventional Commits](https://www.conventionalcommits.org/) para facilitar versionamento semântico e changelogs automáticos.







