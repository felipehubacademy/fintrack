# Lojas: App Store e Google Play (app mobile)

Guia para o Felipe publicar o app `packages/mobile`. Tudo aqui é para copiar e colar.
Textos das lojas vêm do plano de produto (seção 6); respostas de privacidade seguem a seção 6.4.

Um app só, com nome por idioma:

| Idioma | Nome na tela do celular | Nome na loja |
|---|---|---|
| Português (Brasil) | MeuAzulão | MeuAzulão: Finanças no Zap |
| Espanhol (América Latina) | Zul | Zul: Finanzas por WhatsApp |
| Inglês (padrão) | Zul | Zul: Budget on WhatsApp |

O nome no celular vem de `packages/mobile/locales/*.json` (iOS e Android). Qualquer outro idioma de aparelho mostra "Zul".

---

## 1. Para onde a configuração aponta

| Item | Valor | Onde está |
|---|---|---|
| Conta Expo (owner) | `felipexavier_kid` | `app.config.js` → `owner` |
| Projeto EAS (projectId) | `1c40456c-0cbf-44bf-be20-e6723bffc90c` | `app.config.js` → `extra.eas.projectId` |
| Slug | `meuazulao-mobile` | `app.config.js` |
| Bundle ID iOS | `com.meuazulao.app` | `app.config.js` → `ios.bundleIdentifier` |
| Package Android | `com.meuazulao.app` | `app.config.js` → `android.package` |
| Apple ID (login da Apple) | `felipe.xavier1987@gmail.com` | `eas.json` → `submit.production.ios.appleId` |
| Versão | `1.0.0` (build number e versionCode sobem sozinhos no EAS) | `app.config.js` + `eas.json` (`appVersionSource: remote`) |

### O que você precisa preencher no `eas.json`

Em `packages/mobile/eas.json`, `submit.production.ios`:

- `ascAppId`: hoje está `FILL_ME_APP_STORE_CONNECT_APPLE_ID`. Troque pelo **Apple ID numérico do app** (App Store Connect → Apps → o app → App Information → "Apple ID", algo como `6740000000`). Só existe depois que você criar o app no App Store Connect (passo 3).
- `appleTeamId`: hoje está `FILL_ME_APPLE_TEAM_ID`. Troque pelo **Team ID** (developer.apple.com → Account → Membership details → "Team ID", 10 caracteres, ex.: `AB12CD34EF`).

Android: a chave da conta de serviço do Google Play **não fica no repositório**. Suba uma vez no EAS:
`eas credentials -p android` → production → Google Service Account → enviar o JSON. (Como criar o JSON: Play Console → Configuração → Acesso à API → criar conta de serviço com permissão de "Lançar apps".)

### Variáveis de ambiente no EAS (ambiente `production`)

O app lê estas variáveis no build. Crie no site do Expo (Project → Environment variables) ou pelo terminal:

```bash
cd packages/mobile
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "https://<projeto>.supabase.co" --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<anon key>" --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_ZUL_WHATSAPP --value "<número do Zul só com dígitos, ex.: 5511999999999>" --visibility plaintext
# Opcionais:
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value "https://meuazulao.com.br" --visibility plaintext   # padrão já é esse
eas env:create --environment production --name SENTRY_DSN --value "<dsn>" --visibility sensitive                            # sem DSN o app funciona, só não manda crash
```

Repita para `preview` se for gerar builds de teste. O Sentry está com envio de sourcemaps desligado (`SENTRY_DISABLE_AUTO_UPLOAD=true` no `eas.json`); para ligar, crie `SENTRY_ORG`, `SENTRY_PROJECT` e `SENTRY_AUTH_TOKEN` no EAS e remova essa linha.

---

## 2. Comandos (você roda, ou aprova que alguém rode)

Pré-requisitos: `npm i -g eas-cli` e `eas login` com a conta `felipexavier_kid`.

```bash
cd packages/mobile

# Conferir a configuração (precisa terminar sem erro)
npx expo config --type public

# Build de produção
eas build -p ios --profile production
eas build -p android --profile production

# Enviar para as lojas (último build)
eas submit -p ios --profile production --latest
eas submit -p android --profile production --latest
```

