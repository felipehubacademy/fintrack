# Scripts de Gerenciamento de Templates WhatsApp

## Scripts Disponíveis

### 1. `create-whatsapp-template.js`
Cria um novo template via WhatsApp Business API.

**Uso:**
```bash
node scripts/create-whatsapp-template.js
```

### 2. `check-template-status.js`
Verifica o status de um template específico.

**Uso:**
```bash
node scripts/check-template-status.js [nome_do_template]
```

**Exemplo:**
```bash
node scripts/check-template-status.js bill_reminder_utility_v2
```

### 3. `list-templates.js`
Lista todos os templates existentes na conta.

**Uso:**
```bash
node scripts/list-templates.js
```

### 4. `monitor-template-approval.js`
Monitora o status de aprovação de um template específico.

**Uso:**
```bash
node scripts/monitor-template-approval.js
```

## Template Atual

**Nome:** `bill_reminder_utility_v2`  
**ID:** `2275557932958238`  
**Status:** ✅ **APPROVED**  
**Categoria:** UTILITY  
**Idioma:** pt_BR

## Estrutura do Template

```
Contas a pagar vencendo

Vencimento: {{1}}
Quantidade: {{2}} conta(s)

{{3}}

Valor total: R$ {{4}}

Notificação automática.
```

**Variáveis:**
- `{{1}}` - Data de vencimento (DD/MM/YYYY)
- `{{2}}` - Quantidade de contas
- `{{3}}` - Lista de contas (separadas por `\n`)
- `{{4}}` - Valor total formatado

## Variáveis de Ambiente Necessárias

```bash
PHONE_ID=801805679687987
WHATSAPP_TOKEN=seu_token_aqui
WABA_ID=1305894714600979  # Opcional (usa valor padrão se não configurado)
```

## Notas

- O template foi criado e aprovado automaticamente via API
- O código já está atualizado para usar `bill_reminder_utility_v2`
- O template é do tipo UTILITY, permitindo envio a qualquer momento (sem janela de 24h)



