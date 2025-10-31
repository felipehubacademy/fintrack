# Fluxo das Novas Funcionalidades do ZUL

Este documento descreve o fluxo aguardado para as novas funções de consulta implementadas no ZUL.

---

## 📊 1. Resumo de Despesas (`get_expenses_summary`)

### Quando usar:
Quando o usuário perguntar sobre gastos totais, sem especificar categoria.

### Exemplos de triggers:
- "quanto gastei?"
- "quanto já gastei esse mês?"
- "resumo de despesas"
- "resumo esse mês"
- "quanto gastei hoje?"
- "quanto gastei essa semana?"
- "quanto gastei no mês passado?"

### Fluxo esperado:

1. **ZUL recebe mensagem** → Identifica que é uma consulta de resumo
2. **Inferência do período**:
   - Se mencionar "hoje" → `period: "hoje"`
   - Se mencionar "semana" → `period: "esta_semana"`
   - Se mencionar "mês passado" → `period: "mes_anterior"`
   - Se mencionar "mês" (sem especificar) → `period: "este_mes"`
   - **Se NÃO mencionar período** → `period: "este_mes"` (default)
3. **Chama função** → `get_expenses_summary({ period: "este_mes" })`
4. **Função retorna** → Resumo formatado com:
   - Total geral
   - Breakdown por categoria (top 10)
   - Percentual por categoria
   - Número de despesas
5. **ZUL retorna mensagem** → Exibe o resumo sem perguntar nada

### Exemplo de conversa:

```
Usuário: Zul, quanto gastei esse mês?
ZUL: 💰 *Resumo de Despesas* (Este Mês)

*Total: R$ 1.250,00*

• Alimentação: R$ 450,00 (36,0%)
• Transporte: R$ 300,00 (24,0%)
• Casa: R$ 250,00 (20,0%)
• Saúde: R$ 150,00 (12,0%)
• Lazer: R$ 100,00 (8,0%)

(45 despesas no total)
```

### Casos especiais:

- **Sem despesas**: Retorna "💰 Nenhuma despesa encontrada este mês."
- **Com categoria no filtro**: Se chamar com `category`, retorna apenas o total dessa categoria

---

## 📈 2. Resumo por Categoria (`get_category_summary`)

### Quando usar:
Quando o usuário perguntar sobre gastos de uma categoria específica.

### Exemplos de triggers:
- "quanto gastei de alimentação?"
- "quanto já gastei de alimentação esse mês?"
- "resumo de alimentação"
- "quanto foi em transporte hoje?"
- "quanto gastei de saúde essa semana?"

### Fluxo esperado:

1. **ZUL recebe mensagem** → Identifica categoria + período
2. **Inferência automática**:
   - Extrai categoria da mensagem (ex: "alimentação" → "Alimentação")
   - Extrai período (default: "este_mes" se não mencionar)
   - Normaliza nome da categoria (busca match no banco)
3. **Chama função** → `get_category_summary({ category: "Alimentação", period: "este_mes" })`
4. **Função retorna** → Resumo específico:
   - Total gasto na categoria
   - Número de despesas
5. **ZUL retorna mensagem** → Exibe o resumo sem perguntar nada

### Exemplo de conversa:

```
Usuário: Zul, quanto gastei de alimentação esse mês?
ZUL: 💰 *Resumo de Despesas* (Este Mês)

*Você gastou em Alimentação:* R$ 450,00
(15 despesas)
```

### Casos especiais:

- **Categoria não encontrada**: Busca normalizada ainda assim, tenta fazer match parcial
- **Sem despesas na categoria**: Retorna "💰 Nenhuma despesa encontrada este mês." (com período correto)

---

## 💰 3. Consultar Saldo de Contas (`get_account_balance`)

### Quando usar:
Quando o usuário perguntar sobre saldo bancário.

### Exemplos de triggers:
- "qual meu saldo?"
- "quanto tenho?"
- "meu saldo"
- "saldo da nubank"
- "quanto tem na nubank?"
- "saldo nubank"
- "quanto tenho na conta?"

### Fluxo esperado:

1. **ZUL recebe mensagem** → Identifica que é consulta de saldo
2. **Inferência da conta**:
   - Se mencionar nome de banco/conta (ex: "nubank", "c6") → `account_name: "Nubank"`
   - Se NÃO mencionar → `account_name: null` (retorna todas as contas)
3. **Chama função** → `get_account_balance({ account_name: "Nubank" })` ou `get_account_balance({})`
4. **Função retorna** → Saldo formatado:

   **Caso 1: Uma conta específica**
   ```
   💰 *Saldo das Contas*

   *Nubank - Felipe*
   Nubank - Conta Corrente
   Saldo: *R$ 1.500,00*
   ```

   **Caso 2: Múltiplas contas**
   ```
   💰 *Saldo das Contas*

   • Nubank - Felipe (Nubank) CC: R$ 1.500,00
   • C6 - Felipe (C6) CC: R$ 800,00
   • Poupança - Felipe (Caixa) PP: R$ 2.000,00

   *Total: R$ 4.300,00*
   ```

5. **ZUL retorna mensagem** → Exibe o saldo sem perguntar nada

### Exemplo de conversa:

