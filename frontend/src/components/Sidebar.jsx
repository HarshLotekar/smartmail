import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Mail, 
  Inbox, 
  Send, 
  Archive, 
  Trash2, 
  Settings, 
  LogOut,
  User,
  ChevronDown,
  ChevronRight,
  Edit3,
  BarChart3,
  Sparkles,
  Brain
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { mailAPI } from '../services/api'
import { useUIStore } from '../store/uiStore'
import ComposeModal from './ComposeModal'

/**
 * Sidebar Navigation Component
 * Provides navigation links and user menu
 */
const Sidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { refreshCounter } = useUIStore()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [counts, setCounts] = useState({
    inbox: 0,
    starred: 0,
    unread: 0,
    decisions: 0
  })

  // Fetch email counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await mailAPI.getEmails({ page: 1, limit: 500 })
        const emails = response.data?.messages || []
        
        // Fetch decision count
        let decisionCount = 0
        try {
          const decisionsResponse = await mailAPI.getPendingDecisions()
          decisionCount = decisionsResponse.data?.count || 0
        } catch (err) {
          console.error('Failed to fetch decision count:', err)
        }
        
        setCounts({
          inbox: emails.length,
          starred: emails.filter(e => e.is_starred).length,
          unread: emails.filter(e => !e.is_read).length,
          decisions: decisionCount
        })
      } catch (err) {
        console.error('Failed to fetch email counts:', err)
      }
    }
    
    fetchCounts()
  }, [refreshCounter]) // Refresh when store counter changes

  const navigationItems = [
    {
      icon: Inbox,
      label: 'Inbox',
      path: '/inbox',
      count: counts.inbox,
      active: location.pathname === '/inbox'
    },
    {
      icon: Brain,
      label: 'Decision Inbox',
      path: '/decisions',
      count: counts.decisions,
      active: location.pathname === '/decisions',
      highlight: counts.decisions > 0
    },
    {
      icon: Send,
      label: 'Sent',
      path: '/sent',
      count: 0,
      active: location.pathname === '/sent'
    },
    {
      icon: Archive,
      label: 'Archive',
      path: '/archive',
      count: 0,
      active: location.pathname === '/archive'
    },
    {
      icon: Trash2,
      label: 'Trash',
      path: '/trash',
      count: 0,
      active: location.pathname === '/trash'
    },
    {
      icon: BarChart3,
      label: 'Inbox Insights',
      path: '/analytics',
      active: location.pathname === '/analytics'
    },
    {
      icon: Sparkles,
      label: 'Smart Cleanup',
      path: '/cleanup',
      active: location.pathname === '/cleanup'
    }
  ]

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleNavigation = (path) => {
    // Clear all filters when navigating to Inbox
    if (path === '/inbox') {
      useUIStore.setState({ 
        searchQuery: '', 
        selectedFilter: null, 
        labelFilter: '' 
      })
    }
    
    // Clear filters when navigating to Decision Inbox
    if (path === '/decisions') {
      useUIStore.setState({ 
        searchQuery: '', 
        selectedFilter: null, 
        labelFilter: '' 
      })
    }
    
    navigate(path)
  }

  return (
    <div
      className={`flex flex-col transition-all duration-200 ${isCollapsed ? 'w-16' : 'w-64'} border-r border-dark-border bg-dark-surface`}
    >
      {/* Header */}
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-semibold text-dark-text-primary">SmartMail</h1>
                <p className="text-xs text-dark-text-secondary">AI-Powered</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <ChevronDown className="w-4 h-4 text-text-secondary transform -rotate-90" />
            </button>
          )}
        </div>
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="mt-2 p-1 hover:bg-white/10 rounded w-full flex justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Compose Button */}
        <button
          onClick={() => setComposeOpen(true)}
          className="w-full btn-primary px-4 py-2.5 mb-6 flex items-center justify-center gap-2 transition-all"
        >
          <Edit3 className="w-4 h-4" />
          {!isCollapsed && <span className="font-medium">Compose</span>}
        </button>

        {/* Main Navigation */}
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded text-left transition-all ${
                  item.active
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-dark-text-secondary hover:bg-dark-bg hover:text-dark-text-primary'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* User Menu */}
      <div className="border-t border-card-border p-4">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left hover:bg-white/10 transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? user?.name : ''}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-full flex items-center justify-center flex-shrink-0 shadow-plum-glow">
              {user?.avatar_url ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary truncate">{user?.name}</p>
                  <p className="text-sm text-text-muted truncate">{user?.email}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${
                  showUserMenu ? 'transform rotate-180' : ''
                }`} />
              </>
            )}
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && !isCollapsed && (
            <div className="absolute bottom-full left-0 right-0 mb-2 glass-card border border-card-border rounded-lg shadow-2xl py-2">
              <button
                onClick={() => {
                  navigate('/settings')
                  setShowUserMenu(false)
                }}
                className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-white/10 transition-colors text-text-secondary hover:text-text-primary"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Settings</span>
              </button>
              <div className="border-t border-card-border my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-white/10 transition-colors text-red-400 hover:text-red-300"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} />
    </div>
  )
}

export default Sidebar