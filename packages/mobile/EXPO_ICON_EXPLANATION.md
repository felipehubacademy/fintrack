# 🔍 Por que o ícone não aparece no Expo Go?

## ⚠️ Limitação do Expo Go

**O Expo Go sempre mostra o ícone do próprio Expo Go**, não o ícone customizado do seu app. Isso é uma limitação conhecida do Expo Go.

## ✅ Solução: EAS Build

Para ver o ícone customizado, você precisa criar um **build nativo** usando EAS Build:

### 1. Instalar EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login no Expo
```bash
eas login
```

### 3. Configurar projeto
```bash
cd packages/mobile
eas build:configure
```

### 4. Criar Development Build
```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile production --platform android
```

### 5. Instalar no dispositivo
- iOS: Baixe via TestFlight ou link direto
- Android: Baixe o APK e instale manualmente

## 📱 Onde o ícone aparece

- ✅ **EAS Build (Development/Production)**: Ícone customizado aparece
- ✅ **App Store / Google Play**: Ícone customizado aparece
- ❌ **Expo Go**: Sempre mostra ícone do Expo Go (limitação)

## 🔄 Limpar cache (se necessário)

```bash
cd packages/mobile
rm -rf .expo node_modules/.cache
npx expo start --clear
```

## 📝 Verificação

Os arquivos estão corretos:
- ✅ `icon.png` - 1024x1024px
- ✅ `adaptive-icon.png` - 1024x1024px  
- ✅ `splash-icon.png` - 1024x1024px
- ✅ `app.json` configurado corretamente

O ícone aparecerá quando você fizer um build nativo, não no Expo Go.

