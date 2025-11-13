# ✅ Belvo - Informações CONFIRMADAS (Documentação Oficial)

**Data:** 12 de Novembro de 2025  
**Fonte:** [Belvo Developer Documentation](https://developers.belvo.com/products/aggregation_brazil/aggregation-brazil-introduction)  
**Status:** ✅ Informações Oficiais Confirmadas

---

## 📋 Resumo Executivo

**Belvo Open Finance Data Aggregation (OFDA)** é uma solução completa para integração com a **Rede Open Finance do Brasil**, oferecendo:

✅ **Dados padronizados** de contas bancárias  
✅ **Hosted Widget** pronto para uso  
✅ **My Belvo Portal** para gestão de consentimentos (obrigatório por regulação)  
✅ **Webhooks automáticos** para atualização em tempo real  
✅ **Conformidade total** com regulamentação brasileira

---

## 🔐 Conceitos Fundamentais

### Consent (Consentimento)
- Acordo do usuário para compartilhar dados Open Finance
- **Apenas o usuário pode gerenciar** (renovar/revogar)
- Padronizado pela Rede Open Finance Brasil
- Válido por período determinado

### Link
- Representação interna da Belvo para um usuário
- Criado automaticamente após consentimento
- Relação **1:1** com consent
- Você pode deletar o link (revoga o consent automaticamente)

**Importante:** Deletar um link é **irreversível** e remove todos os dados do usuário.

---

## 📊 Dados Disponíveis

### 1. **Owner** (Titular da Conta)
- Nome completo
- Informações de contato
- Documentos de identidade (CPF/CNPJ)
- Dados cadastrais

### 2. **Account** (Conta)
- Informações da conta
- Saldo
- Overdraft (cheque especial)
- Empréstimos
- Cartões de crédito

### 3. **Transaction** (Transação)
- Data da transação
- Valor
- Descrição
- Categoria
- Tipo (débito/crédito)

### 4. **Bill** (Fatura de Cartão)
- Faturas mensais de cartão de crédito
- Valor total
- Data de vencimento
- Detalhes de pagamento

### 5. **Balance** (Saldo)
- Saldo disponível
- Saldo bloqueado
- Investimentos automáticos

### 6. **Investment** (Investimento)
- Posição de portfólio
- Tipo de produto
- ISIN
- Saldo
- Remuneração
- Detalhes de valorização

### 7. **Investment Transaction** (Transação de Investimento)
- Operações de compra/venda
- Instrumento relacionado
- Valores bruto e líquido
- Quantidade
- Nota de corretagem

---

## 🏦 Instituições Disponíveis

**Cobertura:** 200+ instituições financeiras brasileiras

**Tipos:**
- Bancos tradicionais
- Fintechs
- Cooperativas de crédito
- Instituições de investimento

**Lista completa:** [Banking Aggregation (Brazil OFDA) Institutions](https://developers.belvo.com/products/aggregation_brazil/aggregation-brazil-institutions)

---

## 🔄 Fluxo de Integração

### Passo a Passo:

```
1. Usuário na sua aplicação
   ↓
2. Você solicita CPF/CNPJ e nome completo
   ↓
3. POST /token/ (gera access token)
   ↓
4. Lança Belvo Hosted Widget
   ↓
5. Usuário escolhe instituição
   ↓
6. Usuário define quais dados compartilhar
   ↓
7. Redirect para instituição bancária
   ↓
8. Usuário concede consentimento
   ↓
9. Redirect de volta ao Widget
   ↓
10. Link criado automaticamente
    ↓
11. Belvo recupera últimos 12 meses de dados
    ↓
12. Webhooks enviados para cada recurso
    ↓
13. Você consome os dados via API
```

### 📥 Recuperação Automática Inicial:

Assim que o consentimento é concedido, Belvo **automaticamente** recupera:
- ✅ Últimos 12 meses de **Accounts**
- ✅ Últimos 12 meses de **Owners**
- ✅ Últimos 12 meses de **Transactions**
- ✅ Últimos 12 meses de **Credit Card Bills**

---

## 🔔 Webhooks Disponíveis

### Webhooks de Atualização Histórica:
Enviados após recuperação inicial dos dados:

- `historical_update` (OWNERS)
- `historical_update` (ACCOUNTS)
- `historical_update` (TRANSACTIONS)
- `historical_update` (BILLS)
- `historical_update` (INVESTMENTS)
- `historical_update` (INVESTMENT_TRANSACTIONS)

### Webhooks de Atualização Recorrente:
Para links recorrentes, enviados quando há novos dados:

- `new_transactions_available`
- `new_accounts_available`
- `new_bills_available`
- etc.

### Webhook de Expiração de Consentimento:
- `consent_expired` - Enviado quando consentimento expira

**Atualização Automática:** ✅ **CONFIRMADO** via webhooks

---

## 🖥️ Belvo Hosted Widget

### Características:
- ✅ Compliant com Open Finance Brasil
- ✅ Guia o usuário em todo o processo
- ✅ Responsivo (desktop e mobile)
- ✅ Customizável (cores, logo, textos)
- ✅ Suporte a deeplinks (apps mobile)

### Integração:
1. **Web:** Iframe ou popup
2. **Mobile:** WebView com deeplink handling

### Customização:
- Logo da sua marca
- Cores primárias/secundárias
- Textos personalizados
- URL de redirecionamento

---

## 🏛️ My Belvo Portal (MBP)

### ⚠️ OBRIGATÓRIO por Regulação

Segundo regulamentação Open Finance, usuários **DEVEM** ter acesso fácil para gerenciar consentimentos.

### 3 Modos de Implementação:

#### 1. **Public MBP** (Mais simples)
- URL: `https://meuportal.belvo.com/?mode=landing`
- Usuário vê **todos** os consentimentos (todas as apps usando Belvo)
- Sem customização
- Implementação: apenas redirect

#### 2. **Customized MBP** (Recomendado)
- Mostra apenas consentimentos da **sua aplicação**
- Customizável (logo, cores)
- Melhor UX
- Requer configuração

#### 3. **Consent Renewal Mode**
- Usado para renovar consentimentos expirados
- Triggered por webhook `consent_expired`
- Fluxo simplificado

---

## 📱 Integração Mobile

Para apps mobile-native:

1. Criar **WebView** na aplicação
2. Carregar Belvo Hosted Widget na WebView
3. Configurar **deeplink** handling
4. Usuário é redirecionado ao banco via deeplink
5. Após consentimento, retorna ao app via deeplink

**Documentação:** Belvo fornece guias específicos para iOS e Android

---

## ⏱️ Limites de Recuperação de Dados

### Frequência de Atualização:
- Limitado pela Rede Open Finance Brasil
- Varia por instituição
- Belvo gerencia automaticamente

### Gestão de Consentimentos:
- Consentimentos têm prazo de validade
- Belvo envia webhook quando expira
- Usuário precisa renovar via MBP

**Documentação detalhada:** [Understanding Data Retrieval Limits in Brazil OFDA](https://developers.belvo.com/products/aggregation_brazil/data-retrieval-limits)

---

## 🔒 Segurança e Conformidade

### Regulamentação:
- ✅ Compliant com Open Finance Brasil
- ✅ Conformidade com LGPD
- ✅ Certificações de segurança

### Dados:
- ❌ Belvo **NÃO armazena** credenciais bancárias
- ✅ Criptografia end-to-end
- ✅ Tokens de acesso seguros
- ✅ Auditoria completa

---

## 🎯 Implementação no FinTrack

### Fase 1: Setup Inicial (1-2 dias)
```javascript
// 1. Gerar token de acesso
POST https://api.belvo.com/token/
Body: {
  cpf: "12345678900",
  full_name: "João Silva"
}
Response: {
  access_token: "abc123...",
  expires_in: 3600
}

// 2. Lançar Widget
<iframe 
  src="https://widget.belvo.com?access_token=abc123..."
  width="100%"
  height="600px"
/>

// 3. Receber Link ID
// Widget retorna link_id após consentimento
```

### Fase 2: Webhooks (1 dia)
```javascript
// Endpoint no FinTrack
POST /api/webhooks/belvo

// Processar webhook
if (webhook.type === 'historical_update') {
  // Buscar transações
  GET https://api.belvo.com/transactions/?link={link_id}
  
  // Salvar no banco
  // Categorizar automaticamente
  // Atualizar dashboard
}
```

### Fase 3: Gestão de Consentimentos (1 dia)
```javascript
// Adicionar link no menu/perfil
<a href="https://meuportal.belvo.com/?mode=landing">
  Gerenciar Contas Conectadas
</a>

// Ou customizado
<a href="https://meuportal.belvo.com/?mode=custom&app_id={seu_id}">
  Minhas Contas
</a>
```

---

## 💰 Preços (Ainda Não Confirmados)

⚠️ **Informações de preços NÃO estão na documentação pública**

**Próximo passo:** Contatar time comercial da Belvo

**Contato:**
- Email: sales@belvo.com
- Solicitar proposta para Brasil
- Perguntar sobre tier gratuito/sandbox

---

## ✅ Checklist de Integração

### Pré-requisitos:
- [ ] Conta Belvo criada ✅ (você já criou)
- [ ] API keys obtidas
- [ ] Sandbox testado
- [ ] Webhook endpoint configurado

### Implementação:
- [ ] Backend: Endpoint para gerar token
- [ ] Frontend: Integrar Hosted Widget
- [ ] Backend: Endpoint para receber webhooks
- [ ] Backend: Processar e salvar transações
- [ ] Frontend: Exibir transações importadas
- [ ] Frontend: Link para My Belvo Portal

### Compliance:
- [ ] Termos de uso atualizados
- [ ] Política de privacidade atualizada
- [ ] Consentimento explícito do usuário
- [ ] Link visível para gestão de consentimentos

---

## 🚀 Próximos Passos

### Imediato:
1. ✅ Explorar dashboard Belvo
2. ✅ Obter API keys (sandbox)
3. ✅ Testar Hosted Widget em sandbox
4. ✅ Configurar webhook endpoint

### Curto Prazo:
1. Implementar geração de token
2. Integrar widget na página "Contas"
3. Processar webhooks
4. Salvar transações no banco

### Médio Prazo:
1. Categorização automática
2. Reconciliação com despesas manuais
3. Alertas de transações duplicadas
4. Insights baseados em transações reais

---

## 📚 Links Úteis

- **Documentação Geral:** https://developers.belvo.com/products/aggregation_brazil/aggregation-brazil-introduction
- **Instituições Disponíveis:** https://developers.belvo.com/products/aggregation_brazil/aggregation-brazil-institutions
- **API Reference:** https://developers.belvo.com/reference
- **Hosted Widget Guide:** https://developers.belvo.com/products/aggregation_brazil/hosted-widget-introduction
- **My Belvo Portal:** https://meuportal.belvo.com/
- **Webhooks:** https://developers.belvo.com/products/aggregation_brazil/webhooks

---

## ✅ Conclusão

**Belvo está CONFIRMADA como solução viável** para Open Banking no FinTrack:

1. ✅ **Documentação completa** e bem estruturada
2. ✅ **Hosted Widget** pronto para uso
3. ✅ **Webhooks automáticos** para atualização em tempo real
4. ✅ **Compliance total** com regulamentação brasileira
5. ✅ **My Belvo Portal** resolve obrigação regulatória
6. ✅ **200+ instituições** brasileiras

**Única pendência:** Confirmar preços com time comercial

**Recomendação:** ✅ **Prosseguir com implementação** usando sandbox enquanto aguarda proposta comercial

---

**Preparado por:** AI Assistant  
**Baseado em:** Documentação oficial Belvo  
**Status:** ✅ Informações Confirmadas  
**Próximo Passo:** Implementar integração

