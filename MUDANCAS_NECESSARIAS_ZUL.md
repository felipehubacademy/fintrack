# 🔧 MUDANÇAS NECESSÁRIAS NO CÓDIGO DO ZUL

## ⚠️ MUDANÇA CRÍTICA: TABELA

### Estrutura Antiga vs Nova

```sql
-- ❌ ESTRUTURA ANTIGA (código atual está usando isso)
CREATE TABLE conversation_state (
  user_phone TEXT PRIMARY KEY,
  state TEXT,
  temp_data JSONB,
  updated_at TIMESTAMP
);

-- ✅ ESTRUTURA NOVA (banco já tem)
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL,
  conversation_state JSONB NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Mapeamento de Campos

| Antigo | Novo |
|--------|------|
| `user_phone` | `phone` |
| `state` | `status` |
| `temp_data` | `conversation_state` |
| (não existia) | `user_id` |
| (não existia) | `organization_id` |

---

## 📍 LOCAIS PARA ATUALIZAR

### Arquivo: `backend/services/zulAssistant.js`

#### Linha 321 - `loadThreadFromDB()`
```javascript
// ❌ ANTES
const { data, error } = await supabase
  .from('conversation_state')
  .select('*')
  .eq('user_phone', normalizedPhone)
  .neq('state', 'idle')
  .single();

// ✅ DEPOIS
const { data, error } = await supabase
  .from('conversations')
  .select('*')
  .eq('phone', normalizedPhone)
  .neq('status', 'completed')
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

#### Linha 365 - `saveThreadToDB()`
```javascript
// ❌ ANTES
const { error } = await supabase
  .from('conversation_state')
  .upsert({
    user_phone: normalizedPhone,
    state: state,
    temp_data: {
      assistant_thread_id: threadId,
      ...extraData
    },
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'user_phone'
  });

// ✅ DEPOIS
const { error } = await supabase
  .from('conversations')
  .upsert({
    user_id: extraData.user_id,
    organization_id: extraData.organization_id,
    phone: normalizedPhone,
    status: state,
    conversation_state: {
      assistant_thread_id: threadId,
      ...extraData
    },
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'phone' // Assume unique constraint on (phone, user_id, organization_id)
  });
```

#### Linha 404 - `clearThread()`
```javascript
// ❌ ANTES
await supabase
  .from('conversation_state')
  .update({ 
    state: 'idle',
    temp_data: {}
  })
  .eq('user_phone', normalizedPhone);

// ✅ DEPOIS
await supabase
  .from('conversations')
  .update({ 
    status: 'completed',
    conversation_state: {}
  })
  .eq('phone', normalizedPhone);
```

#### Linha 602 e 640 - `loadConversationHistory()` e `saveToHistory()`
```javascript
// Similar às mudanças acima
// Trocar: conversation_state → conversations
// Trocar: user_phone → phone
// Trocar: state → status
// Trocar: temp_data → conversation_state
```

#### Linha 669 - `clearConversationHistory()`
```javascript
// Similar às mudanças acima
```

### Arquivo: `backend/services/smartConversation.js`

#### Linha 946 - Debug do estado
```javascript
// ❌ ANTES
await supabase.from('conversation_state').upsert({...});

// ✅ DEPOIS  
await supabase.from('conversations').upsert({...});
```

---

## 📊 DIAGRAMA: ANTES vs DEPOIS

### Fluxo de Persistência

```
📱 WhatsApp Message
    ↓
🤖 ZulAssistant.processMessage()
    ↓
💾 loadThreadFromDB(phone)
    ↓
    ├─→ Busca no banco → ❌ ANTES: 'conversation_state'
    │                        ✅ DEPOIS: 'conversations'
    │
    ├─→ Filtra por → ❌ ANTES: .eq('user_phone', ...)
    │                  ✅ DEPOIS: .eq('phone', ...)
    │
    ├─→ Estado → ❌ ANTES: .neq('state', 'idle')
    │               ✅ DEPOIS: .neq('status', 'completed')
    │
    └─→ Dados → ❌ ANTES: .select('temp_data')
                    ✅ DEPOIS: .select('conversation_state')
```

---

## 🎯 CASOS DE USO AFETADOS

