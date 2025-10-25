# Segurança de URLs Dinâmicas - Implementação

## 📋 Resumo

Este documento descreve as melhorias de segurança implementadas para proteger o sistema contra acesso não autorizado usando URLs dinâmicas no formato `/org/{orgId}/user/{userId}`.

## 🚨 Problemas Identificados (Antes)

1. **Header usava URLs hardcoded** - Links sem `orgId/userId`, permitindo bypass de validação
2. **useOrganization não validava params da URL** - Buscava apenas por email, sem verificar correspondência com URL
3. **Falta de middleware de segurança** - Não validava se usuário podia acessar `orgId/userId` específicos
4. **Validação inconsistente** - Apenas algumas páginas validavam acesso
5. **Hook useDynamicUrls incompleto** - Não cobria todas as rotas e não validava

## ✅ Melhorias Implementadas

### 1. Middleware de Validação (`web/middleware.js`)

**O que faz:**
- Intercepta TODAS as requisições para URLs dinâmicas
- Valida autenticação antes de qualquer página carregar
- Verifica se `userId` na URL corresponde ao usuário autenticado
- Verifica se usuário pertence à organização da URL
- Redireciona automaticamente para URLs corretas em caso de tentativa de acesso indevido

**Proteções Implementadas:**

```javascript
// 1. Verifica autenticação
if (!session) {
  // Redireciona para login
}

// 2. CRÍTICO: Valida userId
if (session.user.id !== userIdFromUrl) {
  // Log de segurança e redirecionamento
}

// 3. Valida relacionamento org/user
const userData = await supabase
  .from('users')
  .select('organization_id')
  .eq('id', userIdFromUrl)
  .eq('organization_id', orgIdFromUrl)
  .single();

if (!userData) {
  // Usuário não pertence à organização
}
```

**Logs de Segurança:**
- Todas as tentativas de acesso não autorizado são logadas
- Inclui informações do usuário, path, orgId e userId tentados

### 2. Hook useDynamicUrls Melhorado (`web/hooks/useDynamicUrls.js`)

**O que faz:**
- Valida parâmetros da URL em tempo real
- Detecta discrepâncias entre URL e usuário autenticado
- Redireciona automaticamente para URL correta
- Fornece funções helper para verificação de autenticação

**Funcionalidades:**

```javascript
const {
  getDynamicUrl,      // Converte path para URL dinâmica
  isValidUrl,         // Boolean: URL é válida?
  validationError,    // Detalhes do erro de validação
  requiresAuth,       // Verifica se path requer auth
  getCurrentIds,      // Retorna orgId e userId atuais
  loading,            // Estado de carregamento
  organization,       // Dados da organização
  user                // Dados do usuário
} = useDynamicUrls();
```

**Validação em Tempo Real:**
```javascript
useEffect(() => {
  if (!loading && organization && user) {
    const { orgId, userId } = router.query;
    
    if (orgId && userId) {
      const isOrgValid = orgId === organization.id;
      const isUserValid = userId === user.id;
      
      if (!isOrgValid || !isUserValid) {
        // Redirecionar para URL correta
      }
    }
  }
}, [loading, organization, user, router.query]);
```

### 3. Header Seguro (`web/components/Header.jsx`)

**O que mudou:**
- TODOS os links agora usam `getDynamicUrl()`
- Desktop e mobile menus atualizados
- Função `isActive()` adaptada para URLs dinâmicas

**Antes:**
```jsx
<Link href="/dashboard">Dashboard</Link>
```

**Depois:**
```jsx
<Link href={getDynamicUrl('/dashboard')}>Dashboard</Link>
```

**Páginas Protegidas:**
- ✅ Painel Principal
- ✅ Transações
- ✅ Contas Bancárias
- ✅ Cartões
- ✅ Contas a Pagar
- ✅ Orçamentos
- ✅ Investimentos
- ✅ Fechamento
- ✅ Configurações

### 4. HOC withAuth (`web/hooks/withAuth.js`)

**O que faz:**
- Higher Order Component para proteger páginas
- Validação completa antes de renderizar componente
- Verificação de estado do usuário (ativo/inativo)
- Verificação de estado da organização

**Como usar:**

```javascript
import withAuth from '../hooks/withAuth';

function MinhaPageProtegida() {
  return <div>Conteúdo protegido</div>;
}

export default withAuth(MinhaPageProtegida, {
  requiresDynamicUrl: true,
  redirectTo: '/login'
});
```

