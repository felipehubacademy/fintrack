# 🔧 PLANO DE MIGRAÇÃO E ATUALIZAÇÃO DO ZUL

## ⚠️ PROBLEMA CRÍTICO IDENTIFICADO

### Tabela Mudou de Nome E Estrutura

**ANTES (antiga estrutura):**
```sql
conversation_state
├── user_phone (PK)
├── state (text)
├── temp_data (JSONB)
└── updated_at
```

**DEPOIS (nova estrutura):**
```sql
conversations
├── id (UUID, PK)  
├── user_id (FK → users)
├── organization_id (FK → organizations)
├── phone (text)
├── status (text: 'pending', 'waiting_card_info', 'completed', 'cancelled')
├── conversation_state (JSONB)
├── created_at
└── updated_at
```

### 📍 Locais que Precisam Atualizar

**Arquivo:** `backend/services/zulAssistant.js`

**Linhas a modificar:**
- Linha 321: `.from('conversation_state')`
- Linha 365: `.from('conversation_state')`
- Linha 404: `.from('conversation_state')`
- Linha 602: `.from('conversation_state')`
- Linha 640: `.from('conversation_state')`
- Linha 669: `.from('conversation_state')`

**Arquivo:** `backend/services/smartConversation.js`
- Linha 946: `.from('conversation_state')`

### 🔧 Mudanças Necessárias no Código

#### 1. Ajustar Queries de Leitura

**ANTES:**
```javascript
const { data } = await supabase
  .from('conversation_state')
  .select('*')
  .eq('user_phone', normalizedPhone)
  .neq('state', 'idle')
  .single();
```

**DEPOIS:**
```javascript
const { data } = await supabase
  .from('conversations')
  .select('*')
  .eq('phone', normalizedPhone)
  .neq('status', 'completed')
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

#### 2. Ajustar Queries de Escrita

**ANTES:**
```javascript
await supabase
  .from('conversation_state')
  .upsert({
    user_phone: normalizedPhone,
    state: state,
    temp_data: { ... }
  }, {
    onConflict: 'user_phone'
  });
```

**DEPOIS:**
```javascript
await supabase
  .from('conversations')
  .upsert({
    user_id: userId,
    organization_id: organizationId,
    phone: normalizedPhone,
    status: state,
    conversation_state: { ... }
  }, {
    onConflict: 'phone', // UPSERT por phone + user_id + organization_id (precisa criar unique constraint)
    ignoreDuplicates: false
  });
```

#### 3. Ajustar Mapeamento de Campos

**Mapeamento:**
- `user_phone` → `phone`
- `state` → `status`
- `temp_data` → `conversation_state`
- Adicionar: `user_id`, `organization_id`, `created_at`

---

## ✅ RESPONDENDO SUAS PREOCUPAÇÕES

### 1. "Consolidar os fluxos não vai quebrar nem WhatsApp nem chat web?"

**Resposta:** NÃO VAI QUEBRAR! Aqui está o porquê:

#### Como Funciona Atualmente:

```
WhatsApp:
  ├─→ SmartConversation.handleMessage() (fluxo antigo) ✅
  └─→ ZulAssistant.processMessage() (fluxo novo) ❌ (nunca usado por feature flag)

Chat Web:
  ├─→ web/pages/api/zul-chat.js
  └─→ backend/services/zulAssistant.js
      └─→ ZulWebChat.sendWebChatMessage() ✅ (JÁ FUNCIONA)
```

#### O Que Vai Acontecer na Consolidação:

**Estratégia:**

1. **Manter toda a lógica do ZulAssistant** (que já funciona para web chat)
2. **Integrar funções úteis do SmartConversation** nele
3. **Remover apenas o SmartConversation**

**Resultado:**
- ✅ WhatsApp continua funcionando (agora via ZulAssistant)
- ✅ Chat web continua funcionando (já usa ZulAssistant)
- ✅ Código mais simples e único
- ✅ Mesma funcionalidade, menos código

**Comparação:**

| Aspecto | SmartConversation | ZulAssistant | Consolidado |
|---------|------------------|--------------|-------------|
| Funcionalidades | ✅ Completo | ✅ Completo | ✅ Completo |
| Function Calling | ❌ Não | ✅ Sim | ✅ Sim |
| Histórico Persistido | ⚠️ Parcial | ✅ Completo | ✅ Completo |
| Conversa Natural | ⚠️ Robótica | ✅ Variada | ✅ Variada |
| Chat Web | ❌ Não | ✅ Sim | ✅ Sim |

**Garantia de Não Quebrar:**
- Todos os casos de uso estão em ambos
- Estamos apenas unificando em um único fluxo
- Testes extensivos antes do deploy

---

### 2. "Configurar a feature flag (ou remover) - explique melhor"

**Situação Atual:**
```javascript
// Em smartConversation.js linha 33
this.useAssistant = process.env.USE_ZUL_ASSISTANT === 'true';
```

**Problema:** Variável nunca definida, então sempre `false`

**O que fazer:**

#### Opção 1: Remover Feature Flag (RECOMENDADO)

**Por quê?**
- Feature flag foi criada para transição gradual
- Fluxo novo (ZulAssistant) já está completo
- SmartConversation é código legado
- Consolidação elimina a necessidade

**Como:**
```javascript
// REMOVER estas linhas:
console.log('🔍 [CONSTRUCTOR] USE_ZUL_ASSISTANT raw:', JSON.stringify(process.env.USE_ZUL_ASSISTANT));
this.useAssistant = process.env.USE_ZUL_ASSISTANT === 'true';

