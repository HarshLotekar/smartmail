# Google OAuth Configuration Guide

## Production Setup (Render.com)

### Backend Configuration (smartmail-w4ff.onrender.com)

#### Required Environment Variables in Render Dashboard:
```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://smartmail-frontend-pcuw.onrender.com
GOOGLE_CLIENT_ID=your_actual_client_id
GOOGLE_CLIENT_SECRET=your_actual_client_secret
JWT_SECRET=your_secure_random_secret
```

**IMPORTANT**: `FRONTEND_URL` is required for OAuth callback redirect!

---

### Google Cloud Console Configuration

Go to: https://console.cloud.google.com/apis/credentials

#### 1. Authorized JavaScript Origins
Add BOTH URLs:
```
https://smartmail-w4ff.onrender.com
https://smartmail-frontend-pcuw.onrender.com
```

#### 2. Authorized Redirect URIs
Add this EXACT URL:
```
https://smartmail-w4ff.onrender.com/api/auth/google/callback
```

**⚠️ Any mismatch will cause OAuth to fail!**

---

## OAuth Flow (Production)

### Step-by-Step Process:

1. **User clicks "Login with Google"**
   - Frontend: `https://smartmail-frontend-pcuw.onrender.com`
   - JavaScript redirects browser to: `https://smartmail-w4ff.onrender.com/api/auth/google`

2. **Backend initiates OAuth**
   - Route: `GET /api/auth/google`
   - Redirects browser to Google login page
   - Includes redirect_uri: `https://smartmail-w4ff.onrender.com/api/auth/google/callback`

3. **User logs in with Google**
   - Google shows consent screen
   - User approves access

4. **Google redirects to backend callback**
   - Route: `GET /api/auth/google/callback?code=...`
   - Backend exchanges code for tokens
   - Backend creates/updates user in database
   - Backend generates JWT token

5. **Backend redirects to frontend with token**
   - Redirect URL: `https://smartmail-frontend-pcuw.onrender.com/auth/success?token=JWT_HERE`

6. **Frontend processes token**
   - Route: `/auth/success`
   - Extracts token from URL query parameter
   - Stores token in localStorage
   - Fetches user profile from backend
   - Redirects to `/inbox`

---

## Key Files

### Backend

**Routes**: `backend/src/routes/auth.routes.js`
```javascript
// Start OAuth flow
router.get('/google', initiateAuth);

// OAuth callback
router.get('/callback', handleCallback);
```

**Controller**: `backend/src/controllers/auth.controller.js`
```javascript
// Generates JWT and redirects to frontend
const redirectUrl = `${process.env.FRONTEND_URL}/auth/success?token=${jwtToken}`;
res.redirect(redirectUrl);
```

### Frontend

**API Service**: `frontend/src/services/api.js`
```javascript
// Redirects browser to backend OAuth
export async function loginWithGoogle() {
  const backendURL = 'https://smartmail-w4ff.onrender.com';
  window.location.href = `${backendURL}/api/auth/google`;
}
```

**Auth Success Page**: `frontend/src/pages/AuthSuccess.jsx`
```javascript
// Handles OAuth callback
const token = searchParams.get('token');
apiHelpers.setAuthToken(token);
login(userData, token);
navigate('/inbox');
```

**Routes**: `frontend/src/App.jsx`
```javascript
<Route path="/auth/success" element={<AuthSuccess />} />
```

---

## Authentication Method

### JWT-Only (NO Sessions, NO Cookies)

✅ JWT generated in backend
✅ JWT passed via URL query parameter to frontend
✅ Frontend stores JWT in localStorage
✅ Frontend includes JWT in Authorization header for API requests

❌ NO express-session
❌ NO cookie-parser for auth
❌ NO session storage

### Token Storage

**Backend**: Generates JWT with 7-day expiration
```javascript
const jwtToken = jwt.sign(
  { userId, email, googleId },
  JWT_SECRET,
  { expiresIn: '7d' }
);
```

**Frontend**: Stores in localStorage
```javascript
localStorage.setItem('smartmail_token', token);
```

**API Requests**: Includes in Authorization header
```javascript
headers: {
  'Authorization': `Bearer ${token}`
}
```

---

## Common Issues & Solutions

### Issue: "404 Not Found" when clicking login

**Cause**: Frontend redirecting to frontend domain instead of backend

**Solution**: 
- Verify `loginWithGoogle()` uses full backend URL
- Check browser network tab for redirect URL
- Should be: `https://smartmail-w4ff.onrender.com/api/auth/google`

### Issue: "redirect_uri_mismatch" error

**Cause**: Google Cloud Console redirect URI doesn't match backend callback URL

**Solution**:
1. Go to Google Cloud Console
2. Add exact URL: `https://smartmail-w4ff.onrender.com/api/auth/google/callback`
3. Save and wait 5 minutes for Google to propagate

### Issue: Backend redirects but frontend doesn't receive token

**Cause**: `FRONTEND_URL` environment variable not set in Render

**Solution**:
1. Go to Render Dashboard → Backend Service
2. Environment tab
3. Add: `FRONTEND_URL=https://smartmail-frontend-pcuw.onrender.com`
4. Service will auto-restart

### Issue: Token received but user not authenticated

**Cause**: JWT_SECRET mismatch or token verification failed

**Solution**:
1. Check backend logs for JWT errors
2. Verify `JWT_SECRET` is set in Render environment variables
3. Check `/api/auth/check` endpoint with token

---

## Testing Checklist

### Local Development
- [ ] Backend running on `http://localhost:3001`
- [ ] Frontend running on `http://localhost:5173`
- [ ] Google OAuth redirect URI includes `http://localhost:3001/api/auth/google/callback`
- [ ] Click login → Redirects to Google → Returns to `/auth/success` → Redirects to `/inbox`

### Production (Render)
- [ ] Backend deployed and responding at `/api/auth/status`
- [ ] Frontend deployed and loading correctly
- [ ] `FRONTEND_URL` set in backend environment variables
- [ ] Google Cloud Console has both Render URLs configured
- [ ] Click login → Redirects to Google → Returns to `/auth/success` → Redirects to `/inbox`
- [ ] Hard refresh (Ctrl+Shift+R) to clear cache before testing

---

## Deployment Commands

### Push Changes to GitHub (Auto-deploy to Render)
```powershell
cd d:\smartmail
git add .
git commit -m "Fix: OAuth with JWT-only flow"
git push origin main
```

### Manual Deploy in Render
1. Go to Render Dashboard
2. Select service (backend or frontend)
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait for "Your site is live 🎉"

### Monitor Logs
```
Render Dashboard → Service → Logs tab
Watch for OAuth-related console.log messages
```

---

## URLs Reference

**Backend**: https://smartmail-w4ff.onrender.com
**Frontend**: https://smartmail-frontend-pcuw.onrender.com
**Repository**: https://github.com/HarshLotekar/smartmail

**OAuth Start**: https://smartmail-w4ff.onrender.com/api/auth/google
**OAuth Callback**: https://smartmail-w4ff.onrender.com/api/auth/google/callback
**Frontend Success**: https://smartmail-frontend-pcuw.onrender.com/auth/success

---

## Security Notes

1. **Never commit secrets**: Keep `.env` files in `.gitignore`
2. **Use strong JWT_SECRET**: Generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
3. **HTTPS only in production**: Render provides free SSL
4. **Token expiration**: JWT expires in 7 days, refresh tokens handled by backend
5. **CORS configuration**: Backend allows frontend origin via `FRONTEND_URL`

---

Last Updated: January 19, 2026
