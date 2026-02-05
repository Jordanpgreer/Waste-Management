# 🚀 Quick Deploy Reference

## Your Deployment Stack (All FREE)

```
Frontend (Vercel)  →  Backend (Render)  →  Database (Supabase ✅)
     FREE                  FREE                  DONE
```

## ⚡ Quick Start

### 1. Deploy Backend to Render (15 minutes)
1. Go to https://render.com → Sign up with GitHub
2. **New +** → **Web Service** → Select your repo
3. Configure:
   - **Name:** `waste-management-backend`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free**

4. **Add Environment Variables:**
```env
NODE_ENV=production
PORT=5000
API_VERSION=v1
DB_HOST=db.xxxxx.supabase.co           # From Supabase dashboard
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-password     # From Supabase
JWT_SECRET=generate-a-random-string-here
CORS_ORIGIN=https://your-app.vercel.app # Update after Vercel deploy
```

5. Click **Create Web Service**
6. Copy your backend URL: `https://waste-management-backend.onrender.com`

### 2. Deploy Frontend to Vercel (10 minutes)
1. Go to https://vercel.com → Sign up with GitHub
2. **New Project** → Select `Jordanpgreer/Waste-Management`
3. Configure:
   - **Framework:** Create React App
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`

4. **Add Environment Variable:**
```env
REACT_APP_API_URL=https://waste-management-backend.onrender.com/api/v1
```

5. Click **Deploy**
6. Copy your frontend URL: `https://your-app.vercel.app`

### 3. Update CORS (2 minutes)
1. Go back to Render → Your backend service
2. **Environment** → Edit `CORS_ORIGIN`
3. Set to your Vercel URL: `https://your-app.vercel.app`
4. Save → Render auto-redeploys

### 4. Test! 🎉
Visit your Vercel URL and log in!

---

## 📋 Supabase Connection Info

You need from Supabase Dashboard → Settings → Database:
- **Host:** `db.xxxxx.supabase.co`
- **Password:** Your database password

---

## ⚠️ Important Notes

### Render Free Tier
- **Spins down after 15 min** of inactivity
- First request after = 30-60s delay (cold start)
- Fine for testing/demo

### Vercel Free Tier
- **No cold starts**
- 100 GB bandwidth/month
- Perfect for frontend

---

## 🔄 Future Updates

Just push to GitHub:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

Both Vercel and Render **auto-deploy** on push! 🎉

---

## 🆘 Troubleshooting

**Can't connect to backend?**
- Check Render logs (Render dashboard → Logs tab)
- Verify `REACT_APP_API_URL` in Vercel matches Render URL

**CORS errors?**
- Update `CORS_ORIGIN` in Render to match Vercel URL exactly
- Must include `https://`

**Database connection failed?**
- Verify Supabase credentials in Render
- Check Supabase allows external connections

---

For full guide, see: **DEPLOYMENT_GUIDE.md**
