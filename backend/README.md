# SmartMail Backend

AI-powered email organizer backend built with Node.js, Express, and SQLite.

## Features

- 🔐 **Google OAuth2 Authentication** - Secure Gmail integration
- 📧 **Gmail API Integration** - Sync and manage emails 
- 🤖 **AI-Powered Analysis** - Email categorization, summarization, and reply generation
- 🏷️ **Smart Labels** - AI-suggested email organization
- 📊 **Analytics** - Email statistics and insights
- 🔒 **Security** - Rate limiting, encryption, and secure headers

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: SQLite with sqlite3
- **Authentication**: Google OAuth2 + JWT
- **AI Integration**: Ollama (local) or Google Gemini (cloud)
- **Security**: Helmet, CORS, Rate limiting

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
```

Required environment variables:
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console  
- `JWT_SECRET` - Random secure string
- `AI_PROVIDER` - 'ollama' or 'gemini'

### 3. Initialize Database

```bash
npm run init-db
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Gmail API
4. Create OAuth2 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3001/api/auth/callback` (development)
   - Your production callback URL
6. Add your credentials to `.env`

## AI Provider Setup

### Option 1: Ollama (Local AI)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama2

# Start Ollama server
ollama serve
```

Set in `.env`:
```
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama2
```

### Option 2: Google Gemini (Cloud AI)

1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Set in `.env`:
```
AI_PROVIDER=gemini
GEMINI_API_KEY=your-api-key
```

## API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate OAuth flow
- `GET /api/auth/callback` - OAuth callback
- `POST /api/auth/refresh` - Refresh tokens
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - Logout user

### Mail Management  
- `POST /api/mail/sync` - Sync Gmail messages
- `GET /api/mail/messages` - Get messages with filters
- `GET /api/mail/messages/:id` - Get specific message
- `PUT /api/mail/messages/:id/read` - Mark as read/unread
- `PUT /api/mail/messages/:id/star` - Toggle star
- `POST /api/mail/send` - Send email

### AI Operations
- `POST /api/ai/analyze/:messageId` - Analyze email
- `POST /api/ai/reply/:messageId` - Generate reply
- `POST /api/ai/triage` - Smart email triage
- `GET /api/ai/status` - AI service status

### User Management
- `GET /api/user/profile` - User profile
- `GET /api/user/labels` - User labels
- `POST /api/user/labels` - Create label
- `PUT /api/user/preferences` - Update preferences

## Scripts

```bash
npm start          # Production server
npm run dev        # Development server with nodemon
npm run init-db    # Initialize database
npm test           # Run tests
```

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route handlers
│   ├── middleware/      # Custom middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Helper functions
│   └── index.js        # Server entry point
├── database/
│   ├── schema.sql      # Database schema
│   ├── seed.sql        # Initial data
│   └── init.js         # Database initialization
├── package.json
└── .env.example
```

## Security

- Rate limiting (100 requests/15min in production)
- CORS configuration
- Helmet security headers
- JWT authentication
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## Deployment

### Docker (Recommended)

```bash
# Build image
docker build -t smartmail-backend .

# Run container
docker run -p 3001:3001 --env-file .env smartmail-backend
```

### Traditional Deployment

1. Set `NODE_ENV=production`
2. Configure production database
3. Set up reverse proxy (nginx/Apache)
4. Configure SSL certificates
5. Set up process manager (PM2)

## Development

### Database Migrations

The app uses SQLite with automatic schema creation. For schema changes:

1. Update `database/schema.sql`
2. Run `npm run init-db`

### Adding New Routes

1. Create controller in `src/controllers/`
2. Add routes in `src/routes/`
3. Register routes in `src/index.js`

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Troubleshooting

### Common Issues

1. **Database locked**: Stop all instances and retry
2. **Gmail API errors**: Check OAuth credentials and scopes
3. **AI not working**: Verify Ollama is running or Gemini API key
4. **CORS errors**: Update FRONTEND_URL in .env

### Logs

Development logs are detailed. Production uses combined format.

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit pull request

## License

MIT License - see LICENSE file for details