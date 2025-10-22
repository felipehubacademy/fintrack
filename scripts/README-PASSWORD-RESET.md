# Como Configurar Senha para Usuários Existentes

## 🎯 Opções Disponíveis

### Opção 1: Via Supabase Dashboard (Recomendado - Mais Fácil)

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **Authentication** → **Users**
4. Encontre o usuário
5. Clique nos **3 pontinhos (...)** à direita
6. Selecione **"Send Password Recovery Email"**
7. O usuário receberá um email e poderá criar sua senha

### Opção 2: Via Interface do Site

1. Acesse: https://meuazulao.com.br/reset-password
2. Digite o email do usuário
3. Clique em "Enviar Link de Recuperação"
4. Abra o email recebido
5. Clique no link e defina a nova senha

### Opção 3: Via Script (Para múltiplos usuários)

1. Edite o arquivo `scripts/send-password-reset.js`
2. Adicione os emails na array `emails`:
   ```js
   const emails = [
     'seu@email.com',
     'outro@email.com'
   ];
   ```
3. Execute o script:
   ```bash
   cd /Users/felipexavier/FinTrack
   node scripts/send-password-reset.js
   ```
4. Os emails serão enviados automaticamente

## ⚠️ Importante

- O link de reset expira em 1 hora (padrão do Supabase)
- Após criar a senha, o usuário pode fazer login normalmente em `/login`
- A senha deve ter no mínimo 8 caracteres

## 🔧 Troubleshooting

**Email não chegou?**
- Verifique a pasta de spam
- Use a Opção 1 (Supabase Dashboard) que é mais confiável
- O script mostra o link direto que pode ser copiado e colado no navegador

**Erro no script?**
- Certifique-se que tem a variável `SUPABASE_SERVICE_ROLE_KEY` no `.env`
- Rode `npm install @supabase/supabase-js` se necessário

