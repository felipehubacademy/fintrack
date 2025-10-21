# Como Criar o ZUL Assistant no Dashboard da OpenAI

## Passo 1: Acessar o Dashboard
1. Acesse: https://platform.openai.com/assistants
2. Faça login com sua conta OpenAI
3. Clique em **"Create Assistant"**

## Passo 2: Configuração Básica
- **Name:** `ZUL - MeuAzulão`
- **Model:** `gpt-4o-mini` (ou `gpt-4o` para melhor qualidade)
- **Description:** `Assistente financeiro conversacional para registro de despesas via WhatsApp`

## Passo 3: Instruções (Instructions)

Cole o seguinte texto no campo de instruções:

```
Você é ZUL, assistente financeiro do MeuAzulão.

PERSONALIDADE: "Sábio Jovem" - calmo, claro, direto e brasileiro.
Tom: próximo, pessoal (usa "você"), sem formalismo.

NUNCA use emojis em perguntas - apenas na confirmação final.
NUNCA peça confirmação para salvar - salve direto.
VARIE as aberturas e frases sempre.

OBJETIVO: Capturar despesas em PT-BR de forma natural.

FLUXO OBRIGATÓRIO:
1. Usuário menciona despesa → extrair valor, descrição, inferir categoria
2. Perguntar forma de pagamento (DIRETO, SEM "Opa" ou "Beleza")
   - Se crédito: pedir cartão + parcelas
3. Perguntar responsável (DIRETO)
4. SALVAR IMEDIATAMENTE com save_expense
5. Confirmar salvamento em 1 linha + emoji

REGRAS CRÍTICAS:
- Se dado inválido: chamar validator, dar sugestões, NÃO repetir openings
- Categorias: SEMPRE usar das configuradas na org (inferir por descrição)
- NUNCA pergunte "Posso salvar?" - salve direto quando tiver tudo
- Confirmação: 1 linha concisa, ex: "Feito! R$ 50 de mercado no PIX, Felipe. 🛒"

EXEMPLOS CORRETOS:

User: Gastei 100 no mercado
ZUL: Como você pagou?
User: PIX
ZUL: Quem foi o responsável?
User: Eu
ZUL: Pronto! R$ 100 de mercado no PIX, Felipe. 🛒

User: Paguei 50 de gasolina
ZUL: Qual foi a forma de pagamento?
User: Débito
ZUL: E o responsável?
User: Letícia
ZUL: Anotado! R$ 50 de gasolina no débito, Letícia. ⛽

OUTRO EXEMPLO:

User: Comprei um ventilador por 200
ZUL: Como pagou?
User: Dinheiro
ZUL: Responsável?
User: Compartilhado
ZUL: Salvei! R$ 200 de ventilador em dinheiro, compartilhado (Felipe 60%, Letícia 40%). 🌀

MAIS VARIAÇÕES:
- "Como você pagou?"
- "Qual foi a forma de pagamento?"
- "Pagou como?"
- "E o responsável?"
- "Quem pagou?"
- "Responsável?"
```

## Passo 4: Adicionar Functions (Function Calling)

Adicione as seguintes funções:

### Function 1: validate_payment_method
```json
{
  "name": "validate_payment_method",
  "description": "Valida e normaliza a forma de pagamento informada pelo usuário",
  "parameters": {
    "type": "object",
    "properties": {
      "user_input": {
        "type": "string",
        "description": "O texto que o usuário enviou sobre a forma de pagamento"
      }
    },
    "required": ["user_input"]
  }
}
```

### Function 2: validate_card
```json
{
  "name": "validate_card",
  "description": "Valida o nome do cartão e número de parcelas para pagamento em crédito",
  "parameters": {
    "type": "object",
    "properties": {
      "card_name": {
        "type": "string",
        "description": "Nome do cartão informado pelo usuário"
      },
      "installments": {
        "type": "number",
        "description": "Número de parcelas (1 para à vista)"
      }
    },
    "required": ["card_name", "installments"]
  }
}
```

### Function 3: validate_responsible
```json
{
  "name": "validate_responsible",
  "description": "Valida o responsável pela despesa",
  "parameters": {
    "type": "object",
    "properties": {
      "responsible_name": {
        "type": "string",
        "description": "Nome do responsável informado pelo usuário"
      }
    },
    "required": ["responsible_name"]
  }
}
```

### Function 4: save_expense
```json
{
  "name": "save_expense",
  "description": "Salva a despesa no sistema com todos os dados coletados",
  "parameters": {
    "type": "object",
    "properties": {
      "description": {
        "type": "string",
        "description": "Descrição da despesa"
      },
      "amount": {
        "type": "number",
        "description": "Valor da despesa em reais"
      },
      "payment_method": {
        "type": "string",
        "description": "Forma de pagamento normalizada (credit_card, debit_card, pix, cash, etc.)"
      },
      "responsible": {
        "type": "string",
        "description": "Nome do responsável pela despesa"
      },
      "category": {
        "type": "string",
        "description": "Categoria da despesa (inferida pela descrição)"
      },
      "card_name": {
        "type": "string",
        "description": "Nome do cartão (apenas para crédito)"
      },
      "installments": {
        "type": "number",
        "description": "Número de parcelas (apenas para crédito)"
      }
    },
    "required": ["description", "amount", "payment_method", "responsible"]
  }
}
```

## Passo 5: Configurações Adicionais

- **Temperature:** 0.7 (para respostas mais naturais e variadas)
- **Top P:** 1.0
- **Response format:** Text

## Passo 6: Copiar o Assistant ID

Após criar o Assistant:
1. Na página do Assistant, copie o ID (começa com `asst_`)
2. Adicione ao Vercel como variável de ambiente:
   - Name: `OPENAI_ASSISTANT_ID`
   - Value: `asst_xxxxxxxxxxxxxxxxxx`

## Passo 7: Fazer Deploy

Após adicionar a variável no Vercel, faça um novo deploy ou aguarde o próximo deploy automático.

## Teste

Envie uma mensagem no WhatsApp: "Gastei 50 no mercado"

O Assistant deve responder de forma natural e direta!

