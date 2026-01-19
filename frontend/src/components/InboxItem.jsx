
import React, { useState } from "react"
import { motion } from "framer-motion"
import { ChevronDown, ChevronUp } from "lucide-react"

const InboxItem = ({ email, selected, onSelect, onClick }) => {
  const [showReason, setShowReason] = useState(false)
  
  const getSenderName = () => {
    const senderName = email.sender_name || email.from_name || email.fromName
    const senderEmail = email.sender_email || email.from_email || email.fromEmail
    
    if (senderName && senderName.trim()) return senderName.trim()
    if (senderEmail) return senderEmail.split("@")[0]
    return "Unknown Sender"
  }

  const getInitials = (name) => {
    return name
      .split(" ")
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("")
  }

  // REFACTOR: Neutral avatar colors with subtle grays
  const getAvatarColor = (name) => {
    const colors = ['bg-gray-600', 'bg-slate-600', 'bg-zinc-600', 'bg-stone-600', 'bg-neutral-600']
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return "Today"
    if (diffDays === 2) return "Yesterday"
    if (diffDays <= 7) return `${diffDays - 1} days ago`
    return date.toLocaleDateString()
  }

  const senderName = getSenderName()
  const initials = getInitials(senderName)
  const avatarColor = getAvatarColor(senderName)
  // Always show a colored badge for ai_category (with fallback)
  const aiCategory = email.ai_category || email.aiCategory || 'Updates'
  // Try to parse labels if stored as JSON string
  let parsedLabels = []
  if (typeof email.labels === 'string') {
    try { parsedLabels = JSON.parse(email.labels) } catch (_) {}
  } else if (Array.isArray(email.labels)) {
    parsedLabels = email.labels
  }
  
  // REFACTOR: Subtle, bordered badges instead of bold solid colors
  // Purple only used as accent for Personal category
  const categoryColors = {
    Work: 'bg-blue-50 text-blue-700 border-blue-200',
    Personal: 'bg-purple-50 text-purple-700 border-purple-200',
    Promotions: 'bg-orange-50 text-orange-700 border-orange-200',
    Social: 'bg-pink-50 text-pink-700 border-pink-200',
    Updates: 'bg-teal-50 text-teal-700 border-teal-200',
    Security: 'bg-red-50 text-red-700 border-red-200',
    Spam: 'bg-gray-50 text-gray-600 border-gray-200',
    Education: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Newsletter: 'bg-green-50 text-green-700 border-green-200',
    Events: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    Other: 'bg-gray-50 text-gray-600 border-gray-200'
  }
  // Canonicalize for color lookup
  const canonicalCat = (aiCategory || '').toString().trim().replace(/\s+/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  const badgeColor = categoryColors[canonicalCat] || categoryColors['Other']

  // Decision badge colors
  const decisionColors = {
    reply_required: 'bg-red-100 text-red-700 border-red-300',
    deadline: 'bg-orange-100 text-orange-700 border-orange-300',
    follow_up: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    informational_only: 'bg-gray-100 text-gray-600 border-gray-300'
  }

  const decisionLabels = {
    reply_required: 'Reply Needed',
    deadline: 'Deadline',
    follow_up: 'Follow Up',
    informational_only: 'Info Only'
  }

  const hasDecision = email.decision_required && email.decision_type
  const decisionBadgeColor = hasDecision ? decisionColors[email.decision_type] : ''
  const decisionBadgeLabel = hasDecision ? decisionLabels[email.decision_type] : ''

  return (
    // REFACTOR: Subject-first hierarchy for faster scanning
    // Clean white background, reduced border radius, subtle shadow
    // Purple accent only for selected state
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        flex items-start p-3 mb-2 rounded-lg border 
        bg-white hover:bg-gray-50 transition-all cursor-pointer
        ${selected ? "ring-2 ring-purple-500 border-purple-200" : "border-gray-200 shadow-sm"}
      `}
      onClick={onClick}
      style={{ minHeight: 64 }}
    >
      {/* Avatar - neutral color, compact */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-3 flex-shrink-0 ${avatarColor}`}>
        {initials}
      </div>
      
      {/* Main content - subject-first layout */}
      <div className="flex-1 min-w-0">
        {/* PRIORITY 1: Subject line - bold, primary focus */}
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <h3 className="text-sm font-bold text-gray-900 truncate flex-1">
            {email.subject || "No Subject"}
          </h3>
          {/* Date - smallest text, right-aligned, muted */}
          <span className="text-[11px] text-gray-400 flex-shrink-0">
            {formatDate(email.date || email.received_date)}
          </span>
        </div>
        
        {/* PRIORITY 2: Sender (medium weight) + Preview (muted) */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-medium text-xs text-gray-600 flex-shrink-0">{senderName}</span>
          <span className="text-xs text-gray-400 truncate flex-1">
            {email.preview || email.snippet || "No preview available"}
          </span>
        </div>
        
        {/* PRIORITY 3: Category badges - muted, visually secondary */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Decision Badge */}
          {hasDecision && (
            <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border font-bold ${decisionBadgeColor}`}>
              {decisionBadgeLabel}
            </span>
          )}
          
          {aiCategory && (
            <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border font-medium ${badgeColor} opacity-60`}>
              {aiCategory}
            </span>
          )}
          {parsedLabels && parsedLabels.length > 0 && (
            <span className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 opacity-70">
              {typeof parsedLabels[0] === 'object' ? parsedLabels[0].name : String(parsedLabels[0])}
            </span>
          )}
        </div>

        {/* Expandable "Why this?" Reason - Collapsed by default */}
        {hasDecision && (
          <div className="mt-2 border-t border-gray-200 pt-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowReason(!showReason)
              }}
              className="flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-700 font-medium"
            >
              {showReason ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Why this?
            </button>
            {showReason && (
              <p className="mt-1 text-[11px] text-gray-600 pl-4">
                {email.decision_reason || 'Marked based on message content.'}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default InboxItem
