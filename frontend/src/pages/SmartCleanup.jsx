import React, { useState, useEffect } from 'react'
import { Sparkles, Archive, Trash2, Mail, AlertCircle, CheckCircle } from 'lucide-react'
import { mailAPI } from '../services/api'

/**
 * SmartCleanup Component
 * Helps users safely clean inbox clutter without automatic deletion
 */
export default function SmartCleanup() {
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState([])
  const [dismissed, setDismissed] = useState(false)
  const [processingIds, setProcessingIds] = useState(new Set())
  const [successMessage, setSuccessMessage] = useState('')
  const [settings, setSettings] = useState({
    enabled: true,
    inactivityThreshold: 45
  })

  // Load settings on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('smartmail_settings') || '{}')
    if (saved.smartCleanup) {
      setSettings(saved.smartCleanup)
    }
    fetchCleanupCandidates()
  }, [])

  // Fetch cleanup candidates from backend
  const fetchCleanupCandidates = async () => {
    try {
      setLoading(true)
      const saved = JSON.parse(localStorage.getItem('smartmail_settings') || '{}')
      const threshold = saved.smartCleanup?.inactivityThreshold || 45
      
      const response = await mailAPI.getCleanupCandidates({ threshold })
      setCandidates(response.data?.candidates || [])
    } catch (error) {
      console.error('Failed to fetch cleanup candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle archive all for a sender
  const handleArchiveSender = async (sender) => {
    if (!confirm(`Archive all ${sender.count} emails from ${sender.name}?`)) {
      return
    }

    try {
      setProcessingIds(prev => new Set(prev).add(sender.email))
      await mailAPI.batchArchive({ messageIds: sender.messageIds })
      
      setCandidates(prev => prev.filter(c => c.email !== sender.email))
      setSuccessMessage(`Archived ${sender.count} emails from ${sender.name}`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Failed to archive emails:', error)
      alert('Failed to archive emails. Please try again.')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(sender.email)
        return next
      })
    }
  }

  // Handle delete all for a sender
  const handleDeleteSender = async (sender) => {
    if (!confirm(`⚠️ Delete all ${sender.count} emails from ${sender.name}? This cannot be undone.`)) {
      return
    }

    try {
      setProcessingIds(prev => new Set(prev).add(sender.email))
      await mailAPI.batchDelete({ messageIds: sender.messageIds })
      
      setCandidates(prev => prev.filter(c => c.email !== sender.email))
      setSuccessMessage(`Deleted ${sender.count} emails from ${sender.name}`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('Failed to delete emails:', error)
      alert('Failed to delete emails. Please try again.')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(sender.email)
        return next
      })
    }
  }

  // Handle unsubscribe
  const handleUnsubscribe = async (sender) => {
    if (!confirm(`Stop receiving emails from ${sender.name}?\n\nThis will unsubscribe you from their mailing list.`)) {
      return
    }

    try {
      setProcessingIds(prev => new Set(prev).add(sender.email))
      
      // Find a message ID to get unsubscribe info
      if (sender.messageIds && sender.messageIds.length > 0) {
        await mailAPI.unsubscribe(sender.messageIds[0])
        
        setCandidates(prev => prev.filter(c => c.email !== sender.email))
        setSuccessMessage(`Unsubscribed from ${sender.name}`)
        setTimeout(() => setSuccessMessage(''), 3000)
      }
    } catch (error) {
      console.error('Failed to unsubscribe:', error)
      alert('Failed to unsubscribe. Some emails may not support automatic unsubscribe.')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(sender.email)
        return next
      })
    }
  }

  const totalEmails = candidates.reduce((sum, c) => sum + c.count, 0)

  if (!settings.enabled) {
    return (
      <div className="h-full overflow-y-auto bg-dark-bg">
        <div className="max-w-5xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-dark-text-primary flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-[#8B5CF6]" />
              Smart Cleanup
            </h1>
            <p className="text-dark-text-secondary mt-2">
              Review inactive emails and clean your inbox safely.
            </p>
          </div>

          <div className="bg-dark-surface p-8 rounded-lg border border-dark-border text-center">
            <AlertCircle className="w-12 h-12 text-dark-text-secondary mx-auto mb-4" />
            <p className="text-dark-text-primary mb-2">Smart Cleanup is disabled</p>
            <p className="text-sm text-dark-text-secondary mb-4">
              Enable it in Settings to start cleaning your inbox
            </p>
            <button
              onClick={() => window.location.href = '/settings'}
              className="btn-primary px-6 py-2"
            >
              Go to Settings
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-dark-bg">
        <div className="max-w-5xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-dark-text-primary flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-[#8B5CF6]" />
              Smart Cleanup
            </h1>
            <p className="text-dark-text-secondary mt-2">
              Review inactive emails and clean your inbox safely.
            </p>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-dark-text-secondary">Analyzing your inbox...</div>
          </div>
        </div>
      </div>
    )
  }

  if (dismissed || candidates.length === 0) {
    return (
      <div className="h-full overflow-y-auto bg-dark-bg">
        <div className="max-w-5xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-dark-text-primary flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-[#8B5CF6]" />
              Smart Cleanup
            </h1>
            <p className="text-dark-text-secondary mt-2">
              Review inactive emails and clean your inbox safely.
            </p>
          </div>

          <div className="bg-dark-surface p-8 rounded-lg border border-dark-border text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-dark-text-primary mb-2">Your inbox looks great!</p>
            <p className="text-sm text-dark-text-secondary">
              No inactive promotional emails found that need attention.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-dark-bg">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark-text-primary flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-[#8B5CF6]" />
            Smart Cleanup
          </h1>
          <p className="text-dark-text-secondary mt-2">
            Review inactive emails and clean your inbox safely.
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {successMessage}
          </div>
        )}

        {/* Summary Card */}
        <div className="bg-gradient-to-br from-[#8B5CF6]/10 to-[#8B5CF6]/5 border border-[#8B5CF6]/20 rounded-lg p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-dark-text-primary mb-2">
                Smart Cleanup found {totalEmails} emails you haven't opened in {settings.inactivityThreshold} days
              </h2>
              <p className="text-sm text-dark-text-secondary">
                These are promotional emails and newsletters that might be safe to archive or delete.
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-sm text-dark-text-secondary hover:text-dark-text-primary px-4 py-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>

        {/* Review List */}
        <div className="bg-dark-surface rounded-lg border border-dark-border overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-border">
            <h3 className="font-semibold text-dark-text-primary">Review by Sender</h3>
            <p className="text-sm text-dark-text-secondary mt-1">
              Choose what to do with each sender's emails
            </p>
          </div>

          <div className="divide-y divide-dark-border">
            {candidates.map((sender) => {
              const isProcessing = processingIds.has(sender.email)
              
              return (
                <div key={sender.email} className="p-6 hover:bg-white/5 transition-colors">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-dark-text-primary">
                          {sender.name || sender.email}
                        </h4>
                        <span className="px-2 py-0.5 bg-[#8B5CF6]/10 text-[#8B5CF6] text-xs rounded-full">
                          {sender.category || 'Promotion'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-dark-text-secondary">
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {sender.count} email{sender.count > 1 ? 's' : ''}
                        </span>
                        <span>Last opened: {sender.lastOpened}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleArchiveSender(sender)}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Archive className="w-4 h-4" />
                        Archive All
                      </button>
                      <button
                        onClick={() => handleDeleteSender(sender)}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-dark-bg hover:bg-red-500/10 text-dark-text-secondary hover:text-red-400 border border-dark-border hover:border-red-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete All
                      </button>
                      <button
                        onClick={() => handleUnsubscribe(sender)}
                        disabled={isProcessing}
                        className="px-4 py-2 text-sm text-dark-text-secondary hover:text-dark-text-primary hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Unsubscribe
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-300">
            💡 <strong>Tip:</strong> Archive moves emails out of your inbox but keeps them searchable. 
            Delete removes them permanently. Unsubscribe stops future emails from this sender.
          </p>
        </div>
      </div>
    </div>
  )
}