Atalhos no `package.json`: `npm run build:ios`, `npm run build:android`, `npm run submit:ios`, `npm run submit:android`.

Observações:
- **iOS:** o primeiro `eas build -p ios` pergunta se pode criar certificados e provisioning profile na sua conta Apple. Responda sim (o EAS guarda tudo).
- **Android, primeira vez:** o Google não deixa a API enviar o primeiro build de um app novo. Baixe o `.aab` do primeiro build no site do Expo e faça upload **manual** em Play Console → Produção → Criar versão. Depois disso o `eas submit` funciona.
- **Android, status `draft`:** o `eas.json` envia para a faixa `production` como rascunho (`releaseStatus: draft`). Nada vai ao ar até você clicar em "Enviar para revisão" no Play Console. Depois da primeira aprovação, dá para trocar para `"completed"`.
- **Sem teste fechado:** a conta do Google Play é de empresa e já publica apps, então a regra de 12 testadores por 14 dias (só para contas pessoais novas) não se aplica. Android vai para produção junto com o iOS.

---

## 3. App Store Connect

Criar o app: App Store Connect → Apps → "+" → New App
- Platform: iOS · Name: `Zul: Budget on WhatsApp` · Primary language: **English (U.S.)** · Bundle ID: `com.meuazulao.app` · SKU: `meuazulao-ios`
- Depois adicione as localizações **Portuguese (Brazil)** e **Spanish (Mexico)** (canto superior direito da página da versão).

Campos gerais (iguais em todos os idiomas):
- Category: **Finance** · Secondary: **Productivity**
- Price: **Free** · Availability: todos os países (ou só Brasil + América Latina + EUA no início)
- Age rating: responda "None" em tudo → **4+**
- Support URL: `https://meuazulao.com.br` (precisa ter forma de contato visível)
- Privacy Policy URL: `https://meuazulao.com.br/privacy?lang=en` (pt: `?lang=pt`, es: `?lang=es`)
- Copyright: `2026 <seu nome ou nome da empresa>`
- Export compliance: já respondido no build (`usesNonExemptEncryption: false`)
- iPad: o app é só iPhone (`supportsTablet: false`), então não precisa de screenshot de iPad.

### Português (Brasil)

- **Name (30):** MeuAzulão: Finanças no Zap
- **Subtitle (30):** Controle gastos pelo WhatsApp
- **Keywords (100):** controle financeiro,gastos,orçamento,whatsapp,despesas,cartão,parcelas,casal,planilha,economia
- **Promotional text (170):** Grátis no acesso antecipado. Mande seus gastos no WhatsApp e veja tudo organizado: cartões, parcelas, orçamentos e as contas do casal.
- **What's New:** Primeira versão. Mande "café 8" para o Zul e veja aparecer aqui.
- **Description:**

```
Mandou no Zap, tá anotado.

O MeuAzulão organiza seu dinheiro pelo WhatsApp. Você manda o gasto para o Zul, nosso assistente, e em 3 segundos está registrado na categoria certa. Sem planilha, sem esforço.

COMO FUNCIONA
• Mande "mercado 120" por texto, um áudio ou a foto do comprovante
• O Zul entende, categoriza e confirma na hora
• Abra o app quando quiser ver tudo organizado

O QUE VOCÊ VÊ NO APP
• Quanto ainda pode gastar hoje, sem fazer conta
• Cartões e parcelas: as faturas dos próximos meses
• Orçamentos que avisam antes de estourar
• Lembretes de contas a pagar
• Resumo do mês em 1 minuto

PARA O CASAL
Convide seu par. Cada um registra pelo próprio WhatsApp e vocês veem as contas da casa juntos, sem briga sobre quem pagou o quê.

SEGURO E SIMPLES
• Não pedimos senha de banco e não acessamos sua conta bancária
• Só entra o que você manda
• Exclua sua conta e seus dados quando quiser, direto no app

COMECE GRÁTIS
Grátis durante o acesso antecipado. Entre com seu número do WhatsApp e mande o primeiro gasto.

O MeuAzulão é um organizador de finanças pessoais. Não é banco, não movimenta dinheiro e não oferece empréstimos.
```

