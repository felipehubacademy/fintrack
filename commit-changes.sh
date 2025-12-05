#!/bin/bash

# Script para fazer commits organizados das mudanças
# Execute: bash commit-changes.sh

set -e

echo "🚀 Iniciando commits organizados..."
echo ""

# 1. Estrutura do Monorepo - Migração
echo "📦 Commit 1: Estrutura do Monorepo"
git add packages/backend/ packages/web/ packages/shared/
git add .gitignore package.json
git commit -m "feat: migração para estrutura monorepo

- Move backend/ para packages/backend/
- Move web/ para packages/web/
- Cria packages/shared/ com código compartilhado
- Configura npm workspaces no package.json
- Atualiza .gitignore para estrutura monorepo

BREAKING CHANGE: Estrutura de diretórios alterada para monorepo"
echo "✅ Commit 1 concluído"
echo ""

# 2. Melhorias em Transações
echo "💳 Commit 2: Melhorias em Transações"
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
echo "✅ Commit 2 concluído"
echo ""

# 3. Banco de Dados - Migration SQL
echo "🗄️  Commit 3: Função SQL para Parcelas"
git add docs/migrations/2025-11-21-update-installments-function.sql
git commit -m "feat(db): adiciona função para atualizar grupos de parcelas

- Cria função update_installment_group para atualizar parcelas
- Permite atualizar descrição, categoria, cartão, owner sem alterar datas
- Valida permissões de usuário e organização
- Mantém datas originais de cada parcela
- Atualiza installment_info corretamente"
echo "✅ Commit 3 concluído"
echo ""

# 4. Documentação
echo "📚 Commit 4: Documentação"
git add MONOREPO_SETUP.md
git add README.md
git add STATUS_NOTIFICACOES.md
git commit -m "docs: atualiza documentação do projeto

- Adiciona MONOREPO_SETUP.md com guia completo do monorepo
- Atualiza README.md com informações da nova estrutura
- Atualiza STATUS_NOTIFICACOES.md"
echo "✅ Commit 4 concluído"
echo ""

# 5. Scripts e Utilitários
echo "🛠️  Commit 5: Scripts e Utilitários"
git add scripts/setup-mobile-env.sh
git add scripts/README.md
git add scripts/list-templates.js
git add scripts/monitor-template-approval.js
git commit -m "chore: adiciona scripts de configuração e atualiza existentes

- Adiciona setup-mobile-env.sh para configurar .env do mobile
- Atualiza scripts de templates do WhatsApp
- Atualiza documentação de scripts"
echo "✅ Commit 5 concluído"
echo ""

# 6. Remover arquivos antigos (deletados)
echo "🗑️  Commit 6: Remover arquivos antigos (movidos para packages/)"
git add backend/ web/
git commit -m "chore: remove diretórios antigos após migração para monorepo

- Remove backend/ (movido para packages/backend/)
- Remove web/ (movido para packages/web/)
- Arquivos foram migrados, não deletados"
echo "✅ Commit 6 concluído"
echo ""

echo "🎉 Todos os commits foram criados com sucesso!"
echo ""
echo "📊 Resumo:"
echo "   - 6 commits criados"
echo "   - Estrutura organizada por categoria"
echo "   - Mensagens seguem Conventional Commits"
echo ""
echo "💡 Próximos passos:"
echo "   1. Revise os commits: git log --oneline -6"
echo "   2. Se estiver tudo ok, faça push: git push"
echo "   3. Ou ajuste os commits: git rebase -i HEAD~6"












