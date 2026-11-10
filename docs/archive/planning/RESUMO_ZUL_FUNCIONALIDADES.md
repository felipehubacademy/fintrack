# 🤖 RESUMO: FUNCIONALIDADES DO ZUL - WHATSAPP

## ✅ O QUE O ZUL FAZ HOJE

### 1. Registro de Despesas via Conversação Natural

#### Casos de Uso Suportados:

| Input do Usuário | Resposta do Zul | O que acontece |
|------------------|-----------------|----------------|
| `"Gastei 50 no mercado"` | `"Opa! 50 no mercado 🛒. Pagou como?"` | Pergunta método de pagamento |
| `"80 farmácia, pix"` | `"Beleza! Quem pagou?"` | Pergunta responsável |
| `"120 no cinema"` → `"Crédito"` → `"Latam 3x"` | `"Registrado! R$ 120 - cinema 💳"` | Registra com parcelas |
| `"30 na padaria, eu"` | `"Anotado! R$ 30 - padaria ✅"` | Registra direto |

---

### 2. Validações Inteligentes

#### ✅ Métodos de Pagamento Reconhecidos:
- **Crédito**: "credito", "cred", "crédito", "credit", "cartão crédito"
- **Débito**: "debito", "deb", "débito", "debit", "cartão débito"
- **PIX**: "pix", "PIX"
- **Dinheiro**: "dinheiro", "cash", "espécie", "especia"
- **Transferência**: "transferencia", "ted", "doc"
- **Boleto**: "boleto", "fatura", "conta"

#### ✅ Validação de Cartões:
- Busca cartões cadastrados da organização
- Sugere cartões disponíveis se inválido
- Suporta parcelas (1x a 12x)

#### ✅ Validação de Responsáveis:
- Busca cost centers da organização
- Suporta "Compartilhado"
- Mapeia "eu" para nome do usuário
- Sugere responsáveis disponíveis se inválido

---

### 3. Contextualização Inteligente

#### Categorização Automática:
O Zul infere categorias baseado em palavras-chave:

```
"mercado"     → Alimentação 🛒
"farmácia"    → Saúde 💊
"posto"       → Transporte ⛽
"restaurante" → Alimentação 🍽️
"uber"        → Transporte 🚗
"academia"    → Saúde/Esporte 💪
```

#### Emojis Contextuais:
- 🛒 Supermercado
- ⛽ Combustível
- 💊 Saúde
- 🍽️ Restaurante
- 🚗 Transporte
- 📄 Contas
- 📚 Educação

---

### 4. Histórico de Conversas

#### Estados da Conversa:
1. **idle** - Sem conversa ativa
2. **awaiting_payment_method** - Aguardando forma de pagamento
3. **awaiting_card** - Aguardando cartão
4. **awaiting_responsible** - Aguardando responsável
5. **awaiting_confirmation** - Aguardando confirmação

#### Persistência:
- Salva no banco (`conversation_state`)
- Cache em memória (otimização)
- Limpeza automática após salvar

---

### 5. Despesas Compartilhadas

#### Como Funciona:
```
Usuario: "200 mercado"
Zul: "Como pagou?"
Usuario: "Débito"
Zul: "Quem foi o responsável?"
Usuario: "Compartilhado"
Zul: "Registrado! R$ 200 compartilhado 👥"
```

#### Características:
- Marca como `split: true`
- Permite ajustar divisão manualmente
- Registra % de cada responsável

---

### 6. Parcelas de Cartão de Crédito

#### Como Funciona:
```
Usuario: "500 no notebook"
Zul: "Como pagou?"
Usuario: "Crédito"
Zul: "Qual cartão e quantas vezes?"
Usuario: "Nubank 6x"
Zul: "Registrado! R$ 500, Nubank 6x de R$ 83.33 💳"
```

#### Características:
- Cria installments no banco
- Distribui valor total em parcelas
- Marca todas como "pending" exceto primeira

---

## 🚫 LIMITAÇÕES ATUAIS

### 1. Não Pode Editar Despesas
- Não há comando "editar" ou "corrigir"
- Usuário precisa registrar nova despesa

### 2. Não Pode Consultar Despesas
- Não há comando "mostrar", "listar" ou "consultar"
- Usuário precisa ir ao app

### 3. Não Pode Cancelar Conversa Pendente
- Não há comando "cancelar" ou "esquece"
- Nova mensagem de despesa cancela automaticamente

### 4. Apenas Despesas (Sem Receitas)
- Não há comando para registrar receitas
- Foco apenas em despesas

### 5. Apenas Hoje (Sem Datas Específicas)
- Todas as despesas são registradas como "hoje"
- Não há suporte para registrar despesas antigas

---

## 🎯 FUNCIONALIDADES FUTURAS (NÃO IMPLEMENTADAS)

