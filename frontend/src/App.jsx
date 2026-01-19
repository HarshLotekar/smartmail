
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import DashboardLayout from './components/DashboardLayout';
import Inbox from './pages/Inbox';
import DecisionInbox from './pages/DecisionInbox';
import Sent from './pages/Sent';
import Archive from './pages/Archive';
import Trash from './pages/Trash';
import MessageView from './pages/MessageView';
import Analytics from './pages/Analytics';
import SmartCleanup from './pages/SmartCleanup';
import Settings from './pages/Settings';
import Home from './pages/Home';
import TrustScreen from './pages/TrustScreen';
import EmailContentDemo from './pages/EmailContentDemo';

// Initialize theme on app load
const initializeTheme = () => {
  const saved = JSON.parse(localStorage.getItem('smartmail_settings') || '{}')
  const theme = saved.theme || 'dark' // Default to dark
  
  // Remove existing classes
  document.body.classList.remove('light', 'dark')
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.body.classList.add(prefersDark ? 'dark' : 'light')
  } else {
    document.body.classList.add(theme)
  }
}

// PrivateRoute component for protecting routes
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-text-primary">Authenticating...</div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children;
}

/**
 * Main App Component with Authentication
 */

function AppContent() {
  // Initialize theme when app loads
  useEffect(() => {
    initializeTheme()
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/trust" element={<TrustScreen />} />
      <Route
        path="/inbox"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <Inbox />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/decisions"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <DecisionInbox />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/sent"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <Sent />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/archive"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <Archive />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/trash"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <Trash />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/message/:id"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <MessageView />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <Analytics />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/cleanup"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <SmartCleanup />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <DashboardLayout>
              <Settings />
            </DashboardLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/demo/email-content"
        element={
          <PrivateRoute>
            <EmailContentDemo />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/**
 * App wrapper with providers
 */

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App