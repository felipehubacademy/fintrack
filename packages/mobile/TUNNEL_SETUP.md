# 🌐 Configuração de Tunnel

## ✅ Instalar @expo/ngrok

Quando perguntar:
```
The package @expo/ngrok@^4.1.0 is required to use tunnels, would you like to install it globally? › (Y/n)
```

**Responda: `Y` (yes)**

Isso vai instalar o ngrok globalmente, permitindo usar tunnels.

## 🚀 Depois de Instalar

Você pode usar tunnels de duas formas:

### Opção 1: Comando direto
```bash
cd packages/mobile
npx expo start --dev-client --tunnel
```

### Opção 2: Via npm start (se configurado)
```bash
cd packages/mobile
npm start -- --tunnel
```

## 💡 O que é Tunnel?

- **Tunnel**: Cria uma URL pública temporária
- **Permite**: Conectar de qualquer lugar (não precisa estar na mesma rede)
- **Útil**: Para desenvolvimento remoto ou quando time está em redes diferentes

## 📱 Conectar no App

Depois que o tunnel estiver rodando:
1. Você verá um QR code no terminal
2. No app, toque em **"Scan QR Code"**
3. Escaneie o QR code
4. Conecte ao servidor!

## ⚠️ Nota

- Tunnel é mais lento que rede local
- Mas funciona de qualquer lugar
- Ideal para desenvolvimento remoto

