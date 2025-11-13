# 🎯 Arquitetura do Sistema de Onboarding e Tours

## 📋 Visão Geral

Temos **2 sistemas complementares** que funcionam juntos:

### 1. **Onboarding Overlay** (Modal Inicial)
- **O que é:** Modal fullscreen que aparece na **primeira vez** que o usuário acessa uma página
- **Quando:** Automático na primeira visita
- **Objetivo:** Dar uma visão geral rápida da página
- **Componente:** `OnboardingOverlay_v2.jsx`
- **Formato:** Modal centralizado com passos sequenciais

### 2. **Tour Interativo** (Guia com Highlights)
- **O que é:** Tour interativo que **destaca elementos** na página com overlays e card flutuante
- **Quando:** Manual (via botão "Tour" ou Zul) ou após onboarding
- **Objetivo:** Guia detalhado mostrando cada elemento específico
- **Componente:** `useTour` hook + `ZulFloatingButton` (card flutuante)
- **Formato:** Highlights nos elementos + card flutuante explicativo

---

## 🔄 Fluxo Completo

### Primeira Vez (Novo Usuário):
```
1. Usuário acessa /dashboard
   ↓
2. OnboardingOverlay aparece (modal)
   - 5 passos explicando a página
   - Visão geral
   ↓
3. Ao finalizar, oferecer:
   - Opção: "Iniciar Tour Interativo" (com highlights)
   - Ou: "Pular" (pode fazer depois)
   ↓
4. Se escolher tour interativo:
   - useTour inicia
   - Elementos são destacados
   - Card flutuante aparece
   - Usuário navega pelos elementos
```

### Visitas Seguintes:
```
1. Usuário acessa /dashboard
   ↓
2. OnboardingOverlay NÃO aparece (já viu)
   ↓
3. Usuário pode:
   - Clicar no botão "Tour" (topo da página)
   - Clicar no Zul (canto inferior direito) → "Iniciar Tour"
   ↓
4. Tour interativo inicia (useTour)
   - Highlights nos elementos
   - Card flutuante explicativo
```

---

## 🎨 Como Funciona Cada Sistema

### OnboardingOverlay (Modal)
```jsx
<OnboardingOverlay
  steps={getDashboardTourSteps(orgUser?.name)}
  isOpen={showDashboardTour}
  onComplete={() => setShowDashboardTour(false)}
  onSkip={() => setShowDashboardTour(false)}
  storageKey="dashboard"
  allowSkip={true}
/>
```

**Características:**
- ✅ Modal centralizado
- ✅ Passos sequenciais (1 de 5, 2 de 5, etc.)
- ✅ Bolas de progresso pequenas
- ✅ Pode pular
- ✅ Salva no localStorage (`onboarding_dashboard`)

### Tour Interativo (useTour)
```jsx
const { startTour, isTourActive, nextStep } = useTour();

// Iniciar tour
startTour(getDashboardTourSteps(orgUser?.name), 'dashboard');

// Renderizar highlights
{isTourActive && (
  <div className="highlight-overlay" />
  <Card className="floating-tour-card" />
)}
```

**Características:**
- ✅ Destaca elementos específicos na página
- ✅ Card flutuante (canto inferior direito)
- ✅ Navegação passo a passo
- ✅ Pode destacar múltiplos elementos
- ✅ Scroll automático para elementos

---

## 🔗 Integração dos Sistemas

### Opção 1: Conectar os Dois (Recomendado)
Quando o OnboardingOverlay finalizar, oferecer iniciar o tour interativo:

```jsx
<OnboardingOverlay
  steps={overlaySteps}
  isOpen={showOnboarding}
  onComplete={() => {
    // Ao finalizar, oferecer tour interativo
    setShowTourOffer(true);
  }}
/>

{showTourOffer && (
  <Modal>
    <h3>Quer um tour interativo?</h3>
    <Button onClick={() => {
      setShowTourOffer(false);
      startTour(tourSteps, 'dashboard');
    }}>
      Iniciar Tour Interativo
    </Button>
  </Modal>
)}
```

### Opção 2: Separados (Atual)
- OnboardingOverlay: Aparece automaticamente na primeira vez
- Tour Interativo: Disponível via botão "Tour" ou Zul

---

## 📝 Estados e Storage

### OnboardingOverlay:
- **localStorage:** `onboarding_dashboard` = `'true'`
- **Verificação:** `localStorage.getItem('onboarding_dashboard')`

### Tour Interativo:
- **Database:** `onboarding_progress.tours_completed` (JSONB)
- **SessionStorage:** `skippedTours` (array)
- **Verificação:** `useTour().isTourCompleted('dashboard')`

---

## 🎯 Páginas com Tours

1. **Dashboard** (`/dashboard`)
   - OnboardingOverlay: ✅
   - Tour Interativo: ✅ (via useTour)

2. **Metas** (`/dashboard/goals`)
   - OnboardingOverlay: ✅
   - Tour Interativo: ⚠️ (precisa implementar)

3. **Insights** (`/dashboard/insights`)
   - OnboardingOverlay: ⚠️ (precisa implementar)
   - Tour Interativo: ✅ (via useTour)

4. **Transações** (`/dashboard/transactions`)
   - OnboardingOverlay: ⚠️ (precisa implementar)
   - Tour Interativo: ✅ (via useTour)

---

## 🚀 Próximos Passos

1. **Conectar OnboardingOverlay → Tour Interativo**
   - Ao finalizar onboarding, oferecer tour interativo
   - Implementar `UnifiedOnboarding` component

2. **Adicionar OnboardingOverlay em todas as páginas**
   - Goals, Insights, Transactions, etc.
   - Cada página tem seus próprios steps

3. **Melhorar Tour Interativo**
   - Adicionar mais elementos destacados
   - Melhorar scroll automático
   - Adicionar animações

4. **Testar Fluxo Completo**
   - Primeira vez: Onboarding → Tour Interativo
   - Visitas seguintes: Botão "Tour" → Tour Interativo

---

## ❓ Perguntas Frequentes

**Q: Por que dois sistemas?**
A: OnboardingOverlay é rápido (visão geral), Tour Interativo é detalhado (guia passo a passo).

**Q: Eles se excluem?**
A: Não! São complementares. Onboarding primeiro, depois tour interativo.

**Q: Posso ter só um?**
A: Sim, mas recomendamos os dois para melhor experiência.

**Q: Como desabilitar um?**
A: Não passar `isOpen={true}` para OnboardingOverlay ou não chamar `startTour()`.

---

## 📚 Referências

- `web/components/ui/OnboardingOverlay_v2.jsx` - Modal inicial
- `web/components/ui/UnifiedOnboarding.jsx` - Combina ambos (não usado ainda)
- `web/hooks/useTour.js` - Hook para tour interativo
- `web/components/ZulFloatingButton.jsx` - Card flutuante do tour
- `web/data/tourSteps.js` - Steps de todos os tours

