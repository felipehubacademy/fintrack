# Zul no WhatsApp: configuração para o lançamento

Guia passo a passo para colocar o Zul no ar no WhatsApp e ativar o login por código no WhatsApp. Tudo aqui é feito nos painéis (Meta, Vercel e Supabase); o código já está pronto.

Ordem recomendada:

1. Meta Business e WhatsApp Manager (seções 1 a 4)
2. Variáveis na Vercel e deploy (seção 5)
3. Webhook na Meta (seção 6)
4. Migrações no Supabase (seção 7)
5. Login por telefone no Supabase (seção 8)
6. Templates (seção 9)
7. Teste final (seção 10)

Onde aparecer `<backend-domain>`, use o domínio do projeto **backend** na Vercel (por exemplo `fintrack-backend.vercel.app` ou um domínio próprio, como `api.meuazulao.com.br`).

---

## 1. Verificação da empresa (Meta Business)

1. Acesse https://business.facebook.com e abra o portfólio empresarial do MeuAzulão.
2. Vá em **Configurações do negócio > Central de segurança > Verificação da empresa** e clique em **Iniciar verificação**.
3. Envie os dados exatamente como no CNPJ: razão social, endereço, telefone e site (meuazulao.com.br).
4. Envie um documento oficial (cartão CNPJ ou contrato social) e confirme o domínio ou e-mail comercial quando pedirem.
5. A análise leva de 1 a 5 dias úteis. Sem a verificação, o número fica limitado a 250 conversas iniciadas por dia e os templates de autenticação podem não ser liberados.

## 2. App na Meta e produto WhatsApp

1. Acesse https://developers.facebook.com/apps e crie um app do tipo **Business** (ou use o existente), vinculado ao portfólio do passo 1.
2. Em **Adicionar produtos**, adicione **WhatsApp** e vincule a conta do WhatsApp Business (WABA).
3. Em **Configurações do app > Básico**, copie a **Chave secreta do app** (App Secret). Ela vira a variável `WHATSAPP_APP_SECRET`.
4. Publique o app (modo **Ao vivo**). Em modo de desenvolvimento a Meta não entrega webhooks de números reais.

## 3. Registrar o número de telefone

