# 🔍 Investigação: Template Reclassificado para MARKETING

## Problema
O template `bill_reminder_amanha` foi reclassificado de **UTILITY** para **MARKETING** pelo WhatsApp.

## 📋 Análise do Template Atual

### Template Atual
```
Olá {{1}}, você tem {{2}} conta(s) vencendo amanhã ({{3}}):

{{4}}

Total: R$ {{5}}

Acesse o MeuAzulão para ver detalhes.
```

## 🚨 Possíveis Causas da Reclassificação

Com base na documentação oficial do WhatsApp Business API, templates são reclassificados para MARKETING quando:

### 1. **Call-to-Action (CTA) Promocional**
❌ **Problema identificado**: A frase "Acesse o MeuAzulão para ver detalhes" pode ser interpretada como:
- Convite para usar o app (promocional)
- Call-to-action que não é essencial para a transação
- Linguagem de marketing/engajamento

### 2. **Linguagem Não Transacional**
❌ **Problema**: O template pode não estar claro o suficiente sobre ser uma **notificação transacional** (relacionada a uma conta existente do usuário).

### 3. **Falta de Contexto Transacional**
❌ **Problema**: O template não menciona explicitamente que é uma **notificação de conta existente** ou **lembrete de pagamento pendente**.

## ✅ Soluções Recomendadas

### Opção 1: Minimalista com Assinatura do Zul (RECOMENDADO)

**Template Revisado**:
```
Olá {{1}}, você tem {{2}} conta(s) vencendo amanhã ({{3}}):

{{4}}

Total: R$ {{5}}

— Zul
```

**Ou com frase relevante**:
```
Olá {{1}}, você tem {{2}} conta(s) vencendo amanhã ({{3}}):

{{4}}

Total: R$ {{5}}

Qualquer coisa, é só chamar! — Zul
```

**Mudanças**:
- ✅ Remove "Acesse o MeuAzulão para ver detalhes" (CTA promocional)
- ✅ Remove palavras como "automático", "auto", "notificação automática" (podem ser interpretadas como marketing)
- ✅ Adiciona assinatura simples do Zul (personalização, não promocional)
- ✅ Foca apenas na informação essencial (lembrete de pagamento)

### Opção 2: Tornar CTA Mais Transacional

**Template Revisado**:
```
Olá {{1}}, você tem {{2}} conta(s) vencendo amanhã ({{3}}):

{{4}}

Total: R$ {{5}}

Para registrar o pagamento, acesse sua conta.
```

**Mudanças**:
- ✅ CTA focado em ação transacional (registrar pagamento)
- ✅ Não menciona nome do app (menos promocional)
- ✅ Linguagem mais transacional

### Opção 3: Template Minimalista (MAIS SEGURO)

**Template Revisado**:
```
Olá {{1}}, você tem {{2}} conta(s) vencendo amanhã ({{3}}):

{{4}}

Total: R$ {{5}}
```

**Mudanças**:
- ✅ Remove completamente qualquer CTA
- ✅ Apenas informação essencial
- ✅ Máxima chance de aprovação como UTILITY

## 📚 Regras do WhatsApp para Categoria UTILITY

### O que é considerado UTILITY:
✅ Notificações de transações existentes
✅ Lembretes de pagamento pendente
✅ Atualizações de conta
✅ Confirmações de ações do usuário
✅ Alertas de segurança

### O que NÃO é considerado UTILITY (vira MARKETING):
❌ Convites para usar o app
❌ Promoções ou ofertas
❌ Conteúdo educacional não transacional
❌ CTAs para engajamento
❌ Mencionar nome do app de forma promocional

## 🔧 Como Corrigir

### Passo 1: Editar Template no WhatsApp Business Manager

1. Acesse: https://business.facebook.com/
2. Vá em **Ferramentas** > **WhatsApp Manager** > **Templates de Mensagem**
3. Encontre o template `bill_reminder_amanha`
4. Clique em **"Editar"** (se permitido) ou **"Criar Nova Versão"**

### Passo 2: Aplicar Mudanças

**Recomendação**: Use a **Opção 1** (mais balanceada)

1. Remova: `Acesse o MeuAzulão para ver detalhes.`
2. Adicione: `Esta é uma notificação automática da sua conta.`
3. Mantenha todas as variáveis (`{{1}}` a `{{5}}`)
4. Categoria: **UTILITY** (SERVIÇO)

### Passo 3: Enviar para Revisão

1. Clique em **"Enviar para revisão"**
2. Na descrição, explique:
   ```
   Este template é uma notificação transacional de lembrete de 
   pagamento pendente. É enviado automaticamente para usuários 
   que têm contas a pagar vencendo no dia seguinte. Não contém 
   conteúdo promocional ou marketing.
   ```

### Passo 4: Solicitar Reclassificação (Se Necessário)

Se o template já foi aprovado como MARKETING:

1. No WhatsApp Business Manager, selecione o template
2. Clique em **"Solicitar revisão"** ou **"Reportar problema"**
3. Explique que é uma notificação transacional:
   ```
   Este template é uma notificação transacional de lembrete de 
   pagamento. Não é marketing, é um serviço essencial para 
   usuários que já têm contas cadastradas no sistema. Por favor, 
   reclassifique como UTILITY.
   ```

## 📖 Referências Oficiais

### Documentação WhatsApp
- [Template Categories](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates#template-categories)
- [Utility Templates](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/utility)
- [Marketing Templates](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/marketing)

### Políticas
- [WhatsApp Commerce Policy](https://www.whatsapp.com/legal/commerce-policy)
- [Message Template Guidelines](https://developers.facebook.com/docs/whatsapp/message-templates/guidelines)

## 🎯 Recomendação Final

**Use versão minimalista com assinatura do Zul**:

```
Olá {{1}}, você tem {{2}} conta(s) vencendo amanhã ({{3}}):

{{4}}

Total: R$ {{5}}

— Zul
```

**Ou com frase relevante**:
```
Olá {{1}}, você tem {{2}} conta(s) vencendo amanhã ({{3}}):

{{4}}

Total: R$ {{5}}

Qualquer coisa, é só chamar! — Zul
```

**Justificativa**:
- ✅ Remove elemento promocional (CTA)
- ✅ Remove palavras como "automático" que podem ser interpretadas como marketing
- ✅ Mantém informação essencial (lembrete de pagamento)
- ✅ Assinatura do Zul adiciona personalização sem ser promocional
- ✅ Máxima chance de aprovação como UTILITY
- ✅ Mais limpo e direto

## ⚠️ Importante

- Templates UTILITY podem ser enviados a qualquer momento (sem janela de 24h)
- Templates MARKETING só podem ser enviados dentro da janela de 24h após interação do usuário
- Para lembretes automáticos, **UTILITY é essencial**

## 📝 Próximos Passos

1. ✅ Revisar template atual no WhatsApp Business Manager
2. ✅ Aplicar mudanças recomendadas (Opção 1)
3. ✅ Enviar para revisão com descrição clara
4. ✅ Monitorar aprovação
5. ✅ Se necessário, solicitar reclassificação manual

---

**Última atualização**: 2025-11-06

