# Assinatura do MeuAzulão: produtos, preços, templates e webhooks

Modelo aprovado pelo Felipe em 26/11/2026. Venda **só pelas lojas** (Felipe, 26/11: "vendas somente pelas lojas, sem dor de cabeça para gerenciarmos"): sem Stripe e sem link de pagamento.

1. **Entrada:** 7 dias grátis, sem cartão, começando no WhatsApp só com o número.
2. **Dia 7:** Plus mensal ou anual, com o anual em destaque.
3. **Dia 8, para quem não assinou:** o Zul oferece o primeiro mês pelo preço de reativação.

Os valores abaixo são os mesmos do código (`packages/shared/src/billing/index.js`). Se mudar um preço, mude nos dois.

## 1. Como a cobrança funciona

- **RevenueCat** centraliza as compras da App Store e do Google Play, feitas dentro do app.
- Quem assina é a **organização** (o casal divide o plano). O `app_user_id` no RevenueCat é o id da organização.
- Entitlement: `plus`. Offerings: `default` (mensal e anual) e `winback` (primeiro mês com desconto).
- O RevenueCat avisa o nosso servidor por webhook; o servidor grava `plus_until` na organização. App, web e Zul leem só isso.
- Quem usa só o WhatsApp recebe do Zul o link `meuazulao.com.br/assinar/<org>` (dia 7) ou `/oferta/<org>` (dia 8). No celular, o site manda direto para a página do app na App Store ou no Google Play; no computador, mostra os dois botões. A pessoa entra no app com o mesmo número do WhatsApp e assina na tela do Plus, que mostra a oferta do primeiro mês para quem já passou do teste.

## 2. Produtos (mesmos ids nas duas lojas)

| Produto | Id | Tipo | Período |
|---|---|---|---|
| Plus mensal | `meuazulao_plus_monthly` | Assinatura auto-renovável | 1 mês |
| Plus anual | `meuazulao_plus_annual` | Assinatura auto-renovável | 1 ano |

- **App Store Connect:** grupo de assinaturas `MeuAzulão Plus`, os dois produtos no mesmo grupo (anual com nível de serviço acima do mensal).
- **Google Play:** uma assinatura `meuazulao_plus` com dois planos base, `monthly` e `annual`, ou dois produtos com os ids acima (o RevenueCat aceita os dois jeitos; use os dois produtos para manter os ids iguais aos da Apple).
- **Sem período grátis na loja.** Os 7 dias já correm antes de qualquer compra, então a loja não deve dar mais um teste.

### Oferta de reativação (dia 8)

| Loja | Como criar | Id |
|---|---|---|
| App Store | Oferta promocional ou código de oferta no produto mensal: 1 mês, "Pagar adiantado" pelo preço da tabela | `first_month_winback` |
| Google Play | Oferta no plano mensal: fase de preço introdutório de 1 mês, elegibilidade "desenvolvedor determina" | `first_month_winback` |

## 3. Preços por mercado

| Mercado (moeda) | Mensal | Anual | Primeiro mês na reativação |
|---|---|---|---|
| Brasil (BRL) | R$ 9,90 | R$ 79,90 | R$ 0,99 |
| México (MXN) | MXN 59 | MXN 449 | MXN 9 |
| Colômbia (COP) | COP 9.900 | COP 79.900 | COP 2.900 |
| EUA e resto do mundo (USD) | US$ 4,99 | US$ 39,99 | US$ 0,99 |

Argentina, Chile e Peru pagam em USD (tabela de USD). Nas lojas, defina o preço base em USD e ajuste manualmente BRL, MXN e COP para os valores acima. **COP anual e todos os preços de reativação fora do Brasil são propostas** (o plano só fixava o mensal); confirme antes de salvar nas lojas.

## 4. Templates do WhatsApp (Meta)

Os dois entram na seção 9 do `META_SETUP.md`. Botão de URL com sufixo dinâmico: a URL base é fixa no nosso domínio e o `{{1}}` do botão recebe o id da organização. O site redireciona o celular para a loja certa, então o template pode ser aprovado antes de o app estar publicado.

Se o usuário escreveu nas últimas 24 h, o Zul manda o mesmo texto como mensagem livre, sem template.

### `fim_teste` (Utilidade), dia 7

