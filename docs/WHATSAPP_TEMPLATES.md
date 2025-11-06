# Templates WhatsApp Business API

Este documento descreve os templates do WhatsApp Business API utilizados no MeuAzulão.

## Template: Lembrete de Contas a Pagar (1 dia antes)

### Informações do Template

- **Nome**: `bill_reminder_amanha` (NOVO - criar novo template)
- **Categoria**: UTILITY (SERVIÇO)
- **Idioma**: Português (Brasil) - `pt_BR`
- **Tipo**: Template de Serviço (pode ser enviado a qualquer momento, sem janela de 24h)

**⚠️ IMPORTANTE**: 
- O template anterior foi reclassificado para MARKETING
- **Recomendação**: Criar um NOVO template com este nome (não editar o antigo)
- Isso garante aprovação correta como UTILITY desde o início

### Estrutura do Template

**Corpo do template** (VERSÃO UTILITY APROVADA - Baseada em pesquisa):

**⚠️ PROBLEMA IDENTIFICADO**: 
- Versões anteriores foram reclassificadas para MARKETING
- **Causa principal**: Variável no início ("Olá {{1}}") + linguagem genérica ("você tem")
- **Solução**: Template que começa com texto fixo e usa linguagem transacional

**Template UTILITY Aprovado (Versão 1 - ULTRA MINIMALISTA - RECOMENDADA)**:
```
Conta a pagar vencendo

Conta: {{1}}
Vencimento: {{2}}
Valor: R$ {{3}}

Notificação automática.
```

**Template UTILITY Aprovado (Versão 2 - Múltiplas Contas)**:
```
Contas a pagar vencendo

Vencimento: {{1}}
Quantidade: {{2}} conta(s)

{{3}}

Valor total: R$ {{4}}

Notificação automática.
```

**Por que funciona**:
- ✅ **Não começa com variável** (regra crítica do WhatsApp)
- ✅ **Formato tipo extrato bancário** (máximo transacional)
- ✅ **Remove TUDO que pode ser marketing**: "Olá", "você tem", "você possui", "cadastrada(s)"
- ✅ **Sem personalização** (não menciona nome, sem assinatura)
- ✅ **Apenas informação transacional essencial** (conta, vencimento, valor)
- ✅ **Zero chance de ser interpretado como marketing**

**📄 Veja documentação completa**: `docs/TEMPLATE_UTILITY_APROVADO.md`

### Variáveis

| Variável | Tipo | Descrição | Exemplo |
|----------|------|-----------|---------|
| `{{1}}` | Texto | Primeiro nome do usuário | `"Felipe"` |
| `{{2}}` | Texto | Quantidade de contas | `"3"` |
| `{{3}}` | Texto | Data de vencimento (DD/MM/YYYY) | `"15/01/2025"` |
| `{{4}}` | Texto | Lista de contas (separadas por `\n`) | `"Aluguel\nConta de Água\nConta de Luz"` |
| | | **IMPORTANTE**: Use `\n` (barra invertida + n) para quebras de linha | |
| | | No exemplo do WhatsApp, pode usar `\n` ou quebras reais (Enter) | |
| | | Quando enviado via API, `\n` será interpretado como quebra de linha | |
| `{{5}}` | Texto | Valor total formatado | `"450,00"` |

### Exemplo de Uso

**Input**:
- Nome: "Felipe"
- Quantidade: 3
- Data: "15/01/2025"
- Lista: "Aluguel\nConta de Água\nConta de Luz"
- Total: "450,00"

**Mensagem renderizada**:
```
Olá Felipe, você tem 3 conta(s) vencendo amanhã (15/01/2025):

Aluguel
Conta de Água
Conta de Luz

Total: R$ 450,00

Qualquer coisa, é só chamar! — Zul
```

---

## Como Criar o Template no WhatsApp Business Manager

### Passo 1: Acessar o WhatsApp Business Manager

1. Acesse: https://business.facebook.com/
2. Selecione sua conta/Meta Business
3. Vá em **Ferramentas** > **WhatsApp Manager**

### Passo 2: Criar Novo Template

1. No menu lateral, clique em **"Templates de Mensagem"**
2. Clique em **"Criar Template"**
3. Escolha **"Criar do zero"**

**💡 Por que criar novo?**
- O template antigo já foi aprovado como MARKETING
- Criar novo garante aprovação correta como UTILITY desde o início
- Evita problemas de reclassificação
- Permite manter o antigo como backup (se necessário)

### Passo 3: Configurar Template

**Nome do Template**:
```
bill_reminder_amanha
```

**Categoria**:
- Selecione: **UTILITY** (SERVIÇO)

**Idioma**:
- Português (Brasil) - `pt_BR`

