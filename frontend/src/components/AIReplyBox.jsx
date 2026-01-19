import React, { useState, useEffect, useRef } from 'react'
import { Bot, Send, RefreshCw, Copy, ThumbsUp, ThumbsDown, X, Wand2 } from 'lucide-react'
import { useFormHotkeys } from '../hooks/useHotkeys'

/**
 * AIReplyBox Component
 * Handles AI-generated replies and manual composition
 */
const AIReplyBox = ({ 
  email, 
  aiReply, 
  loadingReply, 
  onGenerateReply, 
  onClose,
  onSend 
}) => {
  const [replyText, setReplyText] = useState('')
  const [tone, setTone] = useState('professional')
  const [length, setLength] = useState('medium')
  const [isEditing, setIsEditing] = useState(false)
  const [showAiOptions, setShowAiOptions] = useState(false)
  const textareaRef = useRef(null)

  // Set AI reply when it becomes available
  useEffect(() => {
    if (aiReply?.reply && !isEditing) {
      setReplyText(aiReply.reply)
    }
  }, [aiReply, isEditing])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [replyText])

  // Keyboard shortcuts
  useFormHotkeys({
    submit: handleSend,
    cancel: onClose
  })

  const toneOptions = [
    { value: 'professional', label: 'Professional' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'formal', label: 'Formal' },
    { value: 'casual', label: 'Casual' }
  ]

  const lengthOptions = [
    { value: 'short', label: 'Short' },
    { value: 'medium', label: 'Medium' },
    { value: 'long', label: 'Long' }
  ]

  function handleSend() {
    if (!replyText.trim()) return
    
    if (onSend) {
      onSend({
        to: email.sender_email,
        subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`,
        body: replyText,
        inReplyTo: email.message_id,
        threadId: email.thread_id
      })
    }
    onClose()
  }

  const handleGenerateReply = () => {
    setShowAiOptions(false)
    onGenerateReply({ tone, length })
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(replyText)
    // TODO: Show toast notification
    console.log('Copied to clipboard')
  }

  const handleFeedback = (isPositive) => {
    // TODO: Send feedback to backend
    console.log(`AI reply feedback: ${isPositive ? 'positive' : 'negative'}`)
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Reply</h3>
              <p className="text-sm text-gray-600">
                To: {email.sender_email}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* AI Options Toggle */}
            <button
              onClick={() => setShowAiOptions(!showAiOptions)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="AI Options"
            >
              <Wand2 className="w-4 h-4 text-gray-600" />
            </button>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* AI Options Panel */}
      {showAiOptions && (
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Tone Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="input-field text-sm"
              >
                {toneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Length Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Length
              </label>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="input-field text-sm"
              >
                {lengthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerateReply}
            disabled={loadingReply}
            className="btn-primary flex items-center space-x-2"
          >
            <Bot className={`w-4 h-4 ${loadingReply ? 'animate-spin' : ''}`} />
            <span>{loadingReply ? 'Generating...' : 'Generate AI Reply'}</span>
          </button>
        </div>
      )}

      {/* AI Reply Info */}
      {aiReply && !isEditing && (
        <div className="p-4 bg-green-50 border-b border-green-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Bot className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                AI Generated Reply
              </span>
              {aiReply.confidence && (
                <span className="text-xs text-green-600">
                  ({Math.round(aiReply.confidence * 100)}% confidence)
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyToClipboard}
                className="p-1 hover:bg-green-200 rounded transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="w-4 h-4 text-green-600" />
              </button>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleFeedback(true)}
                  className="p-1 hover:bg-green-200 rounded transition-colors"
                  title="Good reply"
                >
                  <ThumbsUp className="w-4 h-4 text-green-600" />
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  className="p-1 hover:bg-green-200 rounded transition-colors"
                  title="Poor reply"
                >
                  <ThumbsDown className="w-4 h-4 text-green-600" />
                </button>
              </div>
            </div>
          </div>
          
          {aiReply.reasoning && (
            <p className="text-sm text-green-700">
              <strong>AI reasoning:</strong> {aiReply.reasoning}
            </p>
          )}
        </div>
      )}

      {/* Subject Line */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Subject:</label>
          <span className="text-sm text-gray-900">
            {email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`}
          </span>
        </div>
      </div>

      {/* Reply Content */}
      <div className="p-4">
        <textarea
          ref={textareaRef}
          value={replyText}
          onChange={(e) => {
            setReplyText(e.target.value)
            setIsEditing(true)
          }}
          placeholder="Type your reply here... or generate one with AI"
          className="w-full min-h-[200px] p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!aiReply && !loadingReply && (
              <button
                onClick={() => setShowAiOptions(!showAiOptions)}
                className="btn-secondary flex items-center space-x-2"
              >
                <Bot className="w-4 h-4" />
                <span>Generate AI Reply</span>
              </button>
            )}
            
            {loadingReply && (
              <div className="flex items-center space-x-2 text-gray-600">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Generating reply...</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!replyText.trim()}
              className="btn-primary flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Send Reply</span>
            </button>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          Press Ctrl+Enter to send, Escape to cancel
        </div>
      </div>
    </div>
  )
}

export default AIReplyBox