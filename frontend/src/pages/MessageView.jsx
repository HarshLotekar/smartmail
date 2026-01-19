import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Reply, ReplyAll, Forward, Archive, Trash2, Star, RefreshCw, Send, Paperclip, X, Bell, BellOff } from 'lucide-react'
import api, { mailAPI } from '../services/api'
import EmailContent from '../components/EmailContent'
import ReplyAllComposer from '../components/ReplyAllComposer'
import ForwardComposer from '../components/ForwardComposer'
import AIReplyBox from '../components/AIReplyBox'
import '../styles/email-content.css'

/**
 * MessageView Page Component
 * Displays full email content
 */

const MessageView = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  
  // State management
  const [email, setEmail] = useState(null)
  const [emailLoading, setEmailLoading] = useState(true)
  const [emailError, setEmailError] = useState(null)

  // Fetch email data (shared so we can refresh on demand)
  const refreshEmail = useCallback(async () => {
    if (!id) return
    try {
      setEmailLoading(true)
      setEmailError(null)
      
      const response = await mailAPI.getEmail(id)
      
      const emailData = response.data.message || response.data
      setEmail(emailData)
      
      console.log('Fetched email:', emailData)
      console.log('Email data keys:', Object.keys(emailData))
      console.log('Email subject:', emailData.subject)
      console.log('Email body_html:', emailData.body_html)
      console.log('AI Summary:', emailData.ai_summary)
      console.log('AI Reply:', emailData.ai_reply)
    } catch (err) {
      console.error('Failed to fetch email:', err)
      setEmailError(err.message)
    } finally {
      setEmailLoading(false)
    }
  }, [id])

  useEffect(() => {
    refreshEmail()
  }, [refreshEmail])

  // Mark email as read when opened
  useEffect(() => {
    if (email && !email.is_read) {
      mailAPI.markAsRead(id, true).catch(console.error)
    }
  }, [email, id])

  // Modal/composer states
  const [showReplyAll, setShowReplyAll] = useState(false)
  const [showForward, setShowForward] = useState(false)
  const [unsubscribeInfo, setUnsubscribeInfo] = useState(null)
  const [showUnsubscribeDialog, setShowUnsubscribeDialog] = useState(false)
  const [preFilledReplyText, setPreFilledReplyText] = useState('')
  const [showReply, setShowReply] = useState(false)
  const [replyAttachments, setReplyAttachments] = useState([])
  const fileInputRef = React.useRef(null)

  // Follow-up reminder state
  const [isDetectingFollowUp, setIsDetectingFollowUp] = useState(false)
  const [followUpResult, setFollowUpResult] = useState(null)
  const [showFollowUpNotification, setShowFollowUpNotification] = useState(false)

  const handleStar = async () => {
    if (!email) return
    try {
      const next = !email.is_starred
      setEmail(prev => ({ ...prev, is_starred: next }))
      await mailAPI.toggleStar(id, next)
    } catch (error) {
      console.error('Star toggle failed:', error)
      // revert on error
      setEmail(prev => ({ ...prev, is_starred: !prev.is_starred }))
    }
  }

  const handleDelete = async () => {
    if (!email) return
    
    if (window.confirm('Are you sure you want to delete this email?')) {
      try {
        await mailAPI.deleteEmail(id)
        navigate('/inbox')
      } catch (error) {
        console.error('Delete failed:', error)
      }
    }
  }

  const handleArchive = async () => {
    if (!email) return
    try {
      const next = !email.is_archived
      setEmail(prev => ({ ...prev, is_archived: next }))
      await mailAPI.archiveEmail(id, next)
    } catch (error) {
      console.error('Archive toggle failed:', error)
      setEmail(prev => ({ ...prev, is_archived: !prev.is_archived }))
    }
  }
  
  // Handle file attachment
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    setReplyAttachments(prev => [...prev, ...files])
  }
  
  const handleRemoveAttachment = (index) => {
    setReplyAttachments(prev => prev.filter((_, i) => i !== index))
  }
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Handle Reply All
  const handleSendReplyAll = async (data) => {
    try {
      await mailAPI.replyAll(id, data)
      alert('Reply sent successfully!')
    } catch (error) {
      console.error('Failed to send reply all:', error)
      throw error
    }
  }

  // Handle Follow-up Detection
  const handleDetectFollowUp = async () => {
    if (!email || isDetectingFollowUp) return
    
    try {
      setIsDetectingFollowUp(true)
      setFollowUpResult(null)
      
      const emailBody = email.body_text || email.body_html || email.snippet || ''
      
      const response = await api.post('/followups/detect', {
        emailId: email.id || email.message_id,
        subject: email.subject || '(No Subject)',
        body: emailBody,
        from: email.sender_email || email.from_email || email.from,
        date: email.date || email.received_at || email.created_at || new Date().toISOString()
      })
      
      if (response.data.success) {
        setFollowUpResult(response.data)
        setShowFollowUpNotification(true)
        
        // Auto-hide notification after 5 seconds
        setTimeout(() => {
          setShowFollowUpNotification(false)
        }, 5000)
      }
    } catch (error) {
      console.error('Failed to detect follow-up:', error)
      alert('Failed to analyze email for follow-up. Please try again.')
    } finally {
      setIsDetectingFollowUp(false)
    }
  }

  // Handle Forward
  const handleSendForward = async (data) => {
    try {
      await mailAPI.forward(id, data)
      alert('Email forwarded successfully!')
    } catch (error) {
      console.error('Failed to forward email:', error)
      throw error
    }
  }

  // Handle unsubscribe
  const handleUnsubscribe = async () => {
    if (!email) return
    
    try {
      // Get unsubscribe info
      const response = await mailAPI.getUnsubscribeInfo(id)
      const info = response.data
      
      if (!info.available) {
        alert('This email does not support unsubscribe.')
        return
      }
      
      setUnsubscribeInfo(info)
      setShowUnsubscribeDialog(true)
      
    } catch (error) {
      console.error('Failed to get unsubscribe info:', error)
      alert('Failed to check unsubscribe options.')
    }
  }

  const performUnsubscribe = async (method) => {
    try {
      const response = await mailAPI.unsubscribe(id, method)
      const result = response.data
      
      if (result.method === 'one-click') {
        alert('Successfully unsubscribed!')
        setShowUnsubscribeDialog(false)
      } else if (result.method === 'url') {
        // Open URL in new tab
        window.open(result.url, '_blank')
        alert('Please complete unsubscribe in the opened window.')
        setShowUnsubscribeDialog(false)
      } else if (result.method === 'mailto') {
        // Create mailto link
        window.location.href = `mailto:${result.email}`
        alert('Please send the email to complete unsubscribe.')
        setShowUnsubscribeDialog(false)
      }
      
    } catch (error) {
      console.error('Unsubscribe failed:', error)
      alert('Failed to unsubscribe. Please try again.')
    }
  }

  // Get all recipients for Reply All
  const getAllRecipients = () => {
    if (!email) return []
    
    const recipients = []
    
    // Add sender
    if (email.sender_email || email.from_email) {
      recipients.push({
        name: email.sender_name || email.from_name || '',
        email: email.sender_email || email.from_email
      })
    }
    
    // Add to addresses
    const toAddresses = email.to_addresses || []
    const toArray = Array.isArray(toAddresses) ? toAddresses : 
                    typeof toAddresses === 'string' ? toAddresses.split(',').map(s => s.trim()) : []
    
    toArray.forEach(addr => {
      if (typeof addr === 'string') {
        recipients.push({ email: addr.trim(), name: '' })
      } else if (addr.email) {
        recipients.push(addr)
      }
    })
    
    // Add cc addresses if available
    const ccAddresses = email.cc_addresses || []
    const ccArray = Array.isArray(ccAddresses) ? ccAddresses :
                    typeof ccAddresses === 'string' ? ccAddresses.split(',').map(s => s.trim()) : []
    
    ccArray.forEach(addr => {
      if (typeof addr === 'string') {
        recipients.push({ email: addr.trim(), name: '' })
      } else if (addr.email) {
        recipients.push(addr)
      }
    })
    
    // Remove duplicates
    const seen = new Set()
    return recipients.filter(r => {
      if (seen.has(r.email)) return false
      seen.add(r.email)
      return true
    })
  }

  if (emailLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center space-x-2 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading email...</span>
        </div>
      </div>
    )
  }

  if (emailError || !email) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load email</p>
          <div className="space-x-2">
            <button onClick={refreshEmail} className="btn-primary">
              Try Again
            </button>
            <button onClick={() => navigate('/inbox')} className="btn-secondary">
              Back to Inbox
            </button>
          </div>
        </div>
      </div>
    )
  }

  console.log('MessageView rendering with email:', email);
  console.log('Email fields:', {
    sender_name: email?.sender_name,
    from_name: email?.from_name,
    sender_email: email?.sender_email,
    from_email: email?.from_email,
    subject: email?.subject,
    body_html: email?.body_html ? 'present' : 'missing',
    body_text: email?.body_text ? 'present' : 'missing',
  });

  // Helper to safely parse attachments
  const parseAttachments = (attachments) => {
    if (!attachments) return []
    if (Array.isArray(attachments)) return attachments
    
    // Try to parse if it's a string
    if (typeof attachments === 'string') {
      try {
        const parsed = JSON.parse(attachments)
        return Array.isArray(parsed) ? parsed : []
      } catch (e) {
        console.error('Failed to parse attachments:', e)
        return []
      }
    }
    
    // If it's an object, wrap in array
    if (typeof attachments === 'object') {
      return [attachments]
    }
    
    return []
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Email Content - Left Side */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {/* Header */}
        <div className="border-b border-gray-200 p-4 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <button
                onClick={() => navigate('/inbox')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                title="Back to inbox"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900 truncate">
                {email?.subject || '(No Subject)'}
              </h1>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={handleDetectFollowUp}
                disabled={isDetectingFollowUp}
                className={`p-2 hover:bg-primary-50 rounded-lg transition-colors ${
                  isDetectingFollowUp ? 'opacity-50 cursor-not-allowed' : 'text-primary-600'
                }`}
                title="Detect Follow-up Reminder"
              >
                {isDetectingFollowUp ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Bell className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={handleStar}
                className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${
                  email.is_starred ? 'text-yellow-500' : 'text-gray-600'
                }`}
                title="Star (S)"
              >
                <Star className={`w-5 h-5 ${email.is_starred ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Follow-up Notification Banner */}
          {showFollowUpNotification && followUpResult && (
            <div className={`mx-4 mt-2 p-3 rounded-lg border-l-4 ${
              followUpResult.needsFollowUp
                ? 'bg-green-50 border-green-500'
                : 'bg-blue-50 border-blue-500'
            } animate-slide-down`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  {followUpResult.needsFollowUp ? (
                    <Bell className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <BellOff className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-semibold ${
                      followUpResult.needsFollowUp ? 'text-green-800' : 'text-blue-800'
                    }`}>
                      {followUpResult.needsFollowUp 
                        ? '✅ Follow-up Reminder Set!' 
                        : 'ℹ️ No Follow-up Needed'}
                    </p>
                    {followUpResult.needsFollowUp && followUpResult.followUp && (
                      <p className="text-sm text-gray-700 mt-1">
                        {followUpResult.followUp.reason} • 
                        <span className="font-medium ml-1 capitalize">{followUpResult.followUp.urgency}</span> urgency • 
                        <span className="ml-1">
                          {new Date(followUpResult.followUp.reminderDate).toLocaleDateString()}
                        </span>
                      </p>
                    )}
                    {!followUpResult.needsFollowUp && followUpResult.analysis && (
                      <p className="text-sm text-gray-600 mt-1">
                        This email doesn't require a follow-up reminder.
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowFollowUpNotification(false)}
                  className="p-1 hover:bg-white/50 rounded transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              {followUpResult.needsFollowUp && (
                <div className="mt-2 ml-8">
                  <button
                    onClick={() => navigate('/followups')}
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 underline"
                  >
                    View all follow-ups →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Email Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 py-6">
          <div className="max-w-full px-4">
            <EmailContent
              messageId={id}
              sender={email.is_sent ? 'You' : (email.sender_name || email.from_name || email.fromName || 'Unknown Sender')}
              senderEmail={email.sender_email || email.from_email || email.fromEmail || ''}
              subject={email.subject || '(No Subject)'}
              body={email.body_html || email.bodyHtml || email.body_text || email.bodyText || ''}
              timestamp={email.date || email.received_at || email.created_at || new Date().toISOString()}
              avatarUrl={null}
              attachments={parseAttachments(email.attachments).map(att => ({
                filename: att.filename || att.name || 'attachment',
                name: att.filename || att.name || 'attachment',
                size: att.size || 0,
                mimeType: att.mimeType || att.mime_type || 'application/octet-stream',
                attachmentId: att.attachmentId || att.attachment_id,
                url: att.url || att.download_url || '#'
              }))}
              labels={Array.isArray(email.labels) 
                ? email.labels.map(l => typeof l === 'object' ? (l.name || String(l)) : String(l))
                : (typeof email.labels === 'string' && email.labels.trim() 
                    ? (() => {
                        try {
                          const parsed = JSON.parse(email.labels);
                          return Array.isArray(parsed) ? parsed.map(l => typeof l === 'object' ? (l.name || String(l)) : String(l)) : [email.labels];
                        } catch (_) {
                          return [email.labels];
                        }
                      })()
                    : []
                  )
              }
              isUnread={!email.is_read}
              isSentEmail={email.is_sent || false}
              onReply={() => {
                if (email.is_sent) return; // Don't show reply for sent emails
                setShowReply(true)
                const storedReply = localStorage.getItem('smartmail_draft_reply')
                if (storedReply) {
                  setPreFilledReplyText(storedReply)
                  localStorage.removeItem('smartmail_draft_reply')
                }
              }}
              onReplyWithText={(text) => {
                if (email.is_sent) return; // Don't show reply for sent emails
                setPreFilledReplyText(text)
                setShowReply(true)
              }}
              onReplyAll={() => {
                if (email.is_sent) return; // Don't show reply for sent emails
                setShowReplyAll(true)
              }}
              onForward={() => setShowForward(true)}
              onUnsubscribe={handleUnsubscribe}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onMarkUnread={async () => {
                try {
                  await mailAPI.markAsRead(id, false);
                  setEmail(prev => ({ ...prev, is_read: false }));
                } catch (error) {
                  console.error('Mark unread failed:', error);
                }
              }}
              onSummaryGenerated={(summary) => {
                console.log('Summary generated:', summary)
                setAiSummary(summary)
              }}
              onReplyGenerated={(reply) => {
                console.log('Reply generated:', reply)
                setAiReply(reply)
              }}
            />
          </div>
        </div>
      </div>

      {/* Gmail-like Reply Composer */}
      {showReply && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-accent-300 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Reply className="w-5 h-5" />
                New Message
              </h3>
              <button
                onClick={() => {
                  setShowReply(false)
                  setPreFilledReplyText('')
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
              >
                ✕
              </button>
            </div>
            
            {/* Email Details */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 space-y-3">
              {/* To Field */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-600 w-16">To:</label>
                <div className="flex-1 bg-white px-3 py-2 rounded-lg border border-gray-200">
                  <span className="text-gray-900">{email.sender_email || email.from_email || 'Unknown'}</span>
                </div>
              </div>
              
              {/* Subject Field */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-600 w-16">Subject:</label>
                <div className="flex-1 bg-white px-3 py-2 rounded-lg border border-gray-200">
                  <span className="text-gray-900">Re: {email.subject || '(No Subject)'}</span>
                </div>
              </div>
            </div>
            
            {/* Message Body */}
            <div className="px-6 py-4">
              <textarea
                className="w-full border-0 focus:ring-2 focus:ring-primary-500 rounded-lg p-4 text-gray-700 min-h-[300px] resize-none bg-white"
                value={preFilledReplyText}
                onChange={(e) => setPreFilledReplyText(e.target.value)}
                placeholder="Type your message here..."
                autoFocus
                style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
              />
            </div>
            
            {/* Attachments List */}
            {replyAttachments.length > 0 && (
              <div className="px-6 pb-3">
                <div className="flex flex-wrap gap-2">
                  {replyAttachments.map((file, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg text-sm"
                    >
                      <Paperclip className="w-4 h-4 text-primary-600" />
                      <span className="text-gray-700 font-medium">{file.name}</span>
                      <span className="text-gray-500">({formatFileSize(file.size)})</span>
                      <button
                        onClick={() => handleRemoveAttachment(index)}
                        className="ml-1 p-0.5 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            
            {/* Footer with Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                  <span className="text-sm font-medium">Attach files</span>
                </button>
                <div className="text-sm text-gray-500">
                  {preFilledReplyText.length} characters
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReply(false)
                    setPreFilledReplyText('')
                    setReplyAttachments([])
                  }}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      // TODO: Implement actual send functionality via API
                      console.log('Sending reply:', {
                        to: email.sender_email || email.from_email,
                        subject: `Re: ${email.subject}`,
                        body: preFilledReplyText,
                        attachments: replyAttachments.map(f => f.name)
                      })
                      
                      // Placeholder - replace with actual API call
                      await new Promise(resolve => setTimeout(resolve, 500))
                      
                      alert('Reply sent successfully! (Demo mode)')
                      setShowReply(false)
                      setPreFilledReplyText('')
                      setReplyAttachments([])
                    } catch (error) {
                      console.error('Send failed:', error)
                      alert('Failed to send reply')
                    }
                  }}
                  disabled={!preFilledReplyText.trim()}
                  className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-accent-300 text-white rounded-lg hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Reply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reply All Composer Modal */}
      {showReplyAll && (
        <ReplyAllComposer
          emailId={id}
          recipients={getAllRecipients()}
          subject={`Re: ${email.subject || '(No Subject)'}`}
          originalBody={email.body_html || email.bodyHtml || email.body_text || email.bodyText || ''}
          onSend={handleSendReplyAll}
          onCancel={() => setShowReplyAll(false)}
        />
      )}

      {/* Forward Composer Modal */}
      {showForward && (
        <ForwardComposer
          emailId={id}
          originalEmail={{
            sender: email.sender_name || email.from_name || email.fromName || 'Unknown',
            date: email.date || email.received_at || email.created_at,
            subject: email.subject,
            body: email.body_html || email.bodyHtml || email.body_text || email.bodyText || '',
            attachments: parseAttachments(email.attachments)
          }}
          onSend={handleSendForward}
          onCancel={() => setShowForward(false)}
        />
      )}

      {/* Unsubscribe Dialog */}
      {showUnsubscribeDialog && unsubscribeInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Unsubscribe</h3>
            
            <p className="text-gray-700 mb-4">
              Do you want to unsubscribe from emails from <strong>{unsubscribeInfo.fromName || unsubscribeInfo.from}</strong>?
            </p>

            {unsubscribeInfo.methods.map((method, idx) => (
              <div key={idx} className="mb-3">
                {method.type === 'http' && method.oneClick && (
                  <button
                    onClick={() => performUnsubscribe('http')}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Unsubscribe (One-Click)
                  </button>
                )}
                {method.type === 'http' && !method.oneClick && (
                  <button
                    onClick={() => performUnsubscribe('http')}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Open Unsubscribe Page
                  </button>
                )}
                {method.type === 'mailto' && (
                  <button
                    onClick={() => performUnsubscribe('mailto')}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Send Unsubscribe Email
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() => setShowUnsubscribeDialog(false)}
              className="w-full px-4 py-2 mt-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageView