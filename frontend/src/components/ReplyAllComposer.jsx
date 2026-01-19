import React, { useState } from 'react'
import { X, Send, UserPlus, UserMinus } from 'lucide-react'

/**
 * ReplyAllComposer Component
 * Modal for composing Reply All emails
 * 
 * @param {Object} props
 * @param {string} props.emailId - Original email ID
 * @param {Array} props.recipients - List of all recipients {name, email}
 * @param {string} props.subject - Email subject
 * @param {string} props.originalBody - Original email body for quoting
 * @param {Function} props.onSend - Send handler
 * @param {Function} props.onCancel - Cancel handler
 */
export default function ReplyAllComposer({
  emailId,
  recipients = [],
  subject = '',
  originalBody = '',
  onSend,
  onCancel
}) {
  const [body, setBody] = useState('')
  const [selectedRecipients, setSelectedRecipients] = useState(recipients)
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!body.trim()) {
      alert('Please enter a message')
      return
    }

    setSending(true)
    try {
      await onSend({
        emailId,
        to: selectedRecipients.map(r => r.email),
        subject,
        body,
        includeOriginal: true
      })
      onCancel()
    } catch (error) {
      console.error('Failed to send reply:', error)
      alert('Failed to send reply. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const removeRecipient = (email) => {
    setSelectedRecipients(prev => prev.filter(r => r.email !== email))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Reply All</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To ({selectedRecipients.length})
            </label>
            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
              {selectedRecipients.map((recipient, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  <span className="font-medium">
                    {recipient.name || recipient.email}
                  </span>
                  {recipient.name && recipient.email !== recipient.name && (
                    <span className="text-blue-600 text-xs">
                      &lt;{recipient.email}&gt;
                    </span>
                  )}
                  <button
                    onClick={() => removeRecipient(recipient.email)}
                    className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    title="Remove recipient"
                  >
                    <UserMinus className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {selectedRecipients.length === 0 && (
                <span className="text-gray-500 text-sm">No recipients</span>
              )}
            </div>
          </div>

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
              placeholder="Type your reply..."
              rows={10}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              autoFocus
            />
          </div>

          {/* Original Message */}
          {originalBody && (
            <div className="border-l-4 border-gray-300 pl-4 py-2">
              <p className="text-sm text-gray-500 mb-2">Original message:</p>
              <div 
                className="text-sm text-gray-600 max-h-40 overflow-y-auto"
                dangerouslySetInnerHTML={{ 
                  __html: originalBody.substring(0, 500) + (originalBody.length > 500 ? '...' : '')
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedRecipients.length === 0 ? (
              <span className="text-red-600">⚠️ No recipients selected</span>
            ) : (
              <span>Replying to {selectedRecipients.length} recipient(s)</span>
            )}
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
              disabled={sending || selectedRecipients.length === 0 || !body.trim()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Reply
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
