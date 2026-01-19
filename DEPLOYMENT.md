# SmartMail Deployment Guide

## 🚀 Deploy to Render (Recommended - FREE)

### Prerequisites
- GitHub account with SmartMail repository
- Gmail API credentials (OAuth2)
- Google Gemini API key (optional)

---

## Option 1: Render.com (Best for Full-Stack)

### Step 1: Prepare Environment Variables

Create these in Render dashboard:

**Backend Environment Variables:**
```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend.onrender.com
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-backend.onrender.com/api/auth/callback
JWT_SECRET=your_random_secret_key_here
GEMINI_API_KEY=your_gemini_api_key (optional)
```

**Frontend Environment Variables:**
```env
VITE_API_URL=https://your-backend.onrender.com
```

### Step 2: Deploy Backend

1. Go to https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `smartmail-backend`
   - **Region:** Oregon (Free)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

5. Add environment variables (from Step 1)
6. Click **"Create Web Service"**

### Step 3: Add Persistent Storage (for SQLite)

1. In your backend service dashboard
2. Go to **"Disks"** tab
3. Click **"Add Disk"**
   - **Name:** `smartmail-data`
   - **Mount Path:** `/opt/render/project/src/data`
   - **Size:** 1 GB (Free)
4. Click **"Save"**

### Step 4: Deploy Frontend

1. Click **"New +"** → **"Static Site"**
2. Connect same GitHub repository
3. Configure:
   - **Name:** `smartmail-frontend`
   - **Branch:** `main`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
   - **Plan:** Free

4. Add `VITE_API_URL` environment variable
5. Click **"Create Static Site"**

### Step 5: Update CORS and Redirects

After both services are deployed:

1. Copy backend URL: `https://smartmail-backend-xxx.onrender.com`
2. Copy frontend URL: `https://smartmail-frontend-xxx.onrender.com`
3. Update Google Cloud Console:
   - Add frontend URL to **Authorized JavaScript origins**
   - Add `backend-url/api/auth/callback` to **Authorized redirect URIs**

---

## Option 2: Vercel (Frontend) + Railway (Backend)

### Deploy Frontend to Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   cd d:\smartmail\frontend
   vercel
   ```

3. Set environment variables:
   ```bash
   vercel env add VITE_API_URL production
   ```

### Deploy Backend to Railway

1. Go to https://railway.app/
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select SmartMail repository
4. Choose `backend` folder
5. Add environment variables
6. Deploy

---

## 🔄 How to Update After Deployment

### Method 1: Git Push (Automatic Deploy)

```bash
# Make your changes locally
cd d:\smartmail

# Test locally first
npm run dev  # Test changes

# Commit changes
git add .
git commit -m "Description of changes"
git push origin main
```

**Render/Vercel will automatically detect the push and redeploy!**

### Method 2: Manual Redeploy (Render)

1. Go to Render dashboard
2. Select your service
3. Click **"Manual Deploy"** → **"Deploy latest commit"**

### Method 3: Environment Variable Changes

**For Render:**
1. Go to service dashboard
2. Click **"Environment"** tab
3. Update variables
4. Service will auto-restart

**For Vercel:**
```bash
vercel env add VARIABLE_NAME production
vercel --prod
```

---

## 📝 Quick Update Workflow

```bash
# 1. Make changes in VS Code
# Edit files as needed

# 2. Test locally
cd d:\smartmail\backend
npm run dev

cd d:\smartmail\frontend  
npm run dev

# 3. Commit and push
cd d:\smartmail
git add .
git commit -m "Feature: Added new functionality"
git push origin main

# 4. Wait 2-3 minutes for auto-deploy
# Check deployment status in Render/Vercel dashboard
```

---

## 🐛 Common Issues

### Issue: "Build failed"
**Solution:** Check build logs in dashboard, ensure all dependencies in package.json

### Issue: "Database not persisting"
**Solution:** Verify disk is mounted at correct path in Render

### Issue: "CORS errors"
**Solution:** Update FRONTEND_URL in backend environment variables

### Issue: "OAuth redirect fails"
**Solution:** Update Google Cloud Console with deployed URLs

---

## 💰 Free Tier Limits

**Render Free Tier:**
- Backend: 750 hours/month
- Storage: 1GB persistent disk
- Spins down after 15 min inactivity (30s wake-up time)

**Vercel Free Tier:**
- Unlimited static sites
- 100GB bandwidth/month
- Serverless function executions

---

## 🎯 Production Checklist

- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS only
- [ ] Set up custom domain (optional)
- [ ] Configure rate limiting
- [ ] Set up monitoring/logging
- [ ] Regular database backups
- [ ] Update OAuth redirect URIs

---

Your app will be live at:
- Frontend: `https://smartmail-frontend.onrender.com`
- Backend: `https://smartmail-backend.onrender.com`

Deploy time: ~5-10 minutes total! 🚀
