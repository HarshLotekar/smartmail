# SmartMail Environment Setup Guide

## 🚀 Quick Setup

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file** with your actual values:
   ```bash
   nano .env  # or your preferred editor
   ```

## 🔧 Required Configuration

### 1. Google OAuth2 Setup

**Step 1: Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API and Google+ API

**Step 2: Create OAuth2 Credentials**
1. Go to "Credentials" in the API & Services section
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Select "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:3001/api/auth/callback` (development)
   - `https://yourdomain.com/api/auth/callback` (production)

**Step 3: Update .env file**
```bash
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnop123456789
```

### 2. JWT Secret Generation

Generate a strong JWT secret (32+ characters):

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using online generator
# https://generate-secret.vercel.app/32
```

Update your `.env`:
```bash
JWT_SECRET=your-generated-32-character-secret-here
```

### 3. AI Service Configuration

**Option A: Ollama (Local AI)**
1. Install Ollama: https://ollama.ai/
2. Pull a model: `ollama pull llama2`
3. Keep default settings:
   ```bash
   AI_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama2
   ```

**Option B: Google Gemini (Cloud AI)**
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Update `.env`:
   ```bash
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

## 🔒 Security Configuration

### Encryption Key
Generate a 32-character encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Session Secret
Generate a session secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📧 Email Sync Settings

Adjust based on your needs:
```bash
# Sync 50 emails per request (recommended for development)
DEFAULT_SYNC_LIMIT=50

# Maximum 500 emails per request (for large inboxes)
MAX_SYNC_LIMIT=500

# Sync every 5 minutes (300 seconds)
DEFAULT_SYNC_FREQUENCY=300
```

## 🌐 CORS Configuration

For development:
```bash
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

For production:
```bash
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

## 🏗️ Development vs Production

### Development Settings
```bash
NODE_ENV=development
DEV_MODE=true
SKIP_AUTH=false
DETAILED_ERRORS=true
LOG_LEVEL=info
COOKIE_SECURE=false
```

### Production Settings
```bash
NODE_ENV=production
DEV_MODE=false
SKIP_AUTH=false
DETAILED_ERRORS=false
LOG_LEVEL=error
COOKIE_SECURE=true
FORCE_HTTPS=true
TRUST_PROXY=true
```

## 🔍 Validation

After configuring, test your setup:

```bash
# Test configuration
npm run validate-db

# Start development server
npm run dev

# Check logs for any configuration errors
```

## 📝 Sample .env File

```bash
# Server
PORT=3001
NODE_ENV=development

# Google OAuth2
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/callback

# JWT
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
JWT_EXPIRES_IN=7d

# AI (Ollama)
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# CORS
FRONTEND_URL=http://localhost:5173

# Security
ENCRYPTION_KEY=f1e2d3c4b5a6978869504132435465768798a0b1c2d3e4f5g6h7
SESSION_SECRET=your-session-secret-here

# Development
DEV_MODE=true
LOG_LEVEL=info
DETAILED_ERRORS=true
```

## ⚠️ Important Notes

1. **Never commit `.env` file to version control**
2. **Keep `.env.example` updated** for team members
3. **Use strong, unique secrets** for each environment
4. **Rotate secrets regularly** in production
5. **Use environment-specific values** for different deployments

## 🆘 Troubleshooting

### Common Issues

**Google OAuth Error:**
- Check redirect URI matches exactly
- Verify APIs are enabled
- Ensure credentials are for "Web application" type

**AI Service Connection Error:**
- For Ollama: Check if service is running (`ollama serve`)
- For Gemini: Verify API key is valid and has quota

**Database Connection Error:**
- Check database file permissions
- Ensure directory exists: `mkdir -p database`

**CORS Errors:**
- Verify FRONTEND_URL matches your React app URL
- Check ALLOWED_ORIGINS includes all necessary domains

Need help? Check the logs or create an issue in the repository.