### Español (México)

- **Name (30):** Zul: Finanzas por WhatsApp
- **Subtitle (30):** Controla tus gastos en el chat
- **Keywords (100):** control de gastos,presupuesto,finanzas personales,whatsapp,ahorro,tarjeta,cuotas,msi,pareja,gastos
  (o plano repete "gastos"; se quiser ganhar espaço, troque o último por `deudas` ou `recibos`)
- **Promotional text (170):** Gratis durante el acceso anticipado. Envía tus gastos por WhatsApp y mira todo ordenado: tarjetas, cuotas, presupuestos y gastos en pareja.
- **What's New:** Primera versión. Mándale "café 8" a Zul y míralo aparecer aquí.
- **Description:**

```
Lo mandas, queda anotado.

Zul ordena tu dinero por WhatsApp. Le escribes lo que gastaste y en 3 segundos queda registrado en la categoría correcta. Sin hojas de cálculo, sin esfuerzo.

CÓMO FUNCIONA
• Manda "súper 120" por texto, un audio o la foto del recibo
• Zul entiende, lo categoriza y te confirma al instante
• Abre la app cuando quieras ver todo ordenado

LO QUE VES EN LA APP
• Cuánto puedes gastar hoy, sin hacer cuentas
• Tarjetas y cuotas (MSI): lo que pagarás los próximos meses
• Presupuestos que avisan antes de pasarte
• Recordatorios de cuentas por pagar
• Tu mes en un minuto

EN PAREJA
Invita a tu pareja. Cada quien registra desde su WhatsApp y ven juntos los gastos de la casa, sin pelear por quién pagó qué.

SEGURO Y SIMPLE
• No pedimos contraseñas bancarias ni nos conectamos a tu banco
• Solo entra lo que tú mandas
• Elimina tu cuenta y tus datos cuando quieras, desde la app

EMPIEZA GRATIS
Gratis durante el acceso anticipado. Entra con tu número de WhatsApp y manda tu primer gasto.

Zul es un organizador de finanzas personales. No es un banco, no mueve dinero y no ofrece préstamos.
```

### English (U.S.)

- **Name (30):** Zul: Budget on WhatsApp
- **Subtitle (30):** Track spending by chat
- **Keywords (100):** budget,expense tracker,spending,whatsapp,money,bills,split,couples,receipt,personal finance
- **Promotional text (170):** Free during early access. Text your expenses on WhatsApp and see everything organized: cards, installments, budgets and shared costs.
- **What's New:** First release. Text "coffee 8" to Zul and watch it show up here.
- **Description:**

```
Text it. Done.

Zul organizes your money over WhatsApp. Text what you spent and in 3 seconds it is logged in the right category. No spreadsheets, no effort.

HOW IT WORKS
• Send "groceries 120" as a text, a voice note or a photo of the receipt
• Zul understands it, categorizes it and confirms right away
• Open the app whenever you want to see it all organized

WHAT YOU SEE IN THE APP
• How much you can spend today, no math needed
• Cards and installments: what you will pay in the coming months
• Budgets that warn you before you overspend
• Bill reminders
• Your month in one minute

FOR COUPLES
Invite your partner. Each of you logs from your own WhatsApp and you see the household spending together, no arguing over who paid what.

SAFE AND SIMPLE
• We never ask for bank passwords and never connect to your bank
• Only what you send gets in
• Delete your account and your data anytime, right in the app

START FREE
Free during early access. Log in with your WhatsApp number and send your first expense.

Zul is a personal finance organizer. It is not a bank, does not move money and does not offer loans.
```

> **Risco de marca:** a Apple (diretriz 5.2.1) e o Google podem recusar "WhatsApp" no **nome** do app. Se recusarem, use: EN `Zul: Budget by Chat`, ES `Zul: Finanzas por chat`. O PT ("no Zap") não usa a marca. Na descrição, citar o WhatsApp é permitido.

