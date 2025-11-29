# 🔧 Troubleshooting - Erro "Android internal error"

## ❌ Erro Encontrado

O time está recebendo:
- **"Error loading app"**
- **"Android internal error"**

## 🔍 Possíveis Causas e Soluções

### 1. Verificar se o Tunnel está Ativo

**No terminal onde o servidor está rodando:**
- Verifique se ainda mostra "Tunnel ready"
- Se não estiver, reinicie:
```bash
cd packages/mobile
npx expo start --dev-client --tunnel
```

### 2. Verificar Variáveis de Ambiente

**Certifique-se de que o `.env` existe e está correto:**

```bash
cd packages/mobile
cat .env
```

Deve conter:
```env
EXPO_PUBLIC_SUPABASE_URL=sua-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave
```

### 3. Limpar Cache e Reiniciar

**No servidor:**
```bash
cd packages/mobile
npx expo start --dev-client --tunnel --clear
```

### 4. Verificar Logs do Servidor

**No terminal do servidor, verifique se há erros:**
- Erros de compilação
- Erros de módulos não encontrados
- Erros de rede

### 5. Tentar Conexão Direta (Sem Tunnel)

Se o tunnel não funcionar, tente rede local:

```bash
cd packages/mobile
npx expo start --dev-client
```

**Limitação**: Todos precisam estar na mesma rede Wi-Fi.

### 6. Verificar Build do App

**Certifique-se de que o app instalado é o Development Build correto:**

- Deve ser o build que acabamos de criar
- Não pode ser Expo Go
- Deve ser o APK do development build

### 7. Reinstalar o App

**No dispositivo:**
1. Desinstale o app atual
2. Reinstale o APK do development build
3. Tente conectar novamente

## 🚀 Solução Rápida (Recomendada)

### Passo 1: Parar o servidor atual
```bash
# No terminal do servidor, pressione Ctrl+C
```

### Passo 2: Limpar cache
```bash
cd packages/mobile
rm -rf .expo node_modules/.cache
```

### Passo 3: Reiniciar com tunnel limpo
```bash
npx expo start --dev-client --tunnel --clear
```

### Passo 4: Compartilhar novo QR code/URL
- Novo QR code aparecerá
- Compartilhe com o time
- Peça para tentarem novamente

## 📋 Checklist de Diagnóstico

- [ ] Tunnel está ativo e mostrando "Tunnel ready"?
- [ ] Variáveis de ambiente estão configuradas?
- [ ] Não há erros no terminal do servidor?
- [ ] O app instalado é o Development Build correto?
- [ ] Tentou limpar cache e reiniciar?

## 🔄 Alternativa: Build Preview (Sem Servidor)

Se o desenvolvimento remoto não funcionar, crie um build preview:

```bash
cd packages/mobile
eas build --profile preview --platform android
```

Isso cria um build que funciona sem servidor de desenvolvimento.

## 💡 Próximos Passos

1. **Tente reiniciar o servidor com `--clear`**
2. **Compartilhe novo QR code/URL**
3. **Se não funcionar, considere build preview**

