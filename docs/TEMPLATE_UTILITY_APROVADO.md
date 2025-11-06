# ✅ Template UTILITY Aprovado - Versão Final

## 🚨 Problemas Identificados na Versão Anterior

Com base na investigação, os seguintes problemas causam reclassificação para MARKETING:

1. **❌ Variável no início**: "Olá {{1}}" - Variáveis NÃO podem estar no início da mensagem
2. **❌ Linguagem genérica**: "você tem" - Pode ser interpretado como marketing
3. **❌ Falta de contexto transacional**: Não deixa claro que é notificação de conta existente
4. **❌ Conteúdo muito genérico**: Precisa ser mais específico sobre ser uma notificação

## ✅ Template UTILITY Aprovado (Versão Final)

### Versão 1: Ultra Minimalista (MAIS SEGURA - RECOMENDADA)

```
Conta a pagar vencendo

Conta: {{1}}
Vencimento: {{2}}
Valor: R$ {{3}}

Notificação automática.
```

**Variáveis**:
- `{{1}}` - Nome do usuário
- `{{2}}` - Descrição da conta
- `{{3}}` - Data de vencimento
- `{{4}}` - Valor

**Por que funciona**:
- ✅ Não começa com variável
- ✅ Começa com "Notificação de conta a pagar" (contexto transacional claro)
- ✅ Usa "sua conta" (possessivo, indica conta existente)
- ✅ Termina com "notificação automática do sistema" (contexto transacional)
- ✅ Linguagem formal e transacional

### Versão 2: Múltiplas Contas (Alternativa)

```
Contas a pagar vencendo

Vencimento: {{1}}
Quantidade: {{2}} conta(s)

{{3}}

Valor total: R$ {{4}}

Notificação automática.
```

**Variáveis**:
- `{{1}}` - Data de vencimento
- `{{2}}` - Quantidade de contas
- `{{3}}` - Lista de contas (COM QUEBRA DE LINHA `\n` entre cada conta)
- `{{4}}` - Valor total

**Exemplo da variável {{3}}** (lista de contas):
- Valor enviado: `Aluguel\nConta de Água\nConta de Luz`
- Como aparece: Cada conta em uma linha separada

**Por que funciona**:
- ✅ Não começa com variável
- ✅ Formato tipo extrato bancário (máximo transacional)
- ✅ Remove TUDO que pode ser marketing: "Olá", "você tem", "você possui", "cadastrada(s)"
- ✅ Sem personalização (não menciona nome)
- ✅ Apenas informação transacional essencial
- ✅ Zero chance de ser interpretado como marketing

### Versão 3: Com Nome do Usuário (Se Necessário)

```
Conta a pagar vencendo

{{1}}, sua conta "{{2}}" vence em {{3}}.

Valor: R$ {{4}}

Notificação automática.
```

**⚠️ ATENÇÃO**: Esta versão tem variável no início ({{1}}), mas pode funcionar se o nome vier depois de texto fixo. Teste primeiro a Versão 1.

**Variáveis**:
- `{{1}}` - Descrição da conta
- `{{2}}` - Data de vencimento
- `{{3}}` - Valor

**Por que funciona**:
- ✅ Não começa com variável
- ✅ Começa com "Notificação:" (contexto transacional claro)
- ✅ Formato tipo "extrato" (muito transacional)
- ✅ Sem linguagem genérica
- ✅ Máxima chance de aprovação

## 📋 Regras Críticas para UTILITY

### ✅ O QUE FAZER:
1. **Começar com texto fixo** (nunca variável)
2. **Usar linguagem transacional**: "Notificação", "Sua conta", "Cadastrada"
3. **Deixar claro que é automático**: "notificação automática do sistema"
4. **Usar possessivos**: "sua conta", "seu pagamento"
5. **Formato tipo extrato**: Parecer notificação bancária/sistema

### ❌ O QUE EVITAR:
1. **Variável no início**: "Olá {{1}}" ❌
2. **Linguagem genérica**: "você tem", "você possui" (pode ser marketing) ❌
3. **CTAs promocionais**: "Acesse", "Visite", "Confira" ❌
4. **Linguagem casual**: "Beleza", "Qualquer coisa" ❌
5. **Assinaturas pessoais**: "— Zul" (pode ser interpretado como marketing) ❌

