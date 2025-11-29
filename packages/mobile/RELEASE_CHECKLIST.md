# Checklist de Release - MeuAzulão

## ✅ Pré-Release (Concluído)

### Código
- [x] Todos os console.logs removidos
- [x] Sem erros de lint
- [x] Acessibilidade implementada (WCAG AA)
- [x] Performance otimizada (React.memo, useMemo, useCallback)
- [x] Design System consistente

### Configuração
- [x] `app.json` atualizado
- [x] Nome: "MeuAzulão"
- [x] Bundle ID: `com.meuazulao.app`
- [x] Versão: 1.0.0
- [x] Permissões configuradas

---

## 📱 Testes em Dispositivos Reais

### Formato Recomendado: EAS Build (Development)

**NÃO use Expo Go** - Use EAS Build para testes completos:

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login
eas login

# Configurar projeto
eas build:configure

# Criar development build para iOS
eas build --profile development --platform ios

# Criar development build para Android
eas build --profile development --platform android
```

### Dispositivos para Testar

#### iOS
- [ ] iPhone SE (tela pequena)
- [ ] iPhone 14 Pro (tela média)
- [ ] iPhone 14 Pro Max (tela grande)
- [ ] iPad (se suportado)

#### Android
- [ ] Dispositivo pequeno
- [ ] Dispositivo médio
- [ ] Dispositivo grande
- [ ] Tablet (se suportado)

### Checklist de Testes
- [ ] Login/Cadastro funciona
- [ ] Dashboard carrega corretamente
- [ ] Transações funcionam (CRUD)
- [ ] Finanças funcionam (cartões e contas)
- [ ] Todas as telas navegam corretamente
- [ ] Modais abrem/fecham corretamente
- [ ] Pull to refresh funciona
- [ ] Busca e filtros funcionam
- [ ] Performance adequada (< 3s carregamento)
- [ ] Acessibilidade funciona (VoiceOver/TalkBack)

---

## 🎨 Preparação de Assets

### App Icons
- [ ] iOS icon: 1024x1024px (PNG, sem transparência)
- [ ] Android icon: 512x512px (PNG)
- [ ] Android adaptive icon: 1024x1024px
- [ ] Splash screen icon
- [ ] Favicon (web)

**Localização**: `packages/mobile/assets/`

### Screenshots iOS
- [ ] 3-10 screenshots para iPhone 6.7" (1290x2796px)
- [ ] 3-10 screenshots para iPhone 6.5" (1242x2688px)
- [ ] 3-10 screenshots para iPhone 5.5" (1242x2208px)
- [ ] 3-10 screenshots para iPad Pro 12.9" (2048x2732px)

**Telas para capturar**:
1. Dashboard
2. Transações
3. Adicionar Transação
4. Finanças (Cartões)
5. Finanças (Contas)
6. Orçamentos
7. Análises
8. Metas

### Screenshots Android
- [ ] 2-8 screenshots para phone (1080x1920px)
- [ ] Feature graphic: 1024x500px
- [ ] Screenshots para tablet (opcional)

**Telas**: Mesmas do iOS

### Preview Video (Opcional)
- [ ] Video de 15-30 segundos
- [ ] Formato: MP4
- [ ] Resolução: 1080p ou superior

---

## 📝 Configuração de Metadados

### App Store (iOS)

#### Informações Básicas
- [ ] Nome: "MeuAzulão"
- [ ] Subtitle: "Gestão Financeira Inteligente" (30 chars)
- [ ] Bundle ID: `com.meuazulao.app`
- [ ] Categoria: Finance
- [ ] Classificação: 4+

#### Descrição
- [ ] Descrição completa (4000 chars)
- [ ] Keywords (100 chars): `finanças,gestão financeira,controle de gastos,orçamento,despesas,receitas,cartão de crédito,contas bancárias,metas financeiras,planejamento financeiro`

#### URLs
- [ ] Suporte: `https://meuazulao.com/support`
- [ ] Marketing: `https://meuazulao.com`
- [ ] Privacidade: `https://meuazulao.com/privacy`
- [ ] Termos: `https://meuazulao.com/terms`

#### Assets
- [ ] App icon (1024x1024)
- [ ] Screenshots (vários tamanhos)
- [ ] Preview video (opcional)

