<!-- cedb3b8a-888e-42e0-b9e3-a8d2771cbfbc 56e3a287-2ff5-4b58-bd36-d19beebe6e7e -->
# Plano de Otimização Mobile - FinTrack

## Objetivos

- Garantir 100% de funcionalidade em dispositivos móveis
- Manter experiência desktop intacta
- Otimizar gráficos, modais, tooltips e layouts para diferentes tamanhos de tela
- Implementar interações touch-friendly

## 1. Análise e Base de Responsividade

### 1.1 Configuração de Breakpoints

**Arquivo**: `web/tailwind.config.js`

- Padronizar breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- Adicionar utilitários customizados para mobile-first

### 1.2 Utilitários Globais

**Arquivo**: `web/styles/globals.css`

- Adicionar classes utilitárias para mobile
- Estilos para evitar zoom em inputs (font-size mínimo)
- Ajustes de touch target (mínimo 44x44px)

## 2. Gráficos (Recharts)

### 2.1 Pie Charts (MonthCharts, IncomeCharts)

**Arquivos**:

- `web/components/MonthCharts.jsx`
- `web/components/IncomeCharts.jsx`

**Alterações**:

- Altura responsiva: `height={280}` → `height={window.innerWidth < 768 ? 240 : 280}`
- Substituir `onMouseEnter`/`onMouseLeave` por interação touch-friendly:
- Adicionar `onClick` para seleção em mobile
- Manter hover para desktop
- Reduzir `innerRadius` e `outerRadius` em mobile (56/120 → 40/90)
- Ajustar tamanho da fonte no centro do donut para mobile
- Grid responsivo: garantir `grid-cols-1` em mobile, `md:grid-cols-2`, `lg:grid-cols-3`

### 2.2 Bar Charts (MonthlyComparison)

**Arquivo**: `web/components/MonthlyComparison.jsx`

**Alterações**:

- Altura responsiva: `height={400}` → `height={window.innerWidth < 768 ? 300 : 400}`
- Ajustar margens do gráfico para mobile: `margin={{ top: 10, right: 10, left: 10, bottom: 40 }}`
- Reduzir tamanho de fontes dos eixos em mobile
- Tooltip customizado com posicionamento dinâmico que não saia da tela
- Ajustar formatação de valores no YAxis para mobile

### 2.3 Container Responsivo

- Criar hook `useResponsiveChart` para calcular dimensões
- Detectar orientação do dispositivo (portrait/landscape)

## 3. Modais

### 3.1 Modais Principais

**Arquivos**:

- `web/components/ExpenseModal.jsx`
- `web/components/TransactionModal.jsx`
- `web/components/EditExpenseModal.jsx`
- `web/components/ConfirmationModal.jsx`
- Todos os modais em `web/components/*Modal.jsx`

**Alterações**:

- Container: `max-w-md w-full` → `max-w-md w-full mx-4` (padding lateral)
- Altura máxima: adicionar `max-h-[90vh] overflow-y-auto` para evitar overflow
- Header fixo com conteúdo scrollável quando necessário
- Padding responsivo: `p-6` → `p-4 md:p-6`
- Botões: empilhar em mobile (`flex-col space-y-2`), lado a lado em desktop
- Inputs: garantir largura total em mobile
- Formulários: ajustar espaçamento entre campos

### 3.2 Modais Específicos

- **BillModal**: ajustar tabela de parcelas para scroll horizontal em mobile
- **CategoryManagementModal**: lista de categorias com scroll otimizado
- **MemberManagementModal**: cards de membros em grid responsivo

## 4. Tooltips

### 4.1 Componente Base

**Arquivo**: `web/components/ui/Tooltip.jsx`

**Alterações**:

- Substituir lógica de hover por sistema híbrido:
- Desktop: manter `onMouseEnter`/`onMouseLeave`
- Mobile: usar `onClick` para toggle, com backdrop para fechar
- Posicionamento inteligente:
- Detectar bordas da tela e ajustar posição
- Em mobile, preferir `bottom-full` ou `top-full`
- Adicionar `max-width: calc(100vw - 32px)` para não ultrapassar bordas
- Z-index adequado: `z-[100]` já está bom
- Animações suaves para aparecer/desaparecer

### 4.2 HelpTooltip

**Arquivo**: `web/components/ui/HelpTooltip.jsx`

- Adicionar indicador visual de que é clicável em mobile
- Tamanho de toque mínimo (44x44px)

### 4.3 Tooltips em Tabelas/Listas

**Arquivo**: `web/pages/dashboard/transactions.jsx`

- Revisar tooltips inline que aparecem em linhas de transação
- Garantir que não sejam cortados em mobile

## 5. Layout e Componentes de Página

### 5.1 Dashboard Principal

**Arquivo**: `web/pages/dashboard/index.jsx`

