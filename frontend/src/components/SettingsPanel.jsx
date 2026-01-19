import React, { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Bot, User, Moon, Sun, Monitor, Sparkles } from 'lucide-react'

export default function SettingsPanel() {
  const { user, logout } = useAuth()
  const [theme, setTheme] = useState('system')
  const [saving, setSaving] = useState(false)
  const [cleanupEnabled, setCleanupEnabled] = useState(true)
  const [cleanupThreshold, setCleanupThreshold] = useState(45)

  // Apply theme to document
  const applyTheme = (themeMode) => {
    // Remove existing theme classes
    document.body.classList.remove('light', 'dark')
    
    if (themeMode === 'system') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.body.classList.add(prefersDark ? 'dark' : 'light')
    } else {
      // Apply selected theme
      document.body.classList.add(themeMode)
    }
  }

  // Load and apply theme on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('smartmail_settings') || '{}')
    const savedTheme = saved.theme || 'dark' // Default to dark
    setTheme(savedTheme)
    applyTheme(savedTheme)
    
    // Load Smart Cleanup settings
    if (saved.smartCleanup) {
      setCleanupEnabled(saved.smartCleanup.enabled ?? true)
      setCleanupThreshold(saved.smartCleanup.inactivityThreshold ?? 45)
    }

    // Listen for system theme changes when in system mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = (e) => {
      const currentSettings = JSON.parse(localStorage.getItem('smartmail_settings') || '{}')
      if (currentSettings.theme === 'system') {
        document.body.classList.remove('light', 'dark')
        document.body.classList.add(e.matches ? 'dark' : 'light')
      }
    }
    
    mediaQuery.addEventListener('change', handleSystemThemeChange)
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
  }, [])

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme)
    const saved = JSON.parse(localStorage.getItem('smartmail_settings') || '{}')
    const prefs = { ...saved, theme: newTheme }
    localStorage.setItem('smartmail_settings', JSON.stringify(prefs))
    applyTheme(newTheme)
  }
  
  const handleCleanupToggle = (enabled) => {
    setCleanupEnabled(enabled)
    const saved = JSON.parse(localStorage.getItem('smartmail_settings') || '{}')
    const prefs = {
      ...saved,
      smartCleanup: {
        enabled,
        inactivityThreshold: cleanupThreshold
      }
    }
    localStorage.setItem('smartmail_settings', JSON.stringify(prefs))
  }
  
  const handleThresholdChange = (threshold) => {
    setCleanupThreshold(threshold)
    const saved = JSON.parse(localStorage.getItem('smartmail_settings') || '{}')
    const prefs = {
      ...saved,
      smartCleanup: {
        enabled: cleanupEnabled,
        inactivityThreshold: threshold
      }
    }
    localStorage.setItem('smartmail_settings', JSON.stringify(prefs))
  }

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect your Google account?')) {
      await logout()
      window.location.href = '/'
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Theme Section */}
      <div className="bg-dark-surface p-6 rounded-lg border border-dark-border">
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4 flex items-center gap-2">
          {theme === 'light' ? <Sun className="w-5 h-5" /> : 
           theme === 'dark' ? <Moon className="w-5 h-5" /> : 
           <Monitor className="w-5 h-5" />}
          Appearance
        </h3>
        <div className="flex gap-3">
          <button
            onClick={() => handleThemeChange('light')}
            className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
              theme === 'light'
                ? 'bg-accent text-white border-accent'
                : 'bg-dark-bg border-dark-border text-dark-text-secondary hover:border-accent/50'
            }`}
          >
            <Sun className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">Light</span>
          </button>
          <button
            onClick={() => handleThemeChange('dark')}
            className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
              theme === 'dark'
                ? 'bg-accent text-white border-accent'
                : 'bg-dark-bg border-dark-border text-dark-text-secondary hover:border-accent/50'
            }`}
          >
            <Moon className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">Dark</span>
          </button>
          <button
            onClick={() => handleThemeChange('system')}
            className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
              theme === 'system'
                ? 'bg-accent text-white border-accent'
                : 'bg-dark-bg border-dark-border text-dark-text-secondary hover:border-accent/50'
            }`}
          >
            <Monitor className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">System</span>
          </button>
        </div>
      </div>

      {/* Connected Account Section */}
      <div className="bg-dark-surface p-6 rounded-lg border border-dark-border">
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Connected Account
        </h3>
        <div className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border">
          <div className="flex items-center gap-3">
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.name}
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <p className="font-medium text-dark-text-primary">{user?.name}</p>
              <p className="text-sm text-dark-text-secondary">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 text-sm text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
      
      {/* Smart Cleanup Preferences */}
      <div className="bg-dark-surface p-6 rounded-lg border border-dark-border">
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#8B5CF6]" />
          Smart Cleanup Preferences
        </h3>
        
        {/* Important Notice */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-300 leading-relaxed">
            <strong>SmartMail never deletes or unsubscribes automatically.</strong>
            <br />
            Smart Cleanup only provides suggestions. You always review and choose what to do with each sender.
          </p>
        </div>
        
        {/* Enable/Disable Toggle */}
        <div className="mb-6">
          <label className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border cursor-pointer hover:border-[#8B5CF6]/30 transition-colors">
            <div>
              <p className="font-medium text-dark-text-primary">Enable Smart Cleanup suggestions</p>
              <p className="text-sm text-dark-text-secondary mt-1">
                Get suggestions for cleaning inactive promotional emails
              </p>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault()
                handleCleanupToggle(!cleanupEnabled)
              }}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                cleanupEnabled ? 'bg-[#8B5CF6]' : 'bg-dark-border'
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  cleanupEnabled ? 'transform translate-x-6' : ''
                }`}
              />
            </button>
          </label>
        </div>
        
        {/* Inactivity Threshold */}
        <div>
          <label className="block mb-3">
            <span className="font-medium text-dark-text-primary">Inactivity threshold</span>
            <p className="text-sm text-dark-text-secondary mt-1">
              Show emails unopened for this many days
            </p>
          </label>
          <div className="flex gap-3">
            {[30, 45, 60].map(days => (
              <button
                key={days}
                onClick={() => handleThresholdChange(days)}
                disabled={!cleanupEnabled}
                className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                  cleanupThreshold === days
                    ? 'bg-[#8B5CF6] text-white border-[#8B5CF6]'
                    : 'bg-dark-bg border-dark-border text-dark-text-secondary hover:border-[#8B5CF6]/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {days} days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Information Section */}
      <div className="bg-dark-surface p-6 rounded-lg border border-dark-border">
        <h3 className="text-lg font-semibold text-dark-text-primary mb-4 flex items-center gap-2">
          <Bot className="w-5 h-5" />
          AI Features
        </h3>
        <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
          <p className="text-dark-text-secondary text-sm leading-relaxed">
            SmartMail uses AI automatically for email summaries, smart prioritization, 
            and analytics insights. All processing happens securely to help you manage 
            your inbox more efficiently.
          </p>
        </div>
      </div>
    </div>
  )
}