### Caso 1: Primeira Mensagem
```javascript
// Usuário: "Gastei 50 no mercado"

// Fluxo:
1. getOrCreateThread() → Busca conversations
2. Não encontra → Cria nova thread
3. Salva em conversations.status = 'pending'
4. conversation_state = { assistant_thread_id: 'thread_xxx' }
```

### Caso 2: Continuando Conversa
```javascript
// Usuário: "PIX"

// Fluxo:
1. getOrCreateThread() → Busca conversations
2. Encontra status = 'pending'
3. Carrega conversation_state
4. Retorna thread_id
5. Continua conversa
```

### Caso 3: Salvando Despesa
```javascript
// Usuário: "Felipe"

// Fluxo:
1. save_expense() salva despesa
2. clearThread() → Atualiza status = 'completed'
3. Limpa conversation_state = {}
```

---

## ✅ CHECKLIST DE MUDANÇAS

### Backend Services
- [ ] `zulAssistant.js` linha 321
- [ ] `zulAssistant.js` linha 365
- [ ] `zulAssistant.js` linha 404
- [ ] `zulAssistant.js` linha 602
- [ ] `zulAssistant.js` linha 640
- [ ] `zulAssistant.js` linha 669
- [ ] `smartConversation.js` linha 946

### Campos Adicionar
- [ ] `user_id` (obter do user)
- [ ] `organization_id` (obter do user)
- [ ] Ajustar `phone` (normalizar)
- [ ] Ajustar `status` (usar valores corretos)
- [ ] Ajustar `conversation_state` (JSONB)

### Constraint Unique
- [ ] Verificar se existe: `(phone, user_id, organization_id)`
- [ ] Se não existe, criar: `unique(phone, user_id, organization_id)`

---

## 🧪 TESTES NECESSÁRIOS

### Teste 1: Criar Nova Conversa
```javascript
// Simular primeira mensagem
const phone = '5511999999999';
const thread = await zul.getOrCreateThread(userId, phone);

// Verificar:
const { data } = await supabase
  .from('conversations')
  .select('*')
  .eq('phone', phone)
  .single();

console.assert(data.status === 'pending');
console.assert(data.conversation_state.assistant_thread_id === thread);
```

### Teste 2: Continuar Conversa
```javascript
// Simular segunda mensagem
const phone = '5511999999999';
const thread = await zul.getOrCreateThread(userId, phone);

// Verificar que retorna thread existente (não cria nova)
console.assert(thread === existingThreadId);
```

### Teste 3: Limpar Após Salvar
```javascript
// Simular finalização
await zul.clearThread(userId, phone);

// Verificar:
const { data } = await supabase
  .from('conversations')
  .select('*')
  .eq('phone', phone)
  .single();

console.assert(data.status === 'completed');
console.assert(data.conversation_state === {});
```

---

## 🚀 SCRIPT DE MIGRAÇÃO

### SQL: Criar Constraint Unique

```sql
-- Verificar se já existe
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'conversations' 
  AND constraint_type = 'UNIQUE';

-- Se não existir, criar:
ALTER TABLE conversations 
ADD CONSTRAINT conversations_phone_user_org_unique 
UNIQUE (phone, user_id, organization_id);
```

### Migração de Dados (se necessário)

```sql
-- Se já tem dados na tabela antiga conversation_state
-- Migrar para conversations

INSERT INTO conversations (user_id, organization_id, phone, status, conversation_state, updated_at)
SELECT 
  u.id as user_id,
  o.id as organization_id,
  cs.user_phone as phone,
  cs.state as status,
  cs.temp_data as conversation_state,
  cs.updated_at
FROM conversation_state cs
JOIN users u ON u.phone = cs.user_phone
JOIN organizations o ON o.id = u.organization_id;
```

---

## 📝 RESUMO DAS MUDANÇAS

### Arquivos Modificados:
1. `backend/services/zulAssistant.js` (6 mudanças)
2. `backend/services/smartConversation.js` (1 mudança)
3. Criar: `backend/utils/paymentNormalizer.js`
4. Criar: SQL de migração

### Dados Adicionais Necessários:
- `user_id` (buscar do user)
- `organization_id` (buscar do user)

### Comportamento Mantido:
- ✅ Funcionalidades iguais
- ✅ API iguais
- ✅ Apenas estrutura interna muda

---

**Pronto para implementar!** 🚀


