# ⚡ FinTrack Quick Start

Get FinTrack running in 15 minutes!

## Prerequisites

- Node.js 16+ installed
- Supabase account (free)
- Pluggy account (free)
- WhatsApp Business account (free)

## 🚀 Step-by-Step Setup

### 1. Clone & Install (2 minutes)

```bash
# Clone the repository
git clone https://github.com/yourusername/FinTrack.git
cd FinTrack

# Run automated setup
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This will:
- Install all dependencies
- Create environment template files

### 2. Setup Supabase (3 minutes)

1. Go to [supabase.com](https://supabase.com) and create a project
2. Copy these values from **Settings** → **API**:
   - `Project URL` → Save for later
   - `anon public` key → Save for later
   - `service_role` key → Save for later

3. Run this SQL in **SQL Editor**:

```sql
CREATE TABLE expenses (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  owner TEXT,
  split BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'pluggy',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_expenses_date ON expenses(date DESC);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read expenses"
  ON expenses FOR SELECT USING (auth.role() = 'authenticated');
```

4. Enable **Email Auth** in **Authentication** → **Providers**

### 3. Setup Pluggy (3 minutes)

1. Create account at [pluggy.ai](https://pluggy.ai)
2. Get **Client ID** and **Client Secret** from Dashboard → API Keys
3. Connect your Itaú account and copy the **Connection ID**

### 4. Setup WhatsApp (4 minutes)

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create a Business app
3. Add **WhatsApp** product
4. Copy:
   - **Phone Number ID**
   - **Access Token** (get permanent token from System Users)
5. Set webhook (after backend is running):
   - URL: `http://localhost:3000/webhook` (for now)
   - Verify Token: `fintrack_verify_token`

### 5. Configure Environment (2 minutes)

**Backend**: Edit `backend/.env`

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key

PLUGGY_CLIENT_ID=your-client-id
PLUGGY_CLIENT_SECRET=your-client-secret
PLUGGY_CONNECTION_ID=your-connection-id

WHATSAPP_TOKEN=your-access-token
PHONE_ID=your-phone-id
USER_PHONE=+5511999999999

PORT=3000
```

**Frontend**: Edit `web/.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 6. Run Locally (1 minute)

```bash
# Terminal 1 - Start backend
cd backend
npm start

# Terminal 2 - Start frontend
cd web
npm run dev
```

### 7. Test It Out! ✨

1. **Backend Test**:
   ```bash
   # Terminal 3
   curl http://localhost:3000/health
   curl http://localhost:3000/check
   ```

2. **Frontend Test**:
   - Open browser: `http://localhost:3000`
   - Enter your email
   - Check email for magic link
   - Click link to access dashboard

3. **WhatsApp Test**:
   - If you have new transactions, you'll receive a WhatsApp message
   - Click button to assign expense
   - Check dashboard for update

## 🎯 What You Should See

### Backend Console
```
🚀 FinTrack backend running on port 3000
📊 Environment: development
```

### Frontend
- Clean login page with magic link
- Dashboard with summary cards
- Transaction table with filters
- Pie chart showing distribution

### WhatsApp Message
```
💳 Nova transação detectada:

UBER *TRIP
R$ 25.50

De quem é essa despesa?
[Felipe] [Letícia] [Compartilhado]
```

## 🚨 Common Issues

### "Cannot connect to Supabase"
- Check SUPABASE_URL and keys are correct
- Verify database table exists
- Check RLS policies

### "Pluggy authentication failed"
- Verify CLIENT_ID and CLIENT_SECRET
- Check if connection is still active
- Reconnect your bank account if needed

### "WhatsApp not sending"
- Check PHONE_ID and token
- Verify phone number format: `+5511999999999`
- Ensure webhook is configured (or will be after deployment)

### Port already in use
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9
```

## 📱 Next Steps

Once everything works locally:

1. **Deploy to Production**:
   - Follow [DEPLOYMENT.md](docs/DEPLOYMENT.md)
   - Deploy backend to Render
   - Deploy frontend to Vercel
   - Configure GitHub Actions

2. **Customize**:
   - Adjust names in `backend/services/whatsapp.js`
   - Update colors in `web/components/SummaryCards.jsx`
   - Modify cron schedule in `.github/workflows/cron.yml`

3. **Enhance**:
   - See [CONTRIBUTING.md](CONTRIBUTING.md) for feature ideas
   - Add expense categories
   - Implement budgets
   - Add more bank accounts

## 📚 Documentation

- [README.md](README.md) - Full overview
- [SETUP.md](SETUP.md) - Detailed setup guide
- [docs/API.md](docs/API.md) - API documentation
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Deploy to production
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribute to project

## 💡 Tips

1. **Use test transactions** first before connecting real bank
2. **Start with manual `/check` calls** before enabling cron
3. **Test WhatsApp** with temporary webhook (ngrok) during development
4. **Keep tokens secure** - never commit .env files
5. **Monitor API limits** - Pluggy and WhatsApp have free tier limits

## 🆘 Need Help?

- Check [README.md](README.md#troubleshooting) troubleshooting section
- Review [docs/API.md](docs/API.md) for API details
- Open an issue on GitHub
- Check Supabase/Pluggy/WhatsApp documentation

## ✅ Success Checklist

- [ ] Backend running on port 3000
- [ ] Frontend accessible at localhost:3000
- [ ] Can login with magic link
- [ ] Dashboard displays correctly
- [ ] `/check` endpoint fetches transactions
- [ ] WhatsApp sends notifications (if configured)
- [ ] Can assign expenses via WhatsApp
- [ ] Dashboard updates after assignment

---

🎉 **Congratulations! You're tracking your finances like a pro!**

Total setup time: ~15 minutes

Ready to deploy? See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

