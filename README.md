# SmartMail - AI-Powered Email Organizer

A full-stack application that combines Gmail integration with AI-powered email organization and smart reply suggestions.

## 🚀 Features

- **Gmail Integration** - Secure OAuth2 authentication with Gmail API
- **AI-Powered Analysis** - Automatic email categorization, summarization, and sentiment analysis
- **Smart Replies** - AI-generated email responses with customizable tones
- **Intelligent Organization** - Automatic email labeling and priority scoring
- **Modern UI** - Clean, responsive React interface with TailwindCSS
- **Local & Cloud AI** - Support for both Ollama (local) and Google Gemini (cloud)

## 🏗️ Architecture

```
smartmail/
├── backend/          # Node.js + Express API
│   ├── src/
│   │   ├── config/   # Database, Gmail, AI configuration
│   │   ├── controllers/ # Route handlers
│   │   ├── models/   # Database models
│   │   ├── services/ # Gmail & AI services
│   │   └── routes/   # API endpoints
│   └── database/     # SQLite schema & migrations
│
├── frontend/         # React + Vite application
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── pages/    # Application pages
│   │   ├── hooks/    # Custom React hooks
│   │   └── services/ # API integration
│   └── public/       # Static assets
│
└── .github/          # Project documentation
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: SQLite
- **Authentication**: Google OAuth2 + JWT
- **AI**: Ollama (local) or Google Gemini (cloud)

### Frontend  
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: React hooks + Context
- **HTTP Client**: Axios

## ⚡ Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Google Cloud Console account (for Gmail API)
- Ollama (for local AI) OR Google AI Studio account (for cloud AI)

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd smartmail

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Backend Setup

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env with your credentials (see configuration section)
nano .env

# Initialize database
npm run init-db

# Start backend development server
npm run dev
```

Backend will run at `http://localhost:3001`

### 3. Frontend Setup

```bash
cd frontend

# Copy environment template
cp .env.example .env

# Edit with your backend URL (usually no changes needed for development)

# Start frontend development server  
npm run dev
```

Frontend will run at `http://localhost:3000`

## ⚙️ Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Gmail API
4. Create OAuth2 credentials (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:3001/api/auth/callback` (development)
6. Note your Client ID and Client Secret

### AI Provider Setup

#### Option 1: Ollama (Local AI - Recommended for development)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama2

# Start Ollama server  
ollama serve
```

#### Option 2: Google Gemini (Cloud AI)

1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to backend `.env` file

### Environment Variables

**Backend** (`backend/.env`):
```bash
# Server
NODE_ENV=development
PORT=3001

# Google OAuth2
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/callback

# JWT
JWT_SECRET=your-super-secret-jwt-key

# AI Provider ('ollama' or 'gemini')
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama2
# OR for Gemini:
# GEMINI_API_KEY=your-gemini-api-key
```

**Frontend** (`frontend/.env`):
```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

## 🚦 Usage

1. **Start both servers** (backend on :3001, frontend on :3000)
2. **Open** `http://localhost:3000` in your browser
3. **Sign in** with your Google account
4. **Sync emails** from Gmail
5. **View AI analysis** - categorization, summaries, priorities
6. **Generate replies** using AI with different tones
7. **Organize emails** with smart labels

## 📚 API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate OAuth flow
- `GET /api/auth/callback` - OAuth callback  
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile

### Mail Operations
- `POST /api/mail/sync` - Sync Gmail messages
- `GET /api/mail/messages` - Get messages with filtering
- `PUT /api/mail/messages/:id/read` - Mark as read/unread
- `POST /api/mail/send` - Send email

### AI Features
- `POST /api/ai/analyze/:messageId` - Analyze email with AI
- `POST /api/ai/reply/:messageId` - Generate AI reply
- `POST /api/ai/triage` - Smart email triage
- `GET /api/ai/status` - Check AI service status

## 🧪 Development

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests  
cd frontend
npm test
```

### Database Management

```bash
# Reinitialize database
cd backend
npm run init-db

# Database location: backend/database/smartmail.db
```

### Adding Features

1. **Backend**: Add routes → controllers → services → models
2. **Frontend**: Add components → pages → hooks → services

## 🐳 Deployment

### Using Docker

```bash
# Build and run with docker-compose
docker-compose up --build

# Or individual containers
cd backend && docker build -t smartmail-backend .
cd frontend && docker build -t smartmail-frontend .
```

### Manual Deployment

1. **Backend**: Deploy to VPS/cloud with Node.js support
2. **Frontend**: Build and deploy to CDN/static hosting
3. **Database**: Use managed database or persistent volume
4. **Environment**: Set production environment variables
5. **SSL**: Configure HTTPS with reverse proxy

## 🔧 Troubleshooting

### Common Issues

- **"Database is locked"**: Stop all instances and restart
- **Gmail API errors**: Check OAuth credentials and enabled APIs
- **AI not responding**: Verify Ollama is running or Gemini API key is valid
- **CORS errors**: Check frontend URL in backend CORS configuration

### Debug Mode

```bash
# Backend with detailed logging
DEBUG=smartmail:* npm run dev

# Frontend with debug info
VITE_DEBUG=true npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gmail API for email integration
- Ollama for local AI capabilities
- Google Gemini for cloud AI features
- React and Express.js communities

---

**Made with ❤️ for better email management**