### Google Play Store (Android)

#### Informações Básicas
- [ ] Título: "MeuAzulão"
- [ ] Descrição curta: "Gestão Financeira Inteligente" (80 chars)
- [ ] Package: `com.meuazulao.app`
- [ ] Categoria: Finance
- [ ] Classificação: Everyone

#### Descrição
- [ ] Descrição completa (4000 chars)
- [ ] Mesma descrição do iOS

#### URLs
- [ ] Suporte: `https://meuazulao.com/support`
- [ ] Privacidade: `https://meuazulao.com/privacy`
- [ ] Email: `suporte@meuazulao.com`

#### Assets
- [ ] App icon (512x512)
- [ ] Adaptive icon (1024x1024)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (phone)
- [ ] Screenshots (tablet, opcional)
- [ ] Preview video (opcional)

---

## 🏗️ Build de Produção

### Preparação
- [ ] Versão atualizada em `app.json`
- [ ] Build number incrementado
- [ ] Changelog atualizado
- [ ] Release notes preparadas

### EAS Build
```bash
# iOS
eas build --profile production --platform ios

# Android
eas build --profile production --platform android
```

### Validação do Build
- [ ] Build concluído com sucesso
- [ ] Testar build em dispositivo real
- [ ] Verificar todas as funcionalidades
- [ ] Verificar performance

---

## 📤 Submissão para Lojas

### App Store (iOS)

#### Pré-requisitos
- [ ] Conta Apple Developer ativa
- [ ] App Store Connect configurado
- [ ] Certificados e provisioning profiles
- [ ] TestFlight configurado (opcional)

#### Submissão
```bash
eas submit --platform ios
```

Ou via App Store Connect:
1. Fazer upload do `.ipa`
2. Preencher metadados
3. Adicionar screenshots
4. Configurar preço e disponibilidade
5. Submeter para revisão

### Google Play Store (Android)

#### Pré-requisitos
- [ ] Conta Google Play Developer ativa
- [ ] Google Play Console configurado
- [ ] Service account key (para EAS submit)

#### Submissão
```bash
eas submit --platform android
```

Ou via Google Play Console:
1. Criar novo app
2. Fazer upload do `.aab`
3. Preencher metadados
4. Adicionar screenshots e feature graphic
5. Configurar classificação de conteúdo
6. Submeter para revisão

---

## 📋 Documentação Criada

- [x] `TESTING_GUIDE.md` - Guia completo de testes
- [x] `ASSETS_GUIDE.md` - Guia de preparação de assets
- [x] `STORE_METADATA.md` - Metadados para lojas
- [x] `SCREEN_VALIDATION.md` - Checklist de validação
- [x] `EAS_BUILD_GUIDE.md` - Guia de build com EAS
- [x] `RELEASE_CHECKLIST.md` - Este arquivo

---

## 🎯 Próximos Passos Imediatos

1. **Testes em Dispositivos Reais**
   - Criar development build com EAS
   - Testar em iOS e Android
   - Validar todas as funcionalidades

2. **Preparar Assets**
   - Criar/atualizar app icons
   - Capturar screenshots das telas principais
   - Criar feature graphic (Android)

3. **Configurar Metadados**
   - Criar URLs de suporte, privacidade e termos
   - Preparar descrições finais
   - Configurar keywords

4. **Build de Produção**
   - Criar production build
   - Validar build final
   - Preparar para submissão

5. **Submissão**
   - Submeter para App Store
   - Submeter para Google Play
   - Acompanhar revisão

---

## ✅ Status Atual

### Concluído ✅
- Código limpo e otimizado
- Acessibilidade implementada
- Performance otimizada
- Design System consistente
- Documentação completa criada
- Configuração do app.json atualizada

### Pendente ⏳
- Testes em dispositivos reais
- Preparação de assets (ícones, screenshots)
- Configuração de metadados finais
- Build de produção
- Submissão para lojas

---

## 🚀 Você está pronto para:

1. **Testar** - Use EAS Build para criar development builds
2. **Preparar Assets** - Siga o `ASSETS_GUIDE.md`
3. **Configurar Metadados** - Use `STORE_METADATA.md` como referência
4. **Publicar** - Siga os guias de build e submissão

**Boa sorte com a publicação! 🎉**

