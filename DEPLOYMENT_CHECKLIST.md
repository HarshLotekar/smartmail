# OAuth Deployment Checklist

## ✅ Code Changes (COMPLETED)

- [x] Backend: Updated auth.controller.js to redirect to `/auth/success` with JWT
- [x] Backend: Removed cookie-based session handling
- [x] Frontend: Created `/auth/success` page to handle OAuth callback
- [x] Frontend: Updated App.jsx with new route
- [x] Frontend: Fixed loginWithGoogle() to use backend URL
- [x] Frontend: Removed old OAuth handling from Home page
- [x] Committed and pushed to GitHub (commit: 1372eb5)

---

## 🚀 Render Deployment Steps

### 1. Wait for Auto-Deploy
- Backend: https://dashboard.render.com/web/srv-ctqo2ue8ii6s73a8mtpg
- Frontend: https://dashboard.render.com/static/srv-ctqo2ue8ii6s73a8mu00

**Watch for**: "Your site is live 🎉" in Logs tab (takes 3-5 minutes)

---

### 2. Verify Backend Environment Variables

Go to: Backend Service → Environment tab

**Required Variables**:
```
✅ NODE_ENV = production
✅ PORT = 3001
✅ FRONTEND_URL = https://smartmail-frontend-pcuw.onrender.com
✅ GOOGLE_CLIENT_ID = your_client_id
✅ GOOGLE_CLIENT_SECRET = your_secret
✅ JWT_SECRET = your_jwt_secret
```

**If FRONTEND_URL is missing**:
1. Click "Add Environment Variable"
2. Key: `FRONTEND_URL`
3. Value: `https://smartmail-frontend-pcuw.onrender.com`
4. Save (service will restart)

---

### 3. Update Google Cloud Console

Go to: https://console.cloud.google.com/apis/credentials

Select your OAuth 2.0 Client ID

**Authorized JavaScript origins**:
```
https://smartmail-w4ff.onrender.com
https://smartmail-frontend-pcuw.onrender.com
```

**Authorized redirect URIs**:
```
https://smartmail-w4ff.onrender.com/api/auth/google/callback
```

Click "SAVE" and wait 5 minutes for propagation.

---

## 🧪 Testing Steps

### Step 1: Check Backend Status
Open: https://smartmail-w4ff.onrender.com/api/auth/status

**Expected Response**:
```json
{
  "success": true,
  "message": "Google OAuth configured",
  "google": {
    "clientId": true,
    "clientSecret": true,
    "redirectUri": "https://smartmail-w4ff.onrender.com/api/auth/google/callback"
  }
}
```

### Step 2: Test Frontend
1. Open: https://smartmail-frontend-pcuw.onrender.com
2. Hard refresh: Ctrl+Shift+R (to clear cache)
3. Page should load without errors

### Step 3: Test OAuth Flow
1. Click "Login with Google" or "Connect Gmail"
2. Browser should redirect to Google login page
3. Log in with your Google account
4. Approve permissions
5. Should redirect to: `https://smartmail-frontend-pcuw.onrender.com/auth/success?token=...`
6. Should show "Completing sign in..." spinner briefly
7. Should redirect to: `https://smartmail-frontend-pcuw.onrender.com/inbox`
8. Inbox should load your emails

### Step 4: Verify Authentication
1. Open browser DevTools (F12)
2. Go to Application → Local Storage
3. Should see:
   - `smartmail_token`: JWT token
   - `smartmail_user`: User data JSON
4. Go to Network tab
5. Refresh inbox
6. API requests should include `Authorization: Bearer <token>` header

---

## 🐛 Troubleshooting

### Issue: "Not Found" when clicking login

**Check**:
- Open DevTools → Network tab
- Click login
- Check redirect URL
- Should be: `https://smartmail-w4ff.onrender.com/api/auth/google`
- If it's frontend URL, rebuild frontend failed

**Fix**:
```powershell
cd d:\smartmail\frontend
git pull origin main
npm install
npm run build
```

### Issue: "redirect_uri_mismatch"

**Check**: Google Cloud Console redirect URI EXACTLY matches
**Fix**: Copy-paste: `https://smartmail-w4ff.onrender.com/api/auth/google/callback`

### Issue: Redirects but no token in URL

**Check**: Backend logs in Render dashboard
**Fix**: Ensure `FRONTEND_URL` environment variable is set

### Issue: Token received but error on /inbox

**Check**: Backend API requests in Network tab
**Fix**: Verify JWT_SECRET is set and backend restarted

---

## 📊 Monitor Deployment

### Backend Logs
```
Render Dashboard → Backend Service → Logs

Watch for:
✅ "Server running on port 3001"
✅ "Database initialized successfully"
✅ "🔧 Debug - initiateAuth called"
✅ "✅ OAuth success, redirecting to:"
```

### Frontend Logs
```
Render Dashboard → Frontend Service → Logs

Watch for:
✅ "npm run build succeeded"
✅ "Your site is live 🎉"
```

### Browser Console
```
Open DevTools → Console

Watch for:
✅ "✅ Token received from OAuth callback"
✅ "✅ Token decoded: {userId, email, googleId}"
✅ "✅ User authenticated: user@gmail.com"
❌ Any red errors
```

---

## ⏱️ Expected Timeline

- **Commit to GitHub**: Done ✅
- **Render detects push**: ~30 seconds
- **Backend rebuild**: 2-3 minutes
- **Frontend rebuild**: 3-4 minutes
- **Total**: ~5-7 minutes from push to live

---

## 🎯 Success Criteria

✅ Backend responds at `/api/auth/status`
✅ Frontend loads without errors
✅ Login button redirects to Google
✅ OAuth callback returns to `/auth/success`
✅ Token stored in localStorage
✅ User redirected to `/inbox`
✅ Emails load successfully

---

## 📞 If Still Not Working

1. **Check Render Logs**: Look for errors during build/deploy
2. **Check Browser Console**: Look for JavaScript errors
3. **Check Network Tab**: Verify API calls and responses
4. **Verify Environment Variables**: All required vars set in Render
5. **Verify Google Console**: URLs match exactly
6. **Clear All Cache**: Hard refresh with Ctrl+Shift+R
7. **Try Incognito Window**: Eliminates cache/extension issues

---

Last Updated: January 19, 2026
Current Commit: 1372eb5