**Alterações**:

- Cards de estatísticas: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Espaçamento: `gap-6` → `gap-4 md:gap-6`
- Padding do container: `px-4 sm:px-6 lg:px-8`
- QuickActions: grid responsivo adequado
- Seções de gráficos: espaçamento vertical otimizado

### 5.2 Header

**Arquivo**: `web/components/Header.jsx`

**Alterações**:

- Menu mobile drawer: verificar se está funcionando corretamente
- Logo: tamanho responsivo
- Dropdowns: garantir que não saiam da tela em mobile
- Botões de ação: tamanho adequado para toque

### 5.3 Páginas de Transações

**Arquivo**: `web/pages/dashboard/transactions.jsx`

**Alterações**:

- Tabela: em mobile, converter para cards verticais
- Filtros: acordeão colapsável em mobile
- Paginação: botões maiores e mais espaçados
- Ações (editar/deletar): menu dropdown em mobile ao invés de botões inline

### 5.4 Cards e Componentes

- Todos os Cards: padding responsivo `p-4 md:p-6`
- Botões: garantir altura mínima de 44px
- Inputs: font-size mínimo de 16px para evitar zoom no iOS

## 6. Tabelas e Listas

### 6.1 Componente de Tabela Responsiva

**Arquivo**: Criar `web/components/ui/ResponsiveTable.jsx`

**Funcionalidades**:

- Em desktop: tabela tradicional
- Em mobile: converter para cards verticais
- Preservar todas as informações e ações
- Scroll horizontal apenas quando necessário

### 6.2 Aplicar em Páginas

- `web/pages/dashboard/transactions.jsx`
- `web/pages/dashboard/bills.jsx`
- `web/pages/dashboard/cards.jsx`
- Qualquer outra página com tabelas

## 7. Navegação e Interação

### 7.1 Bottom Navigation (Mobile)

- Considerar adicionar navegação inferior fixa para mobile
- Alternativa: melhorar acessibilidade do menu lateral/drawer

### 7.2 Gestos Touch

- Swipe para ações rápidas (opcional)
- Pull-to-refresh em listas (opcional)

## 8. Performance Mobile

### 8.1 Otimizações

- Lazy loading de gráficos
- Debounce em filtros e buscas
- Virtualização de listas longas (se necessário)

### 8.2 Imagens e Assets

- Verificar se todas as imagens são responsivas
- Otimizar tamanhos para mobile

## 9. Testes e Validação

### 9.1 Testes em Dispositivos

- iPhone (various sizes)
- Android (various sizes)
- Tablets (iPad, Android tablets)
- Orientação portrait e landscape

### 9.2 Breakpoints Críticos

- 320px (mobile pequeno)
- 375px (iPhone SE)
- 414px (iPhone Plus)
- 768px (tablet portrait)
- 1024px (tablet landscape)

## 10. Ordem de Implementação

1. **Fase 1 - Base**: Breakpoints, utilitários globais, tooltips
2. **Fase 2 - Gráficos**: Ajustar todos os gráficos para mobile
3. **Fase 3 - Modais**: Otimizar todos os modais
4. **Fase 4 - Layout**: Páginas principais, header, navegação
5. **Fase 5 - Tabelas**: Converter tabelas para mobile-friendly
6. **Fase 6 - Polimento**: Ajustes finos, testes, validação

### To-dos

- [ ] Configurar base de responsividade: atualizar tailwind.config.js com breakpoints padronizados e adicionar utilitários mobile em globals.css (touch targets, font-sizes mínimos)
- [ ] Refatorar Tooltip.jsx para funcionar em mobile: adicionar toggle por click, posicionamento inteligente que não saia da tela, e backdrop para fechar
- [ ] Otimizar gráficos de pizza (MonthCharts, IncomeCharts): altura responsiva, substituir mouse events por touch-friendly, ajustar tamanhos e grid responsivo
- [ ] Otimizar gráficos de barras (MonthlyComparison): altura responsiva, margens ajustadas, tooltip com posicionamento dinâmico, fontes menores em mobile
- [ ] Otimizar todos os modais: padding responsivo, altura máxima com scroll, botões empilhados em mobile, formulários full-width
- [ ] Otimizar layout do dashboard: grids responsivos, espaçamento adequado, cards empilhados em mobile, padding lateral
- [ ] Verificar e otimizar Header: menu drawer funcionando, dropdowns não saindo da tela, botões com tamanho adequado para toque
- [ ] Criar componente ResponsiveTable que converte tabelas para cards em mobile, mantendo todas funcionalidades
- [ ] Aplicar ResponsiveTable nas páginas de transações, bills, cards e outras páginas com tabelas
- [ ] Testar em diferentes dispositivos e tamanhos de tela, validar todos os componentes e ajustar problemas encontrados