import React, { useState } from 'react'
import { X, Send, UserPlus, Paperclip } from 'lucide-react'

/**
 * ForwardComposer Component
 * Modal for forwarding emails
 * 
 * @param {Object} props
 * @param {string} props.emailId - Original email ID
 * @param {Object} props.originalEmail - Original email data
 * @param {Function} props.onSend - Send handler
 * @param {Function} props.onCancel - Cancel handler
 */
export default function ForwardComposer({
  emailId,
  originalEmail = {},
  onSend,
  onCancel
}) {
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [body, setBody] = useState('')
  const [includeAttachments, setIncludeAttachments] = useState(true)
  const [sending, setSending] = useState(false)
  const [showCc, setShowCc] = useState(false)

  const subject = `Fwd: ${originalEmail.subject || '(No Subject)'}`

  const handleSend = async () => {
    if (!to.trim()) {
      alert('Please enter at least one recipient')
      return
    }

    // Parse email addresses (simple comma-separated)
    const toEmails = to.split(',').map(e => e.trim()).filter(e => e)
    const ccEmails = cc ? cc.split(',').map(e => e.trim()).filter(e => e) : []

    setSending(true)
    try {
      await onSend({
        emailId,
        to: toEmails,
        cc: ccEmails,
        subject,
        body,
        includeAttachments,
        originalEmail
      })
      onCancel()
    } catch (error) {
      console.error('Failed to forward email:', error)
      alert('Failed to forward email. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Forward Email</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* To Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com, another@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Separate multiple recipients with commas
            </p>
          </div>

          {/* Cc Field (toggleable) */}
          {!showCc && (
            <button
              onClick={() => setShowCc(true)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              + Add Cc
            </button>
          )}

          {showCc && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cc
              </label>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              readOnly
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
            />
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a message (optional)..."
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Attachments Option */}
          {originalEmail.attachments && originalEmail.attachments.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="includeAttachments"
                checked={includeAttachments}
                onChange={(e) => setIncludeAttachments(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="includeAttachments" className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <Paperclip className="w-4 h-4" />
                Include {originalEmail.attachments.length} attachment(s)
              </label>
            </div>
          )}

          {/* Forwarded Message */}
          <div className="border-l-4 border-blue-500 pl-4 py-3 bg-blue-50 rounded">
            <p className="text-sm font-semibold text-blue-900 mb-2">
              ---------- Forwarded message ----------
            </p>
            <div className="text-sm text-gray-700 space-y-1">
              <p><span className="font-medium">From:</span> {originalEmail.sender || 'Unknown'}</p>
              <p><span className="font-medium">Date:</span> {originalEmail.date ? new Date(originalEmail.date).toLocaleString() : 'Unknown'}</p>
              <p><span className="font-medium">Subject:</span> {originalEmail.subject || '(No Subject)'}</p>
            </div>
            {originalEmail.body && (
              <div className="mt-3 text-sm text-gray-600 max-h-40 overflow-y-auto border-t border-blue-200 pt-2">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: (originalEmail.body || '').substring(0, 500) + (originalEmail.body?.length > 500 ? '...' : '')
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {!to.trim() && <span className="text-red-600">⚠️ Add at least one recipient</span>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !to.trim()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Forwarding...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Forward
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
