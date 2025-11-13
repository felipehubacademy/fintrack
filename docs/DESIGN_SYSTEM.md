# 🎨 FinTrack Design System

**Versão:** 1.0  
**Data:** 12 de Novembro de 2025  
**Princípio:** Design First - Sempre!

---

## 🎯 Princípios de Design

### 1. **Clareza Acima de Tudo**
- Instruções visuais em cada página
- Tooltips informativos em elementos complexos
- Feedback visual constante
- Mensagens de erro/sucesso claras

### 2. **Guia o Usuário**
- Tour guiado para novas features
- Onboarding para primeira vez
- Estados vazios com call-to-action
- Progressão visual clara

### 3. **Profissional, Não Infantil**
- Cores sóbrias e elegantes
- Ícones minimalistas
- Animações sutis
- Linguagem madura

### 4. **Consistência Visual**
- Mesmos componentes em toda app
- Espaçamentos padronizados
- Tipografia uniforme
- Paleta de cores coesa

---

## 🎨 Paleta de Cores

### Cores Primárias
```css
--flight-blue: #3B82F6      /* Azul principal */
--flight-blue-dark: #2563EB /* Azul escuro */
--flight-blue-light: #60A5FA /* Azul claro */
```

### Cores Secundárias
```css
--success: #10B981   /* Verde - sucesso, metas atingidas */
--warning: #F59E0B   /* Amarelo/Dourado - alertas, badges gold */
--error: #EF4444     /* Vermelho - erros, dívidas */
--info: #3B82F6      /* Azul - informações */
```

### Cores de Macro
```css
--needs: #EF4444     /* Necessidades - Vermelho */
--wants: #8B5CF6     /* Desejos - Roxo */
--investments: #10B981 /* Investimentos - Verde */
--income: #3B82F6    /* Recebimentos - Azul */
```

### Cores de Badges
```css
--badge-bronze: #CD7F32  /* Bronze */
--badge-silver: #C0C0C0  /* Prata */
--badge-gold: #FFD700    /* Ouro */
```

### Tons de Cinza
```css
--gray-50: #F9FAFB
--gray-100: #F3F4F6
--gray-200: #E5E7EB
--gray-300: #D1D5DB
--gray-400: #9CA3AF
--gray-500: #6B7280
--gray-600: #4B5563
--gray-700: #374151
--gray-800: #1F2937
--gray-900: #111827
```

---

## 📏 Espaçamentos

### Sistema 8pt Grid
```css
--spacing-1: 0.25rem  /* 4px */
--spacing-2: 0.5rem   /* 8px */
--spacing-3: 0.75rem  /* 12px */
--spacing-4: 1rem     /* 16px */
--spacing-5: 1.25rem  /* 20px */
--spacing-6: 1.5rem   /* 24px */
--spacing-8: 2rem     /* 32px */
--spacing-10: 2.5rem  /* 40px */
--spacing-12: 3rem    /* 48px */
--spacing-16: 4rem    /* 64px */
```

### Aplicação
- **Padding de cards:** `p-6` (24px)
- **Gap entre elementos:** `gap-4` (16px)
- **Margin entre seções:** `mb-8` (32px)
- **Padding de página:** `px-4 sm:px-6 lg:px-8` (responsivo)

---

## 🔤 Tipografia

### Família
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Tamanhos
```css
--text-xs: 0.75rem    /* 12px - labels, badges */
--text-sm: 0.875rem   /* 14px - body secundário */
--text-base: 1rem     /* 16px - body principal */
--text-lg: 1.125rem   /* 18px - subtítulos */
--text-xl: 1.25rem    /* 20px - títulos de card */
--text-2xl: 1.5rem    /* 24px - títulos de seção */
--text-3xl: 1.875rem  /* 30px - títulos de página */
```

### Pesos
```css
--font-normal: 400    /* Texto regular */
--font-medium: 500    /* Destaque leve */
--font-semibold: 600  /* Títulos */
--font-bold: 700      /* Ênfase forte */
```

---

## 🧩 Componentes Base

