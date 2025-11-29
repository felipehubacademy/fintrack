# Guia de Build com EAS - MeuAzulão

## 🚀 Configuração Inicial

### 1. Instalar EAS CLI
```bash
npm install -g eas-cli
```

### 2. Login no Expo
```bash
eas login
```

### 3. Configurar Projeto
```bash
cd packages/mobile
eas build:configure
```

Isso criará o arquivo `eas.json` com as configurações de build.

---

## 📱 Development Build (Para Testes)

### iOS
```bash
eas build --profile development --platform ios
```

### Android
```bash
eas build --profile development --platform android
```

### Ambos
```bash
eas build --profile development --platform all
```

---

## 🏭 Production Build (Para Publicação)

### iOS (App Store)
```bash
eas build --profile production --platform ios
```

### Android (Google Play)
```bash
eas build --profile production --platform android
```

### Ambos
```bash
eas build --profile production --platform all
```

---

## 📋 Perfis de Build

### Development
- Para testes em dispositivos reais
- Inclui ferramentas de debug
- Não otimizado para produção

### Production
- Otimizado e minificado
- Sem ferramentas de debug
- Pronto para publicação

---

## 🔧 Configuração do eas.json

Crie o arquivo `packages/mobile/eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-apple-team-id"
      },
      "android": {
        "serviceAccountKeyPath": "./path/to/api-key.json",
        "track": "internal"
      }
    }
  }
}
```

---

## 📝 Checklist Antes do Build

### Configuração
- [ ] `app.json` atualizado com metadados corretos
- [ ] Bundle identifier configurado
- [ ] Versão e build number atualizados
- [ ] Ícones e splash screens prontos

### Código
- [ ] Sem console.logs
- [ ] Sem erros de lint
- [ ] Testes passando (se houver)
- [ ] Variáveis de ambiente configuradas

### Assets
- [ ] App icon (1024x1024)
- [ ] Adaptive icon (Android)
- [ ] Splash screen
- [ ] Screenshots (se necessário)

---

## 🎯 Comandos Úteis

### Ver builds em andamento
```bash
eas build:list
```

### Ver detalhes de um build
```bash
eas build:view [BUILD_ID]
```

### Cancelar build
```bash
eas build:cancel [BUILD_ID]
```

### Download do build
```bash
eas build:download [BUILD_ID]
```

---

## 📱 Instalação em Dispositivos

### iOS
1. Baixe o arquivo `.ipa` do EAS
2. Instale via TestFlight (recomendado)
3. Ou instale diretamente via Xcode

### Android
1. Baixe o arquivo `.apk` ou `.aab` do EAS
2. Instale diretamente no dispositivo
3. Ou faça upload para Google Play Internal Testing

---

## 🚀 Submissão para Lojas

### App Store (iOS)
```bash
eas submit --platform ios
```

### Google Play (Android)
```bash
eas submit --platform android
```

---

## ⚠️ Notas Importantes

1. **Development Build**: Use para testes antes de publicar
2. **Production Build**: Use apenas quando estiver pronto para publicação
3. **TestFlight**: Configure antes de submeter para App Store
4. **Google Play**: Configure Internal Testing antes de produção

---

## 🔗 Links Úteis

- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [EAS Submit Docs](https://docs.expo.dev/submit/introduction/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Google Play Console](https://play.google.com/console/)

