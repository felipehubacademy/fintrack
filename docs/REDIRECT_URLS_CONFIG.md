# 🔗 Configuração de Redirect URLs no Supabase

## 🎯 Objetivo
Após confirmar o email, redirecionar para a página `/auth/email-confirmed` em vez da landing.

---

## 📍 Como Configurar

### 1. Acesse o Dashboard do Supabase
```
https://supabase.com/dashboard/project/niyqusfrurutumqnopbm
```

### 2. Vá em Authentication > URL Configuration

### 3. Configure as URLs:

#### **Site URL** (URL base)
```
DEVELOPMENT: http://localhost:3000
PRODUCTION: https://meuazulao.com.br
```

#### **Redirect URLs** (adicione TODAS estas URLs)
```
DEVELOPMENT:
- http://localhost:3000/**
- http://localhost:3000/auth/email-confirmed
- http://localhost:3000/login
- http://localhost:3000/dashboard
- http://localhost:3000/landing

PRODUCTION:
- https://meuazulao.com.br/**
- https://app.meuazulao.com.br/**
- https://meuazulao.com.br/auth/email-confirmed
- https://app.meuazulao.com.br/auth/email-confirmed
- https://meuazulao.com.br/login
- https://app.meuazulao.com.br/login
- https://meuazulao.com.br/landing
- https://app.meuazulao.com.br/landing
```

---

## ✨ Fluxo Após Configuração

1. **Usuário cria conta**
   - Recebe email com link de confirmação
   
2. **Usuário clica no link**
   - Supabase verifica o token
   - Redireciona para: `https://meuazulao.com.br/auth/email-confirmed`
   
3. **Página de confirmação** (`/auth/email-confirmed`)
   - Mostra "Email Confirmado! ✅"
   - Aguarda 3 segundos
   - Redireciona automaticamente para `/login`
   
4. **Usuário faz login**
   - Acessa o dashboard normalmente

---

## 🐛 Problema Anterior

### ❌ ANTES:
```
redirect_to=https://meuazulao.com.br
→ Redirecionava para a landing ❌
```

### ✅ AGORA:
```
redirect_to=https://meuazulao.com.br/auth/email-confirmed
→ Redireciona para página de confirmação ✅
→ Após 3s → Redireciona para /login ✅
```

---

## 📝 Nota Importante

A página `/auth/email-confirmed` foi criada em:
```
web/pages/auth/email-confirmed.jsx
```

Ela mostra:
- ✅ CheckCircle verde (animado)
- 📝 "Email Confirmado! ✅"
- ⏱️ Redirecionamento automático após 3s para `/login`

---

## ✅ Status

- [ ] Configurar URLs no Supabase Dashboard
- [ ] Testar criação de conta
- [ ] Testar confirmação de email
- [ ] Verificar redirecionamento

