# Guia de Remoção/Desconexão Belvo

## Dois Níveis de Remoção

O sistema suporta dois níveis de remoção para contas e cartões conectados via Belvo Open Finance:

---

## 1. Desconectar Banco Inteiro (Revogar Link)

### O que acontece:
- ✅ Revoga o link no Belvo API (encerra o consentimento)
- ✅ Marca o link como `status='deleted'` no banco de dados
- ✅ Desativa **TODAS** as contas e cartões associados (`is_active=false`)
- ✅ Para de sincronizar dados via webhooks
- ⚠️ **Ação irreversível** - usuário precisa reconectar do zero

### Quando usar:
- Usuário não quer mais compartilhar dados daquele banco
- Consentimento expirou e não quer renovar
- Quer remover completamente o acesso ao banco

### Como usar:
1. Acesse "Contas Bancárias" (`/dashboard/bank-accounts`)
2. Na seção "Contas conectadas via Open Finance", clique em **"Desconectar"** ao lado do banco
3. Confirme a ação no diálogo
4. Todas as contas/cartões daquele banco serão desativadas

### Implementação:
- **API Route**: `DELETE /api/belvo/links/[id]`
- **Função**: `handleDisconnectBelvo(linkId)`
- **Arquivo**: `web/pages/dashboard/bank-accounts.jsx`

---

## 2. Ocultar Conta/Cartão Individual

### O que acontece:
- ✅ Marca apenas aquela conta/cartão como `is_active=false`
- ✅ Oculta da visualização na interface
- ✅ **Mantém o link ativo** (continua sincronizando outras contas/cartões)
- ✅ Dados continuam sendo atualizados via webhooks (mas ficam ocultos)
- ✅ **Ação reversível** - pode reativar a qualquer momento

### Quando usar:
- Usuário tem múltiplas contas no mesmo banco
- Quer ocultar apenas uma conta específica
- Não quer ver aquela conta na listagem, mas mantém as outras
- Quer "arquivar" temporariamente sem revogar o acesso

### Como usar:
1. Acesse "Contas Bancárias" (`/dashboard/bank-accounts`)
2. Localize a conta Belvo específica
3. Clique no botão **"Ocultar conta"** (ícone de lixeira laranja)
4. Confirme no diálogo (aviso de que link permanece ativo)
5. Para reativar, clique no botão de reativação (ícone verde) em contas inativas

### Implementação:
- **Função**: `handleToggleActive(account)`
- **Arquivo**: `web/pages/dashboard/bank-accounts.jsx`
- **Operação**: Atualização direta no Supabase (não passa pela Belvo API)

---

## Comparação

| Aspecto | Desconectar Banco | Ocultar Conta Individual |
|---------|-------------------|--------------------------|
| **Escopo** | Todo o banco | Uma conta/cartão específico |
| **Revoga na Belvo** | ✅ Sim | ❌ Não |
| **Outras contas do mesmo banco** | Desativadas | Permanecem ativas |
| **Sincronização via webhook** | ❌ Para | ✅ Continua |
| **Reversível** | ❌ Não (precisa reconectar) | ✅ Sim (clique para reativar) |
| **Consentimento** | Encerrado | Continua válido |
| **Uso recomendado** | Remoção permanente | Ocultar temporariamente |

---

## Mensagens de Confirmação

### Desconectar Banco:
```
Tem certeza que deseja desconectar este banco? 
Todas as contas e cartões conectados serão desativados.
```

### Ocultar Conta Belvo:
```
Desativar esta conta apenas a ocultará da visualização. 
O link com o banco permanecerá ativo e continuará sincronizando.

Para revogar completamente o acesso, use "Desconectar" 
na seção de bancos conectados acima.

Deseja continuar?
```

### Reativar Conta Oculta:
```
Reativar esta conta fará com que ela apareça novamente na listagem. 
Deseja continuar?
```

---

## Fluxo Recomendado

### Para remover tudo de um banco:
1. Use **"Desconectar Banco"** na seção de bancos conectados
2. Confirme a ação
3. Verifique que todas as contas/cartões foram desativados

### Para ocultar apenas algumas contas:
1. Use **"Ocultar conta"** em cada conta específica
2. Mantenha o link ativo para outras contas
3. Reative quando necessário

### Para deletar contas manuais:
1. Use **"Desativar conta"** (mesmo botão, sem aviso especial)
2. Reative quando necessário

---

## Código de Referência

### API Route - Desconectar Banco
```javascript
// web/pages/api/belvo/links/[id].js
DELETE /api/belvo/links/:id?organization_id=xxx
```

### Frontend - Desconectar Banco
```javascript
const handleDisconnectBelvo = async (linkId) => {
  if (!confirm('Tem certeza...')) return;
  await fetch(`/api/belvo/links/${linkId}?organization_id=${organization.id}`, {
    method: 'DELETE'
  });
  await fetchAccounts();
  await fetchBelvoLinks();
};
```

### Frontend - Ocultar/Reativar Conta
```javascript
const handleToggleActive = async (account) => {
  const isBelvo = account.provider === 'belvo';
  // Different confirmation messages for Belvo vs manual
  if (!confirm(message)) return;
  
  await supabase
    .from('bank_accounts')
    .update({ is_active: !account.is_active })
    .eq('id', account.id);
  
  await fetchAccounts();
};
```

---

## Considerações Técnicas

1. **RLS (Row Level Security)**: 
   - Desconectar banco usa Service Role Key para bypass RLS
   - Ocultar conta usa credenciais normais do usuário

2. **Webhooks**:
   - Contas desconectadas não recebem mais atualizações
   - Contas ocultas continuam recebendo atualizações (mas não aparecem na UI)

3. **Filtros**:
   - UI filtra `is_active=true` por padrão
   - Contas inativas podem ser exibidas com toggle (futuro)

4. **Histórico**:
   - Transações antigas permanecem no banco
   - Não são deletadas, apenas a conta fica inativa

---

## Roadmap Futuro

- [ ] Toggle para mostrar/ocultar contas inativas
- [ ] Mesmo sistema para cartões (`/dashboard/cards`)
- [ ] Logs de auditoria para desconexões
- [ ] Email de notificação quando link for desconectado
- [ ] Botão "Reconectar" para links expirados

