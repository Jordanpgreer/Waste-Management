# Deployment Guide - Waste Management Platform

## 🏗️ Architecture Overview

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Vercel    │ ───> │    Render    │ ───> │  Supabase   │
│  (Frontend) │      │  (Backend)   │      │ (Database)  │
└─────────────┘      └──────────────┘      └─────────────┘
```

## 📋 Prerequisites

- [x] Supabase account with database setup ✅ (You have this)
- [ ] Vercel account (free) - https://vercel.com
- [ ] Render account (free) - https://render.com
- [ ] GitHub repository with code pushed

---

## 🗄️ Step 1: Database Setup (Supabase) - Already Done ✅

Since you already have Supabase set up, just verify:

1. Go to Supabase dashboard → Project Settings → Database
2. Note down your connection details:
   - **Host:** `db.xxxxx.supabase.co`
   - **Port:** `5432`
   - **Database:** `postgres`
   - **User:** `postgres`
   - **Password:** Your database password

3. Ensure your database schema is up to date:
   ```bash
   # Run migrations if needed
   psql -h db.xxxxx.supabase.co -U postgres -d postgres -f backend/src/database/schema.sql
   psql -h db.xxxxx.supabase.co -U postgres -d postgres -f backend/db/migrations/001_create_purchase_orders.sql
   psql -h db.xxxxx.supabase.co -U postgres -d postgres -f backend/db/migrations/002_add_po_fields_to_invoices.sql
   ```

---

## 🖥️ Step 2: Deploy Backend to Render (FREE)

### 2.1 Create Render Account
1. Go to https://render.com
2. Sign up with GitHub (easiest)
3. Authorize Render to access your GitHub repos

### 2.2 Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repo: `Jordanpgreer/Waste-Management`
3. Configure:
   - **Name:** `waste-management-backend`
   - **Region:** Oregon (US West) or closest to you
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free** (select Free tier)

### 2.3 Add Environment Variables
In Render dashboard, go to **Environment** tab and add:

```
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database (from your Supabase)
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secure-random-string-here

# CORS (will update after Vercel deployment)
CORS_ORIGIN=https://waste-management-frontend.vercel.app
```

### 2.4 Deploy
1. Click **"Create Web Service"**
2. Render will automatically build and deploy
3. Wait 5-10 minutes for first deployment
4. Your backend URL will be: `https://waste-management-backend.onrender.com`

### 2.5 Test Backend
```bash
curl https://waste-management-backend.onrender.com/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "...",
    "environment": "production"
  }
}
```

---

## 🎨 Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub
3. Authorize Vercel to access your repos

### 3.2 Import Project
1. Click **"Add New..."** → **"Project"**
2. Select `Jordanpgreer/Waste-Management`
3. Vercel will auto-detect the framework
4. Configure:
   - **Framework Preset:** Create React App
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`

### 3.3 Add Environment Variables
In Vercel dashboard, go to **Settings** → **Environment Variables**:

```
REACT_APP_API_URL=https://waste-management-backend.onrender.com
```

### 3.4 Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes
3. Your frontend URL will be: `https://waste-management-frontend.vercel.app`
   (or custom domain you choose)

### 3.5 Update CORS on Backend
Go back to Render and update the `CORS_ORIGIN` environment variable:
```
CORS_ORIGIN=https://waste-management-frontend.vercel.app
```

Then redeploy the backend.

---

## ✅ Step 4: Verify Everything Works

### 4.1 Test Frontend
1. Visit your Vercel URL
2. Try to log in (should work if backend is connected)

### 4.2 Test API Connection
Open browser console on your frontend and check:
- No CORS errors
- API calls returning data
- Authentication working

### 4.3 Test Database Connection
Create a test user or client to verify database writes work.

---

## 🔧 Environment Variables Summary

### Frontend (Vercel)
```env
REACT_APP_API_URL=https://waste-management-backend.onrender.com
```