**Conteúdo do Template**:
Cole exatamente este texto (VERSÃO REVISADA):
```
Olá {{1}}, você tem {{2}} conta(s) vencendo amanhã ({{3}}):

{{4}}

Total: R$ {{5}}

Qualquer coisa, é só chamar! — Zul
```

**⚠️ NOTA**: 
- Esta versão foi revisada para garantir aprovação como UTILITY
- Remove "Acesse o MeuAzulão para ver detalhes" (CTA promocional)
- Remove palavras como "automático" que podem ser interpretadas como marketing
- Adiciona assinatura amigável do Zul (personalização, não promocional)

### Passo 4: Configurar Variáveis

O WhatsApp detecta automaticamente os placeholders `{{1}}`, `{{2}}`, etc. Configure cada variável:

1. **{{1}}** - Tipo: **Texto**
   - Nome: "Nome do usuário"
   - Exemplo: `Felipe`

2. **{{2}}** - Tipo: **Texto**
   - Nome: "Quantidade de contas"
   - Exemplo: `3`

3. **{{3}}** - Tipo: **Texto**
   - Nome: "Data de vencimento"
   - Exemplo: `15/01/2025`

4. **{{4}}** - Tipo: **Texto**
   - Nome: "Lista de contas"
   - Exemplo: `Aluguel\nConta de Água\nConta de Luz`
   - **Importante**: 
     - No campo de exemplo, você pode usar `\n` ou quebras de linha reais (Enter)
     - O preview pode mostrar `\n` literalmente, mas funciona corretamente no envio
     - Quando enviado via API, `\n` será interpretado como quebra de linha pelo WhatsApp

5. **{{5}}** - Tipo: **Texto**
   - Nome: "Valor total"
   - Exemplo: `450,00`

### Passo 5: Revisar e Enviar para Aprovação

1. Clique em **"Visualizar"** para verificar o template
2. Confirme que está correto
3. Clique em **"Enviar para revisão"**

---

## Tempo de Aprovação

- **Tempo estimado**: 15 minutos a 24 horas
- **Status**: Acompanhe em **"Templates de Mensagem"** > **"Pendentes"**
- **Notificação**: Você receberá notificação quando for aprovado

---

## Validação do Template

Após a aprovação, você verá:
- ✅ Status: **Aprovado**
- ✅ Nome: `bill_reminder_amanha`
- ✅ Categoria: **UTILITY**
- ✅ Variáveis: 5 variáveis configuradas

---

## Notas Importantes

### Quebras de Linha
- A variável `{{4}}` precisa usar `\n` para quebras de linha
- O WhatsApp renderiza corretamente as quebras de linha em variáveis de texto

### Limites
- **Máximo de caracteres**: O template completo (com variáveis) não deve exceder 1000 caracteres
- **Máximo de variáveis**: WhatsApp permite até 10 variáveis por template. Estamos usando 5.
- **Limite de contas**: Recomendado limitar a lista a ~10 contas para evitar mensagem muito longa

### Categoria UTILITY
- **Vantagem**: Permite envio a qualquer momento, sem restrição de janela de 24h
- **Uso**: Ideal para notificações transacionais como lembretes de pagamento
- **Aprovação**: Geralmente mais rápida que templates de marketing

### Nome do Template
- Use exatamente `bill_reminder_amanha` no código para referenciar
- O nome é case-sensitive

---

## Payload de Exemplo (Referência Técnica)

Quando o código envia o template, o payload é assim:

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "template",
  "template": {
    "name": "bill_reminder_amanha",
    "language": {
      "code": "pt_BR"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "Felipe"
          },
          {
            "type": "text",
            "text": "3"
          },
          {
            "type": "text",
            "text": "15/01/2025"
          },
          {
            "type": "text",
            "text": "Aluguel\nConta de Água\nConta de Luz"
          },
          {
            "type": "text",
            "text": "450,00"
          }
        ]
      }
    ]
  }
}
```

---

## Troubleshooting

### Template não encontrado
- Verifique se o nome do template está exatamente como `bill_reminder_amanha`
- Confirme que o template está **Aprovado** (não apenas Pendente)
- Verifique se o idioma está correto (`pt_BR`)

### Erro ao enviar template
- Verifique se todas as variáveis estão sendo fornecidas
- Confirme que as credenciais WhatsApp (`PHONE_ID` e `WHATSAPP_TOKEN`) estão configuradas
- Verifique os logs para ver detalhes do erro retornado pela API

### Template rejeitado
- Verifique se o conteúdo está de acordo com as políticas do WhatsApp
- Certifique-se de que não há conteúdo promocional (deve ser UTILITY)
- Revise a estrutura do template e variáveis

---

## Referências

- [Documentação WhatsApp Business API - Templates](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Políticas de Templates do WhatsApp](https://www.whatsapp.com/legal/commerce-policy)
- [Guia de Categorias de Templates](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates#template-categories)

