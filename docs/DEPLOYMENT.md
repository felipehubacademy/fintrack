# 🚀 Deployment Guide

Complete guide to deploy FinTrack to production.

## Prerequisites

- GitHub account
- Supabase account (free tier)
- Render.com or Railway account (free tier)
- Vercel account (free tier)

---

## Step 1: Deploy Backend to Render

### 1.1 Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### 1.2 Create Web Service

1. Click **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `fintrack-backend`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 1.3 Add Environment Variables

Add all variables from `backend/.env.example`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
PLUGGY_CLIENT_ID=your-client-id
PLUGGY_CLIENT_SECRET=your-client-secret
PLUGGY_CONNECTION_ID=your-connection-id
WHATSAPP_TOKEN=your-access-token
PHONE_ID=787122227826364
USER_PHONE=+5511999999999
WHATSAPP_VERIFY_TOKEN=fintrack_verify_token
PORT=3000
NODE_ENV=production
```

### 1.4 Deploy

1. Click **Create Web Service**
2. Wait for deployment (3-5 minutes)
3. Copy your service URL: `https://fintrack-backend-xxx.onrender.com`

### 1.5 Test Backend

```bash
curl https://fintrack-backend-xxx.onrender.com/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-10-09T12:00:00.000Z"}
```

---

## Step 2: Configure WhatsApp Webhook

### 2.1 Update Webhook URL

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Select your app
3. Go to **WhatsApp** → **Configuration**
4. Edit Webhook:
   - **Callback URL**: `https://fintrack-backend-xxx.onrender.com/webhook`
   - **Verify Token**: `fintrack_verify_token`
5. Click **Verify and Save**

### 2.2 Subscribe to Messages

1. In Webhook Fields, subscribe to: `messages`
2. Save changes

### 2.3 Test WhatsApp

Send a test notification from backend:

```bash
curl -X GET https://fintrack-backend-xxx.onrender.com/check
```

You should receive a WhatsApp message if there are new transactions.

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### 3.2 Deploy via Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 3.3 Add Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3.4 Deploy

1. Click **Deploy**
2. Wait for build (2-3 minutes)
3. Visit your app: `https://fintrack-xxx.vercel.app`

### 3.5 Update Supabase Redirect URLs

1. Go to Supabase → **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   ```
   https://fintrack-xxx.vercel.app/dashboard
   ```

---

## Step 4: Setup GitHub Actions

### 4.1 Add Repository Secret

1. Go to your GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add:
   - **Name**: `BACKEND_URL`
   - **Value**: `https://fintrack-backend-xxx.onrender.com`

### 4.2 Enable Workflows

1. Go to **Actions** tab
2. Click **I understand my workflows, go ahead and enable them**

### 4.3 Manual Test

1. Go to **Actions**
2. Select **Check Transactions** workflow
3. Click **Run workflow**
4. Check logs for success

### 4.4 Verify Cron Schedule

The workflow runs every 10 minutes automatically. Check `.github/workflows/cron.yml`:

```yaml
schedule:
  - cron: "*/10 * * * *"
```

---

## Alternative Deployment Options

### Railway.app (Alternative to Render)

```bash
# Install Railway CLI
npm install -g railway

# Login
railway login

# Deploy backend
cd backend
railway init
railway up

# Add environment variables
railway variables:set SUPABASE_URL=...

# Get URL
railway domain
```

### Vercel Functions (Alternative for Backend)

Create `web/api/check.js`:

```javascript
import { getAllTransactions } from '../../backend/services/pluggy.js';
import { saveExpense, transactionExists } from '../../backend/services/supabase.js';

export default async function handler(req, res) {
  // Same logic as backend/routes/pluggy.js
}
```

Deploy:
```bash
cd web
vercel
```

---

## Monitoring & Maintenance

### 1. Render Dashboard