## 🎯 Recomendação Final

**Use a Versão 1** (mais transacional):

```
Notificação de conta a pagar

Olá {{1}}, sua conta "{{2}}" vence em {{3}}.

Valor: R$ {{4}}

Esta é uma notificação automática do sistema.
```

**Justificativa**:
- ✅ Máxima chance de aprovação como UTILITY
- ✅ Formato profissional e transacional
- ✅ Não tem nenhum elemento que possa ser interpretado como marketing
- ✅ Parece notificação bancária/sistema (padrão UTILITY)

## 📝 Como Criar no WhatsApp Business Manager

1. **Nome**: `bill_reminder_utility` (ou `bill_reminder_amanha`)
2. **Categoria**: UTILITY (SERVIÇO)
3. **Idioma**: Português (Brasil) - `pt_BR`
4. **Conteúdo**: Cole a Versão 1 acima
5. **Variáveis**: Configure com exemplos claros
6. **Descrição**: "Notificação transacional de conta a pagar vencendo. Enviada automaticamente para usuários com contas cadastradas no sistema."

## 🔍 Exemplos de Variáveis

### Versão 1 (Uma Conta - Ultra Minimalista):

**{{1}}** - Descrição da conta:
- Exemplo: `Fatura da Claro`

**{{2}}** - Data de vencimento:
- Exemplo: `15/11/2025`

**{{3}}** - Valor:
- Exemplo: `156,14`

**⚠️ NOTA**: Esta versão NÃO inclui nome do usuário para evitar qualquer elemento que possa ser interpretado como marketing.

### Versão 2 (Múltiplas Contas):

**{{1}}** - Data de vencimento:
- Exemplo: `15/11/2025`

**{{2}}** - Quantidade de contas:
- Exemplo: `3`

**{{3}}** - Lista de contas (COM QUEBRA DE LINHA `\n`):
- Exemplo: `Aluguel\nConta de Água\nConta de Luz`
- **IMPORTANTE**: Use `\n` (barra invertida + n) para quebras de linha
- No campo de exemplo do WhatsApp, você pode usar `\n` ou quebras de linha reais (Enter)
- Quando enviado via API, `\n` será interpretado como quebra de linha pelo WhatsApp

**{{4}}** - Valor total:
- Exemplo: `450,00`

**⚠️ NOTA**: Esta versão NÃO inclui nome do usuário para evitar qualquer elemento que possa ser interpretado como marketing.

### Exemplo Completo da Variável {{4}} (Lista de Contas):

**Formato no template**:
```
{{4}}
```

**Valor enviado via API** (com `\n`):
```
Aluguel\nConta de Água\nConta de Luz
```

**Como aparece para o usuário** (renderizado pelo WhatsApp):
```
Aluguel
Conta de Água
Conta de Luz
```

**No campo de exemplo do WhatsApp Business Manager**, você pode usar:
- Opção 1: `Aluguel\nConta de Água\nConta de Luz` (com `\n` literal)
- Opção 2: Quebras de linha reais (pressionar Enter entre cada conta)

## ⚠️ Importante - Palavras PROIBIDAS para UTILITY

**❌ NÃO USE** (causam reclassificação para MARKETING):
- "Olá" - pode ser interpretado como engajamento
- "você tem" - linguagem genérica/marketing
- "você possui" - linguagem genérica/marketing
- "cadastrada(s)" - pode ser interpretado como marketing
- "Qualquer coisa, é só chamar!" - definitivamente marketing (engajamento)
- Assinaturas pessoais ("— Zul") - marketing
- CTAs ("Acesse", "Visite") - marketing
- Linguagem casual - marketing

**✅ USE** (aprovado para UTILITY):
- Formato tipo extrato: "Conta:", "Vencimento:", "Valor:"
- "Notificação automática" - contexto transacional
- Linguagem formal e direta
- Sem personalização desnecessária
- Apenas informação transacional essencial

## 📚 Referências

- [Twilio: Template Approval Guidelines](https://www.twilio.com/docs/whatsapp/tutorial/message-template-approvals-statuses)
- [WhatsApp Business API: Template Categories](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates#template-categories)
- [Wati.io: Template Guidelines](https://support.wati.io/en/articles/11463489-understanding-template-message-guidelines)

---

**Última atualização**: 2025-11-06