```
Usuário: Zul, qual meu saldo?
ZUL: 💰 *Saldo das Contas*

• Nubank - Felipe (Nubank) CC: R$ 1.500,00
• C6 - Felipe (C6) CC: R$ 800,00

*Total: R$ 2.300,00*
```

```
Usuário: Zul, saldo da nubank
ZUL: 💰 *Saldo das Contas*

*Nubank - Felipe*
Nubank - Conta Corrente
Saldo: *R$ 1.500,00*
```

### Casos especiais:

- **Conta não encontrada**: Se mencionar conta que não existe, retorna todas as contas (com mensagem de fallback)
- **Nenhuma conta cadastrada**: Retorna "💰 Nenhuma conta bancária cadastrada."
- **Normalização**: "nubank", "Nubank", "NUBANK" → todos fazem match com "Nubank - Felipe"

---

## 🔄 Fluxo Geral de Consultas

### Princípios importantes:

1. **INFERÊNCIA ATIVA**: ZUL deve inferir período, categoria e conta da mensagem do usuário
2. **SEM PERGUNTAS**: Nunca perguntar "de qual período?" ou "qual conta?" - sempre inferir
3. **RESPOSTA DIRETA**: Chamar a função imediatamente e retornar o resultado
4. **NÃO LIMPAR HISTÓRICO**: Ao contrário de `save_expense` e `save_income`, as funções de consulta **NÃO limpam** o histórico, permitindo continuar a conversa

### Exemplo de fluxo completo:

```
Usuário: Zul, quanto gastei esse mês?
ZUL: 💰 *Resumo de Despesas* (Este Mês)
     *Total: R$ 1.250,00*
     • Alimentação: R$ 450,00 (36,0%)
     ...

Usuário: E quanto gastei de alimentação?
ZUL: 💰 *Resumo de Despesas* (Este Mês)
     *Você gastou em Alimentação:* R$ 450,00
     (15 despesas)

Usuário: Qual meu saldo?
ZUL: 💰 *Saldo das Contas*
     • Nubank - Felipe (Nubank) CC: R$ 1.500,00
     *Total: R$ 1.500,00*
```

### Tratamento de erros:

- **Erro na query**: Retorna mensagem amigável: "Ops [Nome]! Tive um problema ao buscar o resumo. 😅"
- **Sem dados**: Retorna mensagem específica (ex: "Nenhuma despesa encontrada")
- **Conta não encontrada**: Fallback para todas as contas (no caso de saldo)

---

## 📝 Validações e Regras

### Para `get_expenses_summary`:
- ✅ `period` é obrigatório (default: "este_mes")
- ✅ `category` é opcional (quando presente, filtra por categoria)
- ✅ Busca apenas despesas com `status = 'confirmed'`
- ✅ Agrupa por categoria quando não há filtro
- ✅ Limita a top 10 categorias quando há muitas

### Para `get_category_summary`:
- ✅ `category` é obrigatório
- ✅ `period` é obrigatório (default: "este_mes")
- ✅ Normaliza nome da categoria antes de buscar
- ✅ Reutiliza lógica de `get_expenses_summary`

### Para `get_account_balance`:
- ✅ `account_name` é opcional
- ✅ Busca apenas contas com `is_active = true`
- ✅ Normaliza nome da conta para match (case-insensitive, sem acentos)
- ✅ Retorna todas as contas se não especificar
- ✅ Calcula total quando há múltiplas contas

---

## 🎯 Prompt do ZUL

O prompt do ZUL já inclui as regras:

**Regra 15**: RESUMOS E CONSULTAS (despesas)
- Lista exemplos de triggers
- Instrui a inferir período e categoria
- NÃO perguntar nada - chamar função diretamente

**Regra 16**: CONSULTAR SALDO
- Lista exemplos de triggers
- Instrui a inferir nome da conta
- Chamar função diretamente

---

## 🧪 Testes Sugeridos

### Teste 1: Resumo geral
```
Usuário: quanto gastei esse mês?
Esperado: Resumo completo com todas as categorias
```

### Teste 2: Resumo por categoria
```
Usuário: quanto gastei de alimentação hoje?
Esperado: Total em Alimentação hoje
```

### Teste 3: Saldo geral
```
Usuário: qual meu saldo?
Esperado: Lista todas as contas com total
```

### Teste 4: Saldo específico
```
Usuário: saldo da nubank
Esperado: Saldo apenas da conta Nubank
```

### Teste 5: Múltiplas consultas
```
Usuário: quanto gastei esse mês?
ZUL: [resumo]
Usuário: e qual meu saldo?
ZUL: [saldo]
Esperado: Manter contexto, não limpar histórico
```

---

## 📚 Funções Implementadas

| Função | Parâmetros | Retorno |
|--------|-----------|---------|
| `get_expenses_summary` | `period` (obrigatório), `category` (opcional) | Resumo de despesas formatado |
| `get_category_summary` | `category` (obrigatório), `period` (obrigatório) | Resumo por categoria formatado |
| `get_account_balance` | `account_name` (opcional) | Saldo das contas formatado |

---

**Última atualização**: 31/10/2025
**Arquivo**: `docs/ZUL_NOVAS_FUNCIONALIDADES_FLUXO.md`