| Idioma | Corpo |
|---|---|
| pt_BR | `Oi, {{1}}! Seu teste grátis do MeuAzulão termina hoje. Para continuar anotando seus gastos comigo, baixe o app e assine o Plus por {{2}} por mês ou {{3}} por ano. Entre no app com este mesmo número.` |
| es | `¡Hola, {{1}}! Tu prueba gratis de MeuAzulão termina hoy. Para seguir anotando tus gastos conmigo, descarga la app y suscríbete a Plus por {{2}} al mes o {{3}} al año. Entra a la app con este mismo número.` |
| en | `Hi, {{1}}! Your MeuAzulão free trial ends today. To keep logging your expenses with me, download the app and get Plus for {{2}} a month or {{3}} a year. Sign in to the app with this same number.` |

Botão de URL: **Baixar o app** / **Descargar la app** / **Get the app** → `https://www.meuazulao.com.br/assinar/{{1}}`

| Variável | Exemplo pt_BR | Exemplo es | Exemplo en |
|---|---|---|---|
| `{{1}}` nome | `Felipe` | `Sofía` | `Alex` |
| `{{2}}` preço mensal | `R$ 9,90` | `MXN 59` | `$4.99` |
| `{{3}}` preço anual | `R$ 79,90` | `MXN 449` | `$39.99` |
| botão `{{1}}` | `3f2a9c1e-org` | `3f2a9c1e-org` | `3f2a9c1e-org` |

### `oferta_primeiro_mes` (Marketing), dia 8

Ative o botão de descadastro da Meta (**Parar promoções** / **Detener promociones** / **Stop promotions**).

| Idioma | Corpo |
|---|---|
| pt_BR | `Oi, {{1}}! Seus gastos continuam guardados aqui. Volte para o Plus pagando só {{2}} no primeiro mês: é só assinar pelo app, entrando com este mesmo número. Depois fica {{3}} por mês, e você cancela quando quiser.` |
| es | `¡Hola, {{1}}! Tus gastos siguen guardados aquí. Vuelve a Plus pagando solo {{2}} el primer mes: suscríbete en la app, entrando con este mismo número. Después son {{3}} al mes, y cancelas cuando quieras.` |
| en | `Hi, {{1}}! Your expenses are still saved here. Come back to Plus for just {{2}} the first month: subscribe in the app, signing in with this same number. After that it's {{3}} a month, and you can cancel anytime.` |

Botão de URL: **Quero a oferta** / **Quiero la oferta** / **Get the offer** → `https://www.meuazulao.com.br/oferta/{{1}}`

| Variável | Exemplo pt_BR | Exemplo es | Exemplo en |
|---|---|---|---|
| `{{1}}` nome | `Felipe` | `Sofía` | `Alex` |
| `{{2}}` preço do 1º mês | `R$ 0,99` | `MXN 9` | `$0.99` |
| `{{3}}` preço mensal | `R$ 9,90` | `MXN 59` | `$4.99` |
| botão `{{1}}` | `3f2a9c1e-org` | `3f2a9c1e-org` | `3f2a9c1e-org` |

A Meta pode reclassificar `fim_teste` como Marketing. Se isso acontecer, ele continua funcionando, só custa mais.

## 5. Webhooks e URLs

| O quê | URL | Segredo |
|---|---|---|
| RevenueCat → nosso servidor | `https://www.meuazulao.com.br/api/billing/revenuecat-webhook` | Header `Authorization` com o valor de `REVENUECAT_WEBHOOK_SECRET` (Vercel, projeto web) |
| Link de assinatura (WhatsApp e site) | `https://www.meuazulao.com.br/assinar/<id da organização>` | Celular: redireciona para a App Store ou o Google Play. Computador: página com os dois botões |
| Link da oferta do dia 8 | `https://www.meuazulao.com.br/oferta/<id da organização>` | Igual ao de cima; a oferta aparece no app |
| Webhook do WhatsApp (Meta) | `https://<domínio do backend>/webhook` | `WHATSAPP_VERIFY_TOKEN` e `WHATSAPP_APP_SECRET` |
| Código de login (Supabase Send SMS Hook) | `https://<domínio do backend>/api/auth/whatsapp-otp` | `SEND_SMS_HOOK_SECRET` |

## 6. Variáveis de ambiente novas

