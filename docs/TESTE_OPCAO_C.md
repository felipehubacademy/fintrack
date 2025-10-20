# 🧪 Teste - Opção C: Compartilhado sem Cost Center

## 📋 **Passo 1: Executar SQL para Limpar**

Execute o arquivo `docs/remove-shared-cost-center.sql` no Supabase SQL Editor.

**Resultado Esperado:**
```
Cost Centers Individuais: 2 (Felipe e Letícia)
Cost Centers Compartilhados: 0
```

---

## 📋 **Passo 2: Verificar Interface**

1. Acesse `/dashboard/expenses`
2. Clique em "Nova Despesa"
3. Verifique o dropdown "Responsável":

**Deve mostrar:**
```
- Felipe
- Letícia
- Compartilhado  ← Adicionado manualmente pelo código
```

---

## 📋 **Passo 3: Testar Despesa Individual**

1. Preencha:
   - **Descrição**: `Uber Felipe`
   - **Valor**: `50.00`
   - **Responsável**: `Felipe`
   - **Forma de Pagamento**: PIX

2. **NÃO deve mostrar** seção "Divisão da Despesa"

3. Salve e verifique no banco:
```sql
SELECT 
    description,
    amount,
    owner,
    split,
    cost_center_id
FROM expenses 
WHERE description = 'Uber Felipe';
```

**Resultado Esperado:**
```
description | amount | owner   | split | cost_center_id
Uber Felipe | 50.00  | Felipe  | false | <uuid_felipe>
```

---

## 📋 **Passo 4: Testar Despesa Compartilhada**

1. Preencha:
   - **Descrição**: `Mercado Novo`
   - **Valor**: `200.00`
   - **Responsável**: `Compartilhado`
   - **Forma de Pagamento**: Dinheiro

2. **Deve mostrar** divisão automática:
```
Divisão da Despesa    [Personalizar]

🔵 Felipe     50% (R$ 100.00)
🔴 Letícia    50% (R$ 100.00)
```

3. Salve e verifique no banco:
```sql
SELECT 
    description,
    amount,
    owner,
    split,
    cost_center_id
FROM expenses 
WHERE description = 'Mercado Novo';
```

**Resultado Esperado:**
```
description  | amount | owner          | split | cost_center_id
Mercado Novo | 200.00 | Compartilhado  | true  | NULL  ← Importante!
```

4. Verifique que **NÃO criou** expense_splits (fallback):
```sql
SELECT * FROM expense_splits 
WHERE expense_id = (SELECT id FROM expenses WHERE description = 'Mercado Novo');
```

**Resultado Esperado:** 0 linhas

---

## 📋 **Passo 5: Testar Divisão Personalizada**

1. Adicione:
   - **Descrição**: `Jantar Especial`
   - **Valor**: `300.00`
   - **Responsável**: `Compartilhado`

2. Clique em **"Personalizar"**

3. Altere:
   - **Felipe**: `70%` → Deve mostrar `R$ 210.00`
   - **Letícia**: `30%` → Deve mostrar `R$ 90.00`

4. Verifique total: `100.00%` ✅

5. Salve e verifique no banco:
```sql
-- Despesa
SELECT 
    id,
    description,
    amount,
    owner,
    split,
    cost_center_id
FROM expenses 
WHERE description = 'Jantar Especial';

-- Splits
SELECT 
    es.percentage,
    es.amount,
    cc.name as responsible
FROM expense_splits es
JOIN cost_centers cc ON cc.id = es.cost_center_id
WHERE es.expense_id = (SELECT id FROM expenses WHERE description = 'Jantar Especial')
ORDER BY cc.name;
```

**Resultado Esperado:**
```
Despesa:
description      | amount | owner          | split | cost_center_id
Jantar Especial  | 300.00 | Compartilhado  | true  | NULL

Splits:
percentage | amount | responsible
70.00      | 210.00 | Felipe
30.00      | 90.00  | Letícia
```

---

## 📋 **Passo 6: Verificar Despesas Antigas**

```sql
-- Ver despesas compartilhadas antigas
SELECT 
    id,
    description,
    amount,
    owner,
    split,
    cost_center_id,
    created_at
FROM expenses 
WHERE owner = 'Compartilhado'
  AND organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9'
ORDER BY created_at;
```

**Resultado Esperado:**
- Todas devem ter `cost_center_id = NULL`
- Despesas antigas: `split` pode ser `false` ou `true`
- Despesas novas: `split = true`

---

## ✅ **Checklist Final**

- [ ] Cost_center "Compartilhado" removido
- [ ] Despesas antigas com `cost_center_id = NULL`
- [ ] Dropdown mostra: Felipe, Letícia, Compartilhado
- [ ] Despesa individual: `cost_center_id = <uuid>`, `split = false`
- [ ] Despesa compartilhada padrão: `cost_center_id = NULL`, `split = true`, sem splits
- [ ] Despesa compartilhada personalizada: `cost_center_id = NULL`, `split = true`, com splits
- [ ] Interface funciona normalmente

---

## 🐛 **Possíveis Problemas**

### **"Responsável inválido" ao salvar:**
**Causa:** `ownerOptions` não inclui "Compartilhado"
**Solução:** Verificar se `useMemo` está correto no ExpenseModal

### **Dropdown não mostra "Compartilhado":**
**Causa:** `costCenters` está vazio ou lógica do filtro incorreta
**Solução:** Verificar console.log de `ownerOptions`

### **`cost_center_id` não é NULL:**
**Causa:** Lógica `costCenter?.id || null` não está funcionando
**Solução:** Verificar se `selectedOption.isShared` está correto

---

## 🎯 **Próximos Passos Após Teste**

1. Atualizar `MonthCharts.jsx` para calcular gráficos corretamente
2. Atualizar outros componentes que usam `costCenters`
3. Reabilitar RLS depois dos testes
4. Testar fluxo completo end-to-end

---

**Comece pelo Passo 1 e me informe o resultado!** 🚀

