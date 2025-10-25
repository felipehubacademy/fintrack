# MeuAzulão - Gestão Financeira Familiar Inteligente

Sistema completo de gestão financeira familiar que permite registrar despesas via WhatsApp e visualizar tudo em um dashboard moderno e intuitivo.

## 🚀 Funcionalidades

- **Entrada via WhatsApp**: Registre despesas através de conversas naturais no WhatsApp
- **Notificações Inteligentes**: Receba confirmações instantâneas de novas transações
- **Atribuição Inteligente**: Atribua despesas a diferentes responsáveis automaticamente
- **Dashboard em Tempo Real**: Interface moderna com gráficos e filtros avançados
- **Autenticação Segura**: Login via magic link com Supabase Auth
- **Design Responsivo**: Interface moderna construída com Tailwind CSS
- **Gestão de Cartões**: Controle de cartões de crédito com parcelamento
- **Orçamentos**: Definição e acompanhamento de orçamentos por categoria

## 🏗️ Arquitetura

```
MeuAzulão/
├── backend/              # Node.js + Express API
│   ├── index.js         # Server entry point
│   ├── routes/          # API routes
│   │   ├── (removido Pluggy)
│   │   └── whatsapp.js  # WhatsApp webhook handlers
│   └── services/        # Business logic
│       ├── (removido Pluggy)
│       ├── supabase.js  # Database operations
│       └── whatsapp.js  # WhatsApp Cloud API client
│
├── web/                 # Next.js frontend
│   ├── pages/
│   │   ├── index.jsx    # Login page
│   │   └── dashboard.jsx # Protected dashboard
│   ├── components/      # React components
│   │   ├── ExpenseTable.jsx
│   │   ├── SummaryCards.jsx
│   │   └── Chart.jsx
│   ├── lib/
│   │   └── supabaseClient.js
│   └── styles/
│       └── globals.css
│
└── .github/workflows/   # Automation
    └── cron.yml        # Scheduled transaction checks
```

## 📋 Prerequisites

1. **Supabase Account**
   - Create a project at [supabase.com](https://supabase.com)
   - Get your `SUPABASE_URL` and `SUPABASE_KEY`

2. **WhatsApp Cloud API**
   - Create API credentials
   - Connect your Itaú account and get the `CONNECTION_ID`

3. **WhatsApp Cloud API**
   - Set up at [Meta for Developers](https://developers.facebook.com)
   - Get your `PHONE_ID` and access token
   - Configure webhook URL

## 🗄️ Database Setup

Create the `expenses` table in Supabase:

```sql
CREATE TABLE expenses (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  owner TEXT,
  split BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_expenses_owner ON expenses(owner);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read all expenses
CREATE POLICY "Allow authenticated users to read expenses"
  ON expenses FOR SELECT
  USING (auth.role() = 'authenticated');
```

## 🔧 Installation

### Backend Setup

```bash
cd backend
npm install
cp ../.env.example .env
# Edit .env with your credentials
npm start
```

### Frontend Setup

```bash
cd web
npm install
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
npm run dev
```

## 🌐 Environment Variables

### Backend (.env)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
# Pluggy removido
WHATSAPP_TOKEN=your-access-token
PHONE_ID=787122227826364
USER_PHONE=5511999999999
PORT=3000
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 📱 API Endpoints

### Backend Routes

// Pluggy removido
- `POST /webhook` - WhatsApp webhook for button responses
- `GET /webhook` - WhatsApp webhook verification
- `GET /health` - Health check

## 🚢 Deployment

### Backend (Render/Railway/Vercel)

1. **Render.com** (Recommended for backend):
   ```bash
   # Connect your GitHub repo
   # Set environment variables in Render dashboard
   # Deploy as Web Service
   ```

2. **Railway.app**:
   ```bash
   railway login
   railway init
   railway up
   ```

### Frontend (Vercel)

```bash
cd web
vercel login
vercel
# Add environment variables in Vercel dashboard
```

### GitHub Actions Setup

1. Go to your GitHub repository Settings → Secrets
2. Add secret: `BACKEND_URL` (your deployed backend URL)
3. The cron job will run automatically every 10 minutes

## 💡 Usage Flow

1. **Automatic Sync**: GitHub Actions calls `/check` every 10 minutes
2. **New Transaction**: WhatsApp message saves expense to Supabase
3. **WhatsApp Notification**: User receives message with buttons [Felipe] [Letícia] [Compartilhado]
4. **User Responds**: Clicks a button to assign the expense
5. **Database Update**: Backend updates the owner field
6. **Dashboard**: Changes reflect instantly on the dashboard

## 🎨 Dashboard Features

- **Summary Cards**: Total spending per person
- **Pie Chart**: Visual distribution of expenses
- **Expense Table**: Filterable list with search
- **Real-time Updates**: Refresh button to sync latest data

## 🔐 Security

- Protected routes with Supabase Auth
- Magic link authentication (no passwords)
- Row Level Security on database
- Environment variables for sensitive data
- CORS enabled for specific origins

## 🛠️ Development

```bash
# Backend development with auto-reload
cd backend
npm run dev

# Frontend development
cd web
npm run dev
```

## 📝 Notes

- Transactions are only processed for **debit** (negative amounts)
- Duplicate detection based on date + description + amount
- WhatsApp buttons have 3 options: Felipe, Letícia, Compartilhado
- Dashboard accessible at `http://localhost:3000` (after authentication)

## 🤝 Contributing

Feel free to open issues or submit pull requests!

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🆘 Troubleshooting

### Webhook/WhatsApp Issues
// ...
- Test with `POST /auth` endpoint

### WhatsApp not sending messages
- Verify your `WHATSAPP_TOKEN` is valid
- Check `PHONE_ID` matches your WhatsApp Business Account
- Ensure webhook is properly configured in Meta dashboard

### Database errors
- Verify Supabase credentials
- Check if `expenses` table exists
- Ensure RLS policies are configured

### Frontend auth issues
- Use `NEXT_PUBLIC_` prefix for Supabase variables
- Check if email is enabled in Supabase Auth settings
- Verify redirect URLs in Supabase dashboard

## 📞 Support

For issues or questions, please open a GitHub issue.

---

Built with ❤️ using Next.js, Supabase, and WhatsApp Cloud API

# Deploy test Tue Oct 14 20:16:31 -03 2025
# Force deploy Tue Oct 14 20:23:21 -03 2025
# Deploy clean Tue Oct 14 21:58:39 -03 2025