### App Privacy (App Store Connect → App Privacy)

"Do you or your third-party partners collect data from this app?" → **Yes**. Tracking → **No** (o app não rastreia; o manifesto de privacidade já diz `NSPrivacyTracking: false`).

| Tipo de dado (Apple) | Coletado | Ligado à pessoa | Usado para rastrear | Finalidade |
|---|---|---|---|---|
| Contact Info → Phone Number | Sim | Sim | Não | App Functionality |
| Contact Info → Name | Sim | Sim | Não | App Functionality |
| Contact Info → Email Address | Sim | Sim | Não | App Functionality |
| Financial Info → Other Financial Info (gastos que a pessoa digita) | Sim | Sim | Não | App Functionality |
| User Content → Photos or Videos (fotos de comprovante e de perfil) | Sim | Sim | Não | App Functionality |
| Diagnostics → Crash Data | Sim | Não | Não | App Functionality |
| Usage Data → Product Interaction | Sim | Sim | Não | Analytics, App Functionality |

O plano 6.4 lista telefone, nome, dados financeiros, crash e interação. **E-mail** e **fotos** foram acrescentados porque o app tem login por e-mail e upload de comprovante/foto de perfil; se ficarem de fora, a declaração não bate com o app. Não declaramos cartão, banco, localização, contatos nem identificadores de publicidade (o app não coleta). Essas mesmas respostas estão no manifesto `ios.privacyManifests` do `app.config.js`; se mudar uma, mude a outra.

### Notas para a revisão da Apple (App Review Information)

- Sign-in required: **Yes** → preencha "User name" com o telefone de teste e "Password" com o código fixo (veja "Conta de demonstração" abaixo).
- Contact: seu nome, telefone e e-mail.
- **Notes** (cole em inglês):

```
Zul (MeuAzulão in Portuguese) is a personal budgeting organizer. People log their own expenses by chatting with our assistant "Zul" on WhatsApp; this app is the dashboard that shows those entries organized (totals, budgets, card installments, bill reminders).

It is not a financial service: it does not hold or move money, offers no payments, loans, investments or crypto, and does not connect to bank accounts. All financial data is entered by the user.

How to sign in: on the login screen enter the demo phone number below (country: United States +1) and tap "Send code". The demo number has a fixed code, so no WhatsApp message is needed: type the code below.
Demo phone: +1 555 010 0199
Code: 123456
(Alternatively use "Use email instead" with the demo email and password, if provided.)

Account deletion: Settings > Delete account. It lists what is deleted, asks the user to type DELETE, deletes the account and all data on our server and signs out.

The demo account is pre-filled with sample expenses so every screen has content.
```

### Conta de demonstração (Supabase, número de teste com código fixo)

O login por telefone usa o Supabase Auth. Para o revisor entrar sem receber WhatsApp:

1. Supabase Dashboard → projeto de produção → **Authentication → Sign In / Providers → Phone**. O provedor Phone precisa estar ligado (ele já está, porque o hook de envio pelo WhatsApp usa esse provedor).
2. Em **Test Phone Numbers and OTPs**, adicione `15550100199=123456` (número sem `+`, sinal de igual, código). Em "Test OTPs valid until", ponha uma data depois da revisão (ex.: 2027-03-31). Números de teste não disparam o hook: nenhum WhatsApp é enviado e o código fixo vale.
3. Crie a pessoa: **Authentication → Users → Add user** → telefone `+15550100199` (marque "auto confirm"). O app usa `shouldCreateUser: false`, então sem esse passo o login diz que a conta não existe.
4. Crie os dados do app para esse usuário (linha em `users`, organização, alguns gastos de exemplo, um cartão com parcelas, um orçamento). O caminho mais fácil: o engenheiro do backend roda o mesmo fluxo que o Zul usa para criar conta, apontando para esse usuário, e insere ~20 gastos de exemplo.
5. Teste você mesmo no app (build de produção) antes de enviar.
6. **Não exclua a conta de demonstração** durante a revisão (o revisor pode testar a exclusão; se excluir, recrie para a próxima versão).

