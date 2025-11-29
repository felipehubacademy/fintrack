# 🌐 Guia de Desenvolvimento Remoto

## 📱 Conectando ao Servidor Remoto

O app está pedindo para conectar a um servidor de desenvolvimento. Você tem **3 opções**:

### Opção 1: Servidor Remoto (Recomendado para Time)

Se alguém do time está rodando o servidor de desenvolvimento:

1. **No app (Development Build)**
   - Toque em **"Fetch development servers"**
   - Ou toque em **"Scan QR Code"** e escaneie o QR code do servidor

2. **Se o servidor estiver rodando em outro computador**
   - O servidor precisa estar acessível na mesma rede
   - Ou usar tunneling (veja Opção 3)

### Opção 2: Servidor Local (Se você tem acesso ao computador)

Se você tem acesso ao computador onde o código está:

```bash
cd packages/mobile
npm start
# ou
npx expo start --dev-client
```

Depois, no app:
- Toque em **"Connect"** se aparecer `http://localhost:8081`
- Ou escaneie o QR code

### Opção 3: Tunneling (Para Acesso Remoto)

Para conectar de qualquer lugar (sem estar na mesma rede):

```bash
cd packages/mobile
npx expo start --dev-client --tunnel
```

Isso cria um túnel público que permite conectar de qualquer lugar.

## 🔧 Configuração para o Time

### Para quem vai rodar o servidor:

1. **Instalar dependências** (se ainda não fez):
```bash
cd packages/mobile
npm install
```

2. **Configurar variáveis de ambiente**:
Criar arquivo `packages/mobile/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=sua-url-do-supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-do-supabase
```

3. **Iniciar servidor**:
```bash
npm start
# ou para tunneling:
npx expo start --dev-client --tunnel
```

4. **Compartilhar com o time**:
- Compartilhar o QR code
- Ou compartilhar a URL do tunnel
- Ou usar "Fetch development servers" se estiverem na mesma rede

## 📋 Checklist para o Time

- [ ] Servidor de desenvolvimento rodando
- [ ] Variáveis de ambiente configuradas
- [ ] QR code ou URL compartilhada
- [ ] Todos conseguem conectar ao servidor

## 💡 Dicas

- **Tunneling**: Mais lento, mas funciona de qualquer lugar
- **Rede local**: Mais rápido, mas precisa estar na mesma rede Wi-Fi
- **Produção**: Para testar sem servidor, use um build de produção/preview

## 🚀 Alternativa: Build Preview (Sem Servidor)

Se não conseguir rodar servidor, você pode criar um build preview:

```bash
eas build --profile preview --platform android
```

Isso cria um build que funciona sem servidor de desenvolvimento.

