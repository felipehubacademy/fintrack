# 📱 Template WhatsApp - FinTrack

## Como criar manualmente no Meta Business Suite

### 🔗 Links úteis:
- **Meta Business Suite:** https://business.facebook.com/
- **WhatsApp Manager:** https://business.facebook.com/wa/manage/message-templates/
- **Criar Template:** https://business.facebook.com/wa/manage/message-templates/create

---

## 📝 Informações do Template

### Configurações Básicas:
| Campo | Valor |
|-------|-------|
| **Nome** | `fintrack_transaction_alert` |
| **Categoria** | `Utility` (Utilidade) |
| **Idioma** | `Portuguese (BR)` ou `pt_BR` |

---

## 📋 Conteúdo do Template

### 🔤 HEADER (Cabeçalho):
**Tipo:** Text

**Texto:**
```
Nova Transacao Detectada
```

⚠️ **IMPORTANTE:**
- ❌ Sem emojis
- ❌ Sem acentuação
- ❌ Sem asteriscos ou formatação
- ❌ Sem quebras de linha

---

### 📄 BODY (Corpo):
**Texto:**
```
Ola! Detectamos uma nova transacao no seu cartao LATAM:

Descricao: {{1}}
Valor: R$ {{2}}
Data: {{3}}

Deseja categorizar esta transacao?
```

**Variáveis:**
- `{{1}}` = Descrição da transação (ex: "SEPHORA RJ")
- `{{2}}` = Valor (ex: "89,90")
- `{{3}}` = Data (ex: "15/01/2024")

⚠️ **ATENÇÃO:**
- As variáveis devem ser exatamente `{{1}}`, `{{2}}`, `{{3}}`
- No Meta Business Suite, você pode adicionar essas variáveis clicando no botão "Add Variable"

---

### 🔽 FOOTER (Rodapé):
**Texto:**
```
FinTrack - Controle Financeiro
```

---

### 🔘 BUTTONS (Botões):
**Tipo:** Quick Reply Buttons (3 botões)

**Botão 1:**
- Tipo: Quick Reply
- Texto: `Confirmar`

**Botão 2:**
- Tipo: Quick Reply  
- Texto: `Ignorar`

**Botão 3:**
- Tipo: Quick Reply
- Texto: `Editar`

---

## 📸 Preview Visual

```
┌─────────────────────────────────────┐
│  Nova Transacao Detectada           │ ← HEADER
├─────────────────────────────────────┤
│                                     │
│  Ola! Detectamos uma nova          │
│  transacao no seu cartao LATAM:    │
│                                     │
│  Descricao: SEPHORA RJ             │ ← Variável {{1}}
│  Valor: R$ 89,90                   │ ← Variável {{2}}
│  Data: 15/01/2024                  │ ← Variável {{3}}
│                                     │
│  Deseja categorizar esta           │
│  transacao?                        │
│                                     │ ← BODY
├─────────────────────────────────────┤
│  FinTrack - Controle Financeiro    │ ← FOOTER
├─────────────────────────────────────┤
│  [ Confirmar ]  [ Ignorar ]        │
│        [ Editar ]                  │ ← BUTTONS
└─────────────────────────────────────┘
```

---

## ✅ Checklist antes de submeter:

- [ ] Nome: `fintrack_transaction_alert`
- [ ] Categoria: Utility
- [ ] Idioma: Portuguese (BR)
- [ ] Header sem emojis ou acentos
- [ ] Body com 3 variáveis {{1}}, {{2}}, {{3}}
- [ ] Footer com nome do app
- [ ] 3 botões Quick Reply adicionados
- [ ] Preview verificado

---

## ⏳ Após submeter:

1. **Aguardar aprovação** (24-48 horas)
2. **Você receberá email** quando aprovado/rejeitado
3. **Motivos comuns de rejeição:**
   - Emojis no header
   - Formatação incorreta
   - Conteúdo promocional (deve ser Utility)
   - Variáveis mal formatadas

4. **Status do template:**
   - `PENDING` = Em análise
   - `APPROVED` = Aprovado e pronto para usar
   - `REJECTED` = Rejeitado (veja o motivo no email)

---

## 🔑 Após aprovação, usar assim:

```javascript
// Enviar mensagem com template aprovado
const messageData = {
  messaging_product: 'whatsapp',
  to: '+5511978229898',
  type: 'template',
  template: {
    name: 'fintrack_transaction_alert',
    language: { code: 'pt_BR' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'SEPHORA RJ' },      // {{1}}
          { type: 'text', text: '89,90' },           // {{2}}
          { type: 'text', text: '15/01/2024' }       // {{3}}
        ]
      }
    ]
  }
};
```

---

## 📞 Suporte:

Se tiver problemas:
1. Verifique que está usando a conta WhatsApp Business correta
2. Confirme que o número está verificado
3. Revise as políticas do WhatsApp Business
4. Entre em contato com o suporte Meta se persistir

---

**Template criado para:** FinTrack - Sistema de Controle Financeiro
**Data:** 09/10/2025
**Versão:** 1.0

