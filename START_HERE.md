# 🎉 Welcome to FinTrack!

Your personal finance tracker is ready to go! Here's everything you need to get started.

## 📚 Documentation Guide

Choose your path based on your goal:

### 🚀 **I want to get started FAST (15 minutes)**
→ Read [QUICKSTART.md](QUICKSTART.md)
- Minimal setup steps
- Get running locally in 15 minutes
- Perfect for trying it out

### 📖 **I want detailed setup instructions**
→ Read [SETUP.md](SETUP.md)
- Step-by-step guide
- All configuration options explained
- Troubleshooting included

### 🌐 **I want to deploy to production**
→ Read [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Deploy backend to Render
- Deploy frontend to Vercel
- Setup GitHub Actions automation
- Cost analysis (spoiler: it's free!)

### 🔧 **I want to understand the architecture**
→ Read [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)
- Complete system architecture
- Data flow diagrams
- Technology stack details
- Future roadmap

### 🛠️ **I want to customize or contribute**
→ Read [CONTRIBUTING.md](CONTRIBUTING.md)
- Development setup
- Code style guidelines
- Feature ideas
- Pull request process

### 📡 **I need API documentation**
→ Read [docs/API.md](docs/API.md)
- All endpoints documented
- Request/response examples
- Authentication details
- Webhook setup

## 🎯 Quick Reference

### What is FinTrack?

FinTrack automatically:
1. ✅ Fetches your bank transactions (via Pluggy)
2. ✅ Stores them in Supabase database
3. ✅ Sends WhatsApp notifications for new expenses
4. ✅ Lets you assign expenses via WhatsApp buttons
5. ✅ Displays everything on a beautiful dashboard

### Key Features

- 🔄 **Automatic Sync**: Checks for new transactions every 10 minutes
- 📱 **WhatsApp Integration**: Get notified and respond via WhatsApp
- 🎨 **Beautiful Dashboard**: Charts, filters, and real-time updates
- 🔐 **Secure**: Magic link authentication, no passwords
- 💰 **Free**: Runs entirely on free tiers
- 🚀 **Fast Setup**: Get running in 15 minutes

## 🏃‍♂️ Fastest Path to Success

### Option 1: Local Development First

```bash
# 1. Install dependencies
./scripts/setup.sh

# 2. Configure .env files
# - backend/.env (see backend/.env.example)
# - web/.env.local (see web/.env.example)

# 3. Setup database
# - Create Supabase project
# - Run docs/SUPABASE_SCHEMA.sql

# 4. Start both servers
cd backend && npm start        # Terminal 1
cd web && npm run dev          # Terminal 2

# 5. Test
./scripts/test-backend.sh     # Terminal 3
open http://localhost:3000    # Browser
```

### Option 2: Deploy to Production Immediately

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/fintrack.git
git push -u origin main

# 2. Deploy backend to Render
# - Connect repo at render.com
# - Add environment variables
# - Deploy

# 3. Deploy frontend to Vercel
# - Connect repo at vercel.com
# - Add environment variables
# - Deploy

# 4. Configure GitHub Actions
# - Add BACKEND_URL secret
# - Enable Actions

# Done! ✨
```

## 📋 Pre-Setup Checklist

Before you start, make sure you have:

- [ ] Node.js 16+ installed (`node --version`)
- [ ] Git installed (`git --version`)
- [ ] Supabase account (free at [supabase.com](https://supabase.com))
- [ ] Pluggy account (free at [pluggy.ai](https://pluggy.ai))
- [ ] WhatsApp Business account ([Meta for Developers](https://developers.facebook.com))
- [ ] Bank account connected to Pluggy
- [ ] Email for testing login

## 🎬 What Happens After Setup

### Every 10 Minutes (Automated)
1. GitHub Actions calls your backend
2. Backend checks Pluggy for new transactions
3. New expenses are saved to database
4. WhatsApp notifications sent

### When You Get a Notification
1. You receive WhatsApp message with transaction details
2. Click button: [Felipe] [Letícia] [Compartilhado]
3. Backend updates database
4. Dashboard reflects changes immediately

### When You Check the Dashboard
1. Login with magic link (no password!)
2. See summary cards (total per person)
3. View pie chart (visual distribution)
4. Browse transaction table (with filters)
5. Refresh to sync latest data

## 🆘 Common First-Time Issues

### "npm install fails"
```bash
# Clear npm cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### "Can't connect to Supabase"
- Double-check SUPABASE_URL (no trailing slash)
- Use service_role key for backend
- Use anon key for frontend
- Verify database table exists

### "Pluggy authentication failed"
- Check CLIENT_ID and CLIENT_SECRET
- Verify connection is active in Pluggy dashboard
- Reconnect your bank if needed

### "WhatsApp not working"
- Verify phone number format: `+5511999999999`
- Check token is not expired
- Webhook URL must be publicly accessible
- Use ngrok for local testing

### "Port 3000 already in use"
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9
# Or use different port
PORT=3001 npm start
```

## 💡 Pro Tips

1. **Start Simple**: Test with just `/check` endpoint before enabling cron
2. **Use Test Mode**: Most services have sandbox/test modes
3. **Check Logs**: Always check backend console for errors
4. **Monitor Limits**: Stay aware of free tier limits
5. **Backup Data**: Export Supabase data regularly
6. **Secure Tokens**: Never commit .env files

## 🎓 Learning Path

If you're new to these technologies:

1. **Next.js**: [nextjs.org/learn](https://nextjs.org/learn)
2. **Supabase**: [supabase.com/docs/guides/getting-started](https://supabase.com/docs/guides/getting-started)
3. **Tailwind CSS**: [tailwindcss.com/docs](https://tailwindcss.com/docs)
4. **Express.js**: [expressjs.com/en/starter/installing.html](https://expressjs.com/en/starter/installing.html)

## 📊 Project Stats

- **Total Files**: 25+
- **Lines of Code**: ~2,000
- **Dependencies**: 12
- **Setup Time**: 15 minutes
- **Monthly Cost**: $0 (free tier)

## 🔗 Quick Links

| What | Where |
|------|-------|
| **Quick Start** | [QUICKSTART.md](QUICKSTART.md) |
| **Setup Guide** | [SETUP.md](SETUP.md) |
| **Deployment** | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
| **API Docs** | [docs/API.md](docs/API.md) |
| **Architecture** | [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) |
| **Contributing** | [CONTRIBUTING.md](CONTRIBUTING.md) |
| **Full README** | [README.md](README.md) |

## 🎯 Your Next Steps

1. **Read** [QUICKSTART.md](QUICKSTART.md) for fastest setup
2. **Setup** Supabase, Pluggy, and WhatsApp accounts
3. **Configure** environment variables
4. **Run** locally and test
5. **Deploy** to production (optional)
6. **Customize** to your needs

## 🎉 Success Stories

After setup, you'll have:

✅ Automated transaction tracking  
✅ WhatsApp notifications for new expenses  
✅ Easy expense attribution via buttons  
✅ Beautiful dashboard with charts  
✅ Secure authentication  
✅ Zero monthly costs  

## 🤝 Get Help

- 📖 Check documentation (you are here!)
- 🐛 Open GitHub issue for bugs
- 💡 Start GitHub discussion for questions
- 📧 Contact: [your-email@example.com]

## 📝 Final Checklist

Before you start coding:

- [ ] Read START_HERE.md (you are here!)
- [ ] Read QUICKSTART.md
- [ ] Have all accounts ready (Supabase, Pluggy, WhatsApp)
- [ ] Node.js and npm installed
- [ ] Terminal/command line ready
- [ ] Text editor open (VS Code recommended)
- [ ] Coffee/tea ready ☕

---

## 🚀 Ready to Start?

### For Quick Setup (Recommended)
```bash
open QUICKSTART.md
```

### For Detailed Setup
```bash
open SETUP.md
```

### For Production Deployment
```bash
open docs/DEPLOYMENT.md
```

---

**You're all set! Let's build something amazing! 🎉**

Questions? Check [README.md](README.md) or open an issue.

*Built with ❤️ using Next.js, Supabase, Pluggy, and WhatsApp*