### Backend (Render)
```env
NODE_ENV=production
PORT=5000
API_VERSION=v1
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password
JWT_SECRET=your-secure-jwt-secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://waste-management-frontend.vercel.app
```

---

## 🚨 Important Notes

### Render Free Tier Limitations
- **Spins down after 15 minutes of inactivity**
- First request after spin-down takes 30-60 seconds (cold start)
- 750 hours/month limit (enough for 24/7 operation)

### Handling Cold Starts
Option 1: Accept the delay (fine for development)
Option 2: Use a cron job to ping every 10 minutes:
```bash
# Use cron-job.org or similar
curl https://waste-management-backend.onrender.com/health
```

Option 3: Upgrade to Render paid tier ($7/month) for always-on

### Supabase Free Tier
- 500 MB database storage
- 2 GB bandwidth/month
- No auto-pause (always available)
- More than enough for initial development

---

## 🔄 Continuous Deployment

Both Vercel and Render support automatic deployments:

1. **Push to GitHub** → Automatic deployment
2. **Pull Request** → Preview deployments (Vercel)
3. **Merge to main** → Production deployment

Your workflow:
```bash
git add .
git commit -m "Your changes"
git push origin main
# Vercel and Render automatically deploy! 🚀
```

---

## 📊 Monitoring

### Render Dashboard
- View logs: Render Dashboard → Logs tab
- Monitor CPU/Memory usage
- Check deployment status

### Vercel Dashboard
- View build logs
- Monitor bandwidth usage
- Check function invocations

### Supabase Dashboard
- Monitor database connections
- View query performance
- Check storage usage

---

## 🆘 Troubleshooting

### Backend won't connect to database
- Check Supabase connection details
- Verify database password
- Check Render logs for errors
- Ensure Supabase allows external connections

### CORS errors
- Update `CORS_ORIGIN` in Render to match Vercel URL exactly
- Include `https://` protocol
- Redeploy backend after changes

### Frontend can't reach backend
- Verify `REACT_APP_API_URL` in Vercel
- Check backend is deployed and running
- Test backend health endpoint directly

### Build failures
- Check Node version compatibility
- Verify all dependencies in package.json
- Review build logs in dashboard

---

## 💰 Cost Breakdown

| Service | Tier | Monthly Cost | What You Get |
|---------|------|--------------|--------------|
| Vercel | Free | $0 | 100 GB bandwidth, unlimited deploys |
| Render | Free | $0 | 750 hours, 512 MB RAM, cold starts |
| Supabase | Free | $0 | 500 MB database, 2 GB bandwidth |
| **TOTAL** | | **$0** | Fully functional platform! |

---

## 🚀 Optional: Custom Domain

### Vercel (Frontend)
1. Go to Project Settings → Domains
2. Add your domain (e.g., `app.yourdomain.com`)
3. Update DNS records as instructed

### Render (Backend)
1. Go to Settings → Custom Domain
2. Add API subdomain (e.g., `api.yourdomain.com`)
3. Update DNS records

Then update CORS settings to match new domain.

---

## 📝 Next Steps After Deployment

1. **Test all features** thoroughly in production
2. **Set up error monitoring** (Sentry, LogRocket)
3. **Configure database backups** (Supabase auto-backups)
4. **Set up staging environment** (separate branches)
5. **Add monitoring/alerting** (UptimeRobot)

---

## 🎉 You're Live!

Once deployed, your platform will be accessible at:
- **Frontend:** `https://waste-management-frontend.vercel.app`
- **Backend API:** `https://waste-management-backend.onrender.com`
- **Database:** Supabase (secure connection)

Total deployment time: ~30-45 minutes for first-time setup.

---

## 📞 Support

If you encounter issues:
1. Check Render logs (most common source of issues)
2. Verify environment variables match exactly
3. Test backend health endpoint
4. Check Supabase connection is active

Need help? Check the documentation:
- Vercel: https://vercel.com/docs
- Render: https://render.com/docs
- Supabase: https://supabase.com/docs