### 1. **HelpCard**
Instruções e dicas visuais

**Tipos:**
- `info` - Informações gerais (azul)
- `tip` - Dicas úteis (amarelo)
- `warning` - Alertas (laranja)
- `success` - Confirmações (verde)
- `help` - Ajuda contextual (roxo)

**Uso:**
```jsx
<HelpCard type="tip" title="Dica Importante">
  Configure sua primeira meta para começar!
</HelpCard>
```

### 2. **HelpTooltip**
Tooltips informativos (já existente)

**Uso:**
```jsx
<HelpTooltip content="Explicação detalhada aqui" />
```

### 3. **EmptyState**
Estados vazios com call-to-action

**Uso:**
```jsx
<EmptyState
  icon={Target}
  title="Nenhuma meta criada"
  description="Crie sua primeira meta financeira"
  actionLabel="Criar Meta"
  onAction={() => setShowModal(true)}
/>
```

### 4. **OnboardingOverlay**
Tutorial interativo passo a passo

**Uso:**
```jsx
<OnboardingOverlay
  steps={onboardingSteps}
  isOpen={showOnboarding}
  onComplete={() => setShowOnboarding(false)}
  storageKey="goals_onboarding"
/>
```

### 5. **Button**
Botões padronizados (já existente)

**Variantes:**
- `default` - Azul sólido
- `outline` - Borda azul
- `ghost` - Transparente
- `destructive` - Vermelho

### 6. **Card**
Cards padronizados (já existente)

**Estrutura:**
```jsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    Conteúdo
  </CardContent>
</Card>
```

---

## 🎭 Padrões de Interação

### 1. **Primeira Vez (Onboarding)**

**Quando usar:**
- Primeira vez acessando uma página
- Nova feature lançada
- Fluxo complexo

**Estrutura:**
```javascript
const [showOnboarding, setShowOnboarding] = useState(false);

useEffect(() => {
  const hasSeenOnboarding = localStorage.getItem('onboarding_goals');
  if (!hasSeenOnboarding && goals.length === 0) {
    setShowOnboarding(true);
  }
}, [goals]);
```

### 2. **Estado Vazio**

**Quando usar:**
- Nenhum dado disponível
- Lista vazia
- Primeira vez

**Estrutura:**
```jsx
{items.length === 0 ? (
  <EmptyState
    icon={Icon}
    title="Título claro"
    description="Explicação do que fazer"
    actionLabel="Ação principal"
    onAction={handleAction}
  />
) : (
  <ItemsList items={items} />
)}
```

### 3. **Tooltips Informativos**

**Quando usar:**
- Termos técnicos
- Cálculos complexos
- Funcionalidades não óbvias

**Estrutura:**
```jsx
<div className="flex items-center space-x-2">
  <span>Projeção de Atingimento</span>
  <HelpTooltip content="Calculado com base na sua contribuição mensal atual" />
</div>
```

### 4. **Cards de Ajuda**

**Quando usar:**
- Instruções importantes
- Dicas contextuais
- Avisos de ação necessária

**Estrutura:**
```jsx
<HelpCard type="tip" title="Como funciona?">
  <ul className="list-disc list-inside space-y-1">
    <li>Passo 1: Configure o valor alvo</li>
    <li>Passo 2: Defina contribuição mensal</li>
    <li>Passo 3: Acompanhe o progresso</li>
  </ul>
</HelpCard>
```

### 5. **Feedback Visual**

**Loading:**
```jsx
{loading ? (
  <LoadingLogo className="h-24 w-24" />
) : (
  <Content />
)}
```

**Sucesso:**
```jsx
success('Meta criada com sucesso!');
```

**Erro:**
```jsx
error('Erro ao salvar meta');
```

---

## 📱 Responsividade

### Breakpoints
```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

### Grid Padrão
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Cards */}
</div>
```

### Padding Responsivo
```jsx
<div className="px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24">
  {/* Conteúdo */}
</div>
```

---

## 🎬 Animações

### Princípios
- **Sutis:** Não distrair
- **Rápidas:** 200-300ms
- **Propósito:** Guiar atenção

