# Sistema de Notificações Push - MeuAzulão Mobile

## Status Atual
✅ **Estrutura Criada** - Serviço e hook prontos
⏳ **Aguardando Setup** - Necessário instalar dependências

## Instalação

Para ativar o sistema de notificações push:

```bash
cd packages/mobile
npx expo install expo-notifications expo-device expo-constants
```

## Configuração

### 1. Descomentar código nos arquivos

#### `/packages/mobile/src/services/notificationService.js`
- Descomentar todos os imports do Expo
- Descomentar implementações dos métodos

#### `/packages/mobile/app.json`
Adicionar configuração de notificações:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#6366F1",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#6366F1",
      "androidMode": "default",
      "androidCollapsedTitle": "MeuAzulão"
    }
  }
}
```

### 2. Criar tabela no Supabase

Execute a migration SQL:

```sql
-- Criar tabela de tokens de push
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'ios' ou 'android'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Índices
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_token ON push_tokens(token);

-- RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tokens"
  ON push_tokens
  FOR ALL
  USING (auth.uid() = user_id);
```

### 3. Integrar no App

#### No componente raiz (App.js ou AppNavigator):

```javascript
import { useNotifications } from './src/hooks/useNotifications';

function App() {
  const { user } = useOrganization();
  const { token, error } = useNotifications(user?.id);

  useEffect(() => {
    if (token) {
      console.log('✅ Push notifications configuradas');
    }
    if (error) {
      console.error('❌ Erro nas notificações:', error);
    }
  }, [token, error]);

  // ... resto do app
}
```

## Funcionalidades Implementadas

### 1. Notificações de Contas a Pagar

```javascript
// Agendar notificação 3 dias antes do vencimento
await notificationService.scheduleBillDueNotification(bill, 3);
```

### 2. Alertas de Orçamento

```javascript
// Enviar alerta quando atingir 80% do orçamento
await notificationService.scheduleBudgetAlertNotification(
  'Alimentação',
  800, // gasto
  1000  // orçamento
);
```

### 3. Notificações Personalizadas

```javascript
await notificationService.scheduleLocalNotification({
  title: 'Título',
  body: 'Mensagem',
  data: { type: 'custom', id: '123' },
  trigger: { 
    date: new Date(Date.now() + 60000) // 1 minuto
    // ou
    // seconds: 60,
    // repeats: true
  }
});
```

## Backend - Envio de Push Notifications

Para enviar notificações do backend (Supabase Edge Functions):

```javascript
// supabase/functions/send-push/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { userId, title, body, data } = await req.json();

  // Buscar token do usuário
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId);

  if (!tokens || tokens.length === 0) {
    return new Response('No tokens found', { status: 404 });
  }

  // Enviar para Expo Push Service
  const messages = tokens.map(t => ({
    to: t.token,
    sound: 'default',
    title,
    body,
    data,
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  return new Response(JSON.stringify(await response.json()), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## Tipos de Notificações Planejadas

### 📅 Contas a Pagar
- 3 dias antes do vencimento
- No dia do vencimento
- Quando vencida (diário)

### 💰 Orçamentos
- 80% do orçamento atingido
- 100% do orçamento excedido
- Fim do mês com orçamento não utilizado

### 🎯 Metas
- Meta concluída (100%)
- Meta próxima do prazo (7 dias antes)
- Sugestão de aporte mensal

### 📊 Insights
- Resumo mensal (último dia do mês)
- Comparação de gastos (semanal)
- Dicas de economia personalizadas

## Navegação por Notificações

O sistema já está preparado para navegar para telas específicas quando o usuário toca na notificação:

```javascript
// No notificationService.js
handleNotificationTap(data) {
  if (data.type === 'bill_due') {
    navigation.navigate('Mais', { screen: 'Bills' });
  } else if (data.type === 'budget_alert') {
    navigation.navigate('Mais', { screen: 'Budgets' });
  } else if (data.type === 'goal_completed') {
    navigation.navigate('Mais', { screen: 'Goals' });
  }
}
```

## Testing

Para testar notificações locais sem backend:

```javascript
// Em qualquer tela
import { notificationService } from '../services/notificationService';

// Testar notificação imediata
await notificationService.scheduleLocalNotification({
  title: 'Teste',
  body: 'Esta é uma notificação de teste',
  data: { type: 'test' },
  trigger: null, // Enviar imediatamente
});

// Testar notificação agendada (5 segundos)
await notificationService.scheduleLocalNotification({
  title: 'Teste Agendado',
  body: 'Esta notificação foi agendada',
  data: { type: 'test' },
  trigger: { seconds: 5 },
});
```

## Permissões

O sistema já solicita permissões automaticamente ao iniciar. Caso o usuário negue:

1. Mostrar explicação dos benefícios
2. Fornecer botão para abrir configurações do app
3. Funcionar normalmente sem notificações

## Próximos Passos

1. ✅ Estrutura criada
2. ⏳ Instalar dependências
3. ⏳ Descomentar código
4. ⏳ Criar tabela no Supabase
5. ⏳ Configurar app.json
6. ⏳ Implementar backend (Edge Functions)
7. ⏳ Testar em dispositivos reais (não funciona em simulator)
8. ⏳ Publicar app e configurar certificados (iOS APNs, Android FCM)

## Referências

- [Expo Notifications Docs](https://docs.expo.dev/push-notifications/overview/)
- [Expo Push Service](https://expo.dev/notifications)
- [React Native Firebase](https://rnfirebase.io/) (alternativa)

