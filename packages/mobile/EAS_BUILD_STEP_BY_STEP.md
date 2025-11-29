# 🚀 Guia Passo a Passo - EAS Build

## ✅ Status Atual

- ✅ EAS CLI instalado (v16.28.0)
- ✅ Login realizado (felipexavier_kid)
- ✅ `eas.json` configurado
- ✅ `app.json` configurado com ícones

---

## 📱 Passo 1: Escolher Plataforma

Você pode criar builds para:
- **iOS** (requer conta Apple Developer)
- **Android** (mais simples, não requer conta paga)

### Para iOS:
```bash
cd packages/mobile
eas build --profile development --platform ios
```

### Para Android:
```bash
cd packages/mobile
eas build --profile development --platform android
```

---

## 🔧 Passo 2: Tipos de Build

### Development Build
- ✅ Permite usar Expo Dev Client
- ✅ Inclui ferramentas de desenvolvimento
- ✅ Ideal para testes
- ✅ Mais rápido de construir

```bash
eas build --profile development --platform [ios|android]
```

### Preview Build
- ✅ Build de produção para testes internos
- ✅ Sem ferramentas de desenvolvimento
- ✅ Mais próximo do app final

```bash
eas build --profile preview --platform [ios|android]
```

### Production Build
- ✅ Build final para lojas
- ✅ Otimizado e minificado
- ✅ Para App Store / Google Play

```bash
eas build --profile production --platform [ios|android]
```

---

## 📋 Passo 3: Processo de Build

1. **Iniciar Build**
   ```bash
   cd packages/mobile
   eas build --profile development --platform android
   ```

2. **Responder Perguntas**
   - O EAS pode perguntar sobre:
     - Credenciais (primeira vez)
     - Permissões
     - Configurações adicionais

3. **Aguardar Build**
   - Build acontece na nuvem (Expo servers)
   - Tempo: 10-20 minutos
   - Você receberá um link para acompanhar

4. **Download**
   - Link será fornecido no terminal
   - iOS: Instalar via TestFlight ou link direto
   - Android: Baixar APK e instalar

---

## 🎯 Recomendação para Testes

**Comece com Android (mais simples):**

```bash
cd packages/mobile
eas build --profile development --platform android
```

**Depois iOS (se tiver conta Apple Developer):**

```bash
cd packages/mobile
eas build --profile development --platform ios
```

---

## ⚠️ Requisitos iOS

Se for fazer build iOS, você precisa:
- Conta Apple Developer ($99/ano)
- Ou usar conta gratuita (limitações)

O EAS vai guiá-lo através do processo de credenciais.

---

## 📝 Próximos Passos

1. Execute o comando de build
2. Acompanhe o progresso no terminal
3. Baixe e instale no dispositivo
4. Teste o app com o ícone customizado!

---

## 🔍 Verificar Status

```bash
# Ver builds em andamento
eas build:list

# Ver detalhes de um build específico
eas build:view [BUILD_ID]
```

---

## 💡 Dicas

- **Primeira vez**: Pode demorar mais (configuração de credenciais)
- **Builds subsequentes**: Mais rápidos (reutiliza credenciais)
- **Cancelar build**: `Ctrl+C` no terminal
- **Logs**: Disponível no dashboard do Expo