| Onde | Variável | O que é |
|---|---|---|
| Vercel (web) | `REVENUECAT_WEBHOOK_SECRET` | Texto que você define no webhook do RevenueCat |
| Vercel (web) | `APP_STORE_ID` | Apple ID numérico do app (App Store Connect → Informações do app). Sem ele, o iPhone vê a página com os botões em vez de ir direto para a loja, e o botão da App Store some |
| EAS (app) | `EXPO_PUBLIC_RC_IOS_KEY` | Chave pública do RevenueCat para iOS |
| EAS (app) | `EXPO_PUBLIC_RC_ANDROID_KEY` | Chave pública do RevenueCat para Android |

## 7. O que é seu (contas e consoles)

1. Criar a conta no RevenueCat, o projeto MeuAzulão e os apps iOS e Android.
2. Criar os produtos e preços nas duas lojas (seções 2 e 3) e importá-los no RevenueCat; entitlement `plus`; offerings `default` e `winback`.
3. Configurar o webhook do RevenueCat (seção 5) e as variáveis (seção 6).
4. Criar os dois templates na Meta (seção 4).
5. Na App Store Connect, preencher o contrato de apps pagos (Agreements, Tax and Banking); no Play Console, o perfil de pagamentos.

## 8. Job diário

O backend tem o endpoint `/api/cron/trial-funnel` (código em `packages/backend/zul/funnel.js`). Rodando uma vez por dia, ele:

- manda o `fim_teste` para as organizações cujo teste termina **hoje** (no fuso do número do usuário), que não são Plus e ainda não receberam (`trial_ending_sent_at` vazio);
- manda o `oferta_primeiro_mes` para quem terminou o teste **ontem** e não assinou (`winback_sent_at` vazio). Se um dia o job não rodar, a oferta ainda sai nos 2 dias seguintes;
- envia para o usuário principal da organização que já conversou com o Zul (o admin, se ele tiver conversa). Se a pessoa escreveu nas últimas 24 h, vai o mesmo texto da seção 4 como mensagem livre com botão de link; senão, vai o template;
- marca `trial_ending_sent_at` / `winback_sent_at` antes de enviar (cada mensagem sai no máximo uma vez) e desmarca se o envio falhar, para tentar de novo no dia seguinte;
- não faz nada se a flag `paywall` estiver desligada (`FEATURE_PAYWALL=false` no backend) ou se a migração `2026-11-26-billing-01.sql` ainda não rodou.

Autenticação: `Authorization: Bearer <CRON_SECRET>` ou `x-cron-secret: <CRON_SECRET>`. Para testar sem enviar nada, chame com `?dry_run=1` (ou deixe `WEBHOOK_DRY_RUN=1`): a resposta lista o que seria enviado.

```bash
curl -s "https://<domínio do backend>/api/cron/trial-funnel?dry_run=1" -H "Authorization: Bearer $CRON_SECRET"
```

Agendamento pelo GitHub Actions (todo dia às 15h UTC: 12h em Brasília, 9h na Cidade do México, 10h em Bogotá e Nova York). O arquivo `.github/workflows/trial-funnel.yml` já está no repositório (ativa depois do merge na `main`). Cadastre os secrets `BACKEND_URL` (ex.: `https://<domínio do backend>`, sem barra no fim) e `CRON_SECRET` (o mesmo valor da Vercel do backend):

```yaml
name: Trial funnel

on:
  schedule:
    - cron: '0 15 * * *'
  workflow_dispatch:
    inputs:
      dry_run:
        description: 'Só simular (1) ou enviar de verdade (0)'
        default: '1'

jobs:
  trial-funnel:
    runs-on: ubuntu-latest
    steps:
      - name: Run trial funnel
        env:
          BACKEND_URL: ${{ secrets.BACKEND_URL }}
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
          DRY_RUN: ${{ github.event.inputs.dry_run || '0' }}
        run: |
          if [ -z "$BACKEND_URL" ] || [ -z "$CRON_SECRET" ]; then
            echo "BACKEND_URL or CRON_SECRET not set, skipping"
            exit 0
          fi
          curl -sS --fail-with-body -X POST "$BACKEND_URL/api/cron/trial-funnel?dry_run=$DRY_RUN" \
            -H "Authorization: Bearer $CRON_SECRET" \
            -w "\nHTTP %{http_code}\n"
```

O job processa até 500 organizações por execução e para perto de 50 s; se a resposta vier com `"done": false`, rode de novo (é seguro repetir).

**Templates:** nos dois templates, o botão de URL precisa ser o **primeiro** botão (índice 0). No `oferta_primeiro_mes`, deixe o botão de descadastro da Meta depois dele.
