# MeuAzulão: estado do app (26/11/2026, atualizado à tarde)

Auditoria feita no branch `claude/project-thread-ov5j5l`, a partir da `main` em `469b1df`.
Plano de produto: doc "MeuAzulão: plano de produto e lançamento".

## O que funciona

| Parte | Estado |
|---|---|
| Web (`packages/web`, Next 14) | Compila. Lint passa (só avisos). |
| Mobile (`packages/mobile`, Expo SDK 54, RN 0.81) | Empacota para iOS e Android (`expo export`). 67 testes passam. |
| Backend do Zul (`packages/backend`, Vercel) | 17 testes passam (verificação do webhook, parser). |
| Shared (`packages/shared`) | i18n novo + testes. |

## O que estava quebrado e já foi corrigido neste branch

- **CI vermelho em todo push:** `setup-node` com cache exige lockfile, e `package-lock.json` estava no `.gitignore`. Lockfiles agora versionados; CI usa `npm ci`, Node 22, sem `continue-on-error`, e agora roda testes do backend e do shared e empacota o app.
- **Segredos no repositório** (removidos do código; continuam no histórico do git, por isso precisam ser trocados):
  - Token de acesso do WhatsApp (`EAA…`) em `docs/WHATSAPP_CONFIG.md`.
  - `CRON_SECRET` (hex de 64 caracteres, o "Generic Encryption Key" do GitGuardian) em `docs/archive/scripts/test-all-endpoints.sh`.
  - Verify token do webhook era o literal público `fintrack_verify_token`.
  - Chave anon do Supabase (pública por natureza; removida só por higiene).
- **Dependências fora da versão do Expo SDK 54:** `expo-image-picker` 16 → 17, `react-native-gesture-handler`, `react-native-svg`.
- **Metro:** `blacklistRE` não existe mais no Metro 0.87; virou `blockList`.
- **Teste do CategoryIcon** não rodava (import profundo do phosphor).

## Riscos e lacunas encontrados (a corrigir)

- **Segurança da API web (crítico):** `pages/api/account/delete.js` apaga qualquer organização e usuário só com o id no corpo, sem checar quem pede. Mesmo padrão em `notifications/*`, `zul-chat`, `parse-transactions`, `auth/check-duplicates`, `interested-users/*`, `verify-token`.
- **Exclusão de conta no app:** o celular apaga dados tabela por tabela, não remove o usuário do Auth e bloqueia admins ("requer ação no web"). A Apple exige exclusão completa dentro do app.
- **Zul:** `zulAssistant.js` tem 4.929 linhas; cache de thread em memória (`threadCache`), debounce com `setTimeout` depois da resposta (não confiável em serverless), Graph API v18, tudo em português.
- **Idiomas:** nada traduzido; `R$`/`pt-BR` fixos em ~200 lugares.
- **Investimentos:** tela teve crash (import do Badge, corrigido na main), escondida por flag até decisão.
- **Lojas:** `eas.json` com `ascAppId` e `appleTeamId` = `CONFIGURE_ME`; Android aponta para `./google-services.json` (não existe no repo); `owner` Expo `felipexavier_kid`; bundle id `com.meuazulao.app` nos dois.
- **Workflows desligados pelo GitHub:** Daily Notifications e Cleanup Abandoned Conversations (inatividade).

## Base criada para o lançamento

- `@fintrack/shared/i18n`: `t()`, EN/PT/ES, moeda pelo país, `formatMoney`, `formatDate`, `parseMoney`; o `formatCurrency` antigo passou a seguir a moeda e o idioma do usuário. Teste de paridade garante que toda chave existe nos 3 idiomas.
- `@fintrack/shared/config`: flags de lançamento (`investments: false`, `paywall: false`, ...) e `zulChatLink()` para os botões "Registrar no WhatsApp".
- Mobile: `I18nProvider` / `useI18n()` no `App.js`.

## Feito no branch até agora

- **Segurança da API:** todas as rotas exigem login ou segredo; ids vêm do token; exclusão de conta só apaga a própria conta (web e app usam `POST /api/account/delete`).
- **Zul:** núcleo novo sem a Assistants API (Chat Completions com ferramentas), EN/PT/ES, áudio e foto, webhook com assinatura, envio do código de login por WhatsApp. 124 testes.
- **Web:** painel e landing em EN/PT/ES, moeda e datas do usuário, "pode gastar X por dia", botões do WhatsApp, login por código, privacidade, termos, página pública de exclusão, PWA.
- **App:** tudo traduzido, home nova, login por código com e-mail de reserva, onboarding de 2 passos, Investimentos escondido por flag, exclusão de conta completa, configuração das lojas e manifesto de privacidade do iOS. 164 testes.
- **Lojas:** iOS e Android para produção na mesma data (contas de empresa). Textos e respostas em `STORES.md`.
- **Assinatura (modelo aprovado em 26/11):** 7 dias grátis sem cartão, Plus mensal ou anual, oferta do primeiro mês no dia 8. Venda só pelas lojas (App Store e Google Play, via RevenueCat); o Zul e o site mandam quem está só no WhatsApp baixar o app para assinar. Depois do teste, os dados continuam visíveis e novos registros pedem assinatura. Produtos, preços e templates em `BILLING.md`.

O que depende do Felipe: `CHECKLIST_FELIPE.md`.