### Chat Web:
- ✅ Dicas financeiras gerais
- ✅ Conceitos financeiros
- ✅ Planejamento financeiro
- ❌ Registrar despesas via chat web
- ❌ Consultar histórico
- ❌ Métricas e insights

### WhatsApp:
- ❌ Consultar despesas: *"mostra minhas despesas"*
- ❌ Editar despesa: *"edita aquela de ontem"*
- ❌ Registrar receitas: *"recebi 5000"*
- ❌ Notificações automáticas: *"você gastou muito esta semana"*
- ❌ Relatórios via WhatsApp
- ❌ Comandos de voz (speech to text)

---

## 📊 ESTATÍSTICAS ATUAIS

### Arquivos de Código:
- `smartConversation.js` - 2179 linhas
- `zulAssistant.js` - 1014 linhas
- `zulWebChat.js` - 111 linhas
- `zulMessages.js` - 706 linhas
- `whatsapp.js` - 67 linhas

### Total: ~4077 linhas de código

### Funções Principais:
- `handleMessage()` - Processa mensagens
- `analyzeExpenseMessage()` - Analisa com GPT-4
- `sendConversationalMessage()` - Conversa natural
- `save_expense()` - Salva despesas
- `getUserByPhone()` - Busca usuário
- `validateCard()` - Valida cartões
- `validateResponsible()` - Valida responsáveis
- `normalizePaymentMethod()` - Normaliza pagamento

---

## 🔍 EXEMPLOS DE USO REAL

### Exemplo 1: Despesa Simples
```
Usuario:  "Gastei 50 na farmácia"
Zul:      "Opa! R$ 50 na farmácia 💊. Pagou como?"
Usuario:  "Débito"
Zul:      "E quem pagou?"
Usuario:  "Letícia"
Zul:      "Anotado! R$ 50 - farmácia, Letícia 💊"
```

### Exemplo 2: Despesa com Parcelas
```
Usuario:  "Comprei um ventilador de 400"
Zul:      "400 reais 💰. Pagou como?"
Usuario:  "Crédito"
Zul:      "Qual cartão e em quantas vezes?"
Usuario:  "Nubank 4x"
Zul:      "Quem pagou?"
Usuario:  "Eu"
Zul:      "Registrado! R$ 400 - ventilador, Nubank 4x de R$ 100 💳"
```

### Exemplo 3: Despesa Compartilhada
```
Usuario:  "Paguei 200 no supermercado"
Zul:      "200 no supermercado 🛒. Pagou como?"
Usuario:  "PIX"
Zul:      "Quem foi o responsável?"
Usuario:  "Compartilhado"
Zul:      "Registrado! R$ 200 no supermercado, compartilhado 👥"
```

---

## 🎨 PERSONALIDADE DO ZUL

### Tom de Voz:
- **Sábio jovem**: calmo, claro, curioso
- **Próximo**: usa nome do usuário
- **Respeitoso**: linguagem informal mas educada
- **Conciso**: mensagens curtas

### Variações de Mensagens:
- Direto: *"Como pagou?"*
- Amigável: *"Ah, como você pagou essa?"*
- Contextual: *"Qual forma de pagamento?"*
- Casual: *"Pagou como?"*

### Emojis:
- Contextuais por categoria
- Um emoji por mensagem (máximo)
- Apenas na confirmação final

---

## 📝 COMO FUNCIONA TECNICAMENTE

### Fluxo de Processamento:

1. **Recebe Mensagem** (webhook.js)
2. **Verifica Usuário** (getUserByPhone)
3. **Analisa Mensagem** (GPT-4 ou regex)
4. **Extrai Informações**:
   - Valor
   - Descrição
   - Método de pagamento
   - Responsável
   - Cartão (se crédito)
   - Parcelas (se crédito)
5. **Valida Dados** (validarCartao, validarResponsavel)
6. **Pergunta Dados Faltantes** (se necessário)
7. **Salva Despesa** (save_expense)
8. **Confirma ao Usuário** (mensagem personalizada)
9. **Limpa Histórico** (clearThread)

---

## 🚀 PRÓXIMOS PASSOS RECOMENDADOS

### Curto Prazo (1-2 semanas):
1. ✅ Consolidar fluxos (remover SmartConversation)
2. ✅ Padronizar normalização de pagamento
3. ✅ Melhorar persistência de histórico
4. ✅ Implementar tratamento de erros robusto

### Médio Prazo (1 mês):
5. ✅ Adicionar comando "mostrar despesas"
6. ✅ Adicionar comando "editar despesa"
7. ✅ Suporte a datas passadas
8. ✅ Notificações automáticas

### Longo Prazo (2-3 meses):
9. ✅ Registrar receitas via WhatsApp
10. ✅ Relatórios automáticos
11. ✅ Insights financeiros
12. ✅ Comandos de voz

---

**Documento criado em:** 2025-01-02  
**Atualizado em:** 2025-01-02  
**Versão:** 1.0