// SUBSTITUIR por:
// Sempre usar ZulAssistant
await this.zulAssistant.processMessage(message, userPhone, userContext);
```

#### Opção 2: Manter Feature Flag (não recomendado)

**Se insistir em manter:**
```bash
# Adicionar no .env
USE_ZUL_ASSISTANT=true  # Para usar ZulAssistant
# OU
USE_ZUL_ASSISTANT=false # Para usar SmartConversation
```

**Por que NÃO é recomendado:**
- Dois fluxos paralelos = manutenção dupla
- Duplicação de código
- Bugs aparecem em dois lugares
- Confuso para desenvolvedores

#### Opção 3: Feature Flag Temporária para Migração (HÍBRIDA)

**Para migração segura:**
1. Deploy com flag `false` (SmartConversation)
2. Monitorar logs por 24h
3. Switch gradual: `true` para 10% dos usuários
4. Monitorar erros
5. Aumentar para 50%
6. 100% dos usuários
7. Remover SmartConversation

**Recomendação:** **Opção 1** (remover feature flag e consolidar)

---

### 3. "Padronizar normalização de pagamento - sim, perfeito"

**Criar:** `backend/utils/paymentNormalizer.js`

```javascript
/**
 * Normaliza métodos de pagamento para valores canônicos
 */
export function normalizePaymentMethod(input) {
  if (!input) return 'other';
  
  const normalized = String(input)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
  
  // Mapeamento completo e único
  const mapping = {
    'credit_card': 'credit_card',
    'credito': 'credit_card',
    'cred': 'credit_card',
    'credit': 'credit_card',
    'visa': 'credit_card',
    'mastercard': 'credit_card',
    'amex': 'credit_card',
    
    'debit_card': 'debit_card',
    'debito': 'debit_card',
    'deb': 'debit_card',
    'debit': 'debit_card',
    
    'pix': 'pix',
    
    'cash': 'cash',
    'dinheiro': 'cash',
    'especie': 'cash',
    'espécie': 'cash',
    
    'bank_transfer': 'bank_transfer',
    'transferencia': 'bank_transfer',
    'transfer': 'bank_transfer',
    'ted': 'bank_transfer',
    'doc': 'bank_transfer',
    
    'boleto': 'boleto',
    'fatura': 'boleto',
    'conta': 'boleto'
  };
  
  // Buscar exato primeiro
  if (mapping[normalized]) return mapping[normalized];
  
  // Buscar parcial
  for (const [key, value] of Object.entries(mapping)) {
    if (normalized.includes(key)) return value;
  }
  
  return 'other';
}

// Testes unitários inclusos
if (import.meta.url === `file://${process.argv[1]}`) {
  console.assert(normalizePaymentMethod('credito') === 'credit_card');
  console.assert(normalizePaymentMethod('pix') === 'pix');
  console.assert(normalizePaymentMethod('debit') === 'debit_card');
  console.log('✅ Todos os testes passaram!');
}
```

**Uso:**
```javascript
import { normalizePaymentMethod } from '../utils/paymentNormalizer.js';

const method = normalizePaymentMethod('crédito'); // → 'credit_card'
```

---

### 4. "Fortalecer persistência de histórico - sim, perfeito"

**Problema Atual:**
```javascript
// Cache em memória é perdido em cold starts
const threadCache = new Map();
```

**Solução:**
```javascript
async getOrCreateThread(userId, userPhone) {
  // 1. Buscar do banco SEMPRE primeiro
  const saved = await this.loadThreadFromDB(userPhone);
  
  if (saved) {
    // Validar que thread ainda existe no OpenAI
    const isValid = await this.validateThread(saved.threadId);
    
    if (isValid) {
      // Preencher cache para performance
      threadCache.set(userId, saved);
      return saved.threadId;
    } else {
      // Thread inválida, criar nova
      console.log('⚠️ Thread inválida encontrada, criando nova...');
    }
  }
  
  // 2. Criar nova thread
  const thread = await openai.beta.threads.create();
  await this.saveThreadToDB(userPhone, thread.id, { userId, userPhone });
  
  // 3. Atualizar cache
  threadCache.set(userId, {
    threadId: thread.id,
    userPhone,
    lastUsed: Date.now()
  });
  
  return thread.id;
}