**Validações Realizadas:**
1. ✅ Usuário está autenticado?
2. ✅ URL tem `orgId` e `userId`?
3. ✅ `userId` da URL = usuário autenticado?
4. ✅ Usuário pertence à organização?
5. ✅ Usuário está ativo?
6. ✅ Organização está ativa?

**UI de Erro:**
- Loading state durante validação
- Mensagem de erro clara em caso de falha
- Botão para voltar ao início

### 5. Auth Redirect Melhorado (`web/pages/auth/redirect.jsx`)

**Melhorias:**

1. **Busca por ID primeiro** (mais seguro que email)
```javascript
// Buscar por ID do auth (CORRETO)
const { data: userData } = await supabase
  .from('users')
  .select('organization_id, is_active, role, email')
  .eq('id', user.id)
  .single();
```

2. **Detecção de inconsistências de ID**
```javascript
if (userByEmail.id !== user.id) {
  console.error('🚨 ID do usuário não corresponde!');
  // Corrigir automaticamente
}
```

3. **Validações adicionais:**
- ✅ Usuário está ativo?
- ✅ Organização existe?
- ✅ Organização está ativa?
- ✅ ID do auth = ID na URL?

4. **Logs detalhados:**
```javascript
console.log('✅ [REDIRECT] Validação completa. Redirecionando:', {
  orgId: userData.organization_id,
  userId: user.id,
  url: dynamicUrl
});
```

## 🔐 Camadas de Segurança

### Camada 1: Middleware (Primeira Linha de Defesa)
- Valida ANTES da página carregar
- Impede requisições mal-intencionadas
- Redireciona automaticamente

### Camada 2: HOC withAuth (Proteção de Página)
- Validação em nível de componente
- Verificações de estado do usuário/org
- UI de erro amigável

### Camada 3: Hook useDynamicUrls (Validação em Tempo Real)
- Monitora mudanças na URL
- Detecta discrepâncias
- Redireciona quando necessário

### Camada 4: Páginas Dinâmicas (Validação Local)
- Cada página pode ter validações específicas
- Verifica permissões de acesso
- Valida dados carregados

## 📊 Fluxo de Validação

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuário tenta acessar /org/123/user/456/dashboard        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. MIDDLEWARE intercepta                                     │
│    - Verifica autenticação                                   │
│    - Valida userId == session.user.id                        │
│    - Verifica relacionamento org/user                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Página carrega com withAuth                               │
│    - Verifica usuário ativo                                  │
│    - Verifica organização ativa                              │
│    - Renderiza LoadingLogo durante validação                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. useDynamicUrls monitora                                   │
│    - Valida params em tempo real                             │
│    - Detecta mudanças na URL                                 │
│    - Redireciona se necessário                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Componente renderizado                                    │
│    ✅ Acesso seguro garantido                                │
└─────────────────────────────────────────────────────────────┘
```

## 🚫 Cenários de Ataque Bloqueados

### 1. Tentativa de Acesso a Outro Usuário
**Ataque:** `https://app.com/org/123/user/OUTRO_USER_ID/dashboard`

**Bloqueio:**
- ❌ Middleware detecta `userId` diferente do autenticado
- 🔄 Redireciona automaticamente para URL correta
- 📝 Log de segurança registrado

### 2. Tentativa de Acesso a Outra Organização
**Ataque:** `https://app.com/org/OUTRA_ORG/user/456/dashboard`

**Bloqueio:**
- ❌ Middleware verifica relacionamento org/user
- ❌ Query retorna vazio (usuário não pertence à org)
- 🔄 Redireciona para organização correta
- 📝 Log de segurança registrado

### 3. Manipulação de URL Direta
**Ataque:** Alterar URL manualmente no navegador

**Bloqueio:**
- ❌ useDynamicUrls detecta mudança
- ✅ Valida nova URL em tempo real
- 🔄 Redireciona se inválida
- 📝 Console log registrado

### 4. Acesso Sem Autenticação
**Ataque:** Acessar URL protegida sem login

**Bloqueio:**
- ❌ Middleware detecta ausência de sessão
- 🔄 Redireciona para `/login?redirect={url}`
- 📝 Log de aviso registrado

### 5. Usuário Inativo ou Organização Inativa
**Ataque:** Usuário desativado tenta acessar