No Google Play, use o mesmo telefone e código em **Política do app → Acesso ao app → "Todas ou algumas funcionalidades estão restritas"** com as mesmas instruções (em inglês).

---

## 4. Google Play Console

Criar o app: Play Console → Criar app → Nome `Zul: Budget on WhatsApp` · Idioma padrão **Inglês (Estados Unidos) – en-US** · App · Gratuito. Depois adicione traduções **Português (Brasil) – pt-BR** e **Espanhol (América Latina) – es-419**.

Detalhes do app (Presença na loja → Página principal da loja), por idioma:

| Campo | pt-BR | es-419 | en-US |
|---|---|---|---|
| Nome do app (30) | MeuAzulão: Finanças no Zap | Zul: Finanzas por WhatsApp | Zul: Budget on WhatsApp |
| Descrição curta (80) | Mande seus gastos no WhatsApp e veja tudo organizado. Sem planilha, sem esforço. | Envía tus gastos por WhatsApp y mira todo ordenado. Sin hojas de cálculo. | Text your expenses on WhatsApp. See your money organized. No spreadsheets. |
| Descrição completa (4000) | a mesma do App Store (pt) | a mesma do App Store (es) | a mesma do App Store (en) |

Gráficos: ícone 512×512 (PNG, gere a partir de `assets/icon.png`), **gráfico de destaque 1024×500** (obrigatório), screenshots de celular (as 6 da seção 5, mínimo 1080 px no lado menor).

Configuração da loja: Categoria **Finanças** · E-mail de contato · Site `https://meuazulao.com.br` · Política de privacidade `https://meuazulao.com.br/privacy?lang=pt`.

### Conteúdo do app (Política do app → Conteúdo do app)

- **Política de privacidade:** `https://meuazulao.com.br/privacy?lang=pt`
- **Anúncios:** Não contém anúncios
- **Acesso ao app:** restrito → instruções da conta de demonstração (seção 3)
- **Classificação de conteúdo:** questionário → categoria "Utilitário, produtividade, comunicação ou outro"; responder "Não" a tudo → Livre
- **Público-alvo:** 18 anos ou mais (não é para crianças)
- **App de notícias:** Não · **Apps de saúde:** Nenhum · **App governamental:** Não
- **Recursos financeiros (Financial features):** o app é **gestão de finanças pessoais / orçamento**. Se o formulário tiver uma opção de gestão de finanças pessoais ou orçamento, marque só ela. **Não** marque empréstimos, bancos, pagamentos, transferência, carteira digital, investimentos, criptomoedas ou seguros. Se só houver opções de serviços financeiros regulados, marque "Meu app não oferece nenhum desses recursos financeiros".
- **ID de publicidade:** o app **não** usa (responder Não)

### Segurança dos dados (Data safety)

- Coleta ou compartilha algum dos tipos de dados exigidos? **Sim**
- Todos os dados são criptografados em trânsito? **Sim** (HTTPS)
- Oferece forma de pedir exclusão dos dados? **Sim** → no app (Configurações → Excluir conta) e URL de exclusão (veja abaixo)
- Compartilhamento com terceiros: **Não** (provedores que processam dados em nosso nome, como hospedagem e Sentry, não contam como compartilhamento)

| Tipo de dado (Google) | Coletado | Compartilhado | Opcional? | Finalidades |
|---|---|---|---|---|
| Informações pessoais → Nome | Sim | Não | Obrigatório | Funcionalidade do app, Gerenciamento da conta |
| Informações pessoais → Endereço de e-mail | Sim | Não | Opcional (só login por e-mail) | Funcionalidade do app, Gerenciamento da conta |
| Informações pessoais → Número de telefone | Sim | Não | Obrigatório | Funcionalidade do app, Gerenciamento da conta |
| Informações financeiras → Outras informações financeiras | Sim | Não | Obrigatório | Funcionalidade do app |
| Fotos e vídeos → Fotos | Sim | Não | Opcional | Funcionalidade do app |
| Atividade no app → Interações no app | Sim | Não | Obrigatório | Análise, Funcionalidade do app |
| Informações e desempenho do app → Registros de falhas | Sim | Não | Obrigatório | Funcionalidade do app |

