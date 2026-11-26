# O que só você pode fazer (lançamento até segunda, 30/11)

Ordem pensada pelo que demora mais. Detalhes de cada passo em `META_SETUP.md` (WhatsApp, Supabase) e `STORES.md` (lojas).

## Hoje (o que tem espera de terceiros)

1. **Meta Business:** verificação da empresa e número do Zul registrado. Pode levar dias; é o caminho crítico do WhatsApp. (`META_SETUP.md` §1 a §4)
2. **Templates do WhatsApp:** criar os 8, começando por `codigo_login`. A aprovação costuma levar de minutos a 1 dia. (`META_SETUP.md` §9)
3. **Trocar segredos que vazaram no git:** token do WhatsApp, `CRON_SECRET` (Vercel e GitHub Secrets) e `WHATSAPP_VERIFY_TOKEN`.
4. **Advogado:** revisar política de privacidade e termos (`/privacy`, `/terms`). Preencher razão social e CNPJ em `packages/web/pages/privacy.jsx` (`LEGAL`).
5. **Assinatura (decidida: 7 dias grátis, Plus mensal ou anual, oferta no dia 8):** criar a conta no RevenueCat (com Stripe para o link do WhatsApp), os produtos nas duas lojas e os templates `fim_teste` e `oferta_primeiro_mes`. Tudo em `BILLING.md`.

## Antes do merge na main

6. **Supabase:** rodar as migrações `docs/migrations/2026-11-26-zul-01-core.sql`, `-zul-02-link-phone-auth.sql` e `-billing-01.sql`, nessa ordem (ver a prévia do backfill antes). Ligar o provedor Phone e o Send SMS Hook. (`META_SETUP.md` §7 e §8)
7. **Vercel, projeto web:** `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_ZUL_WHATSAPP` (só dígitos).
8. **Vercel, projeto backend:** variáveis listadas em `META_SETUP.md` §5 (inclui `OPENAI_API_KEY`, `WHATSAPP_APP_SECRET`, `SEND_SMS_HOOK_SECRET`, `CRON_SECRET`).
8a. **GitHub Secrets:** `CRON_SECRET` e `BACKEND_URL` (para o job diário do teste grátis). **Vercel web e EAS:** variáveis do RevenueCat em `BILLING.md` §6.

## Lojas (builds prontos até sábado; envio só com o seu ok)

9. **eas.json:** preencher `ascAppId` e `appleTeamId` (App Store Connect, conta da empresa).
10. **EAS:** variáveis `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_ZUL_WHATSAPP`; chave da conta de serviço do Google Play (`eas credentials -p android`).
11. **Conta de demonstração para a revisão:** número de teste `15550100199=123456` no Supabase Auth e um usuário com dados. (`STORES.md`, "Conta de demonstração")
12. **App Store Connect e Play Console:** criar o app `com.meuazulao.app`, colar os textos em PT/ES/EN, privacidade e data safety, URL de exclusão de conta `https://www.meuazulao.com.br/delete-account`. (`STORES.md` §3 e §4)
13. **Android:** o primeiro `.aab` sobe à mão na faixa de produção; depois o `eas submit` funciona.

## Se o WhatsApp não estiver aprovado até domingo

O app e o web continuam funcionando com login por e-mail. O login por código no WhatsApp e o Zul entram assim que a Meta liberar, sem novo build, desde que o número do Zul já esteja em `EXPO_PUBLIC_ZUL_WHATSAPP` e `NEXT_PUBLIC_ZUL_WHATSAPP` (lidos na hora do build).
