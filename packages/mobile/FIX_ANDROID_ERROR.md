# 🔧 Fix: Android Internal Error

## 🚨 Erro
"Error loading app" - "Android internal error"

## ✅ Solução Rápida

### Passo 1: Parar o servidor atual
No terminal onde o servidor está rodando:
- Pressione `Ctrl+C` para parar

### Passo 2: Limpar cache
```bash
cd packages/mobile
rm -rf .expo node_modules/.cache
```

### Passo 3: Reiniciar com cache limpo
```bash
npx expo start --dev-client --tunnel --clear
```

### Passo 4: Aguardar tunnel estar pronto
Espere aparecer:
- "Tunnel ready"
- QR code novo
- URL do tunnel

### Passo 5: Compartilhar novo QR code/URL
- Compartilhe o novo QR code com o time
- Ou compartilhe a nova URL do tunnel

### Passo 6: Time tenta novamente
No app Development Build:
1. Feche o app completamente
2. Abra novamente
3. Toque em "Scan QR Code"
4. Escaneie o novo QR code

## 🔍 Se ainda não funcionar

### Verificar logs do servidor
No terminal do servidor, verifique se há erros:
- Erros de compilação
- Erros de módulos não encontrados
- Erros de variáveis de ambiente

### Verificar variáveis de ambiente
```bash
cd packages/mobile
cat .env
```

Deve conter:
```env
EXPO_PUBLIC_SUPABASE_URL=sua-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave
```

### Tentar sem tunnel (rede local)
Se o tunnel não funcionar, tente rede local:

```bash
cd packages/mobile
npx expo start --dev-client --clear
```

**Limitação**: Todos precisam estar na mesma rede Wi-Fi.

## 🔄 Alternativa: Build Preview

Se desenvolvimento remoto não funcionar, crie um build preview:

```bash
cd packages/mobile
eas build --profile preview --platform android
```

Isso cria um build que funciona sem servidor de desenvolvimento.

## 📋 Checklist

- [ ] Servidor reiniciado com `--clear`?
- [ ] Cache limpo?
- [ ] Tunnel está "ready"?
- [ ] Novo QR code compartilhado?
- [ ] Time fechou e reabriu o app?
- [ ] Variáveis de ambiente estão corretas?

