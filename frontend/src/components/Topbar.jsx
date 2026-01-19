import React, { useState, useEffect, useRef } from 'react'
import { Search, RefreshCw, AlertCircle } from 'lucide-react'
import { useUIStore } from '../store/uiStore'
import { mailAPI } from '../services/api'

const categories = ['Work', 'Personal', 'Promotions', 'Social', 'Updates', 'Security', 'Spam', 'Education', 'Newsletter', 'Events']

export default function Topbar() {
  const {
    searchQuery,
    selectedFilter,
    labelFilter,
    setSearchQuery,
    setSelectedFilter,
    setLabelFilter,
    triggerRefresh,
    syncing,
    lastSyncTime,
    syncError,
    setLastSyncTime,
    setSyncError
  } = useUIStore()

  const [localLoading, setLocalLoading] = useState(false)
  const [timeAgo, setTimeAgo] = useState('')
  const lastSyncRef = useRef(0)
  const autoSyncIntervalRef = useRef(null)

  // Calculate time ago string
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return ''
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    
    if (seconds < 10) return 'just now'
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  // Update time ago display every second
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastSyncTime) {
        setTimeAgo(getTimeAgo(lastSyncTime))
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [lastSyncTime])

  // Perform sync (manual or auto)
  const performSync = async (isAutoSync = false) => {
    // Debounce: prevent syncing if last sync was less than 5 seconds ago
    const now = Date.now()
    if (now - lastSyncRef.current < 5000 && !isAutoSync) {
      console.log('Sync debounced - too soon')
      return
    }
    lastSyncRef.current = now

    try {
      setLocalLoading(true)
      useUIStore.getState().setSyncing(true)
      useUIStore.getState().setSyncError(null)
      
      // Fetch new emails from Gmail
      await mailAPI.syncEmails({ maxResults: 50 }) // Incremental sync for speed
      
      // Update last sync time
      useUIStore.getState().setLastSyncTime(Date.now())
      
      // Trigger inbox refresh
      triggerRefresh()
    } catch (e) {
      console.error('Sync failed:', e)
      if (!isAutoSync) {
        // Only show error for manual sync
        useUIStore.getState().setSyncError(e.message || 'Sync failed')
        
        // Auto-clear error after 5 seconds
        setTimeout(() => {
          useUIStore.getState().setSyncError(null)
        }, 5000)
      }
    } finally {
      setLocalLoading(false)
      useUIStore.getState().setSyncing(false)
    }
  }

  // Manual sync handler
  const doSync = () => {
    performSync(false)
  }

  // Setup auto-sync every 45 seconds
  useEffect(() => {
    // Initial sync on mount
    performSync(true)

    // Setup interval for background auto-sync
    autoSyncIntervalRef.current = setInterval(() => {
      console.log('Auto-syncing in background...')
      performSync(true)
    }, 45000) // 45 seconds

    return () => {
      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current)
      }
    }
  }, [])

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'starred', label: 'Starred' },
    { value: 'important', label: 'Important' }
  ]

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-dark-border bg-dark-surface">
        <div className="px-6 py-3 flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-text-secondary w-4 h-4" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mail"
              className="input-field w-full pl-9 pr-3 py-2 text-sm"
            />
          </div>

          {/* Filters */}
          <div className="hidden md:flex items-center gap-2">
            {filterOptions.map((f) => (
              <button
                key={f.value}
                onClick={() => setSelectedFilter(f.value)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  selectedFilter === f.value
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'text-dark-text-secondary hover:bg-dark-bg hover:text-dark-text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Label dropdown */}
          <div className="hidden md:flex items-center gap-2">
            <label className="text-xs text-text-muted whitespace-nowrap">Label</label>
            <select
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
              className="input-field text-sm rounded px-3 py-1.5 min-w-[140px] cursor-pointer"
            >
              <option value="">All Labels</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Sync Button with Time Indicator */}
          <div className="ml-auto flex items-center gap-3">
            {/* Last sync time - subtle status indicator */}
            {lastSyncTime && (
              <span className="hidden md:block text-xs text-dark-text-secondary/70 whitespace-nowrap">
                Updated {timeAgo}
              </span>
            )}
            
            <button
              onClick={doSync}
              disabled={localLoading || syncing}
              className="btn-secondary inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              title={lastSyncTime ? `Last synced ${timeAgo}` : 'Sync emails from Gmail'}
            >
              <RefreshCw className={`w-4 h-4 transition-transform ${localLoading || syncing ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline font-medium">
                {localLoading || syncing ? 'Syncing…' : 'Sync'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Toast - appears at top center */}
      {syncError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-center gap-2 shadow-lg backdrop-blur-sm">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-400">Sync failed. Retrying in background...</span>
            <button
              onClick={() => setSyncError(null)}
              className="ml-2 text-red-400 hover:text-red-300 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  )
}
