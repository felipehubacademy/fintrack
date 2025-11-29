# 📱 Guia de Instalação - Build Android

## ✅ Build Concluído com Sucesso!

O build Android foi finalizado. Agora você pode instalar o app no dispositivo.

## 🔗 Link do Build

**URL de Download:**
https://expo.dev/accounts/felipexavier_kid/projects/meuazulao-mobile/builds/0145f290-73df-44d7-8f0a-fef02d78f4d8

## 📱 Opções de Instalação

### Opção 1: Instalar no Dispositivo Físico (Recomendado)

1. **Abrir o link no dispositivo Android**
   - Abra o link no navegador do seu celular Android
   - Ou escaneie o QR code com a câmera

2. **Baixar o APK**
   - Clique em "Download" ou "Install"
   - Permita instalação de fontes desconhecidas se solicitado

3. **Instalar**
   - Abra o arquivo APK baixado
   - Toque em "Instalar"
   - Aguarde a instalação

4. **Abrir o App**
   - Procure por "MeuAzulão" na lista de apps
   - Abra e teste!

### Opção 2: Instalar no Emulador

Se você tem um emulador Android rodando:

```bash
# Responda "Y" quando perguntado
# Ou execute manualmente:
adb install [caminho-do-apk]
```

## ✅ Verificações

Depois de instalar, verifique:

- [ ] **Ícone customizado** aparece corretamente na home screen
- [ ] **Splash screen** mostra o logo azul
- [ ] App abre e funciona normalmente
- [ ] Todas as funcionalidades estão operacionais

## 🎉 Próximos Passos

### Para iOS (Quando a conta Apple estiver pronta)

```bash
cd packages/mobile
eas build --profile development --platform ios
```

### Para Production Build (Quando estiver pronto para publicar)

```bash
# Android
eas build --profile production --platform android

# iOS
eas build --profile production --platform ios
```

## 📊 Acompanhar Builds

Você pode ver todos os builds em:
https://expo.dev/accounts/felipexavier_kid/projects/meuazulao-mobile/builds

## 🔍 Troubleshooting

### Se o app não instalar:
- Verifique se "Instalar apps de fontes desconhecidas" está habilitado
- Verifique se há espaço suficiente no dispositivo
- Tente baixar o APK diretamente do link

### Se o app não abrir:
- Verifique se o dispositivo tem Android 6.0+ (API 23+)
- Verifique os logs: `adb logcat | grep -i expo`

## 💡 Dicas

- **Primeira instalação**: Pode demorar alguns segundos para inicializar
- **Desenvolvimento**: Use `expo start --dev-client` para conectar ao servidor de desenvolvimento
- **Testes**: Teste todas as funcionalidades principais antes de criar production build

