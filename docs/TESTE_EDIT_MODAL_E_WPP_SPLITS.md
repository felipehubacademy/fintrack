# 🧪 Teste: Modal de Edição com Splits + WhatsApp

## ✅ **O que foi implementado:**

### 1. **Modal de Edição de Despesas (`EditExpenseModal`)**
- ✅ Componente reusável e responsivo
- ✅ Busca despesa com `expense_splits` existentes
- ✅ Permite editar responsável (individual ou Compartilhado)
- ✅ Mostra divisão padrão quando "Compartilhado" é selecionado
- ✅ Permite personalizar percentuais de divisão
- ✅ Valida que a soma dos percentuais seja 100%
- ✅ Recalcula valores automaticamente ao mudar amount ou percentuais
- ✅ Salva splits personalizados no banco (`expense_splits`)
- ✅ Deleta splits ao mudar de compartilhado para individual

### 2. **SmartConversation (WhatsApp)**
- ✅ Detecta quando `owner = 'Compartilhado'`
- ✅ Define `cost_center_id = NULL` para despesas compartilhadas
- ✅ Define `split = true` para despesas compartilhadas
- ✅ **NÃO cria** `expense_splits` (usa fallback do frontend)
- ✅ Log indicando uso do fallback

---

## 🧪 **Testes Sugeridos:**

### **Teste 1: Edição de Despesa Individual → Compartilhada**
1. Acesse `/dashboard/expenses`
2. Edite uma despesa de Felipe (ou Letícia)
3. Mude o responsável para "Compartilhado"
4. Veja a divisão padrão aparecer (50% Felipe, 50% Letícia)
5. Salve sem personalizar
6. **Resultado esperado:**
   - `owner = 'Compartilhado'`
   - `cost_center_id = NULL`
   - `split = true`
   - **SEM** `expense_splits` no banco (usar fallback)
   - Gráfico "Por Responsável" divide 50/50

---

### **Teste 2: Edição com Divisão Personalizada**
1. Edite uma despesa
2. Mude para "Compartilhado"
3. Clique em "Personalizar"
4. Altere para 70% Felipe, 30% Letícia
5. Salve
6. **Resultado esperado:**
   - `expense_splits` criados no banco:
     ```sql
     SELECT * FROM expense_splits WHERE expense_id = [id_da_despesa];
     -- Felipe: 70%
     -- Letícia: 30%
     ```
   - Gráfico "Por Responsável" reflete 70/30

---

### **Teste 3: Edição de Compartilhada → Individual**
1. Edite uma despesa compartilhada (do Teste 1 ou 2)
2. Mude para "Felipe" ou "Letícia"
3. Salve
4. **Resultado esperado:**
   - `owner = 'Felipe'` (ou Letícia)
   - `cost_center_id = [id_do_felipe]`
   - `split = false`
   - `expense_splits` deletados do banco

---

### **Teste 4: WhatsApp - Despesa Compartilhada**
1. Envie pelo WhatsApp: `"Gastei 100 no mercado"`
2. Responda método: `"Débito"`
3. Responda responsável: `"Compartilhado"`
4. **Resultado esperado:**
   - Despesa criada com `split = true`
   - `cost_center_id = NULL`
   - **SEM** `expense_splits` no banco
   - Gráfico divide usando `split_percentage` dos cost_centers
   - Log no backend: `✅ [SPLIT] Despesa compartilhada criada com fallback de divisão (sem expense_splits)`

---

### **Teste 5: WhatsApp - Despesa Individual**
1. Envie: `"Gastei 50 na padaria"`
2. Responda: `"PIX"`
3. Responda: `"Felipe"`
4. **Resultado esperado:**
   - `owner = 'Felipe'`
   - `cost_center_id = [id_do_felipe]`
   - `split = false`
   - Gráfico soma 100% para Felipe

---

### **Teste 6: Validação de Percentuais**
1. Edite despesa → Compartilhado → Personalizar
2. Defina: Felipe 40%, Letícia 40%
3. Tente salvar
4. **Resultado esperado:**
   - ❌ Alerta: "A divisão deve somar exatamente 100%"
   - Não salva até corrigir

---

## 📊 **Verificação no Banco:**

### **Despesa Compartilhada SEM personalização:**
```sql
SELECT id, owner, cost_center_id, split, amount
FROM expenses
WHERE owner = 'Compartilhado'
AND split = true
AND cost_center_id IS NULL;

-- Não deve ter splits:
SELECT * FROM expense_splits WHERE expense_id IN (SELECT id FROM expenses WHERE owner = 'Compartilhado' AND split = true);
-- Resultado: vazio (usa fallback)
```

### **Despesa Compartilhada COM personalização:**
```sql
SELECT e.id, e.owner, e.amount, es.cost_center_id, es.percentage, es.amount
FROM expenses e
JOIN expense_splits es ON es.expense_id = e.id
WHERE e.owner = 'Compartilhado';
```

---

## 🎯 **Comportamento Esperado:**

| Cenário | `owner` | `cost_center_id` | `split` | `expense_splits` | Divisão |
|---------|---------|------------------|---------|------------------|---------|
| Individual | Felipe | [uuid] | false | - | 100% Felipe |
| Compartilhado (padrão) | Compartilhado | NULL | true | **vazio** | **Fallback** (50/50) |
| Compartilhado (custom) | Compartilhado | NULL | true | **sim** | Percentuais custom |

---

## ⚠️ **Importante:**

1. **Fallback é automático:** Se `split = true` e **NÃO** há `expense_splits`, o frontend usa `split_percentage` dos `cost_centers`.
2. **WhatsApp sempre usa fallback:** Nunca cria `expense_splits` via WhatsApp.
3. **Frontend pode personalizar:** Apenas no modal de edição/criação manual.

---

## 🐛 **Se algo der errado:**

### **Gráfico não divide corretamente:**
1. Verifique se `MonthCharts` está buscando `expense_splits`:
   ```javascript
   expenses.select(`*, expense_splits(...)`)
   ```
2. Verifique se a lógica de fallback está ativa

### **Modal não salva splits:**
1. Verifique RLS da tabela `expense_splits`
2. Veja console do navegador para erros

### **WhatsApp cria splits (não deveria):**
1. Veja logs do backend: deve aparecer `✅ [SPLIT] Despesa compartilhada criada com fallback`
2. Verifique `handleCompleteInfo` em `smartConversation.js`

---

## 📝 **Logs Úteis:**

**Backend (WhatsApp):**
```
✅ [SPLIT] Despesa compartilhada criada com fallback de divisão (sem expense_splits)
✅ Despesa individual criada
```

**Frontend (Modal):**
```javascript
console.log('Splits salvos:', splitDetails);
```

---

**Qualquer dúvida, chama! 🚀**