- Monitor logs: `https://dashboard.render.com/web/your-service-id/logs`
- Check metrics: CPU, Memory, Response time
- Free tier: Spins down after 15 min inactivity

### 2. Vercel Dashboard

- View deployments: `https://vercel.com/dashboard`
- Check analytics: Page views, performance
- Free tier: Unlimited bandwidth

### 3. GitHub Actions

- View workflow runs: Repository → **Actions**
- Check cron execution logs
- Debug failed runs

### 4. Supabase Dashboard

- Monitor database usage: **Database** → **Usage**
- Check auth users: **Authentication** → **Users**
- View API logs: **Logs** → **API Logs**

---

## Cost Breakdown (Free Tier)

| Service | Free Tier Limits | Notes |
|---------|-----------------|-------|
| **Render** | 750 hours/month | Spins down after 15 min inactivity |
| **Vercel** | Unlimited bandwidth | 100 GB bandwidth/month |
| **Supabase** | 500 MB database | Unlimited API requests |
| **GitHub Actions** | 2000 minutes/month | ~12 executions/hour = 8640/month ✅ |
| **Pluggy** | 100 items/month | One bank account = 1 item ✅ |
| **WhatsApp** | 1000 messages/day | ~30 transactions/day fits easily ✅ |

**Total Cost: $0/month** 🎉

---

## Scaling to Production

### When to Upgrade

- **Backend**: More than 100 requests/minute → Upgrade Render plan
- **Database**: More than 500 MB data → Upgrade Supabase
- **WhatsApp**: More than 1000 messages/day → WhatsApp Business API

### Production Checklist

- [ ] Use environment-specific configs
- [ ] Enable HTTPS only
- [ ] Add API rate limiting
- [ ] Implement proper error handling
- [ ] Set up monitoring (e.g., Sentry)
- [ ] Enable database backups
- [ ] Use permanent WhatsApp token
- [ ] Add CI/CD tests
- [ ] Configure custom domain
- [ ] Set up logging service

---

## Troubleshooting

### Backend Not Responding

1. Check Render logs
2. Verify environment variables
3. Test locally with same .env values
4. Check if service is sleeping (free tier)

### WhatsApp Not Working

1. Verify webhook URL is correct
2. Check WHATSAPP_TOKEN is valid
3. Ensure phone number format: `+5511999999999`
4. Test with WhatsApp API test tool

### GitHub Actions Failing

1. Verify BACKEND_URL secret is set
2. Check if backend is accessible
3. Review workflow logs
4. Test endpoint manually with curl

### Frontend Auth Issues

1. Check Supabase redirect URLs
2. Verify environment variables in Vercel
3. Clear browser cache/cookies
4. Check Supabase auth logs

---

## Rollback Strategy

### Backend Rollback

1. Go to Render Dashboard
2. **Deploys** tab
3. Select previous successful deploy
4. Click **Redeploy**

### Frontend Rollback

1. Go to Vercel Dashboard
2. **Deployments** tab
3. Select previous deployment
4. Click **Promote to Production**

---

## Security Best Practices

1. **Never commit .env files** (already in .gitignore)
2. **Use service role key** only in backend
3. **Rotate WhatsApp tokens** regularly
4. **Enable 2FA** on all services
5. **Monitor for unusual activity** in logs
6. **Keep dependencies updated** (`npm audit`)

---

## Success Checklist

- [ ] Backend deployed and responding
- [ ] Frontend deployed and accessible
- [ ] WhatsApp webhook configured
- [ ] GitHub Actions running every 10 minutes
- [ ] Can login to dashboard
- [ ] Transactions appear in dashboard
- [ ] WhatsApp notifications received
- [ ] Can assign expenses via WhatsApp
- [ ] Database updates reflected

---

🎉 **Congratulations! Your FinTrack is now live!**

Visit your app: `https://fintrack-xxx.vercel.app`

Need help? Check the main [README.md](../README.md) or [API.md](./API.md).

