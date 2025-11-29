# Guia de Testes - MeuAzulão

## 🧪 Formato de Testes Recomendado

### ❌ Expo Go (NÃO Recomendado para Publicação)
- **Limitações**: Não suporta todas as funcionalidades nativas
- **Uso**: Apenas para desenvolvimento rápido
- **Problemas**: Alguns módulos podem não funcionar corretamente

### ✅ EAS Build - Development Build (RECOMENDADO)
- **Vantagens**: 
  - Suporta todas as funcionalidades nativas
  - Mais próximo do build de produção
  - Permite testar em dispositivos reais
  - Suporta notificações push, haptics, etc.

### 📱 Como Criar Development Build

#### 1. Instalar EAS CLI
```bash
npm install -g eas-cli
```

#### 2. Login no Expo
```bash
eas login
```

#### 3. Configurar EAS (se ainda não configurado)
```bash
eas build:configure
```

#### 4. Criar Development Build para iOS
```bash
eas build --profile development --platform ios
```

#### 5. Criar Development Build para Android
```bash
eas build --profile development --platform android
```

#### 6. Instalar no Dispositivo
- **iOS**: Baixe o arquivo `.ipa` e instale via TestFlight ou diretamente
- **Android**: Baixe o arquivo `.apk` e instale diretamente no dispositivo

### 🔄 Alternativa: Build Local (Mais Rápido)

#### iOS (requer Mac + Xcode)
```bash
eas build --profile development --platform ios --local
```

#### Android
```bash
eas build --profile development --platform android --local
```

---

## ✅ Checklist de Testes

### 📱 Dispositivos para Testar

#### iOS
- [ ] iPhone SE (tela pequena)
- [ ] iPhone 14 Pro (tela média)
- [ ] iPhone 14 Pro Max (tela grande)
- [ ] iPad (tablet, se suportado)

#### Android
- [ ] Dispositivo pequeno (ex: Pixel 4a)
- [ ] Dispositivo médio (ex: Pixel 6)
- [ ] Dispositivo grande (ex: Pixel 7 Pro)
- [ ] Tablet Android (se suportado)

---

## 🧪 Testes Funcionais

### 1. Autenticação
- [ ] Login com email/senha
- [ ] Cadastro de novo usuário
- [ ] Recuperação de senha
- [ ] Logout

### 2. Dashboard
- [ ] Carregamento inicial
- [ ] Seleção de mês
- [ ] Cards de estatísticas (clique e detalhes)
- [ ] Gráficos (donut charts)
- [ ] Comparação mensal
- [ ] Categorias alarmantes
- [ ] Atividade recente
- [ ] Pull to refresh

### 3. Transações
- [ ] Lista de transações
- [ ] Filtros (tipo, categoria, responsável)
- [ ] Busca
- [ ] Ordenação
- [ ] Adicionar transação (FAB)
- [ ] Editar transação
- [ ] Excluir transação
- [ ] Seleção múltipla
- [ ] Exclusão em massa

### 4. Finanças
- [ ] Lista de cartões
- [ ] Adicionar cartão
- [ ] Editar cartão
- [ ] Excluir cartão
- [ ] Detalhes do cartão
- [ ] Lista de contas bancárias
- [ ] Adicionar conta
- [ ] Editar conta
- [ ] Excluir conta
- [ ] Transferência entre contas
- [ ] Entrada em conta

### 5. Mais (Menu)
- [ ] Navegação para todas as telas
- [ ] Fechamento mensal
- [ ] Contas a pagar
- [ ] Orçamentos
- [ ] Análises
- [ ] Metas
- [ ] Investimentos
- [ ] Perfil
- [ ] Configurações
- [ ] Ajuda

---

## 🎨 Testes de UI/UX

### Consistência Visual
- [ ] Cores consistentes em todas as telas
- [ ] Espaçamentos uniformes
- [ ] Tipografia consistente
- [ ] Shadows e elevação corretas
- [ ] Ícones alinhados

### Responsividade
- [ ] Layout funciona em diferentes tamanhos de tela
- [ ] Textos não cortam
- [ ] Cards e componentes se adaptam
- [ ] Scroll funciona corretamente

### Animações
- [ ] Transições suaves
- [ ] Loading states funcionam
- [ ] Haptic feedback funciona
- [ ] Modais abrem/fecham corretamente

---

## ♿ Testes de Acessibilidade

### Screen Reader (VoiceOver/TalkBack)
- [ ] Todos os botões têm labels descritivos
- [ ] Navegação funciona com gestos
- [ ] Conteúdo é lido corretamente
- [ ] Estados são anunciados

### Contraste
- [ ] Textos têm contraste adequado (WCAG AA)
- [ ] Botões são visíveis
- [ ] Ícones têm contraste suficiente

---

## 🐛 Testes de Erros

### Estados de Erro
- [ ] Mensagens de erro claras
- [ ] Retry funciona
- [ ] Empty states aparecem corretamente
- [ ] Loading states funcionam

### Offline
- [ ] App funciona offline (se aplicável)
- [ ] Mensagens apropriadas quando offline
- [ ] Sincronização quando volta online

---

## 📊 Performance

### Métricas
- [ ] Tempo de carregamento inicial < 3s
- [ ] Navegação entre telas < 500ms
- [ ] Scroll suave (60 FPS)
- [ ] Sem memory leaks

### Otimizações
- [ ] Imagens carregam corretamente
- [ ] Listas grandes não travam
- [ ] Modais abrem rapidamente

---

## 📝 Relatório de Testes

Após os testes, documente:

1. **Dispositivos testados**: Lista de dispositivos e versões
2. **Problemas encontrados**: Bugs, crashes, problemas de UI
3. **Sugestões de melhoria**: UX, performance, acessibilidade
4. **Screenshots**: Capturas de problemas ou melhorias

---

## 🚀 Próximos Passos Após Testes

1. Corrigir bugs encontrados
2. Preparar assets finais (ícones, screenshots)
3. Configurar metadados para lojas
4. Criar build de produção
5. Submeter para revisão

