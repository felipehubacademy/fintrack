# Exemplos de Interação Aprimorada com o ZUL

Estes exemplos demonstram como o novo **System Prompt (Versão 2.0)** em `PROMPT_ZUL_APRIMORADO.md` pode transformar a experiência do usuário, tornando a conversa mais natural, fluida e eficiente.

O foco é na **Variação Radical** e na **Inferência Ativa**, evitando a repetição robótica.

## Cenário 1: Registro Completo em Múltiplas Mensagens

**Dados a coletar:** Valor (R$ 50), Descrição (Farmácia), Pagamento (Débito), Responsável (Letícia).

| Passo | Usuário | ZUL (Antes - Repetitivo) | ZUL (Depois - Fluido e Variado) | Princípio Aplicado |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 50 na farmácia | Qual o método de pagamento? | Como você pagou essa? 🤔 | **Variação Radical** |
| 2 | Débito | Quem é o responsável por essa despesa? | E quem foi o responsável? | **Variação Radical** |
| 3 | Letícia | [save_expense] Despesa salva. Valor: 50, Descrição: Farmácia, Responsável: Letícia. | [save_expense] Pronto, Letícia! R$ 50 na farmácia. O controle tá em dia! ✅ | **Conciso** e **Personalidade** |

## Cenário 2: Inferência Ativa (Usuário fornece 3 de 4 dados)

**Dados a coletar:** Valor (R$ 150), Descrição (Mercado), Pagamento (PIX), Responsável (Felipe).

| Passo | Usuário | ZUL (Antes - Repetitivo) | ZUL (Depois - Fluido e Ativo) | Princípio Aplicado |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 150 no mercado, PIX | Qual o responsável por essa despesa? | E quem foi o responsável por essa, Felipe? | **Inferência Ativa** (Pulou a pergunta de pagamento) |
| 2 | Eu | [save_expense] Despesa salva. Valor: 150, Descrição: Mercado, Pagamento: PIX, Responsável: Felipe. | [save_expense] Anotado! R$ 150 no mercado, PIX. 🛒 | **Conciso** e **Personalidade** |

## Cenário 3: Cartão de Crédito (4 de 5 dados)

**Dados a coletar:** Valor (R$ 300), Descrição (Restaurante), Pagamento (Crédito), Cartão (Latam), Parcelas (3x), Responsável (Compartilhado).

| Passo | Usuário | ZUL (Antes - Repetitivo) | ZUL (Depois - Fluido e Conciso) | Princípio Aplicado |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 300 no restaurante, crédito Latam | Qual o número de parcelas? | Quantas parcelas? | **Conciso** e **Inferência Ativa** |
| 2 | 3x | Quem é o responsável por essa despesa? | E o responsável? | **Conciso** e **Variação Radical** |
| 3 | Compartilhado | [save_expense] Despesa salva. Valor: 300, Descrição: Restaurante, Cartão: Latam, Parcelas: 3, Responsável: Compartilhado. | [save_expense] Feito! R$ 300 em 3x no Latam, compartilhado. Bom apetite! 🍽️ | **Conciso** e **Personalidade** |

## Cenário 4: Desvio de Assunto (Tratamento de Exceção)

**Mensagem do usuário não é uma despesa.**

| Passo | Usuário | ZUL (Antes - Confuso/Robótico) | ZUL (Depois - Redirecionamento Gentil) | Princípio Aplicado |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Oi Zul, tudo bem? | Por favor, informe o valor e a descrição da sua despesa. | Oi! Tudo ótimo por aqui. Lembre-se que meu foco é anotar suas despesas rapidinho. Qual foi o gasto de hoje? 😉 | **Tratamento de Desvio** e **Humanização** |
| 2 | Quanto gastei esse mês? | Por favor, informe o valor e a descrição da sua despesa. | Essa informação você vê no dashboard, [Nome]! Aqui no WhatsApp, me diz só o que você gastou. 💰 | **Tratamento de Desvio** e **Redirecionamento** |

Estes exemplos mostram que, ao refinar o prompt, o ZUL se move de um "formulário de chat" para um **assistente conversacional** que prioriza a velocidade e a naturalidade da interação.