async validateThread(threadId) {
  try {
    const thread = await openai.beta.threads.retrieve(threadId);
    return thread !== null;
  } catch (error) {
    console.error('Thread inválida:', error);
    return false;
  }
}
```

---

## 📋 PLANO DE EXECUÇÃO DETALHADO

### Fase 1: Atualizar Schema (30 min)

```sql
-- 1. Verificar se tabela conversations existe
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'conversations';

-- 2. Verificar estrutura
\d conversations

-- 3. Se necessário, criar constraint única
ALTER TABLE conversations 
ADD CONSTRAINT conversations_phone_user_org_unique 
UNIQUE (phone, user_id, organization_id);
```

### Fase 2: Atualizar Código (2h)

**Arquivos a modificar:**

1. `backend/services/zulAssistant.js`
   - Atualizar todas as queries para `conversations`
   - Ajustar campos (phone, status, conversation_state)
   - Adicionar user_id e organization_id

2. `backend/services/smartConversation.js`
   - Mesmas mudanças
   - OU remover arquivo (se consolidarmos)

3. Criar `backend/utils/paymentNormalizer.js`

### Fase 3: Testes (1h)

```bash
# Teste 1: Registro simples
curl -X POST "webhook" -d '{"message": "50 mercado"}'
# Esperado: Pergunta método de pagamento

# Teste 2: Com pagamento
curl -X POST "webhook" -d '{"message": "80 farmácia, pix"}'
# Esperado: Pergunta responsável

# Teste 3: Registro completo
curl -X POST "webhook" -d '{"message": "120 cinema, crédito, latam, 3x"}'
# Esperado: Registra com sucesso

# Teste 4: Verificar persistência
# Fazer 2 mensagens com tempo (cold start)
# Esperado: Continua conversa anterior
```

### Fase 4: Deploy (30 min)

1. Deploy em staging
2. Testar com usuário real
3. Monitorar logs
4. Deploy em produção
5. Monitorar 24h

---

## 🎯 FUNCIONALIDADES FUTURAS (DEPOIS DA CONSOLIDAÇÃO)

### 1. Consultar Despesas via WhatsApp

```
Usuario: "mostra minhas despesas de hoje"
Zul: "Você gastou R$ 250 hoje:
      • R$ 50 - Mercado
      • R$ 80 - Farmácia
      • R$ 120 - Cinema"
```

### 2. Editar Despesa

```
Usuario: "edita a despesa de 50 no mercado para 70"
Zul: "Atualizado! R$ 70 no mercado 🛒"
```

### 3. Registrar Receitas

```
Usuario: "recebi 5000 de salário"
Zul: "Ótimo! R$ 5000 de salário 💰. Qual categoria?"
```

### 4. Notificações Automáticas

```
Zul: "Você já gastou 80% do orçamento de Alimentação este mês! 🍽️"
```

### 5. Relatórios via WhatsApp

```
Usuario: "resumo do mês"
Zul: "Janeiro 2025:
      Entradas: R$ 10.000
      Saídas: R$ 8.500
      Saldo: R$ 1.500 ✅"
```

---

## ✅ CHECKLIST DE MIGRAÇÃO

### Preparação
- [ ] Back工up do banco de dados
- [ ] Backup do código atual
- [ ] Criar branch `feature/zul-migration`
- [ ] Documentar estado atual

### Atualização de Schema
- [ ] Verificar se tabela `conversations` existe
- [ ] Verificar estrutura correta
- [ ] Criar constraint unique se necessário
- [ ] Testar queries no banco

### Atualização de Código
- [ ] Atualizar `zulAssistant.js` (6 locais)
- [ ] Atualizar `smartConversation.js` (1 local) OU deletar
- [ ] Criar `paymentNormalizer.js`
- [ ] Atualizar todas as queries
- [ ] Testar localmente

### Testes
- [ ] Teste registro simples
- [ ] Teste com parcelas
- [ ] Teste compartilhado
- [ ] Teste persistência
- [ ] Teste cold start
- [ ] Teste chat web

### Deploy
- [ ] Deploy em staging
- [ ] Testes em staging
- [ ] Deploy em produção
- [ ] Monitorar logs

---

**Próximos Passos:**
1. Atualizar código para usar `conversations`
2. Consolidar fluxos (remover SmartConversation)
3. Implementar `paymentNormalizer`
4. Melhorar persistência
5. Testar tudo
6. Deploy

**Estimativa Total:** 4-6 horas  
**Risco:** Baixo (código já testado, apenas refatoração)


