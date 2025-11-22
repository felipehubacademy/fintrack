# FinTrack - Gestão Financeira Familiar

Projeto monorepo contendo Web (Next.js), Mobile (React Native/Expo) e Backend (Node.js/Express) compartilhando código comum.

## 🏗️ Estrutura do Monorepo

```
fintrack/
├── packages/
│   ├── backend/         # API Node.js/Express
│   ├── web/            # App Web Next.js
│   ├── mobile/         # App Mobile React Native/Expo
│   └── shared/         # Código compartilhado entre Web e Mobile
└── package.json        # Workspace root
```

## 🚀 Setup Inicial

1. **Clone o repositório**
```bash
git clone <repo-url>
cd FinTrack
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure variáveis de ambiente**

**Web** - `packages/web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=sua-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave
```

**Mobile** - `packages/mobile/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=sua-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave
```

**Backend** - `packages/backend/.env`:
```
SUPABASE_URL=sua-url
SUPABASE_SERVICE_KEY=sua-service-key
```

## 💻 Desenvolvimento

### Rodar todos os serviços
```bash
npm run dev
```

### Rodar serviços individualmente

**Web** (Next.js):
```bash
npm run dev:web
# Acesse: http://localhost:3000
```

**Mobile** (Expo):
```bash
npm run dev:mobile
# Escaneie o QR code com o app Expo Go
```

**Backend**:
```bash
npm run dev:backend
# API rodando em: http://localhost:5000
```

## 📦 Pacotes

### @fintrack/shared
Código compartilhado entre Web e Mobile:
- **API**: Cliente Supabase configurado
- **Utils**: Funções utilitárias (datas, formatação)
- **Constants**: Configurações globais
- **Types**: Definições de tipos (futuro)

### @fintrack/web
Aplicação web usando Next.js 14, React 18, Tailwind CSS.

### @fintrack/mobile
Aplicação mobile usando Expo e React Native.

### @fintrack/backend
API backend usando Node.js, Express e Supabase.

## 🏗️ Build para Produção

**Web**:
```bash
npm run build:web
```

**Mobile**:
```bash
cd packages/mobile
eas build --platform all
```

**Backend**:
```bash
npm run build:backend
```

## 📱 Deploy

### Web (Vercel)
```bash
# Configurar vercel.json para apontar para packages/web
vercel --prod
```

### Mobile (App Stores)
```bash
cd packages/mobile
# iOS
eas build --platform ios
eas submit --platform ios

# Android
eas build --platform android
eas submit --platform android
```

## 🧪 Testes

```bash
npm test
```

## 🔧 Comandos Úteis

```bash
# Limpar node_modules de todos os pacotes
npm run clean

# Reinstalar todas as dependências
npm run clean && npm install

# Verificar dependências desatualizadas
npm outdated --workspaces
```

## 📝 Convenções

- **Commits**: Use conventional commits (feat:, fix:, docs:, etc)
- **Branches**: feature/, bugfix/, hotfix/
- **Code Style**: ESLint + Prettier configurados

## 🛠️ Tecnologias

- **Frontend Web**: Next.js 14, React 18, Tailwind CSS
- **Frontend Mobile**: React Native, Expo
- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Deploy**: Vercel (Web), EAS (Mobile), Railway (Backend)

## 📖 Documentação

- [Web README](packages/web/README.md)
- [Mobile README](packages/mobile/README.md)
- [Backend README](packages/backend/README.md)
- [Shared README](packages/shared/README.md)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado e proprietário.

## 👥 Time

Desenvolvido com ❤️ pela equipe FinTrack
