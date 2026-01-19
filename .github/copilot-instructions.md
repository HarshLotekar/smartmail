# SmartMail - AI-Powered Email Organizer

## Project Overview
SmartMail is a full-stack application that combines Gmail integration with AI-powered email organization and reply suggestions.

## Architecture
- **Backend**: Node.js + Express + SQLite
- **Frontend**: React + Vite + TailwindCSS  
- **AI Integration**: Ollama (local) or Gemini API (cloud)
- **Authentication**: Google OAuth2

## Development Guidelines
- Use ES Modules throughout the project
- Implement proper error handling and logging
- Keep AI integration modular for easy provider switching
- Follow RESTful API conventions
- Use modern React patterns (hooks, functional components)

## Key Features
- Gmail OAuth integration
- AI-powered email categorization
- Smart reply suggestions
- Clean, responsive UI
- Local-first development with cloud deployment options