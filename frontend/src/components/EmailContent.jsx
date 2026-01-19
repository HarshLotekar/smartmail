import React, { useState, useEffect } from 'react'
import { 
  Reply, 
  ReplyAll, 
  Forward, 
  Archive, 
  Trash2, 
  MailOpen,
  Download,
  Paperclip,
  ChevronDown,
  ChevronUp,
  User,
  MailX,
  Brain,
  Loader2,
  MoreVertical,
  Sparkles,
  Eye,
  X
} from 'lucide-react'
import DOMPurify from 'dompurify'
import { aiAPI, mailAPI } from '../services/api'
import AuthImage from './AuthImage'

/**
 * EmailContent Component
 * Displays full email content with Gmail-like styling
 * 
 * @param {Object} props
 * @param {string} props.sender - Sender name
 * @param {string} props.senderEmail - Sender email address
 * @param {string} props.subject - Email subject
 * @param {string} props.body - Email body (can contain HTML)
 * @param {string} props.timestamp - Email timestamp
 * @param {string} props.avatarUrl - Optional avatar URL
 * @param {Array} props.attachments - Array of attachment objects
 * @param {Array} props.labels - Array of label strings
 * @param {boolean} props.isUnread - Unread status
 * @param {number} props.messageId - Message ID for attachment URLs
 * @param {Function} props.onReply - Reply handler
 * @param {Function} props.onReplyAll - Reply all handler
 * @param {Function} props.onForward - Forward handler
 * @param {Function} props.onArchive - Archive handler
 * @param {Function} props.onDelete - Delete handler
 * @param {Function} props.onMarkUnread - Mark unread handler
 * @param {Function} props.onUnsubscribe - Unsubscribe handler
 */