**URL de exclusão de conta** (o Google exige um link na web): precisa ser uma página pública que explique como excluir a conta (no app em Configurações → Excluir conta, ou pedindo por e-mail/WhatsApp) e o que é apagado. Confirme com quem cuida do site qual URL usar (por exemplo uma seção "Excluir conta" em `https://meuazulao.com.br/privacy`).

---

## 5. Screenshots (6 por idioma)

Tamanhos: **iPhone 6,9"** = 1320 × 2868 px (a Apple redimensiona para os menores) · **Android** = 1080 × 1920 px ou maior (9:16).
Use a conta de demonstração com dados de exemplo, idioma e moeda do aparelho de cada loja (pt-BR com R$, es com MXN, en com US$). Legenda em cima, tela do app embaixo, fundo azul da marca.

| # | Tela sugerida | PT | ES | EN |
|---|---|---|---|---|
| 1 | Conversa no WhatsApp com o Zul ao lado da lista de Movimentos | Mandou no Zap, tá anotado | Lo mandas, queda anotado | Text it. Done. |
| 2 | Início com o "quanto posso gastar hoje" em destaque | Quanto posso gastar hoje? R$ 84 | ¿Cuánto puedo gastar hoy? | How much can I spend today? |
| 3 | Cartão com parcelas/faturas dos próximos meses | Parcelas e faturas dos próximos meses | Tus cuotas de los próximos meses | Every installment, months ahead |
| 4 | Orçamentos com um aviso perto do limite | Orçamento que avisa antes de estourar | Presupuestos que avisan | Budgets that warn you |
| 5 | Gastos do casal (divisão entre membros) | Contas do casal sem briga | Gastos en pareja sin pelear | Split with your partner |
| 6 | Fechamento do mês | Resumo do mês em 1 minuto | Tu mes en un minuto | Your month in one minute |

A tela 1 mostra o WhatsApp: use uma imagem real da conversa com o Zul (sem número de telefone visível). Nada de logos de bancos ou bandeiras de cartão nas imagens.

---

## 6. Checklist rápido

- [ ] Criar o app no App Store Connect e no Play Console (nomes acima)
- [ ] Preencher `ascAppId` e `appleTeamId` no `eas.json`
- [ ] Subir a chave da conta de serviço do Google no EAS (`eas credentials -p android`)
- [ ] Criar variáveis `EXPO_PUBLIC_*` no EAS (ambiente production)
- [ ] Número de teste + código fixo no Supabase e conta de demonstração com dados
- [ ] Páginas `/privacy` e `/terms` no ar com `?lang=pt|es|en`, e endpoint `POST /api/account/delete` funcionando
- [ ] `eas build` iOS e Android → testar no celular (login por código, excluir conta numa conta de teste)
- [ ] Screenshots e gráfico de destaque
- [ ] App Privacy (Apple) e Data safety (Google) conforme as tabelas
- [ ] `eas submit` iOS → enviar para revisão · Android → promover o build do teste interno para produção (ou trocar `track` para `production` no `eas.json`) e enviar para revisão no mesmo dia do iOS

---

## 7. Assinatura (Plus) na revisão das lojas

Produtos, preços e RevenueCat: `docs/launch/BILLING.md`. No app, a compra é só pela loja (RevenueCat SDK, `react-native-purchases`); não há link de pagamento externo dentro do app.

### Onde fica o paywall no app

- **Ao tentar adicionar algo depois do teste:** botão **+** da barra de abas, "Adicionar à mão" no Início e os botões "Registrar no WhatsApp". A leitura (Início, Movimentos, Orçamentos) continua liberada.
- **Mais → Ajustes → Plano → Seu plano** (abre o paywall; também tem "Restaurar compras" e, para quem assinou pela loja, "Gerenciar assinatura").
- **Aviso no Início:** nos 3 últimos dias do teste ("Seu teste termina em N dias") e sempre depois que ele termina, com o botão "Ver planos"/"Assinar".
- O paywall mostra mensal e anual (anual em destaque com "Economize N%"), os preços vindos da loja, "Restaurar compras", o texto de renovação automática e os links de Termos e Privacidade. Se o teste acabou e a offering `winback` existe no RevenueCat, a oferta do primeiro mês aparece primeiro.
- Excluir a conta (Ajustes → Excluir conta) avisa que isso **não** cancela a assinatura da loja e diz onde cancelar.

