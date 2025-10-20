# 🧪 Teste - Gráficos com Expense Splits

## 📊 **Dados de Teste Atuais:**

### **Despesas no Banco:**
1. **Uber Teste** - R$ 50,00 - Felipe (individual)
2. **Mercado Teste** - R$ 100,00 - Compartilhado (fallback 50/50)
3. **Jantar Teste** - R$ 200,00 - Compartilhado (personalizado 60/40)

---

## 🎯 **Cálculo Esperado:**

### **Felipe:**
- Uber Teste: R$ 50,00 (despesa individual)
- Mercado Teste: R$ 50,00 (50% de R$ 100 - fallback)
- Jantar Teste: R$ 120,00 (60% de R$ 200 - personalizado)
- **TOTAL: R$ 220,00**

### **Letícia:**
- Mercado Teste: R$ 50,00 (50% de R$ 100 - fallback)
- Jantar Teste: R$ 80,00 (40% de R$ 200 - personalizado)
- **TOTAL: R$ 130,00**

---

## 📋 **Passos do Teste:**

### **1. Acesse o Dashboard**
```
http://localhost:3000/dashboard
```

### **2. Selecione o mês atual (Outubro 2025)**

### **3. Verifique o gráfico "Por Responsável"**

**Deve mostrar:**
```
🔵 Felipe:  R$ 220,00  (63%)
🔴 Letícia: R$ 130,00  (37%)
```

---

## ✅ **Verificações:**

- [ ] Gráfico mostra Felipe com R$ 220,00
- [ ] Gráfico mostra Letícia com R$ 130,00
- [ ] Percentuais estão corretos (63% e 37%)
- [ ] Não aparece "Compartilhado" como fatia separada
- [ ] Ao passar o mouse, mostra valores corretos no centro do donut

---

## 🐛 **Se der erro:**

### **Console mostra erro de expense_splits:**
**Causa:** RLS ainda está desabilitado ou tabela não existe
**Solução:** Verificar se executou o SQL corretamente

### **Gráfico mostra valores errados:**
**Causa:** Lógica de cálculo incorreta
**Solução:** Verificar console.log no MonthCharts para debug

### **Gráfico não aparece:**
**Causa:** Despesas não estão vindo com expense_splits
**Solução:** Verificar network tab no DevTools

---

## 📝 **Após Teste:**

Me informe:
1. ✅ Se os valores estão corretos
2. ✅ Se há algum erro no console
3. ✅ Print do gráfico (se possível)

**Depois vamos para o próximo passo: Edição de splits!** 🚀

