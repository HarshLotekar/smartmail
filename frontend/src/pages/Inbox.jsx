import React, { useState, useEffect } from 'react'
import ComposeModal from '../components/ComposeModal'
import { useNavigate } from 'react-router-dom'
import { Archive, Trash2, Plus } from 'lucide-react'
import api, { mailAPI } from '../services/api'
// Modern card view replaces legacy InboxItem list
import InboxCard from '../components/InboxCard'
import { useUIStore } from '../store/uiStore'

/**
 * Inbox Page Component
 * Displays list of emails with search and filtering
 */
const Inbox = () => {
  const navigate = useNavigate()
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { searchQuery, selectedFilter, labelFilter, refreshCounter } = useUIStore()
  const [selectedEmails, setSelectedEmails] = useState(new Set())
  const [composeOpen, setComposeOpen] = useState(false)
  const [unsubscribedEmails, setUnsubscribedEmails] = useState([])
  const [expandedSummaryId, setExpandedSummaryId] = useState(null)
  const [expandedReplyId, setExpandedReplyId] = useState(null)
  const [briefDismissed, setBriefDismissed] = useState(() => {
    const today = new Date().toDateString()
    const dismissed = localStorage.getItem('smartmail_brief_dismissed')
    return dismissed === today
  })
  const [showAllEmails, setShowAllEmails] = useState(true)
  const [sortBy, setSortBy] = useState('priority') // priority, date, unread

  // Fetch emails from backend
  const fetchEmails = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Fetching emails from /api/mail...')
      
      const response = await mailAPI.getEmails({ page: 1, limit: 500, sortBy: 'date', sortOrder: 'DESC' })
      
      console.log('Emails response:', response.data)
      
      // Handle API format
      const emails = response.data.messages || response.data.data || []
      console.log('Sample email structure:', emails[0])

      // Fetch decision data
      let decisionsMap = {}
      try {
        const decisionsResponse = await mailAPI.getPendingDecisions()
        const decisions = decisionsResponse.data?.decisions || []
        // Create a map of email_id to decision data
        decisionsMap = decisions.reduce((map, decision) => {
          map[decision.email_id] = {
            decision_required: decision.decision_required,
            decision_type: decision.decision_type,
            decision_reason: decision.reason
          }
          return map
        }, {})
      } catch (err) {
        console.error('Failed to fetch decisions:', err)
      }

      // Merge decision data with emails
      const emailsWithDecisions = emails.map(email => ({
        ...email,
        ...(decisionsMap[email.gmail_id] || {})
      }))

      setEmails(emailsWithDecisions)
      
      // NO AUTO-SYNC: Removed automatic syncing on page load
      // User must click "Sync" button to trigger sync
      
    } catch (err) {
      console.error('Failed to fetch emails:', err)
      setError(err.message || 'Failed to fetch emails')
    } finally {
      setLoading(false)
    }
  }

  // Load emails on component mount (NO AUTO-SYNC)
  useEffect(() => {
    fetchEmails()
    fetchUnsubscribes()
  }, [refreshCounter])

  // Fetch unsubscribed emails
  const fetchUnsubscribes = async () => {
    try {
      const response = await mailAPI.getUnsubscribes()
      const addresses = response.data.unsubscribes.map(u => u.email_address)
      setUnsubscribedEmails(addresses)
    } catch (error) {
      console.error('Failed to fetch unsubscribes:', error)
    }
  }

  const navigateEmail = (direction) => {
    const currentIndex = emails.findIndex(email => 
      selectedEmails.has(email.id) || email.id === parseInt(window.location.pathname.split('/').pop())
    )
    
    if (direction === 'next' && currentIndex < emails.length - 1) {
      navigate(`/message/${emails[currentIndex + 1].id}`)
    } else if (direction === 'prev' && currentIndex > 0) {
      navigate(`/message/${emails[currentIndex - 1].id}`)
    }
  }

  const handleEmailSelect = (emailId, selected) => {
    const newSelected = new Set(selectedEmails)
    if (selected) {
      newSelected.add(emailId)
    } else {
      newSelected.delete(emailId)
    }
    setSelectedEmails(newSelected)
  }

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedEmails(new Set(emails.map(email => email.id)))
    } else {
      setSelectedEmails(new Set())
    }
  }

  // Calculate priority score for an email (same logic as InboxCard)
  const calculatePriorityScore = (email) => {
    let score = 50 // baseline
    const snippet = (email.snippet || email.body_text || '').toLowerCase()
    const subject = (email.subject || '').toLowerCase()
    const sender = (email.from_email || '').toLowerCase()
    
    // Boost for action keywords
    if (/deadline|urgent|asap|important|rsvp/i.test(snippet) || /urgent|important/i.test(subject)) {
      score += 25
    }
    
    // Boost for direct questions
    if (/\?/.test(snippet)) score += 10
    
    // Boost for personal/work senders
    if (!/(notification|noreply|no-reply|updates@|news@)/i.test(sender)) {
      score += 10
    }
    
    // Reduce for newsletters/promotional
    if (/unsubscribe|newsletter|promotional/i.test(snippet)) {
      score -= 20
    }
    
    return Math.max(0, Math.min(100, score))
  }

  // Generate Daily AI Brief stats - data-driven and actionable
  const generateBriefStats = () => {
    if (!emails.length) return null
    
    const now = new Date()
    
    // High priority emails (score >= 75)
    const highPriority = emails.filter(e => calculatePriorityScore(e) >= 75).length
    
    // Emails older than 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const oldEmails7Days = emails.filter(e => {
      const emailDate = new Date(e.date || e.internalDate || 0)
      return emailDate < sevenDaysAgo
    }).length
    
    // Emails older than 14 days
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const oldEmails14Days = emails.filter(e => {
      const emailDate = new Date(e.date || e.internalDate || 0)
      return emailDate < fourteenDaysAgo
    }).length
    
    // Find oldest unread email
    const unreadEmails = emails.filter(e => !e.is_read)
    const oldestUnread = unreadEmails.length > 0
      ? unreadEmails.reduce((oldest, current) => {
          const oldestDate = new Date(oldest.date || oldest.internalDate || 0)
          const currentDate = new Date(current.date || current.internalDate || 0)
          return currentDate < oldestDate ? current : oldest
        })
      : null
    
    return {
      highPriority,
      oldEmails7Days,
      oldEmails14Days,
      oldestUnread,
      oldestUnreadDate: oldestUnread ? new Date(oldestUnread.date || oldestUnread.internalDate) : null
    }
  }

  const handleDismissBrief = () => {
    const today = new Date().toDateString()
    localStorage.setItem('smartmail_brief_dismissed', today)
    setBriefDismissed(true)
  }

  const handleBulkAction = async (action) => {
    if (selectedEmails.size === 0) return

    try {
      const selectedArray = Array.from(selectedEmails)
      
      switch (action) {
        case 'delete':
          if (!confirm(`Delete ${selectedArray.length} email(s)? This cannot be undone.`)) {
            return
          }
          await mailAPI.batchDelete(selectedArray)
          break
        case 'archive':
          await mailAPI.batchArchive(selectedArray)
          break
        case 'read':
          await mailAPI.batchMarkAsRead(selectedArray, true)
          break
        case 'unread':
          await mailAPI.batchMarkAsRead(selectedArray, false)
          break
        default:
          return
      }

      setSelectedEmails(new Set())
      fetchEmails() // Refresh the email list
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error)
      alert(`Failed to ${action} emails. Please try again.`)
    }
  }

  const handleSync = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('[SYNC] Starting incremental sync...')
      
      // Use new incremental sync API
      const syncResponse = await mailAPI.incrementalSync()
      console.log('[SYNC] Completed:', syncResponse.data)
      
      // Fetch updated emails
      await fetchEmails()
      
      // Clear any previous error on success
      setError(null)
      
    } catch (err) {
      console.error('[SYNC] Failed:', err)
      
      // Check for rate limit error (429)
      if (err.response?.status === 429) {
        const retryAfter = err.response?.data?.retryAfter
        const retryDate = retryAfter ? new Date(retryAfter) : null
        const now = new Date()
        const waitMinutes = retryDate ? Math.ceil((retryDate - now) / 60000) : 15
        
        setError(`⏱️ Gmail rate limit reached. Please wait ${waitMinutes} minutes before syncing again.`)
      } else if (err.code === 'ECONNABORTED') {
        setError('Sync is taking longer than expected.')
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to sync emails')
      }
    } finally {
      setLoading(false)
    }
  }

  // Helper to canonicalize category for comparison (title case)
  const canonicalCategory = (cat) => {
    if (!cat) return 'Other';
    // Remove extra spaces, lowercase, then capitalize first letter of each word
    return cat
      .toString()
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }
  // Apply client-side filters for now (server supports ai_category in queries too)
  const visibleEmails = emails.filter(e => {
    // Apply only explicit user-selected filters (no automatic filtering)
    
    // Existing filters
    if (selectedFilter === 'unread' && e.is_read) return false
    if (selectedFilter === 'starred' && !e.is_starred) return false
    if (selectedFilter === 'important' && !e.is_important) return false
    // Canonicalize ai_category and labelFilter for robust matching
    const aiCat = canonicalCategory(e.ai_category || e.aiCategory || '')
    const filterCat = canonicalCategory(labelFilter)
    if (labelFilter && labelFilter !== '') {
      if (aiCat !== filterCat) return false
    }
    if (searchQuery) {
      const hay = `${e.subject || ''} ${e.snippet || ''} ${e.from_email || ''}`.toLowerCase()
      if (!hay.includes(searchQuery.toLowerCase())) return false
    }
    return true
  })

  // Apply sorting to visible emails
  const sortedEmails = [...visibleEmails].sort((a, b) => {
    switch (sortBy) {
      case 'priority': {
        // Multi-key sort: Priority → Unread → Date (newest first)
        // 1. Primary: Priority score (HIGH > MEDIUM > LOW)
        const scoreA = calculatePriorityScore(a)
        const scoreB = calculatePriorityScore(b)
        if (scoreA !== scoreB) {
          return scoreB - scoreA // Higher score first
        }
        
        // 2. Secondary: Unread status (unread before read)
        const unreadA = !a.is_read
        const unreadB = !b.is_read
        if (unreadA !== unreadB) {
          return unreadA ? -1 : 1 // Unread first
        }
        
        // 3. Tertiary: Date (newest first)
        const dateA = new Date(a.date || a.internalDate || 0).getTime()
        const dateB = new Date(b.date || b.internalDate || 0).getTime()
        return dateB - dateA
      }
      case 'date': {
        // Date: Newest → Oldest
        const dateA = new Date(a.date || a.internalDate || 0).getTime()
        const dateB = new Date(b.date || b.internalDate || 0).getTime()
        return dateB - dateA
      }
      case 'sender': {
        // Sender: A–Z
        const senderA = (a.from_name || a.fromName || a.from_email || a.fromEmail || '').toLowerCase()
        const senderB = (b.from_name || b.fromName || b.from_email || b.fromEmail || '').toLowerCase()
        return senderA.localeCompare(senderB)
      }
      default:
        return 0
    }
  })

  // Developer logging: Track email counts for debugging
  console.log('[Inbox] Email counts:', {
    total: emails.length,
    visible: visibleEmails.length,
    sorted: sortedEmails.length,
    sortBy,
    filters: { selectedFilter, labelFilter, searchQuery }
  })

  return (
    <div className="flex flex-col h-full bg-dark-bg">
      {/* Topbar now in DashboardLayout */}

      {/* Sort Control */}
      <div className="mx-6 mt-4 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm text-dark-text-secondary">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-dark-surface border border-dark-border text-dark-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8CFF]"
            >
              <option value="priority">Smart Priority (newest first)</option>
              <option value="date">Date</option>
              <option value="sender">Sender</option>
            </select>
          </div>
        </div>

      {/* Bulk Action Toolbar - fixed bar when emails are selected */}
      {selectedEmails.size > 0 && (
        <div className="sticky top-0 z-30 mx-6 mb-2 mt-4 px-4 py-3 bg-[#4F8CFF]/10 border border-[#4F8CFF]/30 rounded-lg shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-dark-text-primary flex items-center gap-2">
                <span className="px-2 py-1 bg-[#4F8CFF] text-white rounded text-xs font-bold">
                  {selectedEmails.size}
                </span>
                selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkAction('read')}
                  className="text-sm font-medium text-dark-text-primary hover:text-[#4F8CFF] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#4F8CFF]/10"
                  title="Mark as Read"
                >
                  Mark as Read
                </button>
                <button
                  onClick={() => handleBulkAction('unread')}
                  className="text-sm font-medium text-dark-text-primary hover:text-[#4F8CFF] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#4F8CFF]/10"
                  title="Mark as Unread"
                >
                  Mark as Unread
                </button>
                <button
                  onClick={() => handleBulkAction('archive')}
                  className="flex items-center gap-1.5 text-sm font-medium text-dark-text-primary hover:text-[#4F8CFF] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#4F8CFF]/10"
                  title="Archive"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="flex items-center gap-1.5 text-sm font-medium text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
            <button
              onClick={() => setSelectedEmails(new Set())}
              className="text-sm font-medium text-dark-text-secondary hover:text-dark-text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {loading && emails.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2 text-dark-text-secondary">
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <span>Loading emails...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-500 mb-2">Failed to load emails: {error}</p>
              <button
                onClick={fetchEmails}
                className="btn-primary"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : emails.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-xl text-dark-text-primary mb-2">You're all caught up!</p>
              <p className="text-sm text-dark-text-secondary mb-4">
                Your inbox is completely empty
              </p>
              <button
                onClick={handleSync}
                disabled={loading}
                className="btn-primary disabled:opacity-50"
              >
                <span>{loading ? 'Syncing…' : 'Sync Emails'}</span>
              </button>
            </div>
          </div>
        ) : visibleEmails.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-xl text-dark-text-primary mb-2">No matching emails</p>
              <p className="text-sm text-dark-text-secondary mb-4">
                Try adjusting your filters or search query
              </p>
              <button
                onClick={() => {
                  useUIStore.setState({ searchQuery: '', selectedFilter: null, labelFilter: '' })
                }}
                className="btn-secondary"
              >
                Clear filters
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Daily AI Brief */}
            {!briefDismissed && emails.length > 0 && (() => {
              const stats = generateBriefStats()
              if (!stats) return null
              
              // Format date for display (e.g., "Nov 11" or "Jan 5")
              const formatDate = (date) => {
                if (!date) return ''
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }
              
              return (
                <div className="mx-6 mt-4 mb-3 bg-accent/5 border border-accent/20 rounded px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1.5 text-sm text-dark-text-secondary leading-relaxed">
                      <div className="font-medium text-dark-text-primary mb-2">Today's Brief</div>
                      {stats.highPriority > 0 && (
                        <button
                          onClick={() => {
                            setShowAllEmails(true)
                            setSortBy('priority')
                            useUIStore.setState({ selectedFilter: null, labelFilter: '' })
                          }}
                          className="text-left hover:text-dark-text-primary transition-colors flex items-center gap-1.5 group"
                          title="Click to view high-priority emails"
                        >
                          <span className="text-accent group-hover:text-accent/80">•</span>
                          <span><strong>{stats.highPriority}</strong> high-priority {stats.highPriority === 1 ? 'email needs' : 'emails need'} attention</span>
                        </button>
                      )}
                      {stats.oldEmails14Days > 0 ? (
                        <button
                          onClick={() => {
                            setShowAllEmails(true)
                            setSortBy('date')
                            useUIStore.setState({ selectedFilter: null, labelFilter: '' })
                          }}
                          className="text-left hover:text-dark-text-primary transition-colors flex items-center gap-1.5 group"
                          title="Click to view oldest emails"
                        >
                          <span className="text-accent group-hover:text-accent/80">•</span>
                          <span><strong>{stats.oldEmails14Days}</strong> {stats.oldEmails14Days === 1 ? 'email is' : 'emails are'} older than 14 days</span>
                        </button>
                      ) : stats.oldEmails7Days > 0 ? (
                        <button
                          onClick={() => {
                            setShowAllEmails(true)
                            setSortBy('date')
                            useUIStore.setState({ selectedFilter: null, labelFilter: '' })
                          }}
                          className="text-left hover:text-dark-text-primary transition-colors flex items-center gap-1.5 group"
                          title="Click to view oldest emails"
                        >
                          <span className="text-accent group-hover:text-accent/80">•</span>
                          <span><strong>{stats.oldEmails7Days}</strong> {stats.oldEmails7Days === 1 ? 'email is' : 'emails are'} older than 7 days</span>
                        </button>
                      ) : null}
                      {stats.oldestUnread && stats.oldestUnreadDate && (
                        <button
                          onClick={() => {
                            setShowAllEmails(true)
                            useUIStore.setState({ selectedFilter: 'unread', labelFilter: '' })
                            setSortBy('date')
                          }}
                          className="text-left hover:text-dark-text-primary transition-colors flex items-center gap-1.5 group"
                          title="Click to view unread emails"
                        >
                          <span className="text-accent group-hover:text-accent/80">•</span>
                          <span>Oldest unread email: <strong>{formatDate(stats.oldestUnreadDate)}</strong></span>
                        </button>
                      )}
                    </div>
                    <button
                      onClick={handleDismissBrief}
                      className="text-dark-text-secondary hover:text-dark-text-primary text-lg leading-none flex-shrink-0 -mt-1"
                      title="Dismiss for today"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* Select All Header */}
            <div className="border-b border-dark-border bg-dark-surface px-4 py-2 mx-6 mt-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedEmails.size === emails.length && emails.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-dark-border bg-dark-bg text-accent focus:ring-accent focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-dark-text-secondary">Select All</span>
              </label>
            </div>

            {/* Inbox list */}
            <div className="mx-6 mb-4 bg-dark-surface rounded border border-dark-border overflow-visible">
              {sortedEmails.map((email) => (
                <InboxCard
                  key={email.id}
                  email={email}
                  isSelected={selectedEmails.has(email.id)}
                  onSelect={(selected) => handleEmailSelect(email.id, selected)}
                  unsubscribedEmails={unsubscribedEmails}
                  onOpen={() => navigate(`/message/${email.id}`)}
                  expandedSummaryId={expandedSummaryId}
                  onToggleSummary={(id) => setExpandedSummaryId(expandedSummaryId === id ? null : id)}
                  expandedReplyId={expandedReplyId}
                  onToggleReply={(id) => setExpandedReplyId(expandedReplyId === id ? null : id)}
                  onStarToggle={async () => {
                    try { await mailAPI.toggleStar(email.id, !email.is_starred); fetchEmails() } catch(e) { console.error(e) }
                  }}
                  onDelete={async () => {
                    try { await mailAPI.deleteEmail(email.id); fetchEmails() } catch(e) { console.error(e) }
                  }}
                  onMarkRead={async () => { try { await mailAPI.markAsRead(email.id, true); fetchEmails() } catch(e) { console.error(e) } }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Compose Modal */}
      <ComposeModal open={composeOpen} onClose={() => setComposeOpen(false)} />
    </div>
  )
}

export default Inbox