1. No **WhatsApp Manager** (https://business.facebook.com/wa/manage), vá em **Contas > Números de telefone > Adicionar número**.
2. Use um número que **não** esteja ativo em nenhum app WhatsApp (nem no WhatsApp Business do celular). Se estiver, apague a conta no app antes.
3. Nome de exibição: **MeuAzulão** (ou "Zul | MeuAzulão"). A Meta revisa o nome; ele precisa bater com a marca do site.
4. Confirme o número por SMS ou ligação.
5. Abra o número e copie o **Identificação do número de telefone** (Phone number ID). Ele vira `PHONE_ID`.
6. Configure o perfil: foto, descrição ("Seu assistente de finanças pessoais. Anote gastos por mensagem, áudio ou foto."), site e e-mail.
7. Se pedirem PIN de verificação em duas etapas, crie um e guarde no gerenciador de senhas.

## 4. Token permanente (usuário do sistema)

O token temporário do painel expira em 24 horas. Para produção:

1. Em **Configurações do negócio > Usuários > Usuários do sistema**, clique em **Adicionar**, dê o nome `zul-backend` e a função **Administrador**.
2. Clique em **Atribuir ativos**: selecione o **app** do passo 2 (controle total) e a **conta do WhatsApp** (controle total).
3. Clique em **Gerar novo token**, escolha o app, validade **Nunca** e marque as permissões:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Copie o token na hora (ele não aparece de novo). Ele vira `WHATSAPP_TOKEN`.

## 5. Variáveis de ambiente na Vercel (projeto backend)

Em **Vercel > projeto backend > Settings > Environment Variables**, cadastre em **Production** (e em Preview, se quiser testar lá):

| Variável | Obrigatória | Valor |
|---|---|---|
| `WHATSAPP_VERIFY_TOKEN` | sim | Uma frase aleatória que você inventa (ex.: gere com um gerenciador de senhas). A mesma vai no webhook da Meta. |
| `WHATSAPP_APP_SECRET` | sim | Chave secreta do app (passo 2.3). Sem ela o webhook aceita qualquer requisição e registra um aviso no log. |
| `PHONE_ID` | sim | Phone number ID (passo 3.5). |
| `WHATSAPP_TOKEN` | sim | Token permanente (passo 4.4). |
| `WHATSAPP_GRAPH_VERSION` | não | Versão da Graph API. Padrão `v21.0`. |
| `SUPABASE_URL` | sim | URL do projeto Supabase. |
| `SUPABASE_SERVICE_KEY` | sim | Chave **service_role** do Supabase (Settings > API). Nunca use no front. |
| `OPENAI_API_KEY` | sim | Chave da OpenAI (texto, áudio via whisper-1 e fotos de recibo). |
| `ZUL_MODEL` | não | Modelo de chat. Padrão `gpt-4o-mini`. |
| `SEND_SMS_HOOK_SECRET` | sim | Segredo do Send SMS Hook do Supabase (seção 8), no formato `v1,whsec_...`, copiado inteiro. |
| `ZUL_WHATSAPP_NUMBER` | não | Número do Zul no link de convite `wa.me`, só dígitos. Padrão `551127709553` (+55 11 2770-9553). |
| `ZUL_DASHBOARD_URL` | não | Base do link do painel. Padrão `https://meuazulao.com.br` (o Zul envia `/login?phone=+55...`). |
| `ZUL_DELETE_ACCOUNT_URL` | não | Link para apagar a conta. Padrão `https://www.meuazulao.com.br/delete-account`. |
| `ZUL_PLACEHOLDER_EMAIL_DOMAIN` | não | Domínio do e-mail interno das contas criadas pelo WhatsApp. Padrão `phone.meuazulao.invalid` (nunca recebe e-mail). |
| `WHATSAPP_OTP_TEMPLATE` | não | Nome do template de código. Padrão `codigo_login`. |
| `WHATSAPP_TEMPLATE_LANGS` | não | Códigos de idioma dos templates. Padrão `pt:pt_BR,es:es,en:en`. Mude só se aprovar com outros códigos (ex.: `en:en_US`). |
| `WEBHOOK_DRY_RUN` | não | `1` faz o webhook responder 200 sem processar nada. Use só em emergência. |
| `CRON_SECRET` | sim | Segredo do job diário do teste grátis (`/api/cron/trial-funnel`, ver `BILLING.md` seção 8). Gere com `openssl rand -hex 32` e use o mesmo valor no secret `CRON_SECRET` do GitHub Actions. Com `WEBHOOK_DRY_RUN=1`, o job também só simula. |
| `FEATURE_PAYWALL` | não | `false` desliga a cobrança no Zul: nada é bloqueado depois do teste e o job diário não envia nada. Padrão: ligada. |

O link de assinatura que o Zul envia (`/assinar/<id da organização>` e `/oferta/<id da organização>`) usa a mesma `ZUL_DASHBOARD_URL`; sem ela, a base é `https://www.meuazulao.com.br`.

Variáveis antigas `WHATSAPP_PHONE_ID` e `WHATSAPP_ACCESS_TOKEN` continuam funcionando como alternativa a `PHONE_ID` e `WHATSAPP_TOKEN`.

Depois de salvar, faça **Redeploy** do backend.

## 6. Webhook na Meta

1. No app da Meta, vá em **WhatsApp > Configuração > Webhook > Editar**.
2. **URL de callback**: `https://<backend-domain>/webhook`
3. **Token de verificação**: o mesmo valor de `WHATSAPP_VERIFY_TOKEN`.
4. Clique em **Verificar e salvar**. Se der erro, confira se o deploy terminou e se a variável está em Production.
5. Em **Campos do webhook**, clique em **Assinar** no campo **messages**. Os demais não são necessários.
6. Confirme que o número do passo 3 está vinculado ao app (WhatsApp > Configuração da API).

O webhook responde 200 para a Meta só depois de processar a mensagem (até 60 s) e ignora mensagens repetidas pelo id, então reenvios da Meta não duplicam gastos.

## 7. Migrações no Supabase

No **SQL Editor** do Supabase, rode nesta ordem (as duas podem ser rodadas mais de uma vez sem problema):

1. `docs/migrations/2026-11-26-zul-01-core.sql`: tabelas de estado do Zul (`zul_processed_messages`, `zul_conversations`, `zul_confirmations`), colunas `users.language` e `users.currency` e `cards.closing_day`.
2. `docs/migrations/2026-11-26-zul-02-link-phone-auth.sql`: faz o login por telefone cair na conta que já existe:
   - copia o telefone verificado dos usuários atuais para o Auth (o bloco final faz isso uma vez e mostra quantos foram atualizados; há uma consulta de prévia comentada logo acima dele);
   - se alguém criou conta pelo WhatsApp e depois entra pelo app com o mesmo número, liga as duas;
   - qualquer caso ambíguo (dois usuários com o mesmo número, por exemplo) é ignorado e só gera um aviso no log.

Recomendo rodar primeiro num branch ou cópia do banco e conferir o resultado da prévia.

## 8. Login por código no WhatsApp (Supabase Auth)

1. **Authentication > Providers > Phone**: ative o provedor. Não precisa configurar Twilio nem outro SMS, porque o hook abaixo substitui o envio.
   - Tamanho do código: 6 dígitos. Validade: 600 segundos (combina com o texto "expira em 10 minutos" do template).
2. **Authentication > Hooks > Send SMS hook > Adicionar**:
   - Tipo: **HTTPS**
   - URL: `https://<backend-domain>/api/auth/whatsapp-otp`
   - Clique em **Gerar segredo** e copie o valor completo (`v1,whsec_...`) para `SEND_SMS_HOOK_SECRET` na Vercel. Faça redeploy.
   - Ative o hook.
3. O código chega pelo template `codigo_login` no idioma do usuário (o que ele escolheu no Zul ou, se nunca falou com o Zul, pelo código do país do número).

Observação: as contas criadas pelo WhatsApp recebem um e-mail interno `wa<número>@phone.meuazulao.invalid`. Ele existe só para o painel funcionar com as regras atuais de acesso e nunca recebe mensagens.

## 9. Templates

Crie em **WhatsApp Manager > Modelos de mensagem > Criar modelo**. Para cada template, crie as três versões de idioma: **Português (BR)** `pt_BR`, **Espanhol** `es` e **Inglês** `en`. O nome precisa ser exatamente o indicado (minúsculas, com `_`). Na tela de criação, a Meta pede um exemplo para cada variável `{{n}}`: use os valores da coluna "Exemplo".

Regras da Meta que já foram respeitadas nos textos: nenhum texto começa ou termina com variável, e as variáveis estão em sequência.

### 9.1 `codigo_login` (Autenticação)

Categoria **Autenticação**. A Meta não deixa escrever o corpo: o texto é fixo. Configure assim:

- Método de entrega do código: **Copiar código**
- Marque **Adicionar aviso de segurança** ("Para sua segurança, não compartilhe este código.")
- Marque **Adicionar tempo de expiração**: **10 minutos**
- Texto do botão: deixe o padrão (Copiar código / Copiar código / Copy code)

Texto que a Meta gera (só para referência):

| Idioma | Corpo |
|---|---|
| pt_BR | `*{{1}}* é seu código de verificação. Para sua segurança, não compartilhe este código.` Rodapé: `Este código expira em 10 minutos.` |
| es | `Tu código de verificación es *{{1}}*. Por tu seguridad, no lo compartas.` Pie: `Este código caduca en 10 minutos.` |
| en | `*{{1}}* is your verification code. For your security, do not share this code.` Footer: `This code expires in 10 minutes.` |

| Variável | Exemplo |
|---|---|
| `{{1}}` código | `482913` |

### 9.2 `lembrete_conta` (Utilidade)

| Idioma | Corpo |
|---|---|
| pt_BR | `Oi, {{1}}! Lembrete: a conta {{2}} de {{3}} vence em {{4}}. Depois de pagar, é só me avisar por aqui.` |
| es | `¡Hola, {{1}}! Recordatorio: la cuenta {{2}} de {{3}} vence el {{4}}. Cuando la pagues, avísame por aquí.` |
| en | `Hi, {{1}}! Reminder: your {{2}} bill of {{3}} is due on {{4}}. Once it's paid, just let me know here.` |

| Variável | Exemplo pt_BR | Exemplo es | Exemplo en |
|---|---|---|---|
| `{{1}}` nome | `Felipe` | `Sofía` | `Alex` |
| `{{2}}` conta | `Aluguel` | `Renta` | `Rent` |
| `{{3}}` valor | `R$ 2.500,00` | `$8,500.00` | `$1,200.00` |
| `{{4}}` vencimento | `05/12` | `05/12` | `12/05` |

### 9.3 `alerta_orcamento` (Utilidade)

| Idioma | Corpo |
|---|---|
| pt_BR | `Oi, {{1}}! Você já usou {{2}}% do limite de {{3}} neste mês: {{4}} de {{5}}. Responda *resumo* para ver o mês completo.` |
| es | `¡Hola, {{1}}! Ya usaste el {{2}}% de tu límite de {{3}} este mes: {{4}} de {{5}}. Responde *resumen* para ver el mes completo.` |
| en | `Hi, {{1}}! You've used {{2}}% of your {{3}} budget this month: {{4}} of {{5}}. Reply *summary* to see the full month.` |

| Variável | Exemplo pt_BR | Exemplo es | Exemplo en |
|---|---|---|---|
| `{{1}}` nome | `Felipe` | `Sofía` | `Alex` |
| `{{2}}` porcentagem | `80` | `80` | `80` |
| `{{3}}` categoria | `Restaurante` | `Restaurantes` | `Restaurants` |
| `{{4}}` gasto | `R$ 640,00` | `$3,200.00` | `$320.00` |
| `{{5}}` limite | `R$ 800,00` | `$4,000.00` | `$400.00` |

### 9.4 `resumo_semanal` (Utilidade)

| Idioma | Corpo |
|---|---|
| pt_BR | `Oi, {{1}}! Sua semana em números: você gastou {{2}} em {{3}} registros. A categoria com mais gastos foi {{4}}, com {{5}}. Responda *resumo* para ver o mês.` |
| es | `¡Hola, {{1}}! Tu semana en números: gastaste {{2}} en {{3}} registros. La categoría con más gastos fue {{4}}, con {{5}}. Responde *resumen* para ver el mes.` |
| en | `Hi, {{1}}! Your week in numbers: you spent {{2}} across {{3}} entries. Your top category was {{4}}, with {{5}}. Reply *summary* to see the month.` |

| Variável | Exemplo pt_BR | Exemplo es | Exemplo en |
|---|---|---|---|
| `{{1}}` nome | `Felipe` | `Sofía` | `Alex` |
| `{{2}}` total da semana | `R$ 742,30` | `$3,710.00` | `$385.20` |
| `{{3}}` registros | `14` | `14` | `14` |
| `{{4}}` categoria | `Mercado` | `Supermercado` | `Groceries` |
| `{{5}}` valor da categoria | `R$ 310,00` | `$1,540.00` | `$160.00` |

### 9.5 `resumo_mensal` (Utilidade)

| Idioma | Corpo |
|---|---|
| pt_BR | `Oi, {{1}}! Fechamento de {{2}}: gastos de {{3}}, entradas de {{4}} e saldo de {{5}}. Os detalhes estão no seu painel em meuazulao.com.br.` |
| es | `¡Hola, {{1}}! Cierre de {{2}}: gastos de {{3}}, ingresos de {{4}} y saldo de {{5}}. Los detalles están en tu panel en meuazulao.com.br.` |
| en | `Hi, {{1}}! Your {{2}} wrap-up: {{3}} spent, {{4}} earned and a balance of {{5}}. See the details on your dashboard at meuazulao.com.br.` |

| Variável | Exemplo pt_BR | Exemplo es | Exemplo en |
|---|---|---|---|
| `{{1}}` nome | `Felipe` | `Sofía` | `Alex` |
| `{{2}}` mês | `novembro` | `noviembre` | `November` |
| `{{3}}` gastos | `R$ 4.820,00` | `$24,100.00` | `$2,410.00` |
| `{{4}}` entradas | `R$ 6.500,00` | `$32,000.00` | `$3,200.00` |
| `{{5}}` saldo | `R$ 1.680,00` | `$7,900.00` | `$790.00` |

### 9.6 `cobranca_racha` (Utilidade)

Lembrete para quem dividiu uma despesa com o usuário.

| Idioma | Corpo |
|---|---|
| pt_BR | `Oi, {{1}}! {{2}} registrou no MeuAzulão a divisão de {{3}}. A sua parte ficou em {{4}}. Para combinar o pagamento, é só falar com quem dividiu com você.` |
| es | `¡Hola, {{1}}! {{2}} registró en MeuAzulão la división de {{3}}. Tu parte es de {{4}}. Para coordinar el pago, habla con quien dividió contigo.` |
| en | `Hi, {{1}}! {{2}} logged a split of {{3}} on MeuAzulão. Your share is {{4}}. To settle up, just reach out to the person who split it with you.` |

| Variável | Exemplo pt_BR | Exemplo es | Exemplo en |
|---|---|---|---|
| `{{1}}` nome de quem deve | `Ana` | `Lucía` | `Sam` |
| `{{2}}` nome de quem cobra | `Felipe` | `Sofía` | `Alex` |
| `{{3}}` despesa | `Jantar de sábado` | `Cena del sábado` | `Saturday dinner` |
| `{{4}}` valor | `R$ 85,00` | `$420.00` | `$42.00` |

### 9.7 `status_assinatura` (Utilidade)

| Idioma | Corpo |
|---|---|
| pt_BR | `Oi, {{1}}! Atualização da sua conta: o plano {{2}} está {{3}} até {{4}}. Dúvidas? É só responder esta mensagem.` |
| es | `¡Hola, {{1}}! Novedades de tu cuenta: el plan {{2}} está {{3}} hasta el {{4}}. ¿Dudas? Responde este mensaje.` |
| en | `Hi, {{1}}! Account update: your {{2}} plan is {{3}} until {{4}}. Questions? Just reply to this message.` |

| Variável | Exemplo pt_BR | Exemplo es | Exemplo en |
|---|---|---|---|
| `{{1}}` nome | `Felipe` | `Sofía` | `Alex` |
| `{{2}}` plano | `Plus` | `Plus` | `Plus` |
| `{{3}}` situação | `ativo` | `activo` | `active` |
| `{{4}}` data | `25/12/2026` | `25/12/2026` | `12/25/2026` |

### 9.8 `reativacao` (Marketing)

Categoria **Marketing**. Ative o botão de descadastro que a Meta oferece (**Parar promoções** / **Detener promociones** / **Stop promotions**).

| Idioma | Corpo |
|---|---|
| pt_BR | `Oi, {{1}}! Faz {{2}} dias que você não anota nenhum gasto. Que tal retomar hoje? Me manda o último, tipo *mercado 50*, que eu cuido do resto.` |
| es | `¡Hola, {{1}}! Hace {{2}} días que no anotas ningún gasto. ¿Lo retomamos hoy? Mándame el último, por ejemplo *súper 50*, y yo me encargo del resto.` |
| en | `Hi, {{1}}! It's been {{2}} days since you logged an expense. Want to pick it back up today? Send me the last one, like *groceries 50*, and I'll handle the rest.` |

| Variável | Exemplo pt_BR | Exemplo es | Exemplo en |
|---|---|---|---|
| `{{1}}` nome | `Felipe` | `Sofía` | `Alex` |
| `{{2}}` dias | `12` | `12` | `12` |

Os templates da assinatura (`fim_teste` e `oferta_primeiro_mes`) estão em `BILLING.md` §4.

Hoje só o `codigo_login` é enviado pelo código. Os outros sete ficam aprovados para os lembretes e resumos automáticos; aprovar com antecedência evita espera no dia em que forem ligados.

## 10. Teste final

1. Pelo celular, mande `oi` para o número do Zul: deve chegar a mensagem de apresentação.
2. Mande `mercado 87,50`: deve chegar `✅ R$ 87,50 em Mercado, hoje.` e, em seguida, a pergunta do nome.
3. Responda a confirmação (arrastar para responder) com `apagar`: o gasto some.
4. Mande um áudio dizendo "uber vinte e três reais" e uma foto de recibo.
5. No app ou site, entre com o mesmo número: o código deve chegar no WhatsApp pelo template `codigo_login`, e a conta deve ser a mesma que o Zul criou.
6. Nos logs da Vercel (função `api/webhook`), não deve aparecer `invalid X-Hub-Signature-256` nem `signature check skipped`.

Problemas comuns:

- **Verificação do webhook falha**: `WHATSAPP_VERIFY_TOKEN` diferente do digitado na Meta, ou faltou o redeploy.
- **Mensagens chegam mas o Zul não responde**: token expirado (use o permanente do passo 4) ou `PHONE_ID` errado.
- **Erro 131030 ou 131026 no envio**: número fora da lista de teste com o app em modo de desenvolvimento, ou número sem WhatsApp.
- **Código de login não chega**: hook desativado, segredo diferente, ou template `codigo_login` ainda em análise.