**Bloqueio:**
- ❌ withAuth verifica status `is_active`
- ❌ auth/redirect verifica status da org
- 🔄 Redireciona para login com mensagem
- 📝 Log de aviso registrado

## 🔍 Logs de Segurança

### Prefixos de Log
- `🚨` - Tentativa de acesso não autorizado (CRÍTICO)
- `⚠️` - Aviso de segurança
- `✅` - Validação bem-sucedida
- `🔍` - Informação de debug
- `📝` - Criação/atualização de dados
- `🔄` - Redirecionamento

### Exemplos de Logs

**Tentativa de acesso a outro usuário:**
```javascript
🚨 [SECURITY] Tentativa de acesso a outro usuário: {
  authenticatedUser: "abc-123",
  attemptedUser: "xyz-789",
  path: "/org/123/user/xyz-789/dashboard",
  email: "user@example.com"
}
```

**Usuário não pertence à organização:**
```javascript
🚨 [SECURITY] Usuário não pertence à organização: {
  userId: "abc-123",
  orgId: "org-456",
  path: "/org/org-456/user/abc-123/dashboard"
}
```

**Validação bem-sucedida:**
```javascript
✅ [REDIRECT] Validação completa. Redirecionando: {
  orgId: "org-123",
  userId: "abc-123",
  url: "/org/org-123/user/abc-123/dashboard"
}
```

## 📦 Dependências Necessárias

Para o middleware funcionar corretamente, certifique-se de ter:

```json
{
  "@supabase/auth-helpers-nextjs": "^0.x.x"
}
```

Se não tiver instalado, execute:
```bash
cd web
npm install @supabase/auth-helpers-nextjs
```

## 🧪 Testes Recomendados

### Teste 1: Acesso Normal
1. Fazer login normalmente
2. Navegar pelas páginas usando o menu
3. Verificar que URLs estão corretas
4. ✅ Esperado: Tudo funciona normalmente

### Teste 2: Manipulação de URL
1. Fazer login
2. Copiar URL atual
3. Alterar `orgId` ou `userId` manualmente
4. Pressionar Enter
5. ✅ Esperado: Redirecionamento automático para URL correta

### Teste 3: Acesso Sem Login
1. Fazer logout
2. Tentar acessar URL protegida diretamente
3. ✅ Esperado: Redirecionamento para `/login?redirect={url}`

### Teste 4: Links do Header
1. Fazer login
2. Clicar em todos os links do menu (desktop e mobile)
3. Verificar URLs geradas
4. ✅ Esperado: Todas URLs no formato `/org/{orgId}/user/{userId}/{page}`

### Teste 5: Browser Back/Forward
1. Navegar por várias páginas
2. Usar botões voltar/avançar do navegador
3. ✅ Esperado: Validação contínua, sem acesso indevido

## 📋 Checklist de Implementação

- ✅ Middleware de validação criado
- ✅ Hook useDynamicUrls melhorado
- ✅ Header atualizado (desktop e mobile)
- ✅ HOC withAuth criado
- ✅ auth/redirect.jsx melhorado
- ✅ Logs de segurança implementados
- ✅ Validação de usuário ativo/inativo
- ✅ Validação de organização ativa/inativa
- ✅ Redirecionamentos automáticos
- ✅ UI de erro amigável
- ✅ Sem erros de linting

## 🚀 Próximos Passos (Opcional)

### Melhorias Futuras

1. **Auditoria de Logs**
   - Salvar logs de segurança no banco de dados
   - Dashboard de tentativas de acesso não autorizado
   - Alertas automáticos para administradores

2. **Rate Limiting**
   - Limitar tentativas de acesso indevido
   - Bloquear IPs suspeitos temporariamente

3. **2FA (Two-Factor Authentication)**
   - Adicionar segunda camada de autenticação
   - SMS ou TOTP

4. **Permissões Granulares**
   - Sistema de roles mais complexo
   - Permissões por página/recurso

5. **Session Timeout**
   - Expiração automática de sessões inativas
   - Renovação de token antes de expirar

## 📚 Referências

- [Next.js Middleware](https://nextjs.org/docs/advanced-features/middleware)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [OWASP Security Practices](https://owasp.org/www-project-top-ten/)

---

**Documento criado em:** 2025-10-25  
**Última atualização:** 2025-10-25  
**Versão:** 1.0.0

