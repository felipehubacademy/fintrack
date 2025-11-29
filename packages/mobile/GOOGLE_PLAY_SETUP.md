# 📱 Configuração Google Play Store

## ✅ O que você precisa fazer ANTES do build

### 1. Google Play Console (Já tem conta ✅)

Você **NÃO precisa** criar o app na Google Play Console antes do build. Você pode:
- Fazer o build primeiro
- Criar o app na Google Play Console depois
- Fazer upload do APK/AAB quando estiver pronto

### 2. Credenciais de Assinatura

O EAS pode gerenciar isso automaticamente na primeira vez que você fizer um build. Ele vai:
- Criar uma keystore automaticamente
- Armazenar de forma segura
- Usar para assinar todos os builds futuros

**Você pode deixar o EAS fazer isso automaticamente** ou criar manualmente se preferir.

## 🚀 Próximos Passos

### 1. Criar Development Build (Agora)
```bash
cd packages/mobile
eas build --profile development --platform android
```

### 2. Depois do Build
- Baixar o APK
- Instalar no dispositivo
- Testar o app

### 3. Quando estiver pronto para publicar
- Criar app na Google Play Console
- Fazer Production Build
- Fazer upload do AAB

## 📋 Checklist Google Play Console (Para depois)

Quando for publicar, você precisará:

- [ ] Criar app na Google Play Console
- [ ] Preencher informações do app (nome, descrição, screenshots)
- [ ] Configurar política de privacidade
- [ ] Configurar classificação de conteúdo
- [ ] Fazer upload do AAB (production build)
- [ ] Preencher formulário de conteúdo do app
- [ ] Enviar para revisão

**Mas isso pode esperar!** Por enquanto, vamos fazer o build de desenvolvimento para testar.

