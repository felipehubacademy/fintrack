# 🚨 CORREÇÃO URGENTE - Erros em Produção

## Problemas Identificados

1. **Erro 409 (Duplicate Key)** ao salvar transações com cartão de crédito
2. **Erro 500** na API de notificações
3. **Erros de conexão WebSocket** com Supabase

---

## ✅ SOLUÇÃO 1: Corrigir Função SQL no Banco de Dados

### Problema
A função `create_installments` estava dividindo incorretamente os valores dos splits entre as parcelas, causando o erro de chave duplicada.

### Como Corrigir

1. **Acesse o SQL Editor do Supabase:**
   - URL: https://supabase.com/dashboard/project/niyqusfrurutumqnopbm/editor

2. **Execute o script de correção:**
   - Abra o arquivo: `docs/migrations/HOTFIX-split-amount-division.sql`
   - Copie TODO o conteúdo do arquivo
   - Cole no SQL Editor do Supabase
   - Clique em "Run" (ou pressione Ctrl+Enter)

3. **Verifique se executou com sucesso:**
   - Deve aparecer "Success. No rows returned"
   - Isso significa que a função foi atualizada corretamente

---

## ✅ SOLUÇÃO 2: Configurar Variáveis de Ambiente

### Problema
As variáveis de ambiente do Supabase não estão configuradas, causando erros de conexão e na API de notificações.

### Como Corrigir

#### Passo 1: Obter as Chaves do Supabase

1. **Acesse as configurações de API:**
   - URL: https://supabase.com/dashboard/project/niyqusfrurutumqnopbm/settings/api

2. **Copie as seguintes chaves:**
   - **Project URL**: `https://niyqusfrurutumqnopbm.supabase.co`
   - **anon public**: Já temos (veja abaixo)
   - **service_role**: ⚠️ **COPIE ESTA CHAVE DO DASHBOARD** (é secreta!)

#### Passo 2: Configurar o Arquivo .env.local

1. **Abra o arquivo** `web/.env.local` (se não existir, crie-o)

2. **Cole o seguinte conteúdo:**

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://niyqusfrurutumqnopbm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=cole_aqui_a_anon_key_do_dashboard
SUPABASE_SERVICE_ROLE_KEY=COLE_AQUI_A_CHAVE_DO_DASHBOARD
```

3. **Substitua** `COLE_AQUI_A_CHAVE_DO_DASHBOARD` pela chave `service_role` que você copiou do dashboard

4. **Salve o arquivo**

#### Passo 3: Verificar Configuração

Execute o script de verificação:

```bash
cd web
node check-env.js
```

Deve mostrar ✅ para todas as variáveis.

#### Passo 4: Reiniciar o Servidor

```bash
cd web
npm run dev
```

---

## ✅ SOLUÇÃO 3: Configurar Produção (Vercel/Netlify/etc)

Se você está usando um serviço de hospedagem, precisa configurar as variáveis de ambiente lá também:

### Para Vercel:

1. Acesse: https://vercel.com/seu-usuario/seu-projeto/settings/environment-variables
2. Adicione as 3 variáveis:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Faça um novo deploy

### Para Netlify:

1. Acesse: Site settings → Build & deploy → Environment
2. Adicione as 3 variáveis
3. Faça um novo deploy

---

## 📋 Checklist de Verificação

Após aplicar as correções, verifique:

- [ ] Script SQL executado no Supabase (Solução 1)
- [ ] Arquivo `.env.local` criado e configurado (Solução 2)
- [ ] Script `check-env.js` mostra ✅ para todas as variáveis
- [ ] Servidor local reiniciado
- [ ] Variáveis configuradas no ambiente de produção (Solução 3)
- [ ] Novo deploy realizado em produção
- [ ] Teste: Criar uma transação com cartão de crédito parcelado
- [ ] Teste: Verificar se as notificações carregam sem erro 500

---

## 🔍 Como Testar

1. **Teste de Transação:**
   - Crie uma despesa com cartão de crédito
   - Selecione 2 ou mais parcelas
   - Marque como "Compartilhado" (se aplicável)
   - Salve
   - ✅ Deve salvar sem erro 409

2. **Teste de Notificações:**
   - Abra o console do navegador (F12)
   - Recarregue a página
   - ✅ Não deve aparecer erro 500 em `/api/notifications/list`

3. **Teste de WebSocket:**
   - Abra o console do navegador (F12)
   - Recarregue a página
   - ✅ Não deve aparecer erro de conexão WebSocket

---

## 🆘 Se os Erros Persistirem

1. **Limpe o cache do navegador:**
   - Chrome/Edge: Ctrl+Shift+Delete → Limpar cache
   - Firefox: Ctrl+Shift+Delete → Limpar cache

2. **Verifique sua conexão de internet:**
   - Os erros `ERR_INTERNET_DISCONNECTED` indicam problema de rede

3. **Verifique se as chaves estão corretas:**
   - Execute: `cd web && node check-env.js`
   - Todas devem mostrar ✅

4. **Verifique os logs do Supabase:**
   - https://supabase.com/dashboard/project/niyqusfrurutumqnopbm/logs/explorer

---

## 📞 Suporte

Se precisar de ajuda adicional, forneça:
- Logs completos do console do navegador (F12)
- Resultado do comando `node check-env.js`
- Mensagem de erro específica

---

**Data da correção:** 16/11/2025  
**Arquivos modificados:**
- `docs/migrations/FIX-create-installments-ambiguity.sql`
- `docs/migrations/HOTFIX-split-amount-division.sql`
- `web/.env.local` (a ser criado pelo usuário)

