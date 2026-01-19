# SmartMail Frontend

A modern React frontend for the SmartMail AI-powered email organizer.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- SmartMail backend running on `http://localhost:3001`

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 🛠️ Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **Lucide React** - Modern icon library
- **date-fns** - Date utilities

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Sidebar.jsx      # Navigation sidebar
│   │   ├── InboxItem.jsx    # Email list item
│   │   ├── MessageCard.jsx  # Full email display
│   │   └── AIReplyBox.jsx   # AI reply composer
│   ├── pages/               # Page components
│   │   ├── Login.jsx        # Authentication page
│   │   ├── Inbox.jsx        # Email list page
│   │   └── MessageView.jsx  # Individual email page
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.js       # Authentication state
│   │   ├── useFetch.js      # API data fetching
│   │   └── useHotkeys.js    # Keyboard shortcuts
│   ├── services/            # External services
│   │   └── api.js           # Backend API client
│   ├── App.jsx              # Main app component
│   ├── main.jsx             # React entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── package.json             # Dependencies and scripts
├── vite.config.js           # Vite configuration
├── tailwind.config.js       # Tailwind configuration
└── postcss.config.js        # PostCSS configuration
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### API Integration

The frontend connects to the SmartMail backend API:

- **Base URL**: `http://localhost:3001/api`
- **Authentication**: Google OAuth2 + JWT
- **Endpoints**:
  - `/auth/*` - Authentication
  - `/user/*` - User management
  - `/mail/*` - Email operations
  - `/ai/*` - AI features

### Features

#### 📧 Email Management
- Gmail integration via backend
- Email list with search and filtering
- Full email display with attachments
- Mark as read/unread, star, delete
- Bulk operations

#### 🤖 AI Features
- AI-powered email analysis
- Smart reply generation
- Customizable tone and length
- AI confidence scoring

#### ⌨️ Keyboard Shortcuts
- `Ctrl+1` - Go to Inbox
- `R` - Reply to email
- `D` - Delete email
- `S` - Star email
- `Ctrl+K` - Search
- `Ctrl+Shift+A` - AI analysis
- `Arrow keys` - Navigate emails

#### 🎨 UI/UX
- Responsive design
- Dark/light mode ready
- Accessible components
- Loading states
- Error handling

## 🔒 Authentication

The app uses Google OAuth2 for authentication:

1. User clicks "Continue with Google"
2. Redirects to backend OAuth endpoint
3. Backend handles Google OAuth flow
4. Returns JWT token and user data
5. Frontend stores token for API requests

## 📱 Responsive Design

The interface adapts to different screen sizes:

- **Desktop**: Full sidebar + main content
- **Tablet**: Collapsible sidebar
- **Mobile**: Hidden sidebar with menu toggle

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy Options

1. **Static Hosting** (Vercel, Netlify, GitHub Pages)
2. **Docker Container**
3. **Traditional Web Server** (Apache, Nginx)

### Environment Variables

Create a `.env` file for configuration:

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_TITLE=SmartMail
```

## 🔄 Backend Integration

Ensure the SmartMail backend is running:

```bash
cd ../backend
npm start
```

The frontend expects these backend endpoints:
- Health check: `GET /health`
- Authentication: `GET /api/auth/*`
- Emails: `GET /api/mail/*`
- AI features: `POST /api/ai/*`

## 🐛 Troubleshooting

### Common Issues

1. **CORS errors**: Check backend CORS configuration
2. **API not reachable**: Verify backend is running on port 3001
3. **Auth redirect issues**: Check Google OAuth callback URLs
4. **Build failures**: Clear `node_modules` and reinstall

### Debug Mode

Set `localStorage.debug = '*'` in browser console for detailed logging.

## 🤝 Contributing

1. Follow the existing code structure
2. Use TypeScript for new features (optional)
3. Add proper error handling
4. Include loading states
5. Test on multiple screen sizes

## 📄 License

MIT License - see LICENSE file for details.

---

Built with ❤️ by the SmartMail team