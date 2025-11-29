# FinTrack Mobile

App mobile do FinTrack usando React Native + Expo.

## Configuração

1. Copie `.env.example` para `.env`
2. Configure as variáveis de ambiente do Supabase
3. Execute `npm install` na raiz do monorepo
4. Execute `npm run dev:mobile` para iniciar o desenvolvimento

## Variáveis de Ambiente

```
EXPO_PUBLIC_SUPABASE_URL=sua-url-do-supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-do-supabase
```

## Desenvolvimento

```bash
# Iniciar em modo desenvolvimento
npm start

# Rodar no iOS
npm run ios

# Rodar no Android
npm run android

# Rodar na web
npm run web
```

## Estrutura

```
src/
├── screens/        # Telas do app
├── components/     # Componentes reutilizáveis
├── navigation/     # Configuração de navegação
├── services/       # Serviços (API, Supabase)
├── hooks/         # Custom hooks
└── utils/         # Utilitários
```

