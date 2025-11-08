# Reestruturação por Macro Categorias

## Etapas Macro Categorias

1. **Modelagem (macro-1)**
   - Migration `add_macro_group_to_budget_categories.sql`
     - coluna `macro_group` (`needs`, `wants`, `investments`)
     - default `needs`, índice
   - Script para migrar categorias existentes:
     - Necessidades: Alimentação, Transporte, Saúde, Contas, Casa
     - Desejos: Lazer, Educação, Outros (+ palavras `viag`, `assin`, etc.)
     - Investimentos: Investimentos (+ `poup`, `reserva`, `invest`)

2. **APIs & Seeds**
   - Atualizar `createDefaultBudgetCategories` (frontend/backend) para incluir macro
   - Garantir que consultas (ex.: `fetchBudgets`) retornem `macro_group`

3. **UX de Categorias (macro-2)**
   - Modal/formulário exige seleção de macro ao criar/editar
   - Listagens exibem macro atual

4. **Wizard (macro-3 e macro-4)**
   - Recriar `BudgetWizard.jsx` focado em macros
   - Passo 3: pizza 3 fatias + cards macro + tooltip sub
   - Passo 4: tabela agrupada (já em progresso)
   - Atualizar `calculateBudgetDistribution` para macros
   - Recriar `BudgetDistributionChart.jsx`

5. **Dashboard (macro-5)**
   - Cards grandes por macro + lista de subcategorias
   - Barras de progresso, edição individual

6. **Rollout/Testes**
   - Rodar migration/script
   - Testar wizard (solo/family), dashboard
   - Atualizar documentação/seeds

