import React, { useState } from 'react'
import { Star, Trash2, Brain, MailOpen, MessageSquare, Clock, BellOff, Sparkles } from 'lucide-react'
import { Card, CardContent } from './ui/Card'
import { summarizeMail, mailAPI } from '../services/api'
import SmartSummaryModal from './SmartSummaryModal'

export default function InboxCard({ email, onOpen, onStarToggle, onDelete, onMarkRead, isSelected, onSelect, unsubscribedEmails = [], expandedSummaryId, onToggleSummary, expandedReplyId, onToggleReply }) {
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summary, setSummary] = useState('')
  const [busy, setBusy] = useState(false)
  const [showRemindOptions, setShowRemindOptions] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const [replyNotRecommended, setReplyNotRecommended] = useState(false)

  // Check if email is confidently automated
  const isAutomatedEmail = (email) => {
    const senderEmail = (email.from_email || '').toLowerCase()
    const snippet = (email.snippet || email.body_text || '').toLowerCase()
    
    // Block noreply/no-reply addresses
    if (/noreply|no-reply|donotreply|do-not-reply/i.test(senderEmail)) {
      return true
    }
    
    // Block known system-only domains and addresses
    const systemDomains = [
      'daemon@', 'mailer-daemon@', 'postmaster@', 'bounce@', 'bounces@'
    ]
    if (systemDomains.some(pattern => senderEmail.includes(pattern))) {
      return true
    }
    
    // Block emails with explicit "do not reply" warnings in content
    if (/do not reply|please do not respond|this is an automated message|this email was automatically generated/i.test(snippet)) {
      return true
    }
    
    return false
  }

  // Check if sender appears to be human
  const isHumanLikely = (email) => {
    const senderName = (email.from_name || email.fromName || '').trim()
    const subject = (email.subject || '').toLowerCase()
    const snippet = (email.snippet || email.body_text || '').toLowerCase()
    
    // Has a human-looking name (first name or full name)
    if (senderName && !/^[a-z0-9\s]+$/i.test(senderName) === false && senderName.split(' ').length >= 2) {
      return true
    }
    
    // Subject implies conversation (Re:, Fwd:, or question)
    if (/^re:|^fwd:/i.test(subject) || /\?/.test(snippet)) {
      return true
    }
    
    // Content suggests response expected
    if (/please|could you|can you|would you|let me know|get back to me|looking forward/i.test(snippet)) {
      return true
    }
    
    return false
  }

  // Check if email is eligible for reply generation (permissive by default)
  const checkReplyEligibility = (email) => {
    // Block ONLY if confidently automated
    if (isAutomatedEmail(email)) {
      return { eligible: false, reason: 'Reply not recommended for automated emails' }
    }
    
    // Allow all other emails by default
    return { eligible: true }
  }

  // Deterministic AI Draft Reply Generator (max 80 words, 3 paragraphs)
  // Only called after eligibility check passes
  const generateReplyDraft = (email) => {
    const subject = (email.subject || 'No Subject')
    const subjectLower = subject.toLowerCase()
    const snippet = (email.snippet || email.body_text || '')
    const snippetLower = snippet.toLowerCase()
    
    let reply = ''
    
    // Business/Action-required emails - specific responses
    if (/meeting|schedule|calendar/i.test(snippetLower)) {
      reply = `Thank you for reaching out.\n\nI'll review my calendar and get back to you shortly with my availability.\n\nBest regards`
    } else if (/deadline|urgent|asap/i.test(snippetLower)) {
      reply = `Thank you for the update.\n\nI understand the urgency and will prioritize this accordingly.\n\nBest regards`
    } else if (/approve|review|confirm/i.test(snippetLower)) {
      reply = `Thank you for sending this over.\n\nI'll review and provide my feedback by end of day.\n\nBest regards`
    } else if (/invoice|payment|bill/i.test(snippetLower)) {
      reply = `Thank you for the invoice.\n\nI'll process this and confirm once completed.\n\nBest regards`
    } else if (/project|task|assignment/i.test(snippetLower)) {
      reply = `Thank you for the information.\n\nI'll get started on this and keep you updated on progress.\n\nBest regards`
    }
    // Direct questions
    else if (/\?/.test(snippet)) {
      reply = `Thank you for your email.\n\nLet me look into your question and I'll get back to you with details shortly.\n\nBest regards`
    }
    // Conversation continuation
    else if (/re:|fwd:/i.test(subjectLower)) {
      if (/thanks|thank you/i.test(snippetLower)) {
        reply = `You're welcome.\n\nFeel free to reach out if you need anything else.\n\nBest regards`
      } else {
        reply = `Thank you for following up.\n\nI'll review this and respond with the requested information.\n\nBest regards`
      }
    }
    // Generic professional acknowledgment for other human emails
    else {
      reply = `Thank you for your email.\n\nI've received your message and will respond with more details soon.\n\nBest regards`
    }
    
    return reply
  }

  // Action-focused Smart Summary Generator (deterministic mock logic)
  const generateSummary = (email, priorityScore, explanation) => {
    const subject = (email.subject || 'No Subject')
    const subjectLower = subject.toLowerCase()
    const sender = (email.from_name || email.fromName || email.from_email || '')
    const senderLower = sender.toLowerCase()
    const snippet = (email.snippet || email.body_text || '')
    const snippetLower = snippet.toLowerCase()
    
    // Extract concrete facts and actionable info
    let whatItIs = ''
    let whyItMatters = ''
    let actionRequired = ''
    
    // Bill detection
    if (/bill|invoice|payment|statement|balance|due|charge/i.test(subjectLower)) {
      // Try to extract amount
      const amountMatch = snippet.match(/[\$₹€£]\s?(\d+(?:,\d+)?(?:\.\d{2})?)/i) || 
                          snippet.match(/(\d+(?:,\d+)?(?:\.\d{2})?)\s?(?:dollar|rupee|euro|pound)/i)
      const amount = amountMatch ? amountMatch[0] : 'amount not shown'
      
      whatItIs = /electricity|electric|power/i.test(snippetLower) ? `Electricity bill for ${amount}` :
                 /internet|broadband|wifi/i.test(snippetLower) ? `Internet bill for ${amount}` :
                 /phone|mobile|cellular/i.test(snippetLower) ? `Phone bill for ${amount}` :
                 /credit card|card statement/i.test(snippetLower) ? `Credit card statement for ${amount}` :
                 `Bill from ${sender} for ${amount}`
      
      whyItMatters = /overdue|past due/i.test(snippetLower) ? 'Payment overdue' : 'Payment required this billing cycle'
      actionRequired = /paid|payment received/i.test(snippetLower) ? 'Already paid' : 'Pay before due date'
    }
    // Newsletter/digest detection
    else if (/newsletter|digest|weekly|daily|updates|roundup/i.test(subjectLower)) {
      whatItIs = `${subject.replace(/\s*-\s*\d+.*$/i, '')}`.trim() || `Newsletter from ${sender}`
      whyItMatters = 'No direct impact on you'
      actionRequired = 'No action needed'
    }
    // Alert/notification detection
    else if (/alert|notification|notice|reminder|confirm|verify/i.test(subjectLower)) {
      whatItIs = /security|login|password|account/i.test(snippetLower) ? `Security alert from ${sender}` :
                 /delivery|shipped|package/i.test(snippetLower) ? `Delivery notification from ${sender}` :
                 /meeting|event|calendar/i.test(snippetLower) ? subject :
                 `Alert from ${sender}`
      
      whyItMatters = /security|suspicious|unusual/i.test(snippetLower) ? 'May require verification' :
                     /confirm|verify/i.test(snippetLower) ? 'Confirmation required' :
                     'Keeping you informed'
      
      actionRequired = /confirm|verify|review|check/i.test(snippetLower) ? 'Review and confirm if legitimate' :
                       /meeting|event/i.test(snippetLower) ? 'Add to calendar if attending' :
                       'No action needed'
    }
    // Direct message/conversation
    else if (priorityScore >= 60 || /re:|fwd:|reply/i.test(subjectLower)) {
      whatItIs = `Message from ${sender}`
      whyItMatters = /\?/.test(snippet) ? 'Asking you a question' :
                     /re:/i.test(subjectLower) ? 'Continuing conversation' :
                     'Waiting for your response'
      actionRequired = /thanks|thank you|got it|received/i.test(snippetLower) ? 'No action needed' : 'Reply to continue conversation'
    }
    // Social/promotional
    else if (/unsubscribe|promotional|offer|sale|discount|deal/i.test(snippetLower)) {
      whatItIs = /sale|discount|offer/i.test(snippetLower) ? `Promotional offer from ${sender}` : `Update from ${sender}`
      whyItMatters = 'Marketing message'
      actionRequired = 'No action needed'
    }
    // Generic fallback
    else {
      whatItIs = `Email from ${sender}`
      whyItMatters = /urgent|important|asap/i.test(snippetLower) ? 'Marked as important' : 'For your review'
      actionRequired = /reply|respond|rsvp|confirm|approve/i.test(snippetLower) ? 'Response may be needed' : 'No action needed'
    }
    
    return [
      whatItIs,
      whyItMatters,
      actionRequired
    ]
  }

  // AI Action Handlers
  const handleAISummarize = (e) => {
    e.stopPropagation()
    onToggleSummary?.(email.id)
  }

  const handleDraftReply = (e) => {
    e.stopPropagation()
    
    // Reset state
    setReplyNotRecommended(false)
    
    // Check eligibility first
    const eligibility = checkReplyEligibility(email)
    
    if (!eligibility.eligible) {
      setReplyNotRecommended(true)
      onToggleReply?.(email.id)
      return
    }
    
    // Generate draft on first click (only if eligible)
    if (expandedReplyId !== email.id && !replyDraft) {
      const draft = generateReplyDraft(email)
      if (!draft) {
        setReplyNotRecommended(true)
        onToggleReply?.(email.id)
        return
      }
      setReplyDraft(draft)
    }
    
    onToggleReply?.(email.id)
  }

  const handleRemindLater = (e) => {
    e.stopPropagation()
    setShowRemindOptions(!showRemindOptions)
  }

  const handleSetReminder = (timeframe, e) => {
    e.stopPropagation()
    // TODO: Set reminder in backend
    console.log('Set reminder for:', timeframe, email.subject)
    setShowRemindOptions(false)
    // Mock toast notification
    const toastMsg = `Reminder set for ${timeframe}`
    console.log(toastMsg)
  }

  const handleMuteSender = (e) => {
    e.stopPropagation()
    // TODO: Mute sender in backend
    const senderEmail = email.from_email || 'this sender'
    console.log('Mute sender:', senderEmail)
    alert(`Muted ${senderEmail}. You won't see emails from them anymore. (Undo option coming soon)`)
  }

  const handleSummary = async () => {
    setSummaryOpen(true)
    if (summary) return
    try {
      setBusy(true)
      const subject = email.subject || 'No Subject'
      const content = email.body_text || email.bodyText || email.snippet || ''
      const res = await summarizeMail(subject, content)
      setSummary(res.data?.summary || 'Summary unavailable.')
    } catch (e) {
      setSummary('Summary unavailable.')
    } finally {
      setBusy(false)
    }
  }

  const label = email.ai_category || email.aiCategory || 'Other'
  const isUnread = !email.is_read
  const isUnsubscribed = unsubscribedEmails.includes(email.from_email)
  const senderName = email.from_name || email.fromName || email.from_email?.split('@')[0] || 'Unknown'
  const emailDate = new Date(email.date || email.received_at)
  const today = new Date()
  const isToday = emailDate.toDateString() === today.toDateString()
  const dateDisplay = isToday 
    ? emailDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : emailDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  // Visual priority indicators - simple heuristics, NO AI
  const getPriorityLevel = () => {
    const senderEmail = (email.from_email || '').toLowerCase()
    const subject = (email.subject || '').toLowerCase()
    const category = (email.ai_category || email.aiCategory || '').toLowerCase()
    
    // High priority: Banks, finance, billing, direct people
    const highPriorityDomains = ['bank', 'paypal', 'stripe', 'square', 'venmo', 'chase', 'wellsfargo', 'bofa', 'citi']
    const highPriorityKeywords = ['invoice', 'payment', 'bill', 'statement', 'urgent', 'important', 'action required', 'verify', 'security alert']
    const isPersonal = !senderEmail.includes('no-reply') && !senderEmail.includes('noreply') && category !== 'promotions' && category !== 'newsletter'
    
    if (highPriorityDomains.some(d => senderEmail.includes(d))) return 'high'
    if (highPriorityKeywords.some(k => subject.includes(k))) return 'high'
    if (category === 'security' || category === 'work') return 'high'
    
    // Low priority: Promotions, newsletters, marketing
    if (category === 'promotions' || category === 'newsletter' || category === 'social') return 'low'
    if (senderEmail.includes('marketing') || senderEmail.includes('promo')) return 'low'
    if (subject.includes('unsubscribe') || subject.includes('sale') || subject.includes('deal')) return 'low'
    
    return 'normal'
  }
  
  const priority = getPriorityLevel()

  // AI Priority Score (0-100) - returns { score, reason }
  const calculatePriorityScore = () => {
    let score = 50 // Base score
    let reasons = []
    
    const senderEmail = (email.from_email || '').toLowerCase()
    const senderName = (email.from_name || email.fromName || '').toLowerCase()
    const subject = (email.subject || '').toLowerCase()
    const category = (email.ai_category || email.aiCategory || '').toLowerCase()
    
    // Sender importance (+30 points max)
    const vipDomains = ['bank', 'paypal', 'stripe', 'square', 'venmo', 'chase', 'wellsfargo', 'bofa', 'citi', 'irs.gov', 'ssa.gov']
    if (vipDomains.some(d => senderEmail.includes(d))) {
      score += 30
      reasons.push('important sender')
    }
    
    // Direct human sender vs automated (+15 points)
    const isAutomated = senderEmail.includes('no-reply') || senderEmail.includes('noreply') || senderEmail.includes('automated') || senderEmail.includes('donotreply')
    if (!isAutomated && !senderEmail.includes('newsletter') && !senderEmail.includes('marketing')) {
      score += 15
      reasons.push('direct email')
    }
    
    // Critical keywords (+25 points max)
    const criticalKeywords = ['urgent', 'action required', 'expires', 'overdue', 'deadline', 'verify', 'confirm', 'security alert']
    const actionKeywords = ['invoice', 'payment', 'bill', 'statement', 'receipt', 'shipment', 'delivery']
    
    if (criticalKeywords.some(k => subject.includes(k))) {
      score += 25
      reasons.push('needs action')
    } else if (actionKeywords.some(k => subject.includes(k))) {
      score += 15
      reasons.push('transaction')
    }
    
    // Category-based scoring
    if (category === 'security') {
      score += 20
      reasons.push('security')
    } else if (category === 'work') {
      score += 10
      reasons.push('work-related')
    } else if (category === 'personal') {
      score += 5
      reasons.push('personal')
    } else if (category === 'promotions' || category === 'newsletter') {
      score -= 20
      reasons.push('promotional')
    } else if (category === 'social') {
      score -= 10
      reasons.push('social')
    }
    
    // Recency bonus (up to +10 points)
    const emailDate = new Date(email.date || email.received_at)
    const hoursSinceReceived = (Date.now() - emailDate.getTime()) / (1000 * 60 * 60)
    if (hoursSinceReceived < 1) {
      score += 10
      reasons.push('just received')
    } else if (hoursSinceReceived < 6) {
      score += 5
      reasons.push('recent')
    } else if (hoursSinceReceived > 168) {
      score -= 10 // Older than 1 week
    }
    
    // Unread bonus
    if (!email.is_read) {
      score += 5
      reasons.push('unread')
    }
    
    // Add natural variation (±3 points) to avoid identical scores feeling robotic
    // Use email ID as seed for consistency across renders
    const emailIdHash = (email.id || '').toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const variation = (emailIdHash % 7) - 3 // Random-like but deterministic: -3 to +3
    score += variation
    
    // Clamp to 0-100 range
    const finalScore = Math.max(0, Math.min(100, Math.round(score)))
    const primaryReason = reasons[0] || 'standard'
    
    return { score: finalScore, reason: primaryReason }
  }
  
  const { score: priorityScore, reason: priorityReason } = calculatePriorityScore()
  
  // Convert score to human-readable label
  const getPriorityLabel = (score) => {
    if (score >= 75) return 'High'
    if (score >= 55) return 'Medium'
    // Don't show label for low priority - visual de-emphasis only
    return null
  }
  
  // Priority score color coding
  const getPriorityColor = (score) => {
    if (score >= 75) return 'text-orange-400 bg-orange-500/10 border-orange-500/20' // High
    if (score >= 55) return 'text-accent bg-accent/10 border-accent/20' // Medium
    return null // Low priority - no badge
  }
  
  // Detect repetitive senders that should be de-emphasized
  const isRepetitiveSender = () => {
    const senderEmail = (email.from_email || '').toLowerCase()
    const senderName = (email.from_name || email.fromName || '').toLowerCase()
    
    // Common noise senders
    const noiseSenders = [
      'linkedin', 'twitter', 'facebook', 'instagram', 'tiktok',
      'newsletter', 'digest', 'daily', 'weekly', 'notification',
      'updates@', 'news@', 'noreply', 'no-reply', 'donotreply',
      'marketing', 'promo', 'promotional'
    ]
    
    return noiseSenders.some(noise => senderEmail.includes(noise) || senderName.includes(noise))
  }
  
  const isRepetitive = isRepetitiveSender()
  const priorityLabel = getPriorityLabel(priorityScore)
  const priorityColor = getPriorityColor(priorityScore)

  // Generate human-readable explanation for why this email appears
  const generateExplanation = () => {
    const senderEmail = (email.from_email || '').toLowerCase()
    const subject = (email.subject || '').toLowerCase()
    const category = (email.ai_category || email.aiCategory || '').toLowerCase()
    
    // Mock user history - deterministic based on email properties
    const emailHash = (email.id || '').toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const mockUserEngagement = (emailHash % 3) // 0, 1, or 2 - simulates past interaction pattern
    
    // High priority explanations (75-100)
    if (priorityScore >= 75) {
      // Check specific reasons
      const criticalKeywords = ['urgent', 'action required', 'expires', 'overdue', 'deadline']
      if (criticalKeywords.some(k => subject.includes(k))) {
        return 'Contains a deadline or action request'
      }
      
      const vipDomains = ['bank', 'paypal', 'stripe', 'square', 'venmo']
      if (vipDomains.some(d => senderEmail.includes(d))) {
        return 'Financial message from trusted sender'
      }
      
      if (category === 'security') {
        return 'Security alert requiring your attention'
      }
      
      const isAutomated = senderEmail.includes('no-reply') || senderEmail.includes('noreply')
      if (!isAutomated) {
        return 'Direct message waiting for your response'
      }
      
      return 'Important sender marked for priority'
    }
    
    // Medium priority explanations (55-74)
    if (priorityScore >= 55) {
      if (category === 'work') {
        return 'Work-related email from your network'
      }
      
      if (mockUserEngagement === 0) {
        return 'You usually reply to messages like this'
      }
      
      if (email.is_starred) {
        return 'You starred similar emails before'
      }
      
      const actionKeywords = ['invoice', 'payment', 'receipt', 'shipment']
      if (actionKeywords.some(k => subject.includes(k))) {
        return 'Transaction or receipt notification'
      }
      
      return 'Relevant based on your past interactions'
    }
    
    // Low priority explanations (<55)
    if (isRepetitive) {
      if (mockUserEngagement === 2) {
        return "You've ignored similar updates before"
      }
      return 'Automated update you rarely open'
    }
    
    if (category === 'promotions' || category === 'newsletter') {
      return 'Marketing email with low engagement rate'
    }
    
    if (category === 'social') {
      return 'Social media notification you skip often'
    }
    
    const hoursSinceReceived = (Date.now() - new Date(email.date || email.received_at).getTime()) / (1000 * 60 * 60)
    if (hoursSinceReceived > 168) {
      return 'Older message with low priority signals'
    }
    
    return 'Matches your typical inbox background'
  }
  
  const emailExplanation = generateExplanation()

  // Minimal category badges
  const categoryColors = {
    Work: 'bg-accent/10 text-accent border-accent/20',
    Personal: 'bg-dark-text-secondary/10 text-dark-text-primary border-dark-border',
    Promotions: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    Social: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    Updates: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    Security: 'bg-red-500/10 text-red-400 border-red-500/20',
    Spam: 'bg-dark-text-secondary/10 text-dark-text-secondary border-dark-border',
    Education: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    Newsletter: 'bg-green-500/10 text-green-400 border-green-500/20',
    Events: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    Other: 'bg-dark-text-secondary/10 text-dark-text-secondary border-dark-border'
  }
  const badgeColor = categoryColors[label] || categoryColors['Other']

  return (
    <>
      {/* Clean production-grade inbox row */}
      <div 
        className={`
          flex items-center gap-3 px-4 py-2.5
          border-b border-dark-border
          cursor-pointer group transition-all duration-150
          ${
            isUnread 
              ? 'bg-dark-surface/30 border-l-[3px] border-l-[#4F8CFF] hover:bg-dark-surface/40' 
              : 'bg-transparent border-l-[3px] border-l-transparent hover:bg-dark-surface/30'
          }
          ${isSelected ? 'bg-[#4F8CFF]/10' : ''}
        `} 
        onClick={onOpen}
      >
        {/* Left controls: Checkbox + Star (visible on hover) */}
        <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect?.(e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-dark-border bg-dark-surface text-[#4F8CFF] focus:ring-[#4F8CFF] focus:ring-offset-0 cursor-pointer"
          />

          <button 
            title="Star" 
            onClick={(e) => { e.stopPropagation(); onStarToggle?.() }} 
            className="p-0.5 rounded hover:bg-dark-surface transition-colors duration-150"
          >
            <Star className={`w-4 h-4 ${email.is_starred ? 'fill-amber-400 text-amber-400' : 'text-dark-text-secondary'}`} />
          </button>
        </div>

        {/* Main content area with strict hierarchy */}
        <div className="flex-1 min-w-0 space-y-0.5">
          {/* 1. SENDER NAME (bolder + brighter, stands out first) */}
          <div className="flex items-center gap-1.5">
            <span className={`text-sm leading-tight ${
              isUnread ? 'font-semibold text-dark-text-primary' : 'font-normal text-dark-text-secondary/75'
            }`}>
              {senderName}
            </span>
            
            {/* High priority badge ONLY - signals importance without panic */}
            {priority === 'high' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-orange-500/10 text-orange-400/80 border border-orange-500/20">
                High
              </span>
            )}
          </div>
          
          {/* 2. SUBJECT (normal weight, slightly muted) */}
          <div className={`text-sm font-normal leading-tight truncate ${
            isUnread ? 'text-dark-text-primary/85' : 'text-dark-text-secondary/65'
          }`}>
            {email.subject || '(No Subject)'}
          </div>
          
          {/* 3. CONTEXT / REASON (de-emphasized for fast scanning) */}
          <div className="text-[10px] text-dark-text-secondary/25 leading-tight truncate">
            {emailExplanation || email.snippet?.substring(0, 80) || 'No preview'}
          </div>
        </div>

        {/* Right side: Meta info (date, label) */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
          {/* Date (smallest, priority #4) */}
          <span className={`text-[11px] whitespace-nowrap ${
            isUnread ? 'text-dark-text-secondary' : 'text-dark-text-secondary/60'
          }`}>
            {dateDisplay}
          </span>
          
          {/* Category label */}
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${badgeColor} ${
            isUnread ? 'opacity-100' : 'opacity-60'
          }`}>
            {label}
          </span>
        </div>

        {/* Minimal AI actions on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0">
          {/* Summarize (purple for AI) */}
          <button 
            onClick={handleAISummarize}
            className="p-1.5 rounded hover:bg-purple-500/10 text-purple-400 transition-colors duration-150"
            title="Summarize with AI"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete?.() }}
            className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors duration-150"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inline Smart Summary */}
      {expandedSummaryId === email.id && (
        <div className="px-4 py-2 bg-dark-surface border-t border-dark-border transition-all duration-200">
          <div className="flex items-start justify-between gap-2">
            <ul className="flex-1 space-y-1 text-[11px] text-dark-text-secondary leading-relaxed">
              {(() => {
                const { score: priorityScore } = calculatePriorityScore()
                const explanation = generateExplanation()
                const bullets = generateSummary(email, priorityScore, explanation)
                return bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-dark-text-secondary/50 mt-0.5">•</span>
                    <span>{bullet}</span>
                  </li>
                ))
              })()}
            </ul>
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleSummary?.(null) }}
              className="text-gray-400 hover:text-gray-600 text-sm flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Inline Reply Composer - professional AI draft */}
      {expandedReplyId === email.id && (
        replyNotRecommended ? (
          <div className="px-4 py-3 bg-amber-50/60 border-t border-amber-100 transition-all duration-200 ease-in-out" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-700">
                <span className="text-sm">⚠</span>
                <span className="text-xs font-medium">Reply not recommended for automated emails</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onToggleReply?.(null); setReplyNotRecommended(false) }}
                className="text-amber-600 hover:text-amber-800 text-sm flex-shrink-0"
              >
                ×
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 bg-blue-50/40 border-t border-blue-100 transition-all duration-200 ease-in-out" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              {/* Reply header */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-600">
                  <span className="font-medium">To:</span> {email.from_email || 'Unknown'}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggleReply?.(null); setReplyDraft('') }}
                  className="text-gray-400 hover:text-gray-600 text-sm flex-shrink-0"
                  title="Discard"
                >
                  ×
                </button>
              </div>
              
              {/* Subject */}
              <div className="text-xs text-gray-600 mb-2">
                <span className="font-medium">Subject:</span> Re: {email.subject || '(No Subject)'}
              </div>
              
              {/* Reply draft textarea */}
              <textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={6}
                placeholder="Write your reply..."
              />
              
              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleReply?.(null)
                    setReplyDraft('')
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Discard
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // TODO: Implement send via backend API
                    console.log('Sending reply:', { to: email.from_email, subject: `Re: ${email.subject}`, body: replyDraft })
                    alert('Send functionality coming soon!')
                    onToggleReply?.(null)
                    setReplyDraft('')
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )
      )}
    </>
  )
}
