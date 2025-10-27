# 📊 Plano de Unificação de Categorias

## Análise Atual

### Situação:
- **`budget_categories`**: Usada para **expenses** (despesas) e **bills** (contas)
- **`income_categories`**: Usada para **incomes** (entradas), mas tem apenas 1 referência (não funcional)
- **`incomes.category`**: Campo texto simples (não usa `category_id`)

---

## 🎯 Estratégia Recomendada: **Unificar tudo em `budget_categories`**

### Por quê?

1. **Simplicidade**: Uma única tabela de categorias
2. **Flexibilidade**: Categorias podem ser usadas para entrada E saída
3. **Menos duplicação**: Menos manutenção, menos bugs

### Como diferenciar entrada vs saída?

#### **Opção 1: Coluna `type` (RECOMENDADO)**
```sql
ALTER TABLE budget_categories ADD COLUMN type VARCHAR(20) DEFAULT 'expense' 
CHECK (type IN ('expense', 'income', 'both'));
```

**Vantagens:**
- ✅ Claro e explícito
- ✅ Fácil filtrar: `.eq('type', 'income')` ou `.eq('type', 'expense')`
- ✅ Algumas categorias podem ser 'both' (ex: "Investimentos")
- ✅ Compatível com código atual

**Uso:**
```javascript
// Criar categoria para despesas
{ name: 'Alimentação', type: 'expense', color: '#EF4444' }

// Criar categoria para entradas
{ name: 'Salário', type: 'income', color: '#10B981' }

// Criar categoria para ambos
{ name: 'Investimentos', type: 'both', color: '#10B981' }
```

---

#### **Opção 2: Tabela `categories` (mais genérica)**

Renomear `budget_categories` → `categories`

**Vantagens:**
- ✅ Nome mais genérico
- ✅ Não sugere apenas orçamento
- ❌ Requer mudanças em todo o código

---

## 📋 Implementação

### 1. Atualizar SQL de Migração

```sql
-- Adicionar coluna type em budget_categories
ALTER TABLE budget_categories 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'expense' 
CHECK (type IN ('expense', 'income', 'both'));

-- Valores padrão
UPDATE budget_categories 
SET type = 'expense' 
WHERE type IS NULL;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_budget_categories_type 
ON budget_categories(type);
```

### 2. Atualizar Código

**Frontend (hooks/useOrganization.js):**
```javascript
// Buscar categorias de despesa
const { data: expenseCategories } = await supabase
  .from('budget_categories')
  .select('*')
  .eq('organization_id', organization.id)
  .in('type', ['expense', 'both'])
  .order('name');

// Buscar categorias de entrada
const { data: incomeCategories } = await supabase
  .from('budget_categories')
  .select('*')
  .eq('organization_id', organization.id)
  .in('type', ['income', 'both'])
  .order('name');
```

**Componentes de Incomes:**
```javascript
// Mudar de:
<select value={form.category} onChange={...}>
  {incomeCategories.map(cat => ...)}

// Para:
<select value={form.category_id} onChange={...}>
  {incomeCategories.map(cat => ...)}
```

### 3. Migrar Dados Existentes

```sql
-- Inserir categorias de entrada padrão
INSERT INTO budget_categories (organization_id, name, color, type, is_default)
VALUES 
  (NULL, 'Salário', '#10B981', 'income', true),
  (NULL, 'Freelance', '#3B82F6', 'income', true),
  (NULL, 'Investimentos', '#06B6D4', 'income', true),
  (NULL, 'Vendas', '#8B5CF6', 'income', true),
  (NULL, 'Aluguel Recebido', '#F59E0B', 'income', true),
  (NULL, 'Bonificação', '#EC4899', 'income', true),
  (NULL, 'Transferência', '#9CA3AF', 'income', true),
  (NULL, 'Outros', '#6B7280', 'income', true)
ON CONFLICT DO NOTHING;
```

---

## ✨ Benefícios

1. **Simplicidade**: Uma única fonte de verdade
2. **Consistência**: Mesmas cores, mesma interface
3. **Flexibilidade**: Categorias que servem para ambos (ex: "Investimentos")
4. **Menos código**: Remover `income_categories` completamente
5. **Melhor UX**: Categorias consistentes entre entrada e saída

---

## 🔄 Ordem de Execução

1. **Atualizar** `docs/FRESH_DATABASE_SETUP.sql`
2. **Adicionar** coluna `type` e índices
3. **Remover** referência a `income_categories` do código
4. **Atualizar** componentes de incomes para usar `category_id`
5. **Migrar** dados existentes
6. **Testar** criação de despesas e entradas

---

## 🎯 Recomendação Final

**Usar `budget_categories` com coluna `type`**

- ✅ Minimiza mudanças no código
- ✅ Mantém compatibilidade
- ✅ Fácil implementar
- ✅ Escalável para o futuro


