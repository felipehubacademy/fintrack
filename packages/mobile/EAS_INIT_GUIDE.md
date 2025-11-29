# 🚀 Inicialização do Projeto EAS

## ⚠️ Passo Necessário Antes do Build

Antes de criar builds, você precisa inicializar o projeto EAS. Execute:

```bash
cd packages/mobile
eas init
```

Isso vai:
1. Conectar seu projeto ao Expo
2. Criar um projeto no Expo Dashboard
3. Configurar credenciais necessárias

## 📋 Depois de `eas init`

Após inicializar, você pode criar os builds:

### Android (Development)
```bash
eas build --profile development --platform android
```

### iOS (Development) - Quando a conta Apple estiver pronta
```bash
eas build --profile development --platform ios
```

## 🔍 Verificar Status

```bash
# Ver informações do projeto
eas project:info

# Ver builds anteriores
eas build:list
```

