# Troubleshooting Mobile

## ❌ Erro: "Invalid hook call"

### Causa
Múltiplas versões do React instaladas no projeto.

### Solução
```bash
# 1. Limpar tudo
npm run clean

# 2. Remover React canary do Expo (se existir)
rm -rf node_modules/expo/node_modules/@expo/cli/static/canary-full/node_modules/react

# 3. Iniciar com cache limpo
npm start
```

## ❌ Erro: "Unable to resolve asset"

### Causa
Assets (ícones, splash screens) não existem.

### Solução
Simplificamos o `app.json` para não exigir assets durante desenvolvimento. 
Para produção, crie os assets necessários ou use `npx expo prebuild` que gera automaticamente.

## 🔧 Comandos Úteis

```bash
# Iniciar com cache limpo (recomendado)
npm start

# Iniciar normal (com cache)
npm run start:cache

# Limpar completamente e reinstalar
npm run clean

# Verificar versões do React
npm ls react --depth=0
```

## 📝 Estrutura de Dependências

- **React**: 19.1.0 (usado pelo mobile)
- **React Native**: 0.81.5 (Expo SDK 54)
- **@fintrack/shared**: Usa React do host (mobile ou web)

## 🐛 Debug

### Ver logs detalhados
```bash
npm start -- --verbose
```

### Limpar cache do Metro
```bash
npx react-native start --reset-cache
```

### Verificar múltiplas cópias do React
```bash
find node_modules -type d -name "react" ! -path "*/react-*" ! -path "*/java/*"
```
Deve retornar apenas: `node_modules/react`

## 💡 Dicas

1. **Sempre use `npm start`** (já inclui `--clear`)
2. **Não use npm update** sem testar - pode quebrar dependências
3. **Se algo quebrar**: `npm run clean` resolve 90% dos problemas
4. **Hot reload não funciona**: Reinicie com `r` no terminal

