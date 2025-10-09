# 📊 FinTrack - Project Overview

## 🎯 Project Goal

Automatically track personal finances by:
1. Fetching transactions from Itaú (via Pluggy)
2. Storing in Supabase database
3. Sending WhatsApp notifications
4. Allowing expense attribution via WhatsApp buttons
5. Displaying everything on a beautiful dashboard

## 🏗️ Architecture

```
┌─────────────────┐
│  GitHub Actions │  ← Triggers every 10 min
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│           Backend (Express)              │
│  ┌────────────┐  ┌─────────────────┐   │
│  │  Routes    │  │   Services      │   │
│  │            │  │                 │   │
│  │ /check     │→ │ pluggy.js       │   │
│  │ /webhook   │→ │ supabase.js     │   │
│  │ /auth      │→ │ whatsapp.js     │   │
│  └────────────┘  └─────────────────┘   │
└──────┬────────────────┬─────────────┬──┘
       │                │             │
       ↓                ↓             ↓
┌──────────┐    ┌──────────────┐  ┌─────────────┐
│  Pluggy  │    │   Supabase   │  │  WhatsApp   │
│   API    │    │   Database   │  │  Cloud API  │
└──────────┘    └──────┬───────┘  └─────────────┘
                       │
                       ↓
              ┌─────────────────┐
              │   Frontend      │
              │   (Next.js)     │
              │                 │
              │  - Login        │
              │  - Dashboard    │
              │  - Components   │
              └─────────────────┘
```

## 📁 File Structure

```
FinTrack/
│
├── 📂 backend/                    # Node.js + Express API
│   ├── index.js                   # Server entry point
│   ├── package.json               # Dependencies
│   ├── vercel.json               # Vercel deployment config
│   │
│   ├── 📂 routes/                # API Routes
│   │   ├── pluggy.js             # GET /check, POST /auth
│   │   └── whatsapp.js           # POST /webhook
│   │
│   └── 📂 services/              # Business Logic
│       ├── pluggy.js             # Pluggy API integration
│       ├── supabase.js           # Database operations
│       └── whatsapp.js           # WhatsApp messaging
│
├── 📂 web/                       # Next.js Frontend
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   │
│   ├── 📂 pages/                # Next.js Pages (Routes)
│   │   ├── index.jsx            # Login page (/)
│   │   ├── dashboard.jsx        # Dashboard (/dashboard)
│   │   └── _app.jsx             # App wrapper
│   │
│   ├── 📂 components/           # React Components
│   │   ├── ExpenseTable.jsx     # Transaction table
│   │   ├── SummaryCards.jsx     # Summary statistics
│   │   └── Chart.jsx            # Pie chart
│   │
│   ├── 📂 lib/                  # Utilities
│   │   └── supabaseClient.js    # Supabase client setup
│   │
│   └── 📂 styles/               # Styling
│       └── globals.css          # Global styles + Tailwind
│
├── 📂 .github/                  # GitHub Configuration
│   └── workflows/
│       └── cron.yml             # Scheduled job (every 10 min)
│
├── 📂 docs/                     # Documentation
│   ├── API.md                   # API documentation
│   ├── DEPLOYMENT.md            # Deployment guide
│   └── SUPABASE_SCHEMA.sql      # Database schema
│
├── 📂 scripts/                  # Utility Scripts
│   ├── setup.sh                 # Automated setup
│   └── test-backend.sh          # Backend testing
│
├── 📄 README.md                 # Main documentation
├── 📄 SETUP.md                  # Detailed setup guide
├── 📄 QUICKSTART.md             # Quick start guide
├── 📄 CONTRIBUTING.md           # Contribution guidelines
├── 📄 package.json              # Root package.json
└── 📄 .gitignore                # Git ignore rules
```

## 🔄 Data Flow

### Transaction Sync Flow

1. **GitHub Actions** triggers every 10 minutes
2. **Calls** `GET /check` on backend
3. **Backend** authenticates with Pluggy
4. **Fetches** transactions from last 7 days
5. **Checks** if transaction already exists in Supabase
6. **If new**:
   - Save to Supabase
   - Send WhatsApp notification with buttons
7. **User** clicks WhatsApp button (Felipe/Letícia/Compartilhado)
8. **WhatsApp** sends webhook to backend
9. **Backend** updates expense owner in Supabase
10. **Dashboard** shows updated data

### Authentication Flow

1. **User** enters email on login page
2. **Supabase** sends magic link email
3. **User** clicks link
4. **Redirects** to dashboard
5. **Session** stored in browser
6. **Protected routes** check session

## 🔌 API Integrations

### Pluggy API
- **Purpose**: Fetch bank transactions
- **Endpoints Used**:
  - `POST /auth` - Get API key
  - `GET /accounts` - List accounts
  - `GET /transactions` - Fetch transactions
