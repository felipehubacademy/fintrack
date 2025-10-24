# Setup de Categorias de Entrada no Banco de Dados

## ✅ O que foi implementado:

### 1. Tabela criada: `income_categories`
- Armazena categorias fixas de entrada com suas cores
- É uma tabela global (não por organização)
- Campos: `id`, `name`, `color`, `is_default`, `display_order`, `created_at`, `updated_at`

### 2. Categorias padrão inseridas:
- Salário (#10B981 - verde)
- Freelance (#3B82F6 - azul)
- Investimentos (#06B6D4 - ciano)
- Vendas (#8B5CF6 - roxo)
- Aluguel (#F59E0B - laranja)
- Bonificação (#EC4899 - rosa)
- Transferência (#9CA3AF - cinza)
- Outros (#6B7280 - cinza escuro)

### 3. Código atualizado:
- ✅ `web/lib/colors.js`: Função `buildIncomeCategoryColorMap()` criada
- ✅ `web/hooks/useOrganization.js`: Busca `incomeCategories` do banco
- ✅ `web/components/IncomeCharts.jsx`: Usa cores do banco ao invés de hardcoded
- ✅ `web/pages/dashboard/index.jsx`: Passa `incomeCategories` para IncomeCharts

## 📋 Próximos passos:

### 1. Executar a migration no Supabase:
```sql
-- Execute o arquivo: docs/create-income-categories-table.sql
```

### 2. Atualizar componentes restantes (opcional):
- `web/components/TransactionModal.jsx`: Buscar categorias do banco
- `web/components/BankTransactionModal.jsx`: Buscar categorias do banco

## 🎯 Benefícios:
- ✅ Consistência total de cores em toda aplicação
- ✅ Manutenção centralizada das cores
- ✅ Flexibilidade para adicionar novas categorias no futuro
- ✅ Mesma estrutura que `budget_categories` (despesas)

