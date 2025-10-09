# 🚀 FinTrack Setup Guide

## Quick Start Checklist

### 1️⃣ Supabase Setup

1. Create account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Settings** → **API**
4. Copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend)
   - `service_role` key → `SUPABASE_KEY` (backend)

5. Create the database table:

```sql
-- Run this in SQL Editor
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
CREATE INDEX idx_expenses_owner ON expenses(owner);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read expenses"
  ON expenses FOR SELECT
  USING (auth.role() = 'authenticated');
```

6. Enable **Email Auth**:
   - Go to **Authentication** → **Providers**
   - Enable **Email** provider
   - Configure **Site URL** and **Redirect URLs**

### 2️⃣ Pluggy Setup

1. Create account at [pluggy.ai](https://pluggy.ai)
2. Go to **Dashboard** → **API Keys**
3. Copy:
   - Client ID → `PLUGGY_CLIENT_ID`
   - Client Secret → `PLUGGY_CLIENT_SECRET`

4. Connect your Itaú account:
   - Use Pluggy Connect Widget or API
   - Complete authentication flow
   - Copy the Connection ID → `PLUGGY_CONNECTION_ID`

### 3️⃣ WhatsApp Cloud API Setup

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create an App → **Business** type
3. Add **WhatsApp** product
4. Go to **WhatsApp** → **Getting Started**
5. Copy:
   - Phone Number ID → `PHONE_ID`
   - Temporary Access Token → `WHATSAPP_TOKEN`

6. **Configure Webhook**:
   - Click **Configuration** in WhatsApp settings
   - Callback URL: `https://your-backend-url.com/webhook`
   - Verify Token: `fintrack_verify_token` (same as in .env)
   - Subscribe to: `messages`

7. **Get Permanent Token** (Important!):
   - Temporary tokens expire in 24h
   - Go to **Settings** → **System Users** → Create system user
   - Generate permanent token with `whatsapp_business_messaging` permission

8. Add your phone number:
   - Format: `+5511999999999` → `USER_PHONE`

### 4️⃣ Backend Configuration

```bash
cd backend
cp .env.example .env
# Edit .env with all your credentials
npm install
npm start
```

Test endpoints:
```bash
# Test Pluggy auth
curl -X POST http://localhost:3000/auth

# Test transaction check
curl -X GET http://localhost:3000/check

# Health check
curl http://localhost:3000/health
```

### 5️⃣ Frontend Configuration

```bash
cd web
cp .env.example .env.local
# Edit .env.local with Supabase credentials
npm install
npm run dev
```

Visit `http://localhost:3000` and test login with your email.

### 6️⃣ Deploy Backend

**Option A: Render.com** (Recommended)

1. Go to [render.com](https://render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Settings:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Environment: Add all variables from `.env.example`
5. Deploy!

**Option B: Railway.app**

```bash
cd backend
railway login
railway init
railway up
railway open
# Add environment variables in dashboard
```

### 7️⃣ Deploy Frontend

**Vercel** (Recommended for Next.js)

```bash
cd web
vercel login
vercel
```

Or connect via GitHub:
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Set **Root Directory**: `web`
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

### 8️⃣ GitHub Actions Setup

1. Go to your GitHub repo
2. **Settings** → **Secrets and variables** → **Actions**
3. Add repository secret:
   - Name: `BACKEND_URL`
   - Value: `https://your-backend.onrender.com` (your deployed backend URL)
4. Enable Actions in **Actions** tab
5. The cron will run automatically every 10 minutes

### 9️⃣ Supabase Additional Config

Add your deployed frontend URL to Supabase:

1. **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   - `https://your-app.vercel.app/dashboard`
   - `http://localhost:3000/dashboard` (for development)

### 🔟 Test End-to-End

1. **Manual Transaction Check**:
   ```bash
   curl https://your-backend.onrender.com/check
   ```

2. **Check WhatsApp**: You should receive a notification

3. **Click Button**: Assign to Felipe/Letícia/Compartilhado

4. **Check Dashboard**: Login and verify transaction appears

## 🎉 You're Done!

Your FinTrack is now fully operational!

### Maintenance

- **Update Pluggy Connection**: Reconnect if bank auth expires
- **Rotate WhatsApp Token**: Use permanent token from System Users
- **Monitor Logs**: Check backend logs for any errors
- **Database Backup**: Enable automated backups in Supabase

### Troubleshooting

See main [README.md](./README.md) for detailed troubleshooting guide.

## 📊 Expected Behavior

Every 10 minutes:
1. GitHub Action triggers `/check` endpoint
2. Backend fetches Pluggy transactions (last 7 days)
3. New transactions are saved to Supabase
4. WhatsApp notification sent for each new expense
5. You click button to assign expense
6. Database updates with owner
7. Dashboard shows updated data

---

Need help? Open an issue on GitHub!

