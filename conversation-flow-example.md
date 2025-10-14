# 🔄 FLUXO DE CONVERSA SEQUENCIAL IMPLEMENTADO

## 📱 **EXEMPLO: "Gastei 50"**

### **PASSO 1 - Usuário envia mensagem inicial:**
```
Usuário: "Gastei 50"
```

### **PASSO 2 - Sistema analisa e identifica campos faltando:**
```json
{
  "valor": 50,
  "descricao": null,
  "categoria": "Outros",
  "metodo_pagamento": null,
  "responsavel": null,
  "data": "hoje",
  "confianca": 0.6,
  "precisa_confirmar": true
}
```

### **PASSO 3 - Sistema cria despesa pendente e pergunta:**
```
Sistema: "💰 R$ 50,00 - (Outros)

💳 Método de pagamento: Débito, Crédito, PIX ou Dinheiro?"
```

### **PASSO 4 - Usuário responde método:**
```
Usuário: "Débito"
```

### **PASSO 5 - Sistema processa resposta e pergunta próximo campo:**
```
Sistema: "👤 Responsável: Felipe, Letícia ou Compartilhado?"
```

### **PASSO 6 - Usuário responde responsável:**
```
Usuário: "Felipe"
```

### **PASSO 7 - Sistema finaliza e salva:**
```
Sistema: "✅ Despesa registrada!

💰 R$ 50,00 - 
📂 Outros - Felipe
💳 Cartão de Débito
📅 14/10/2025"
```

## 🔄 **FLUXO COMPLETO IMPLEMENTADO:**

### **1. DETECÇÃO DE CONVERSA EM ANDAMENTO:**
- ✅ Sistema verifica se há despesa pendente para o usuário
- ✅ Se houver, continua a conversa existente
- ✅ Se não houver, inicia nova conversa

### **2. ESTADO DA CONVERSA:**
```json
{
  "missing_fields": ["metodo_pagamento", "responsavel"],
  "metodo_pagamento": null,
  "responsavel": null
}
```

### **3. PERGUNTAS SEQUENCIAIS:**
- ✅ **Campo 1**: Método de pagamento
- ✅ **Campo 2**: Responsável (Felipe, Letícia, Compartilhado)
- ✅ **Finalização**: Salva quando todos os campos estão preenchidos

### **4. PROCESSAMENTO INTELIGENTE:**
- ✅ IA analisa cada resposta do usuário
- ✅ Mapeia para valores válidos do sistema
- ✅ Atualiza estado da conversa
- ✅ Pergunta próximo campo automaticamente

### **5. PERSISTÊNCIA:**
- ✅ Despesa salva como "pending" durante conversa
- ✅ Atualizada com cada resposta
- ✅ Finalizada como "confirmed" quando completa

## 🎯 **CAMPOS OBRIGATÓRIOS:**

### **SEMPRE EXTRAÍDOS:**
- ✅ **Valor**: Detectado na mensagem inicial
- ✅ **Data**: Padrão "hoje" se não especificada
- ✅ **Categoria**: Mapeada automaticamente

### **PERGUNTADOS SE FALTANDO:**
- ❓ **Método de Pagamento**: credit_card, debit_card, pix, cash, other
- ❓ **Responsável**: Felipe, Letícia, Compartilhado

## 🛡️ **SEGURANÇAS IMPLEMENTADAS:**

### **1. VALIDAÇÃO DE RESPOSTAS:**
- ✅ IA valida cada resposta do usuário
- ✅ Mapeia para valores válidos do sistema
- ✅ Rejeita respostas inválidas

### **2. TIMEOUT DE CONVERSA:**
- ✅ Conversas pendentes podem ser canceladas
- ✅ Sistema limpa estados órfãos
- ✅ Previne acúmulo de dados desnecessários

### **3. FALLBACK:**
- ✅ Se IA não entender resposta, pergunta novamente
- ✅ Se erro persistir, cancela conversa
- ✅ Logs detalhados para debug

## 📊 **EXEMPLOS DE FLUXOS:**

### **FLUXO COMPLETO:**
```
"Gastei 50" → "Débito" → "Felipe" → ✅ SALVO
```

### **FLUXO PARCIAL:**
```
"Gastei 50" → "Débito" → [usuário para de responder] → ⏳ PENDENTE
```

### **FLUXO COM ERRO:**
```
"Gastei 50" → "XYZ" → "Não entendi, tente: Débito, Crédito..." → "Débito" → "Felipe" → ✅ SALVO
```

## 🚀 **VANTAGENS DO SISTEMA:**

1. **Persistente**: Não perde contexto entre mensagens
2. **Inteligente**: IA processa cada resposta individualmente
3. **Flexível**: Aceita respostas em qualquer ordem
4. **Robusto**: Trata erros e timeouts graciosamente
5. **Eficiente**: Só pergunta o que realmente falta
6. **Seguro**: Valida todas as entradas antes de salvar
