# 🧪 Guia de Testes - Divisão de Despesas Compartilhadas

## 📋 **Passo 1: Executar SQL no Supabase**

1. Acesse o **Supabase SQL Editor**
2. Abra o arquivo `docs/add-expense-splits-table.sql`
3. Execute todo o script
4. Verifique se aparece "✅ SUCCESS" em todos os checks finais

**Resultado Esperado:**
```
✅ expense_splits table - EXISTS
✅ RLS enabled - ENABLED  
✅ default_card_id removed - REMOVED
```

---

## 📋 **Passo 2: Verificar Cost Centers**

Execute no Supabase SQL Editor:
```sql
SELECT 
    name, 
    type, 
    split_percentage,
    color
FROM cost_centers 
WHERE organization_id = '092adfb3-41d8-4006-bfa5-7035358560e9'
ORDER BY type DESC, name;
```

**Resultado Esperado:**
```
Felipe      | individual | 50.00 | #3B82F6
Letícia     | individual | 50.00 | #EC4899
Compartilhado | shared   | 0.00  | #8B5CF6
```

---

## 📋 **Passo 3: Testar Despesa Compartilhada (Padrão)**

### **3.1. Adicionar Despesa:**
1. Acesse `/dashboard/expenses`
2. Clique em "Nova Despesa"
3. Preencha:
   - **Descrição**: `Mercado Teste`
   - **Valor**: `100.00`
   - **Data**: Hoje
   - **Categoria**: Alimentação
   - **Responsável**: `Compartilhado` ← **IMPORTANTE**
   - **Forma de Pagamento**: Dinheiro

### **3.2. Verificar Divisão:**
- **Deve aparecer automaticamente:**
  ```
  Divisão da Despesa    [Personalizar]
  
  🔵 Felipe     50% (R$ 50.00)
  🔴 Letícia    50% (R$ 50.00)
  ```

### **3.3. Salvar e Verificar:**
1. Clique em "Salvar"
2. Verifique no banco:
```sql
SELECT 
    id, 
    description, 
    amount, 
    owner, 
    split
FROM expenses 
WHERE description = 'Mercado Teste';
```

**Resultado Esperado:**
```
description    | amount | owner          | split
Mercado Teste  | 100.00 | Compartilhado  | true
```

3. Verifique se **NÃO** criou `expense_splits`:
```sql
SELECT * FROM expense_splits 
WHERE expense_id = (
    SELECT id FROM expenses 
    WHERE description = 'Mercado Teste'
);
```

**Resultado Esperado:**
```
0 rows (porque usou fallback padrão)
```

---

## 📋 **Passo 4: Testar Despesa Compartilhada (Personalizada)**

### **4.1. Adicionar Despesa:**
1. Acesse `/dashboard/expenses`
2. Clique em "Nova Despesa"
3. Preencha:
   - **Descrição**: `Restaurante Teste`
   - **Valor**: `100.00`
   - **Data**: Hoje
   - **Categoria**: Alimentação
   - **Responsável**: `Compartilhado`
   - **Forma de Pagamento**: PIX

### **4.2. Personalizar Divisão:**
1. Clique em **"Personalizar"**
2. Altere os percentuais:
   - **Felipe**: `60%` → Deve mostrar `R$ 60.00`
   - **Letícia**: `40%` → Deve mostrar `R$ 40.00`
3. Verifique o **Total**: Deve mostrar `100.00%` em verde

### **4.3. Salvar e Verificar:**
1. Clique em "Salvar"
2. Verifique a despesa:
```sql
SELECT 
    id, 
    description, 
    amount, 
    owner, 
    split
FROM expenses 
WHERE description = 'Restaurante Teste';
```

**Resultado Esperado:**
```
description        | amount | owner          | split
Restaurante Teste  | 100.00 | Compartilhado  | true
```

3. Verifique os `expense_splits`:
```sql
SELECT 
    es.percentage,
    es.amount,
    cc.name as responsible
FROM expense_splits es
JOIN cost_centers cc ON cc.id = es.cost_center_id
WHERE es.expense_id = (
    SELECT id FROM expenses 
    WHERE description = 'Restaurante Teste'
)
ORDER BY cc.name;
```

**Resultado Esperado:**
```
percentage | amount | responsible
60.00      | 60.00  | Felipe
40.00      | 40.00  | Letícia
```

---

## 📋 **Passo 5: Testar Validação**

### **5.1. Testar Soma Incorreta:**
1. Adicione despesa compartilhada
2. Clique em "Personalizar"
3. Coloque:
   - **Felipe**: `70%`
   - **Letícia**: `20%`
4. Tente salvar

**Resultado Esperado:**
```
⚠️ Alert: "A divisão deve somar exatamente 100%"
```

---

## 📋 **Passo 6: Verificar Gráficos**

### **6.1. Acesse Dashboard:**
1. Vá para `/dashboard`
2. Abra o gráfico "Por Responsável"

### **6.2. Verificar Cálculos:**

**Despesa 1 (Mercado Teste - Padrão):**
- Felipe: R$ 50.00
- Letícia: R$ 50.00

**Despesa 2 (Restaurante Teste - Personalizada):**
- Felipe: R$ 60.00
- Letícia: R$ 40.00

**Total Esperado no Gráfico:**
- **Felipe**: R$ 110.00
- **Letícia**: R$ 90.00

---

## 📋 **Passo 7: Testar Despesa Individual**

### **7.1. Adicionar Despesa:**
1. Adicione despesa com **Responsável**: `Felipe`
2. Valor: `50.00`

### **7.2. Verificar:**
- **NÃO deve mostrar** seção "Divisão da Despesa"
- **Deve salvar** normalmente como individual

---

## ✅ **Checklist Final**

- [ ] SQL executado com sucesso
- [ ] Cost_centers com percentuais corretos (50/50)
- [ ] Despesa compartilhada padrão cria sem expense_splits
- [ ] Despesa compartilhada personalizada cria expense_splits
- [ ] Validação de 100% funciona
- [ ] Gráficos calculam corretamente
- [ ] Despesa individual não mostra divisão
- [ ] Interface responsiva e intuitiva

---

## 🐛 **Possíveis Erros e Soluções**

### **Erro: "split_percentage is null"**
**Solução:** Execute o SQL de atualização dos cost_centers novamente

### **Erro: "expense_splits table does not exist"**
**Solução:** Execute o SQL de criação da tabela

### **Erro: "Total não soma 100%"**
**Solução:** Ajuste manualmente os percentuais até somar exatamente 100.00%

---

## 📞 **Reporte de Bugs**

Se encontrar qualquer problema, me informe:
1. Qual passo falhou
2. Mensagem de erro
3. Print da tela (se possível)

