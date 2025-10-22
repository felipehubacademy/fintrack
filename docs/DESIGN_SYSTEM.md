# 🎨 DESIGN SYSTEM - FINTRACK V2

## 📋 BASE UI/UX ESTABLECIDA

### ✅ COMPONENTES BASE
- **shadcn/ui** como design system principal
- **Lucide React** para ícones
- **Tailwind CSS** para estilização
- **Glassmorphism** e gradientes modernos

### 🎯 PRINCÍPIOS DE DESIGN

#### 1. **Layout Responsivo**
```jsx
// Grid responsivo padrão
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
```

#### 2. **Cards Profissionais**
```jsx
<Card className="border-0 shadow-sm">
  <CardHeader>
    <CardTitle className="flex items-center space-x-2">
      <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
        <Icon className="h-4 w-4 text-white" />
      </div>
      <span>Título</span>
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* Conteúdo */}
  </CardContent>
</Card>
```

#### 3. **Header Profissional**
```jsx
<header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
    <div className="flex justify-between items-center">
      {/* Logo + Info */}
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
          <Icon className="h-6 w-6 text-white" />
        </div>
        {/* Título e role */}
      </div>
      
      {/* Actions */}
      <div className="flex items-center space-x-3">
        <Button variant="ghost" size="icon">...</Button>
      </div>
    </div>
  </div>
</header>
```

#### 4. **Background Gradiente**
```jsx
<div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
```

#### 5. **Stats Cards com Tendências**
```jsx
<Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium text-gray-600">
      Título
    </CardTitle>
    <div className="p-2 rounded-lg bg-color-50">
      <Icon className="h-4 w-4 text-color-600" />
    </div>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold text-gray-900 mb-1">
      Valor
    </div>
    <div className="flex items-center space-x-2 text-xs">
      <TrendingUp className="h-3 w-3 text-green-600" />
      <span className="text-green-600">+12%</span>
      <span className="text-gray-500">vs mês anterior</span>
    </div>
  </CardContent>
</Card>
```

### 🎨 PALETA DE CORES OFICIAL

#### Cores da Marca
| Nível | Nome | Código HEX | Uso Principal | Descrição |
|-------|------|------------|---------------|-----------|
| 🟦 Primária | **Flight Blue** | `#207DFF` | Corpo principal do pássaro, títulos, botões, ícone principal | Azul vibrante que transmite clareza, leveza e confiança. É a cor base da marca. |
| 🔵 Secundária Escura | **Deep Sky** | `#0D2C66` | Sombra, profundidade, textos escuros e fundos contrastantes | Azul profundo que adiciona seriedade e sofisticação ao contraste. |
| 🩵 Secundária Clara | **Feather Blue** | `#8FCBFF` | Reflexos, gradientes suaves e detalhes luminosos | Azul claro suave que confere volume e sensação de leveza. |
| 💚 Acento | **Spring Accent** | `#5FFFA7` | Detalhes visuais, animações e ícones de destaque | Verde neon que traz energia, inovação e frescor — usar com moderação. |
| ⚪ Neutro | **Fog Mist** | `#E9EEF5` | Fundos, áreas de respiro, interfaces e layouts limpos | Cinza-azulado claro e neutro, que garante contraste e equilíbrio visual. |

#### Aplicação em Tailwind
```css
/* Adicionar ao tailwind.config.js */
colors: {
  brand: {
    primary: '#207DFF',      // Flight Blue
    dark: '#0D2C66',         // Deep Sky
    light: '#8FCBFF',        // Feather Blue
    accent: '#5FFFA7',       // Spring Accent
    neutral: '#E9EEF5',      // Fog Mist
  }
}
```

#### Uso em Componentes
- **Botões primários:** `bg-[#207DFF] hover:bg-[#0D2C66]`
- **Títulos principais:** `text-[#207DFF]`
- **Textos secundários:** `text-[#0D2C66]`
- **Backgrounds:** `bg-[#E9EEF5]`
- **Acentos e CTAs:** `text-[#5FFFA7]` ou `border-[#5FFFA7]`
- **Gradientes:** `bg-gradient-to-r from-[#207DFF] to-[#8FCBFF]`

### 🚀 PADRÕES DE COMPONENTES

#### QuickActions Grid
```jsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
  {actions.map((action) => (
    <Button className="w-full h-auto p-4 flex flex-col items-center space-y-2 bg-color-500 hover:bg-color-600 text-white border-0 hover:scale-105 transition-transform">
      <action.icon className="h-5 w-5" />
      <div className="text-center">
        <div className="font-medium text-sm">{action.title}</div>
        <div className="text-xs opacity-80 mt-1">{action.description}</div>
      </div>
    </Button>
  ))}
</div>
```

#### Activity Timeline
```jsx
<div className="space-y-4">
  {items.map((item) => (
    <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-shrink-0">
        <div className="p-2 bg-gray-100 rounded-lg">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        {/* Conteúdo */}
      </div>
    </div>
  ))}
</div>
```

### 📱 RESPONSIVIDADE

#### Breakpoints
- **Mobile:** `grid-cols-1`
- **Tablet:** `md:grid-cols-2`
- **Desktop:** `lg:grid-cols-3` ou `lg:grid-cols-4`

#### Spacing
- **Gap padrão:** `gap-6` ou `gap-8`
- **Padding:** `p-6`, `py-4`, `px-4`
- **Margin:** `mb-8`, `space-y-8`

### 🔧 IMPLEMENTAÇÃO

#### 1. Instalar dependências
```bash
npm install clsx tailwind-merge lucide-react
```

#### 2. Usar componentes
```jsx
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { TrendingUp, Users, Settings } from 'lucide-react';
```

#### 3. Aplicar estilos
```jsx
// Sempre usar classes utilitárias do Tailwind
className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"
className="border-0 shadow-sm hover:shadow-md transition-shadow"
className="text-gray-900 font-semibold"
```

---

## 📝 NOTAS IMPORTANTES

1. **NUNCA** usar estilos inline ou CSS customizado
2. **SEMPRE** usar o design system estabelecido
3. **MANTER** consistência visual em todas as páginas
4. **SEGUIR** os padrões de layout responsivo
5. **USAR** gradientes e glassmorphism para modernidade
6. **IMPLEMENTAR** transições suaves em hover/focus

---

**🎯 Este é o padrão visual que define o FinTrack V2!**