### Estado da conta de demonstração

Para o revisor ver e testar a compra, deixe a organização da conta de demonstração **com o teste vencido e sem Plus**:

```sql
update organizations
set trial_ends_at = now() - interval '1 day', plus_until = null, plus_source = null
where id = '<id da organização da conta de demonstração>';
```

Os dados de exemplo continuam visíveis; tocar em **+** abre o paywall. A compra na revisão é sandbox (não cobra). Depois de cada revisão, se o revisor assinou, volte a conta para esse estado antes do próximo envio (apague o cliente no RevenueCat ou espere a assinatura sandbox expirar, e rode o SQL de novo).

Acrescente às **Notes** da seção 3 (em inglês):

```
Subscriptions: new accounts get a 7-day free trial (no payment details). After it, reading stays available but adding entries requires Plus (monthly or annual auto-renewable subscription, bought in the app with In-App Purchase).
The demo account's trial has already ended, so the paywall appears when you tap the + button in the tab bar or "Add by hand" on Home. It is also in More > Settings > Plan > Your plan. "Restore purchases" is on the paywall and in More > Settings > Plan.
Terms of Use (EULA): https://www.meuazulao.com.br/terms — Privacy Policy: https://www.meuazulao.com.br/privacy
```

No Google Play (Acesso ao app), use o mesmo texto. Para testar compras no Android antes da revisão, cadastre seu e-mail em **Configuração → Teste de licença** no Play Console.

### O que a Apple exige para as assinaturas

- **Envie as assinaturas junto com a versão:** a primeira compra no app só é revisada junto com um build. Em App Store Connect → app → versão → **In-App Purchases and Subscriptions**, selecione `meuazulao_plus_monthly` e `meuazulao_plus_annual` antes de enviar a versão. As duas precisam estar em "Ready to Submit" (nome, descrição e preço preenchidos nos três idiomas).
- **Screenshot da assinatura (obrigatório):** cada assinatura tem um campo **Review Information → Screenshot**. Use uma captura do paywall no iPhone (o mesmo tamanho das screenshots da seção 5, 1320 × 2868 px, serve; a Apple aceita a partir de 640 × 920 px). Pode ser a mesma imagem nos dois produtos. Tire com a conta de demonstração vencida, em inglês, mostrando os dois planos, o preço e o botão Assinar. Sem essa imagem o produto não sai de "Missing Metadata".
- **Termos de uso (EULA):** a Apple exige o link dos termos para apps com assinatura. Coloque `https://www.meuazulao.com.br/terms` no fim da descrição de cada idioma ("Terms of Use: …" / "Termos de Uso: …" / "Términos de uso: …") **ou** em App Information → License Agreement (EULA). O link de privacidade já está no campo Privacy Policy URL.
- **Contrato de apps pagos:** Agreements, Tax and Banking precisa estar ativo antes do envio (BILLING.md, seção 7).
- **Assinaturas no Google Play:** não pedem screenshot; precisam estar ativas e o perfil de pagamentos configurado.

Checklist extra:

- [ ] `EXPO_PUBLIC_RC_IOS_KEY` e `EXPO_PUBLIC_RC_ANDROID_KEY` no EAS (production) antes do `eas build` (sem elas o app abre normalmente, mas não vende)
- [ ] Assinaturas "Ready to Submit" e selecionadas na versão (App Store)
- [ ] Screenshot do paywall em Review Information de cada assinatura
- [ ] Link dos Termos na descrição ou no campo EULA
- [ ] Conta de demonstração com o teste vencido e sem Plus
- [ ] Testar compra e restauração em sandbox (TestFlight) e com licença de teste (Play)
