# 📱 Como Conectar ao Servidor Remoto - Guia para o Time

## ✅ Servidor Tunnel Ativo!

O servidor está rodando com tunnel. Agora o time pode conectar de qualquer lugar!

## 🔗 Opções para Conectar

### Opção 1: Escanear QR Code (Mais Fácil)

1. **No app Development Build** (MeuAzulão)
2. Toque em **"Scan QR Code"**
3. Escaneie o QR code que aparece no terminal
4. Aguarde a conexão

### Opção 2: Compartilhar URL do Tunnel

O terminal mostra uma URL tipo:
```
exp://abc123.ngrok.io:8081
```

**Compartilhe essa URL** com o time:

1. **No app Development Build**
2. Toque em **"Enter URL manually"** (se disponível)
3. Cole a URL do tunnel
4. Conecte

### Opção 3: Fetch Development Servers

1. **No app Development Build**
2. Toque em **"Fetch development servers"**
3. O servidor deve aparecer na lista
4. Toque para conectar

## 📋 Passo a Passo Detalhado

### Para quem está com o app instalado:

1. **Abra o app "MeuAzulão"** (Development Build)
2. Você verá a tela "Development Servers"
3. **Escolha uma opção:**
   - **"Scan QR Code"** → Escaneie o QR do terminal
   - **"Fetch development servers"** → Busca automática
   - **"Enter URL manually"** → Cole a URL do tunnel

4. **Aguarde a conexão** (pode demorar alguns segundos)
5. **App vai recarregar** com o código mais recente

## 🔍 Onde Encontrar a URL do Tunnel?

No terminal onde o servidor está rodando, você verá algo como:

```
Metro waiting on exp://192.168.x.x:8081
Tunnel URL: exp://abc123.ngrok.io:8081
```

**Compartilhe essa URL** com o time!

## ⚠️ Importante

- **Tunnel URL muda** a cada vez que você reinicia o servidor
- **Compartilhe a URL atual** sempre que reiniciar
- **QR Code** é a forma mais fácil (atualiza automaticamente)

## 💡 Dicas

- **Primeira conexão**: Pode demorar um pouco (download do bundle)
- **Conexões seguintes**: Mais rápidas (usa cache)
- **Se não conectar**: Verifique se o tunnel ainda está ativo no terminal

## 🚀 Próximos Passos

Depois de conectar:
- ✅ App vai carregar o código mais recente
- ✅ Mudanças no código aparecem automaticamente (hot reload)
- ✅ Time pode desenvolver e testar em tempo real!