export default function EmailContent({
  sender = 'Unknown Sender',
  senderEmail = '',
  subject = '(No Subject)',
  body = '',
  timestamp = '',
  avatarUrl = null,
  attachments = [],
  labels = [],
  isUnread = false,
  isSentEmail = false, // New prop to indicate sent email
  messageId, // Add messageId prop for attachment URLs
  onReply,
  onReplyAll,
  onForward,
  onArchive,
  onDelete,
  onMarkUnread,
  onUnsubscribe,
  onReplyWithText, // New prop to handle pre-filled reply
  onSummaryGenerated, // New prop to send summary to parent
  onReplyGenerated // New prop to send AI reply to parent
}) {
  console.log('EmailContent rendering with:', { sender, subject, bodyLength: body?.length })
  
  // ============ ALL STATE HOOKS FIRST ============
  const [isExpanded, setIsExpanded] = useState(true)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [summary, setSummary] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showReplyMenu, setShowReplyMenu] = useState(false)
  const [showAIMenu, setShowAIMenu] = useState(false)
  
  // Tone analyzer state
  const [isAnalyzingTone, setIsAnalyzingTone] = useState(false)
  const [emailTone, setEmailTone] = useState('')
  const [replysuggestions, setReplySuggestions] = useState([])
  const [showToneResults, setShowToneResults] = useState(false)
  
  // Attachment preview state
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  
  // Reply composer state
  const [showReplyComposer, setShowReplyComposer] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [replySubject, setReplySubject] = useState('')
  const [isMinimized, setIsMinimized] = useState(false)
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [ccText, setCcText] = useState('')
  const [bccText, setBccText] = useState('')
  const [replyAttachments, setReplyAttachments] = useState([])
  const [isSendingReply, setIsSendingReply] = useState(false)
  
  // Read dark mode from localStorage (user preference from landing page)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('smartmail_theme')
    return saved === 'dark'
  })

  // ============ ALL EFFECTS ============
  // Listen for theme changes from localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('smartmail_theme')
      setIsDarkMode(saved === 'dark')
    }
    
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])
  
  // Cleanup blob URLs when modal closes
  useEffect(() => {
    return () => {
      if (previewAttachment?.isBlobUrl && previewAttachment?.previewUrl) {
        URL.revokeObjectURL(previewAttachment.previewUrl)
      }
    }
  }, [previewAttachment])
  
  // ============ HELPER FUNCTIONS ============
  // Helper function to check if attachment can be previewed
  const isPreviewable = (mimeType) => {
    if (!mimeType) return false
    return mimeType.startsWith('image/') || mimeType === 'application/pdf'
  }
  
  // Helper function to get file icon based on type
  const getFileIcon = (mimeType) => {
    if (!mimeType) return 'text-gray-500'
    if (mimeType.startsWith('image/')) return 'text-blue-500'
    if (mimeType === 'application/pdf') return 'text-red-500'
    if (mimeType.includes('word') || mimeType.includes('document')) return 'text-blue-600'
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'text-green-600'
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'text-yellow-600'
    return 'text-gray-500'
  }
  
  // Download attachment handler
  const handleDownload = async (attachment) => {
    try {
      const downloadUrl = messageId && attachment.attachmentId
        ? `/api/mail/messages/${messageId}/attachments/${attachment.attachmentId}?download=true`
        : attachment.url || '#'
      
      if (downloadUrl === '#') {
        console.error('No download URL available')
        alert('Download failed: No URL available')
        return
      }
      
      const token = localStorage.getItem('smartmail_token')
      if (!token) {
        console.error('No auth token found')
        alert('Download failed: Please log in again')
        return
      }
      
      console.log('📥 Downloading attachment:', attachment.filename)
      console.log('Download URL:', downloadUrl)
      
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      console.log('Download response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Download failed:', response.status, errorText)
        let errorMsg = 'Download failed'
        try {
          const errorJson = JSON.parse(errorText)
          errorMsg = errorJson.error || errorJson.message || errorMsg
        } catch (e) {
          errorMsg = errorText || `Error ${response.status}`
        }
        alert(`Download failed: ${errorMsg}`)
        return
      }
      
      const blob = await response.blob()
      console.log('Downloaded blob size:', blob.size, 'bytes')
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.filename || attachment.name || 'attachment'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      console.log('✅ Download completed')
    } catch (error) {
      console.error('Download error:', error)
      alert(`Download failed: ${error.message}`)
    }
  }
  
  // Preview attachment handler
  const handlePreview = async (attachment) => {
    const previewUrl = messageId && attachment.attachmentId
      ? `/api/mail/messages/${messageId}/attachments/${attachment.attachmentId}?download=false`
      : attachment.url || '#'
    
    if (previewUrl === '#') {
      console.error('No preview URL available')
      alert('Preview failed: No URL available')
      return
    }
    
    const token = localStorage.getItem('smartmail_token')
    if (!token) {
      console.error('No auth token found')
      alert('Preview failed: Please log in again')
      return
    }
    
    console.log('👁️ Previewing attachment:', attachment.filename)
    console.log('Preview URL:', previewUrl)
    console.log('Message ID:', messageId)
    console.log('Attachment ID:', attachment.attachmentId)
    console.log('MIME Type:', attachment.mimeType)
    
    // For PDFs, fetch and create blob URL for iframe
    if (attachment.mimeType === 'application/pdf') {
      try {
        const response = await fetch(previewUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        console.log('Preview response status:', response.status)
        console.log('Response headers:', Object.fromEntries(response.headers.entries()))
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Preview failed:', response.status, errorText)
          let errorMsg = 'Preview failed'
          try {
            const errorJson = JSON.parse(errorText)
            errorMsg = errorJson.error || errorJson.message || errorMsg
          } catch (e) {
            errorMsg = errorText || `Error ${response.status}`
          }
          alert(`Failed to load PDF preview: ${errorMsg}`)
          return
        }
        
        const blob = await response.blob()
        console.log('Preview blob size:', blob.size, 'bytes, type:', blob.type)
        
        const blobUrl = URL.createObjectURL(blob)
        console.log('Created blob URL:', blobUrl)
        
        setPreviewAttachment({ 
          ...attachment, 
          previewUrl: blobUrl,
          isBlobUrl: true 
        })
        setShowPreview(true)
        console.log('✅ Preview opened')
      } catch (error) {
        console.error('PDF preview error:', error)
        alert(`Failed to load PDF preview: ${error.message}`)
        return
      }
    } else {
      setPreviewAttachment({ ...attachment, previewUrl })
      setShowPreview(true)
    }
  }

  // Handle email summarization
  const handleSummarize = async () => {
    setIsSummarizing(true)
    try {
      const response = await aiAPI.summarizeMail(subject, body)
      const generatedSummary = response.data.summary
      setSummary(generatedSummary)
      setShowSummary(false) // Don't show in email content
      
      // Send to parent (MessageView) to display in side panel
      if (onSummaryGenerated) {
        onSummaryGenerated(generatedSummary)
      }
    } catch (error) {
      console.error('Failed to summarize email:', error)
      const errorMsg = 'Failed to generate summary. Please try again.'
      setSummary(errorMsg)
      if (onSummaryGenerated) {
        onSummaryGenerated(errorMsg)
      }
    } finally {
      setIsSummarizing(false)
    }
  }

  // Handle tone analysis and reply suggestions
  const handleAnalyzeTone = async () => {
    setIsAnalyzingTone(true)
    try {
      const response = await aiAPI.analyzeTone(subject, body)
      setEmailTone(response.data.tone)
      const replies = response.data.replies || []
      setReplySuggestions(replies)
      setShowToneResults(false) // Don't show in email content
      
      // Send first reply suggestion to parent (MessageView) to display in side panel
      if (onReplyGenerated && replies.length > 0) {
        onReplyGenerated(replies[0])
      }
    } catch (error) {
      console.error('Failed to analyze tone:', error)
      setEmailTone('Neutral')
      const defaultReplies = ['Thank you for your email.', 'I will get back to you soon.', 'Received, will review.']
      setReplySuggestions(defaultReplies)
      setShowToneResults(false)
      
      if (onReplyGenerated) {
        onReplyGenerated(defaultReplies[0])
      }
    } finally {
      setIsAnalyzingTone(false)
    }
  }

  // Handle opening reply composer
  const handleOpenReply = () => {
    setReplyTo(senderEmail)
    setReplySubject(`Re: ${subject}`)
    setShowReplyComposer(true)
    setIsMinimized(false)
    
    // Check for pre-filled text from AI suggestions
    const storedReply = localStorage.getItem('smartmail_draft_reply')
    if (storedReply) {
      setReplyText(storedReply)
      localStorage.removeItem('smartmail_draft_reply')
    }
  }

  // Handle reply with pre-filled text (from AI suggestions)
  const handleReplyWithText = (text) => {
    setReplyText(text)
    setReplyTo(senderEmail)
    setReplySubject(`Re: ${subject}`)
    setShowReplyComposer(true)
    setIsMinimized(false)
    setShowToneResults(false)
  }

  // Handle send reply
  const handleSendReply = async () => {
    if (isSendingReply) return // Prevent double submission
    
    try {
      setIsSendingReply(true)
      
      // Create FormData for sending email with attachments
      const formData = new FormData()
      formData.append('to', replyTo)
      if (ccText) formData.append('cc', ccText)
      if (bccText) formData.append('bcc', bccText)
      formData.append('subject', replySubject)
      formData.append('body', replyText)
      
      // Append attachments
      replyAttachments.forEach((file) => {
        formData.append('attachments', file)
      })
      
      // Send via API with proper authentication
      const response = await mailAPI.sendEmail(formData)
      
      if (response.data.success) {
        alert('Reply sent successfully!')
        
        // Reset composer
        setShowReplyComposer(false)
        setReplyText('')
        setReplyTo('')
        setReplySubject('')
        setCcText('')
        setBccText('')
        setReplyAttachments([])
        setShowCcBcc(false)
      } else {
        throw new Error(response.data.error || 'Failed to send')
      }
    } catch (error) {
      console.error('Failed to send reply:', error)
      alert(`Failed to send reply: ${error.response?.data?.error || error.message}`)
    } finally {
      setIsSendingReply(false)
    }
  }

  // Handle remove attachment
  const handleRemoveAttachment = (index) => {
    setReplyAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // Get tone emoji
  const getToneEmoji = (tone) => {
    const emojiMap = {
      'Positive': '😊',
      'Friendly': '😊',
      'Urgent': '⚠️',
      'Apologetic': '😔',
      'Formal': '✉️',
      'Neutral': '📧'
    }
    return emojiMap[tone] || '📧'
  }

  // Get tone color
  const getToneColor = (tone) => {
    const colorMap = {
      'Positive': isDarkMode ? 'bg-green-900/30 border-green-700 text-green-300' : 'bg-green-50 border-green-300 text-green-700',
      'Friendly': isDarkMode ? 'bg-blue-900/30 border-blue-700 text-blue-300' : 'bg-blue-50 border-blue-300 text-blue-700',
      'Urgent': isDarkMode ? 'bg-red-900/30 border-red-700 text-red-300' : 'bg-red-50 border-red-300 text-red-700',
      'Apologetic': isDarkMode ? 'bg-yellow-900/30 border-yellow-700 text-yellow-300' : 'bg-yellow-50 border-yellow-300 text-yellow-700',
      'Formal': isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700',
      'Neutral': isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700'
    }
    return colorMap[tone] || (isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700')
  }

  // Format timestamp to readable format
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      // Today - show time
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    } else if (diffDays < 7) {
      // This week - show day name
      return date.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + 
             date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    } else {
      // Older - show date
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  // Get initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Sanitize HTML content - Allow images and tables for better email rendering
  let sanitizedBody = ''
  try {
    sanitizedBody = DOMPurify.sanitize(body || '', {
      ALLOWED_TAGS: [
        'p', 'br', 'a', 'strong', 'em', 'u', 'ul', 'ol', 'li', 
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'blockquote',
        'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'center',
        'b', 'i', 'font', 'hr', 'pre', 'code'
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'class', 'style', 
        'src', 'alt', 'width', 'height', 'border',
        'align', 'valign', 'bgcolor', 'color', 'size',
        'cellpadding', 'cellspacing', 'colspan', 'rowspan'
      ],
      ALLOW_DATA_ATTR: false
    })
  } catch (error) {
    console.error('DOMPurify error:', error)
    sanitizedBody = body || ''
  }

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Label color mapping
  const getLabelColor = (label) => {
    const colors = {
      'Work': 'bg-blue-100 text-blue-700 border-blue-200',
      'Personal': 'bg-green-100 text-green-700 border-green-200',
      'Important': 'bg-red-100 text-red-700 border-red-200',
      'Promotions': 'bg-purple-100 text-purple-700 border-purple-200',
      'Social': 'bg-pink-100 text-pink-700 border-pink-200',
      'Updates': 'bg-indigo-100 text-indigo-700 border-indigo-200',
      'Finance': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Shopping': 'bg-orange-100 text-orange-700 border-orange-200',
      'Travel': 'bg-cyan-100 text-cyan-700 border-cyan-200',
      'Other': 'bg-gray-100 text-gray-700 border-gray-200'
    }
    return colors[label] || colors['Other']
  }

  const containerClasses = isDarkMode 
    ? 'bg-gray-900 text-gray-100' 
    : 'bg-white text-gray-900'

  const cardClasses = isDarkMode
    ? 'bg-gray-800 border-gray-700'
    : 'bg-white border-gray-200'

  const textMutedClasses = isDarkMode ? 'text-gray-400' : 'text-gray-600'

  // Add error boundary protection
  try {
    return (
      <div className={`rounded-lg shadow-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} ${containerClasses} transition-colors duration-200`}>
        {/* Header Section */}
        <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} p-6`}>
        
        {/* Subject - LARGEST, FIRST */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-1">
            {subject}
          </h1>
        </div>

        {/* Sender Info - Below subject */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={sender}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm">
                  {getInitials(sender)}
                </div>
              )}
            </div>

            {/* Sender Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className={`font-semibold text-base ${isUnread ? 'font-bold' : ''}`}>
                  {sender}
                </h3>
                {isUnread && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    New
                  </span>
                )}
              </div>
              <p className={`text-sm ${textMutedClasses}`}>
                {senderEmail}
              </p>
            </div>

            {/* Timestamp - Right aligned */}
            <div className={`text-sm ${textMutedClasses} whitespace-nowrap`}>
              {formatTimestamp(timestamp)}
            </div>
          </div>
        </div>

        {/* Labels - Keep minimal */}
        <div className="mb-3">

          {/* Labels */}
          {labels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {labels.map((label, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getLabelColor(label)}`}
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons - Redesigned Minimalist Layout */}
        <div className="flex items-center gap-2 pt-3">
          {/* Primary Actions - Left */}
          <div className="flex items-center gap-2">
            {/* Reply with Dropdown - Hide for sent emails */}
            {!isSentEmail && (
              <div className="relative">
                <button
                  onClick={() => setShowReplyMenu(!showReplyMenu)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-100' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  } transition-colors`}
                >
                  <Reply className="w-4 h-4" />
                  <span>Reply</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

              {/* Reply Dropdown Menu */}
              {showReplyMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowReplyMenu(false)}
                  />
                  <div className={`absolute left-0 mt-2 w-48 rounded-lg shadow-lg z-20 ${
                    isDarkMode 
                      ? 'bg-gray-800 border border-gray-700' 
                      : 'bg-white border border-gray-200'
                  }`}>
                    <button
                      onClick={() => {
                        handleOpenReply()
                        setShowReplyMenu(false)
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${
                        isDarkMode
                          ? 'hover:bg-gray-700 text-gray-200'
                          : 'hover:bg-gray-50 text-gray-700'
                      } transition-colors rounded-t-lg`}
                    >
                      <Reply className="w-4 h-4" />
                      <span>Reply</span>
                    </button>
                    <button
                      onClick={() => {
                        onReplyAll()
                        setShowReplyMenu(false)
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${
                        isDarkMode
                          ? 'hover:bg-gray-700 text-gray-200'
                          : 'hover:bg-gray-50 text-gray-700'
                      } transition-colors rounded-b-lg`}
                    >
                      <ReplyAll className="w-4 h-4" />
                      <span>Reply All</span>
                    </button>
                  </div>
                </>
              )}
              </div>
            )}

            {/* Forward Button */}
            <button
              onClick={onForward}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-100' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } transition-colors`}
            >
              <Forward className="w-4 h-4" />
              <span>Forward</span>
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Secondary Actions - Right */}
          <div className="flex items-center gap-1">
            <button
              onClick={onArchive}
              className={`p-2 rounded-lg ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
              } transition-colors`}
              title="Archive"
            >
              <Archive className="w-5 h-5" />
            </button>
            <button
              onClick={onDelete}
              className={`p-2 rounded-lg ${
                isDarkMode
                  ? 'hover:bg-red-900/30 text-red-400 hover:text-red-300'
                  : 'hover:bg-red-50 text-red-600 hover:text-red-700'
              } transition-colors`}
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onMarkUnread}
              className={`p-2 rounded-lg ${
                isDarkMode 
                  ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
              } transition-colors`}
              title="Mark as unread"
            >
              <MailOpen className="w-5 h-5" />
            </button>

            {/* More Actions Dropdown */}
            {onUnsubscribe && (
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className={`p-2 rounded-lg ${
                    isDarkMode 
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' 
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-800'
                  } transition-colors`}
                  title="More actions"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {/* Dropdown Menu */}
                {showMoreMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowMoreMenu(false)}
                    />
                    <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-20 ${
                      isDarkMode 
                        ? 'bg-gray-800 border border-gray-700' 
                        : 'bg-white border border-gray-200'
                    }`}>
                      <button
                        onClick={() => {
                          onUnsubscribe()
                          setShowMoreMenu(false)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm ${
                          isDarkMode
                            ? 'hover:bg-gray-700 text-gray-200'
                            : 'hover:bg-gray-50 text-gray-700'
                        } transition-colors rounded-lg`}
                      >
                        <MailX className="w-4 h-4" />
                        <span>Unsubscribe</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body Section */}
      <div className="p-6">
        <div className="max-w-full">
          {/* Email Body - Always expanded for better reading */}
          <div className="mt-6">
            <div className="space-y-6">
              <div 
                className={`email-body prose ${isDarkMode ? 'prose-invert' : ''}`}
                style={{
                  maxWidth: '720px',
                  lineHeight: '1.65',
                  fontSize: '15px',
                  color: isDarkMode ? '#e5e7eb' : '#1f2937',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  margin: '0 auto'
                }}
                dangerouslySetInnerHTML={{ __html: sanitizedBody }}
              />

              {/* AI Summary Card */}
              {showSummary && summary && (
                <div className={`p-4 rounded-lg border-2 ${
                  isDarkMode 
                    ? 'bg-purple-900/20 border-purple-700' 
                    : 'bg-purple-50 border-purple-300'
                } transition-all duration-300`}>
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 mt-1 p-2 rounded-lg ${
                      isDarkMode ? 'bg-purple-800' : 'bg-purple-200'
                    }`}>
                      <Brain className={`w-5 h-5 ${
                        isDarkMode ? 'text-purple-300' : 'text-purple-700'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`font-semibold text-sm ${
                          isDarkMode ? 'text-purple-300' : 'text-purple-900'
                        }`}>
                          AI Summary
                        </h3>
                        <button
                          onClick={() => setShowSummary(false)}
                          className={`text-xs px-2 py-1 rounded ${
                            isDarkMode 
                              ? 'hover:bg-purple-800 text-purple-400' 
                              : 'hover:bg-purple-200 text-purple-700'
                          } transition-colors`}
                        >
                          ✕ Close
                        </button>
                      </div>
                      <div 
                        className={`text-sm leading-relaxed ${
                          isDarkMode ? 'text-purple-100' : 'text-purple-900'
                        }`}
                        style={{ whiteSpace: 'pre-line' }}
                      >
                        {summary}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Smart Tone Analyzer Results */}
              {showToneResults && emailTone && replysuggestions.length > 0 && (
                <div className={`p-4 rounded-lg border-2 ${
                  isDarkMode 
                    ? 'bg-blue-900/20 border-blue-700' 
                    : 'bg-blue-50 border-blue-300'
                } transition-all duration-300 animate-fade-in`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getToneEmoji(emailTone)}</span>
                      <h3 className={`font-semibold text-sm ${
                        isDarkMode ? 'text-blue-300' : 'text-blue-900'
                      }`}>
                        💡 Suggested Replies
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getToneColor(emailTone)}`}>
                        {emailTone} Tone
                      </span>
                    </div>
                    <button
                      onClick={() => setShowToneResults(false)}
                      className={`text-xs px-2 py-1 rounded ${
                        isDarkMode 
                          ? 'hover:bg-blue-800 text-blue-400' 
                          : 'hover:bg-blue-200 text-blue-700'
                      } transition-colors`}
                    >
                      ✕ Close
                    </button>
                  </div>
                  
                  <div className="grid gap-2">
                    {replysuggestions.map((reply, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          handleReplyWithText(reply)
                        }}
                        className={`w-full text-left px-4 py-3 rounded-lg border-2 ${
                          isDarkMode
                            ? 'bg-gray-800 border-gray-700 hover:border-blue-600 hover:bg-gray-750 text-gray-200'
                            : 'bg-white border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-700'
                        } transition-all duration-200 hover:shadow-md cursor-pointer`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium">{reply}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <p className={`mt-3 text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    Click a suggestion to start composing your reply
                  </p>
                </div>
              )}

              {/* Attachments */}
              {attachments && attachments.length > 0 && (
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="font-semibold text-sm">
                      {attachments.length} Attachment{attachments.length !== 1 ? 's' : ''}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {attachments.map((attachment, index) => {
                      const canPreview = isPreviewable(attachment.mimeType)
                      const isImage = attachment.mimeType?.startsWith('image/')
                      const previewUrl = messageId && attachment.attachmentId
                        ? `/api/mail/messages/${messageId}/attachments/${attachment.attachmentId}?download=false`
                        : attachment.url
                      
                      return (
                        <div key={index}>
                          {/* Image thumbnail preview (Gmail style) */}
                          {isImage && previewUrl && (
                            <div 
                              className={`mb-2 rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity ${
                                isDarkMode ? 'border-gray-700' : 'border-gray-200'
                              }`}
                              onClick={() => handlePreview(attachment)}
                            >
                              <AuthImage
                                src={previewUrl} 
                                alt={attachment.filename || attachment.name}
                                className="max-h-64 w-auto mx-auto"
                                onError={() => console.error('Failed to load image thumbnail')}
                              />
                            </div>
                          )}
                          
                          {/* Attachment card */}
                          <div
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              isDarkMode 
                                ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            } transition-colors`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`flex-shrink-0 w-10 h-10 rounded bg-primary-100 dark:bg-primary-900 flex items-center justify-center`}>
                                <Paperclip className={`w-5 h-5 ${getFileIcon(attachment.mimeType)}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {attachment.filename || attachment.name}
                                </p>
                                <p className={`text-xs ${textMutedClasses}`}>
                                  {formatFileSize(attachment.size)}
                                </p>
                              </div>
                            </div>
                            
                            {/* Action buttons */}
                            <div className="flex items-center gap-1">
                              {canPreview && !isImage && (
                                <button
                                  onClick={() => handlePreview(attachment)}
                                  className="flex-shrink-0 p-2 rounded hover:bg-primary-100 dark:hover:bg-primary-900 text-primary-600 transition-colors"
                                  title="Preview"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => handleDownload(attachment)}
                                className="flex-shrink-0 p-2 rounded hover:bg-primary-100 dark:hover:bg-primary-900 text-primary-600 transition-colors"
                                title="Download"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Inline Reply Composer */}
              {showReplyComposer && !isMinimized && (
                <div className={`mt-6 rounded-lg border-2 ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700' 
                    : 'bg-white border-gray-300'
                } shadow-lg transition-all duration-300 animate-fade-in`}>
                  {/* Composer Header */}
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <h3 className={`font-semibold text-sm ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                      Reply
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsMinimized(true)}
                        className={`p-1 rounded ${
                          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        } transition-colors`}
                        title="Minimize"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setShowReplyComposer(false)
                          setReplyText('')
                        }}
                        className={`p-1 rounded ${
                          isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        } transition-colors`}
                        title="Close"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Composer Body */}
                  <div className="p-4 space-y-3">
                    {/* To Field */}
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium w-12 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        To:
                      </span>
                      <input
                        type="email"
                        value={replyTo}
                        onChange={(e) => setReplyTo(e.target.value)}
                        className={`flex-1 px-2 py-1 text-sm rounded border ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-gray-200'
                            : 'bg-white border-gray-300 text-gray-700'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                      <button
                        onClick={() => setShowCcBcc(!showCcBcc)}
                        className={`text-xs px-2 py-1 rounded ${
                          isDarkMode
                            ? 'hover:bg-gray-700 text-gray-400'
                            : 'hover:bg-gray-100 text-gray-600'
                        } transition-colors`}
                      >
                        Cc/Bcc
                      </button>
                    </div>

                    {/* Cc/Bcc Fields */}
                    {showCcBcc && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium w-12 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            Cc:
                          </span>
                          <input
                            type="email"
                            value={ccText}
                            onChange={(e) => setCcText(e.target.value)}
                            placeholder="Add recipients"
                            className={`flex-1 px-2 py-1 text-sm rounded border ${
                              isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-500'
                                : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium w-12 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            Bcc:
                          </span>
                          <input
                            type="email"
                            value={bccText}
                            onChange={(e) => setBccText(e.target.value)}
                            placeholder="Add recipients"
                            className={`flex-1 px-2 py-1 text-sm rounded border ${
                              isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-500'
                                : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          />
                        </div>
                      </>
                    )}

                    {/* Subject Field */}
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium w-12 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Subject:
                      </span>
                      <input
                        type="text"
                        value={replySubject}
                        onChange={(e) => setReplySubject(e.target.value)}
                        className={`flex-1 px-2 py-1 text-sm rounded border ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-gray-200'
                            : 'bg-white border-gray-300 text-gray-700'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                    </div>

                    {/* Message Body */}
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your message..."
                      className={`w-full px-3 py-2 text-sm rounded border ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-500'
                          : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px] resize-y`}
                      autoFocus
                    />

                    {/* Attachments Display */}
                    {replyAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {replyAttachments.map((file, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                              isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            <Paperclip className="w-3 h-3" />
                            <span className="max-w-[150px] truncate">{file.name}</span>
                            <span className="text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                            <button
                              onClick={() => handleRemoveAttachment(idx)}
                              className="ml-1 hover:text-red-500 font-bold"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Composer Footer */}
                  <div className={`flex items-center justify-between px-4 py-3 border-t ${
                    isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className="flex items-center gap-2">
                      {/* Attach File */}
                      <label
                        className={`p-2 rounded cursor-pointer ${
                          isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'
                        } transition-colors`}
                        title="Attach file"
                      >
                        <Paperclip className="w-4 h-4" />
                        <input
                          type="file"
                          multiple
                          onChange={(e) => setReplyAttachments([...replyAttachments, ...Array.from(e.target.files || [])])}
                          className="hidden"
                        />
                      </label>
                      <button
                        className={`p-2 rounded ${
                          isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'
                        } transition-colors`}
                        title="More options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setShowReplyComposer(false)
                          setReplyText('')
                        }}
                        className={`px-4 py-2 text-sm font-medium rounded-lg ${
                          isDarkMode
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        } transition-colors`}
                      >
                        Discard
                      </button>
                      <button
                        onClick={handleSendReply}
                        disabled={isSendingReply || !replyTo || !replyText}
                        className="px-6 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSendingReply && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSendingReply ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Minimized Composer */}
              {showReplyComposer && isMinimized && (
                <div 
                  onClick={() => setIsMinimized(false)}
                  className={`mt-6 px-4 py-3 rounded-lg border cursor-pointer ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 hover:bg-gray-750'
                      : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                  } transition-colors`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChevronUp className="w-4 h-4" />
                      <span className="text-sm font-medium">Reply to {sender}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowReplyComposer(false)
                        setReplyText('')
                      }}
                      className={`p-1 rounded ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                      } transition-colors`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Attachment Preview Modal */}
      {showPreview && previewAttachment && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div 
            className="relative max-w-6xl max-h-[90vh] w-full bg-white dark:bg-gray-900 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold truncate">
                  {previewAttachment.filename || previewAttachment.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatFileSize(previewAttachment.size)}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleDownload(previewAttachment)}
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="overflow-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
              {previewAttachment.mimeType?.startsWith('image/') ? (
                <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-800">
                  <AuthImage
                    src={previewAttachment.previewUrl}
                    alt={previewAttachment.filename || previewAttachment.name}
                    className="max-w-full max-h-[calc(90vh-120px)] object-contain"
                  />
                </div>
              ) : previewAttachment.mimeType === 'application/pdf' ? (
                <iframe
                  src={`${previewAttachment.previewUrl}#view=FitH`}
                  className="w-full"
                  style={{ height: 'calc(90vh - 120px)' }}
                  title="PDF Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <p>Preview not available for this file type</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} catch (error) {
  console.error('EmailContent rendering error:', error)
  return (
      <div className="flex items-center justify-center h-full p-6 bg-white">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error displaying email</h3>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <pre className="text-xs text-left bg-gray-100 p-3 rounded overflow-auto max-w-md">
            {JSON.stringify({ sender, subject, bodyLength: body?.length }, null, 2)}
          </pre>
        </div>
      </div>
    )
  }
}
