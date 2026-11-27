# Lançamento até segunda (30/11): o que falta

Comandos, migrações, builds e merges ficam com a sessão do Claude Code no seu Mac (seção 2). Para você ficam só os segredos e os painéis (seção 1). Envio às lojas, merge e deploy continuam esperando o seu ok.

## 1. Só você (segredos e painéis)

1. ✅ **Feito em 27/11.** **Vercel, projetos web e backend:** `WHATSAPP_TOKEN` = o token permanente novo (o arquivo `~/.secrets/meuazulao-whatsapp-token.txt` no seu Mac) e `PHONE_ID` = `1466026243268271`. O token antigo deixa de valer.
2. ✅ **Feito em 27/11.** **`CRON_SECRET` novo:** o mesmo valor na Vercel (web e backend) e nos Secrets do GitHub. O antigo vazou no git. Para gerar: `openssl rand -hex 32`.
3. **`APP_STORE_ID`** na Vercel (projeto web): o Apple ID numérico do app (App Store Connect, Informações do app). É o que manda o iPhone direto para a App Store.
4. **Merge do PR #3** (segurança da API): CI verde. Antes do merge, `CRON_SECRET` (item 2) e `SUPABASE_SERVICE_ROLE_KEY` precisam estar na Vercel do web.

Confira também se já estão na Vercel do backend (detalhes em `META_SETUP.md` §5): `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` (novo, o antigo era público), `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`, `SEND_SMS_HOOK_SECRET`. E no RevenueCat, as chaves de `BILLING.md` §6.

O número do Zul (+55 11 2770-9553) já está no código, então não precisa mais de `NEXT_PUBLIC_ZUL_WHATSAPP`, `EXPO_PUBLIC_ZUL_WHATSAPP` nem `ZUL_WHATSAPP_NUMBER`.

## 2. Sessão do Claude Code no seu Mac (branch `claude/project-thread-ov5j5l`)

1. **Supabase:** rodar `docs/migrations/2026-11-26-zul-01-core.sql`, `-zul-02-link-phone-auth.sql` e `-billing-01.sql`, nessa ordem, olhando antes a prévia do backfill. Ligar o provedor Phone e o Send SMS Hook (`META_SETUP.md` §7 e §8).
2. **Webhook da Meta:** apontar para `https://<domínio do backend>/webhook` com o `WHATSAPP_VERIFY_TOKEN` (`META_SETUP.md` §6).
3. **Android:** `npx eas-cli@latest build -p android --profile production` e depois `npx eas-cli@latest submit -p android --latest` (vai para o teste interno, como rascunho). Se o Google recusar o primeiro envio, o `.aab` sobe à mão em Teste interno.
4. **iOS:** preencher `ascAppId` (o mesmo `APP_STORE_ID`) e `appleTeamId` em `packages/mobile/eas.json`, depois `npx eas-cli@latest build -p ios --profile production`. O envio para revisão (`eas submit -p ios`) só com o seu ok.
5. **EAS:** variáveis `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_RC_IOS_KEY` e `EXPO_PUBLIC_RC_ANDROID_KEY` no ambiente production, antes dos builds finais.
6. **Teste de ponta a ponta:** roteiro em `E2E_TEST.md`.

## 3. Lojas e Meta (em andamento com a equipe das lojas)

- Templates do WhatsApp, incluindo os textos novos de `fim_teste` e `oferta_primeiro_mes` (`BILLING.md` §4).
- Produtos de assinatura nas duas lojas, textos, privacidade e data safety (`STORES.md`).
- Conta de demonstração para a revisão: número de teste `15550100199=123456` no Supabase Auth e um usuário com dados (`STORES.md`).
- Para o lançamento no Android: promover o build do teste interno para produção.

## Pendente de revisão jurídica

Política de privacidade e termos (`/privacy`, `/terms`): razão social e CNPJ em `packages/web/pages/privacy.jsx` (`LEGAL`).
