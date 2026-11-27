# Teste de ponta a ponta antes do envio às lojas

Número do Zul: **+55 11 2770-9553** (phone number ID `1466026243268271`). Use um celular pessoal que nunca falou com o Zul, e um segundo número para o teste do casal.

Pré-requisitos: itens 1 e 2 da seção 1 e itens 1 e 2 da seção 2 do `CHECKLIST_FELIPE.md` (token, `PHONE_ID`, `CRON_SECRET`, migrações, webhook), e o template `codigo_login` aprovado. Rode na ordem; cada linha diz o que precisa acontecer.

## A. WhatsApp (Zul)

| # | Ação | Esperado |
|---|---|---|
| A1 | Mandar `oi` | Apresentação do Zul no idioma do número (+55 em PT) |
| A2 | `mercado 87,50` | `✅ R$ 87,50 em Mercado, hoje.` e a pergunta do nome |
| A3 | Responder a confirmação com `apagar` | O gasto some (conferir no painel no passo C) |
| A4 | `uber 23 e almoço 45` | Uma confirmação só, com os dois gastos |
| A5 | Áudio: "uber vinte e três reais" | Gasto de R$ 23 em Transporte |
| A6 | Foto de um recibo | Gasto com o valor do recibo |
| A7 | `tv 2400 em 10x no itaú` | Parcelas de R$ 240 nos próximos 10 meses |
| A8 | `aluguel 2500 todo dia 5` | Conta recorrente criada |
| A9 | `resumo` | Resumo do mês até hoje |
| A10 | `English`, depois `coffee 5` | Respostas passam para inglês; voltar com `Português` |
| A11 | `convidar` e, do segundo número, mandar a mensagem do link | Segundo número entra na mesma casa; gasto dele aparece no painel do primeiro |
| A12 | `plano` | Teste grátis com os dias que faltam e o link para baixar o app |

## B. Login no app e no site

| # | Ação | Esperado |
|---|---|---|
| B1 | Site: entrar com o número do A1 | Código chega no WhatsApp pelo `codigo_login`; mesma conta que o Zul criou |
| B2 | App (build de produção): mesmo login | Mesmo painel, com os gastos do bloco A |
| B3 | Home do app | "Você pode gastar X por dia" com valor coerente |
| B4 | Botão "Registrar no WhatsApp" | Abre a conversa com o Zul, com texto pronto |

## C. Painel

| # | Ação | Esperado |
|---|---|---|
| C1 | Movimentos | Gastos do bloco A, sem o apagado no A3 |
| C2 | Cartões e parcelas | Fatura do Itaú com 10 parcelas |
| C3 | Contas a pagar | Aluguel todo dia 5 |
| C4 | Trocar o idioma do aparelho para espanhol | App inteiro em espanhol |

## D. Teste grátis e assinatura (sandbox das lojas)

Para simular o fim do teste sem esperar 7 dias, a sessão do Claude Code muda `trial_ends_at` da organização de teste no Supabase (só nessa organização).

| # | Ação | Esperado |
|---|---|---|
| D1 | `trial_ends_at` = hoje + 1 hora; chamar `/api/cron/trial-funnel?dry_run=1` | A resposta lista o `fim_teste` para esse número |
| D2 | Mesma chamada sem `dry_run` | Chega a mensagem do dia 7 com o botão "Baixar o app" |
| D3 | Tocar no botão, no iPhone e no Android | Abre a página do app na App Store e no Google Play |
| D4 | `trial_ends_at` = ontem; `mercado 10` no WhatsApp | Zul não anota e manda o convite para assinar no app; `resumo` continua funcionando |
| D5 | Chamar o job de novo | Chega a oferta do dia 8 (primeiro mês por R$ 0,99) |
| D6 | No app, abrir a tela do Plus | Mostra a oferta do primeiro mês e os dois planos |
| D7 | Comprar com conta sandbox (Apple) e conta de teste de licença (Google) | Compra conclui; em até 1 minuto o Zul volta a anotar e o painel mostra Plus |
| D8 | Cancelar no sandbox e esperar a expiração | Volta ao estado do D4 |

## E. Exclusão de conta (exigência da Apple)

| # | Ação | Esperado |
|---|---|---|
| E1 | App, Configurações, Excluir conta, com o segundo número | Conta apagada; login seguinte diz que a conta não existe |
| E2 | Conferir o primeiro número | Continua com os próprios dados e a casa |

## Problemas comuns

- **Zul não responde:** `WHATSAPP_TOKEN` ou `PHONE_ID` errado, ou faltou o redeploy depois de mudar a variável.
- **Webhook não verifica:** `WHATSAPP_VERIFY_TOKEN` diferente do digitado na Meta.
- **Código de login não chega:** Send SMS Hook desligado, segredo diferente, ou `codigo_login` ainda em análise.
- **Compra não libera o Plus:** webhook do RevenueCat sem o `REVENUECAT_WEBHOOK_SECRET` certo (`BILLING.md` §5).
