# Análise da Jornada Solo - Estado Atual

## ✅ O que já está funcionando

### 1. Modais de Despesas
- ✅ `ExpenseModal.jsx` - Oculta campo "Responsável" para Solo
- ✅ `EditExpenseModal.jsx` - Oculta campo "Responsável" para Solo
- ✅ Não mostra opção "Compartilhado" para Solo
- ✅ Auto-seleciona cost center do usuário quando Solo

### 2. RLS (Row Level Security)
- ✅ Políticas RLS filtram dados corretamente
- ✅ Solo vê apenas suas próprias transações
- ✅ Family vê tudo da organização

### 3. Onboarding
- ✅ Pula etapa de convites para Solo
- ✅ Fluxo simplificado para Solo

### 4. Configurações
- ✅ Página de Configurações oculta seção "Usuários e Convites" para Solo

## ⚠️ O que precisa ser ajustado

### 1. WhatsApp Bot (Zul) ❌
**Problema:** Permite salvar despesas como "Compartilhado" mesmo para usuários Solo.

**Localização:** `backend/services/zulAssistant.js`
- Linha ~790: Determina `isShared` baseado no owner
- Linha ~1270: Salva como "Compartilhado" quando `isShared = true`
- **Falta:** Verificar se organização é Solo antes de permitir compartilhado

**Ação necessária:**
- Buscar `organization.type` do contexto
- Se for Solo, forçar `isShared = false` e usar cost center do usuário
- Rejeitar mensagens que tentam criar despesa compartilhada para Solo

### 2. Gráficos MonthCharts ⚠️
**Problema:** Mostra breakdown "Individual vs Org" mesmo para Solo.

**Localização:** `web/components/MonthCharts.jsx`
- Linha ~44-56: Processa breakdown Individual vs Org
- Linha ~155-209: Mostra dados de "Responsável" com splits
- **Falta:** Passar `isSoloUser` como prop e simplificar para Solo

**Ação necessária:**
- Receber `isSoloUser` como prop
- Se Solo, não mostrar breakdown Individual vs Org
- Simplificar gráficos para mostrar apenas dados individuais

### 3. Gráficos IncomeCharts ⚠️
**Problema:** Mostra "Compartilhada" vs "Individual" mesmo para Solo.

**Localização:** `web/components/IncomeCharts.jsx`
- Linha ~41-48: Cria gráfico de "Tipo de Entrada" (Compartilhada vs Individual)
- **Falta:** Verificar se é Solo e ocultar esse gráfico

**Ação necessária:**
- Receber `isSoloUser` como prop
- Se Solo, não mostrar gráfico "Tipo de Entrada"
- Ou simplificar para mostrar apenas "Individual"

### 4. Página de Fechamento (Closing) ⚠️
**Problema:** Mostra dados da família inteira, não diferencia Solo vs Family.

**Localização:** `web/pages/dashboard/closing.jsx`
- Linha ~240-247: Calcula totais da família inteira
- Linha ~406-457: Tooltips mostram divisão por responsável
- Linha ~687: Título sempre mostra nome da organização/família
- **Falta:** Verificar se é Solo e ajustar textos/calculos

**Ação necessária:**
- Buscar `isSoloUser` do hook
- Se Solo, ajustar textos para não mencionar "família"
- Simplificar tooltips para não mostrar divisão por responsável

### 5. Dashboard Principal ⚠️
**Problema:** Pode estar mostrando dados incorretos nos cards de resumo.

**Localização:** `web/pages/dashboard/index.jsx`
- Linha ~244: Comentário diz "Dados sem filtro de privacidade (tudo visível)"
- RLS já filtra, mas textos podem mencionar "família"

**Ação necessária:**
- Verificar textos que mencionam "família" e ajustar para Solo

## 📋 Checklist de Ajustes

- [ ] WhatsApp Bot: Verificar tipo de organização e bloquear despesas compartilhadas para Solo
- [ ] MonthCharts: Simplificar para Solo (remover breakdown Individual vs Org)
- [ ] IncomeCharts: Ocultar gráfico "Tipo de Entrada" para Solo
- [ ] Closing: Ajustar textos e tooltips para Solo
- [ ] Dashboard: Verificar textos que mencionam "família"
- [ ] TransactionModal: Verificar se precisa de ajustes (já verificado - parece OK)

## 🎯 Resultado Esperado

Após os ajustes, usuários Solo devem:
- ✅ Ver apenas suas próprias transações (já funciona via RLS)
- ✅ Não ver opções de "Compartilhado" em nenhum lugar
- ✅ Não ver breakdown Individual vs Org nos gráficos
- ✅ Não conseguir criar despesas compartilhadas via WhatsApp
- ✅ Ver textos adequados para conta individual (sem menção a "família")

