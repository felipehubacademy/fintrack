# Guia de Assets para Lojas - MeuAzulão

## 📱 App Icons

### iOS
- **Tamanho**: 1024x1024px
- **Formato**: PNG (sem transparência)
- **Localização**: `assets/icon.png`
- **Requisitos**:
  - Sem bordas ou cantos arredondados (iOS aplica automaticamente)
  - Fundo sólido ou gradiente
  - Logo centralizado
  - Sem texto pequeno (não será legível)

### Android
- **Tamanho**: 512x512px (mínimo)
- **Formato**: PNG
- **Localização**: `assets/icon.png`
- **Adaptive Icon**: `assets/adaptive-icon.png` (1024x1024px)
  - Deve ter área segura de 512x512px no centro
  - Fundo pode se estender até as bordas

---

## 📸 Screenshots

### iOS (App Store)

#### iPhone 6.7" (iPhone 14 Pro Max, 15 Pro Max)
- **Tamanho**: 1290x2796px
- **Quantidade**: 3-10 screenshots
- **Orientação**: Portrait

#### iPhone 6.5" (iPhone 11 Pro Max, XS Max)
- **Tamanho**: 1242x2688px
- **Quantidade**: 3-10 screenshots
- **Orientação**: Portrait

#### iPhone 5.5" (iPhone 8 Plus)
- **Tamanho**: 1242x2208px
- **Quantidade**: 3-10 screenshots
- **Orientação**: Portrait

#### iPad Pro 12.9"
- **Tamanho**: 2048x2732px
- **Quantidade**: 3-10 screenshots
- **Orientação**: Portrait

### Android (Google Play Store)

#### Phone
- **Tamanho**: 1080x1920px (mínimo)
- **Quantidade**: 2-8 screenshots
- **Orientação**: Portrait ou Landscape
- **Recomendado**: 4-6 screenshots

#### Tablet (7" e 10")
- **Tamanho**: 1200x1920px (mínimo)
- **Quantidade**: 2-8 screenshots
- **Orientação**: Portrait ou Landscape

#### Feature Graphic
- **Tamanho**: 1024x500px
- **Formato**: PNG ou JPG
- **Uso**: Banner principal na página da loja

---

## 📋 Telas para Screenshots

### Prioridade Alta (Obrigatórias)
1. **Dashboard** - Tela principal com estatísticas
2. **Transações** - Lista de transações
3. **Adicionar Transação** - Modal de criação
4. **Finanças** - Lista de cartões/contas

### Prioridade Média (Recomendadas)
5. **Orçamentos** - Tela de orçamentos
6. **Análises** - Gráficos e insights
7. **Metas** - Tela de metas
8. **Perfil** - Tela de configurações

---

## 🎨 Dicas para Screenshots

### Design
- Use dados realistas (não "Lorem ipsum")
- Mostre funcionalidades principais
- Destaque pontos fortes do app
- Mantenha consistência visual

### Textos
- Use textos em português brasileiro
- Evite textos muito pequenos
- Destaque valores e métricas importantes

### Cores
- Use cores do tema (#2563EB - azul)
- Mantenha contraste adequado
- Evite cores muito saturadas

### Composição
- Centralize elementos importantes
- Deixe espaço para respiração
- Evite elementos cortados nas bordas

---

## 🛠️ Ferramentas para Criar Screenshots

### iOS Simulator
```bash
# Abrir simulador
expo start --ios

# Capturar screenshot
# Cmd + S no simulador
# Ou usar: xcrun simctl io booted screenshot screenshot.png
```

### Android Emulator
```bash
# Abrir emulador
expo start --android

# Capturar screenshot
# Cmd + S no emulador
# Ou usar: adb shell screencap -p /sdcard/screenshot.png
```

### Dispositivos Reais
- **iOS**: Use o simulador ou TestFlight
- **Android**: Use o emulador ou instale via ADB

### Edição
- **Figma**: Para criar mockups e adicionar textos
- **Photoshop/GIMP**: Para edição avançada
- **Canva**: Para templates rápidos

---

## 📁 Estrutura de Arquivos

```
packages/mobile/assets/
├── icon.png                    # App icon (1024x1024)
├── adaptive-icon.png          # Android adaptive icon (1024x1024)
├── splash-icon.png            # Splash screen icon
├── favicon.png                # Web favicon
└── screenshots/
    ├── ios/
    │   ├── 6.7-inch/
    │   │   ├── 01-dashboard.png
    │   │   ├── 02-transactions.png
    │   │   ├── 03-add-transaction.png
    │   │   └── 04-finances.png
    │   ├── 6.5-inch/
    │   └── 5.5-inch/
    └── android/
        ├── phone/
        │   ├── 01-dashboard.png
        │   ├── 02-transactions.png
        │   └── ...
        ├── tablet/
        └── feature-graphic.png
```

---

## ✅ Checklist de Assets

### App Icons
- [ ] iOS icon (1024x1024px)
- [ ] Android icon (512x512px)
- [ ] Android adaptive icon (1024x1024px)
- [ ] Splash screen icon
- [ ] Favicon (web)

### Screenshots iOS
- [ ] 3-10 screenshots para iPhone 6.7"
- [ ] 3-10 screenshots para iPhone 6.5"
- [ ] 3-10 screenshots para iPhone 5.5"
- [ ] 3-10 screenshots para iPad Pro 12.9"

### Screenshots Android
- [ ] 2-8 screenshots para phone
- [ ] 2-8 screenshots para tablet (opcional)
- [ ] Feature graphic (1024x500px)

### Preview Video (Opcional)
- [ ] Video de 15-30 segundos mostrando o app
- [ ] Formato: MP4
- [ ] Resolução: 1080p ou superior

---

## 🚀 Próximos Passos

1. Criar/atualizar app icons
2. Capturar screenshots das telas principais
3. Editar screenshots (adicionar textos, destacar features)
4. Otimizar tamanhos de arquivo
5. Validar em diferentes dispositivos