### Transições Padrão
```css
transition-all duration-300
transition-colors duration-200
transition-opacity duration-200
```

### Hover States
```jsx
className="hover:scale-105 transition-transform duration-200"
className="hover:bg-gray-50 transition-colors"
```

---

## ✅ Checklist de Implementação

### Para Cada Nova Página:

- [ ] **Onboarding**
  - [ ] Tour guiado para primeira vez
  - [ ] Salvar estado no localStorage
  - [ ] Botão "Pular tutorial"

- [ ] **Estado Vazio**
  - [ ] EmptyState com ícone
  - [ ] Título claro
  - [ ] Descrição explicativa
  - [ ] Call-to-action principal

- [ ] **Tooltips**
  - [ ] HelpTooltip em termos técnicos
  - [ ] Explicação de cálculos
  - [ ] Dicas contextuais

- [ ] **Cards de Ajuda**
  - [ ] HelpCard no topo (se necessário)
  - [ ] Instruções passo a passo
  - [ ] Dicas úteis

- [ ] **Feedback**
  - [ ] Loading states
  - [ ] Mensagens de sucesso
  - [ ] Mensagens de erro
  - [ ] Confirmações de ação

- [ ] **Responsividade**
  - [ ] Grid responsivo
  - [ ] Padding responsivo
  - [ ] Teste em mobile/tablet/desktop

- [ ] **Acessibilidade**
  - [ ] Labels descritivos
  - [ ] Contraste adequado
  - [ ] Navegação por teclado

---

## 🎨 Exemplos Práticos

### Página de Metas (Implementado)
```jsx
// 1. Onboarding na primeira vez
<OnboardingOverlay steps={goalsOnboarding} />

// 2. Estado vazio
{goals.length === 0 && (
  <EmptyState
    icon={Flag}
    title="Nenhuma meta criada ainda"
    description="Defina suas metas financeiras..."
    actionLabel="Criar Primeira Meta"
  />
)}

// 3. Tooltips em elementos
<HelpTooltip content="Projeção baseada na contribuição mensal" />

// 4. Card de ajuda
<HelpCard type="tip" title="Como começar?">
  Configure o valor alvo e a contribuição mensal...
</HelpCard>
```

### Página de Histórico (A implementar)
```jsx
// 1. Filtros com tooltips
<div className="flex items-center space-x-2">
  <label>Período</label>
  <HelpTooltip content="Filtre por mês, trimestre ou ano" />
</div>

// 2. Estado vazio
{contributions.length === 0 && (
  <EmptyState
    icon={Calendar}
    title="Nenhuma contribuição registrada"
    description="Adicione sua primeira contribuição..."
  />
)}

// 3. Card de instrução
<HelpCard type="info">
  Aqui você visualiza todo o histórico de aportes...
</HelpCard>
```

---

## 📚 Recursos

### Componentes Criados:
- ✅ `HelpCard.jsx` - Cards de instrução
- ✅ `EmptyState.jsx` - Estados vazios
- ✅ `OnboardingOverlay.jsx` - Tutorial interativo
- ✅ `HelpTooltip.jsx` - Tooltips (já existia)
- ✅ `GoalBadges.jsx` - Gamificação elegante

### Próximos Componentes:
- [ ] `ProgressTimeline.jsx` - Timeline de evolução
- [ ] `ContributionHistory.jsx` - Histórico de aportes
- [ ] `GoalInsights.jsx` - Insights automáticos

---

## 🎯 Conclusão

**Design First significa:**
1. ✅ Pensar na experiência do usuário ANTES do código
2. ✅ Instruir e guiar SEMPRE
3. ✅ Feedback visual CONSTANTE
4. ✅ Consistência em TODAS as páginas
5. ✅ Profissional, mas ACESSÍVEL

**Lembre-se:** Cada pixel importa. Cada palavra importa. Cada interação importa.

---

**Mantido por:** Time de Desenvolvimento FinTrack  
**Última atualização:** 12 de Novembro de 2025
