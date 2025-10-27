# 📧 Assuntos dos Emails do MeuAzulão

## Supabase Auth Templates

Configure os assuntos em: **Auth → Email Templates**

### 1. Confirm Signup
**Subject:** `Confirme seu cadastro no MeuAzulão`

### 2. Reset Password
**Subject:** `Redefina sua senha do MeuAzulão`

### 3. Change Email
**Subject:** `Confirme a alteração do seu email`

### 4. Magic Link (se usar)
**Subject:** `Acesse sua conta no MeuAzulão`

### 5. Reauthentication
**Subject:** `Confirme sua identidade`

---

## SendGrid Direto (API)

### 6. Invite Email
**Subject:** `Você foi convidado para ${organization.name} no MeuAzulão`
✅ Já configurado no código
- Enviado via API SendGrid
- HTML customizado inline

---

## Sender Email

Todos os emails são enviados de:
**From:** `noreply@meuazulao.com.br`