- **Rate Limit**: 10 req/s
- **Docs**: [pluggy.ai/docs](https://docs.pluggy.ai)

### Supabase
- **Purpose**: Database + Authentication
- **Features Used**:
  - PostgreSQL database
  - Row Level Security
  - Email Auth (magic links)
  - Real-time subscriptions (optional)
- **Docs**: [supabase.com/docs](https://supabase.com/docs)

### WhatsApp Cloud API
- **Purpose**: Notifications + Interactive buttons
- **Message Types**:
  - Interactive buttons (3 options)
  - Text messages (confirmations)
- **Webhooks**: Receive button clicks
- **Rate Limit**: 1000 msg/day (free)
- **Docs**: [developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)

## 🗄️ Database Schema

```sql
expenses {
  id          BIGSERIAL PRIMARY KEY
  date        DATE NOT NULL
  description TEXT NOT NULL
  amount      DECIMAL(10,2) NOT NULL
  owner       TEXT             -- Felipe | Letícia | Compartilhado
  split       BOOLEAN          -- true if Compartilhado
  source      TEXT             -- pluggy | manual
  created_at  TIMESTAMP
}
```

### Indexes
- `idx_expenses_date` - Fast date sorting
- `idx_expenses_owner` - Fast filtering by owner

## 🎨 Frontend Features

### Pages

**Login (`/`)**
- Email input
- Magic link authentication
- Auto-redirect if logged in

**Dashboard (`/dashboard`)**
- Protected route
- Summary cards (total per person)
- Pie chart (expense distribution)
- Transaction table (filterable)
- Refresh button
- Logout button

### Components

**SummaryCards**
- Total geral
- Felipe total
- Letícia total
- Compartilhado total
- Unassigned warning

**Chart**
- Pie chart using Recharts
- Shows percentage distribution
- Color-coded by person

**ExpenseTable**
- Searchable by description
- Filterable by owner
- Sortable columns
- Responsive design

## 🔐 Security

### Backend
- Service role key (never exposed to frontend)
- CORS enabled for specific origins
- Environment variables for secrets
- HTTPS only in production

### Frontend
- Anon key (safe for public)
- Row Level Security on database
- Protected routes check session
- Magic link authentication (no passwords)

### Database
- RLS policies for access control
- Authenticated users can read
- Only backend can write
- Indexes for performance

## 🚀 Deployment

### Backend Options
1. **Render.com** (Recommended)
   - Free tier: 750 hours/month
   - Auto-deploy from GitHub
   - Environment variables UI

2. **Railway.app**
   - Free tier: $5 credit/month
   - CLI deployment
   - Automatic HTTPS

3. **Vercel Functions**
   - Serverless functions
   - Auto-scaling
   - Global CDN

### Frontend
- **Vercel** (Recommended for Next.js)
  - Automatic deployments
  - Preview deployments
  - Built-in analytics

### Automation
- **GitHub Actions**
  - Free: 2000 minutes/month
  - Cron every 10 min = ~4500 runs/month
  - Well within free tier ✅

## 📊 Performance

### Expected Response Times
- Health check: ~50ms
- Pluggy auth: ~500ms
- Transaction fetch: ~2s (depends on transaction count)
- Database query: ~100ms
- WhatsApp send: ~500ms

### Optimization Opportunities
1. Cache Pluggy API key (valid 1 hour)
2. Batch database inserts
3. Implement transaction pagination
4. Add Redis for caching
5. Use database connection pooling

## 🔧 Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **HTTP Client**: node-fetch
- **Database Client**: @supabase/supabase-js

### Frontend
- **Framework**: Next.js 14
- **React**: 18.2
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Auth**: Supabase Auth

### DevOps
- **Version Control**: Git + GitHub
- **CI/CD**: GitHub Actions
- **Hosting**: Render + Vercel
- **Database**: Supabase (PostgreSQL)

## 📈 Future Enhancements

### Phase 1 (MVP) ✅
- [x] Pluggy integration
- [x] Supabase storage
- [x] WhatsApp notifications
- [x] Dashboard UI
- [x] Authentication

### Phase 2 (Planned)
- [ ] Expense categorization
- [ ] Monthly budgets
- [ ] Recurring expense detection
- [ ] Multiple bank accounts
- [ ] CSV export

### Phase 3 (Future)
- [ ] Mobile app (React Native)
- [ ] Shared family accounts
- [ ] Bill splitting
- [ ] Receipt uploads
- [ ] AI expense categorization

## 💰 Cost Analysis

### Free Tier Limits

| Service | Limit | Usage | Status |
|---------|-------|-------|--------|
| Render | 750 hrs/month | ~720 hrs/month | ✅ Safe |
| Vercel | Unlimited | N/A | ✅ Safe |
| Supabase | 500 MB DB | ~10 MB/month | ✅ Safe |
| GitHub Actions | 2000 min/month | ~100 min/month | ✅ Safe |
| Pluggy | 100 items | 1 account | ✅ Safe |
| WhatsApp | 1000 msg/day | ~30/day | ✅ Safe |

**Total Cost: $0/month** 🎉

### When to Upgrade

- **Backend**: > 100 requests/minute
- **Database**: > 500 MB data
- **WhatsApp**: > 1000 messages/day
- **Bank Accounts**: > 100 connections

## 🧪 Testing

### Manual Testing
```bash
# Setup
./scripts/setup.sh

# Test backend
./scripts/test-backend.sh

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/check
```

### Integration Testing
1. Login flow
2. Transaction sync
3. WhatsApp notification
4. Expense attribution
5. Dashboard update

## 📝 Environment Variables

### Backend (10 variables)
- SUPABASE_URL
- SUPABASE_KEY
- PLUGGY_CLIENT_ID
- PLUGGY_CLIENT_SECRET
- PLUGGY_CONNECTION_ID
- WHATSAPP_TOKEN
- PHONE_ID
- USER_PHONE
- WHATSAPP_VERIFY_TOKEN
- PORT

### Frontend (2 variables)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## 🎓 Learning Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Pluggy Docs](https://docs.pluggy.ai)
- [WhatsApp API Docs](https://developers.facebook.com/docs/whatsapp)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development setup
- Code style guidelines
- Pull request process
- Feature ideas

## 📄 License

MIT License - Free to use for personal or commercial projects.

---

**Built with ❤️ by Felipe Xavier**

*For questions or issues, please open a GitHub issue.*

