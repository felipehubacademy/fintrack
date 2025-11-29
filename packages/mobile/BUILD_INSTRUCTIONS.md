# 🚀 Instruções para Build Android

## ⚠️ Ação Necessária

O EAS precisa gerar uma **Android Keystore** (credencial de assinatura) na primeira vez.

Quando executar o comando, ele vai perguntar:
```
Generate a new Android Keystore?
```

**Responda: `yes` ou `y`**

Isso vai:
- Criar uma keystore automaticamente
- Armazenar de forma segura nos servidores Expo
- Usar para assinar todos os builds futuros

## 📋 Comando Completo

```bash
cd packages/mobile
eas build --profile development --platform android
```

Quando perguntar sobre a keystore, responda **yes**.

## ✅ Depois disso

O build vai:
1. Fazer upload do código
2. Compilar na nuvem (10-20 minutos)
3. Gerar um link para acompanhar
4. Fornecer link de download ao finalizar

## 📱 Instalação

Depois do build:
- Baixe o APK do link fornecido
- Instale no dispositivo Android
- Teste o app com o ícone customizado!

