# Changelog - FinTrack Mobile

## [Sprint 1] - 2025-11-21

### ✅ Implementado

#### Navegação
- Bottom Tab Navigation (4 abas)
- Auth flow automático (Login/Logout)
- Stack navigation configurado

#### Design System
- Button (5 variantes, 3 tamanhos)
- Card components
- Input com validação
- Badge com cores
- EmptyState
- LoadingSpinner

#### Telas Iniciais
- LoginScreen (funcionando)
- DashboardScreen (placeholder)
- TransactionsScreen (com dados reais do Supabase)
- FinancesScreen (menu)
- MoreScreen (configurações)

### 🔧 Correções

#### Problema: SecureStore 2048 bytes limit
**Erro:** `Value being stored in SecureStore is larger than 2048 bytes`

**Causa:** 
- SecureStore tem limite de 2048 bytes
- Token JWT do Supabase é maior que isso
- Causava falha ao salvar sessão

**Solução:**
- Substituído SecureStore por AsyncStorage
- AsyncStorage não tem limite de tamanho
- Mantém persistência de sessão

**Arquivos alterados:**
- `src/services/supabase.js` - Usa AsyncStorage
- `package.json` - Dependência atualizada

### 📱 Como Testar

```bash
# Limpar e reiniciar
cd packages/mobile
rm -rf .expo
npm start
```

**Esperado:**
✅ Login funciona
✅ Sessão persiste
✅ SEM warning de 2048 bytes
✅ Bottom tabs navegam
✅ Transações carregam

### 🔄 Próximo

- Dashboard com stats reais
- Gráficos
- Adicionar transação
- Pull to refresh em todas telas

