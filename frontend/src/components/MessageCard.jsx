
import React, { useState } from 'react'
import { Star, ChevronDown, ChevronUp } from 'lucide-react'
import DOMPurify from 'dompurify'
import clsx from 'clsx'
import { motion } from 'framer-motion'

/**
 * MessageCard Component
 * Displays full email content with rich formatting
 * REFACTOR: Clean white surface, reduced visual noise, minimal borders/shadows
 */
const MessageCard = ({ subject, sender, date, to, labels, bodyHTML, bodyText, isStarred, onStar, className, attachments, aiCategory }) => {
  const [expanded, setExpanded] = useState(true);

  // Normalize labels to an array of strings
  let safeLabels = [];
  if (Array.isArray(labels)) {
    safeLabels = labels.map(l => (typeof l === 'object' && l !== null ? (l.name || String(l)) : String(l)));
  } else if (typeof labels === 'string' && labels.trim()) {
    try {
      const parsed = JSON.parse(labels);
      if (Array.isArray(parsed)) {
        safeLabels = parsed.map(l => (typeof l === 'object' && l !== null ? (l.name || String(l)) : String(l)));
      }
    } catch (_) {
      // treat plain string as single label
      safeLabels = [labels];
    }
  }

  // Normalize attachments to an array of objects
  let safeAttachments = [];
  if (Array.isArray(attachments)) {
    safeAttachments = attachments;
  } else if (attachments && typeof attachments === 'string') {
    try {
      const parsed = JSON.parse(attachments);
      if (Array.isArray(parsed)) safeAttachments = parsed;
    } catch (_) {
      // ignore if not JSON
      safeAttachments = [];
    }
  } else if (attachments && typeof attachments === 'object') {
    safeAttachments = [attachments];
  }

  // Debug logging
  console.log('MessageCard props:', { subject, sender, bodyHTML, attachments });

  return (
    // REFACTOR: Clean white background, minimal border radius (lg instead of 3xl)
    // Remove gradient background, reduce padding, subtle border
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={clsx(
        "max-w-4xl mx-auto p-6 rounded-lg border border-gray-200 bg-white",
        className
      )}
    >
      {/* Header - reduced spacing, cleaner hierarchy */}
      <div className="border-b border-gray-200 pb-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          {/* REFACTOR: Reduced heading size for less visual weight */}
          <h1 className="text-xl font-semibold text-gray-900 mb-1">{subject || '(No Subject)'}</h1>
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <span>From <span className="font-medium text-gray-800">{sender}</span></span>
            <span className="hidden sm:inline">·</span>
            <span>{date}</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          {/* REFACTOR: Purple accent for star action button */}
          <button onClick={onStar} className="p-2 hover:bg-purple-50 rounded-lg transition-colors" title="Star">
            <Star className={clsx('w-5 h-5', isStarred ? 'text-amber-500 fill-current' : 'text-gray-400')} />
          </button>
        </div>
      </div>

      {/* Metadata - subtle bordered badges */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
        {/* REFACTOR: Purple accent only for Personal category badge */}
        {aiCategory && (
          <span className={`px-2 py-1 rounded text-xs font-medium border ${
            aiCategory.toLowerCase() === 'personal' 
              ? 'bg-purple-50 text-purple-700 border-purple-200' 
              : 'bg-gray-50 text-gray-700 border-gray-200'
          }`}>
            {aiCategory}
          </span>
        )}
        {safeLabels && safeLabels.length > 0 && safeLabels.map((label, idx) => (
          <span key={idx} className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs font-medium border border-gray-200">
            {label}
          </span>
        ))}
        {to && (
          <span className="text-gray-500">To <span className="font-medium text-gray-700">{to}</span></span>
        )}
      </div>

      <hr className="border-gray-200 mb-4" />

      {/* Attachments - cleaner styling */}
      {safeAttachments.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-800 mb-2 text-sm">Attachments</h4>
          <ul className="space-y-2">
            {safeAttachments.map((att, i) => {
              const href = att.url || att.downloadUrl || att.contentLink || '#';
              const name = att.filename || att.name || 'Attachment';
              const bytes = att.size || att.fileSize || (att.body && att.body.size);
              const sizeLabel = typeof bytes === 'number' ? `${(bytes/1024).toFixed(1)} KB` : null;
              return (
              <li key={i} className="flex items-center gap-2">
                {/* REFACTOR: Purple accent for attachment links */}
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:text-purple-700 hover:underline break-all text-sm"
                  download={name}
                >
                  {name}
                </a>
                {sizeLabel && (
                  <span className="text-xs text-gray-500">({sizeLabel})</span>
                )}
              </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Message Body - reduced padding, cleaner controls */}
      <div className="email-content-wrapper">
        {expanded ? (
          <div>
            <div className="mb-3 flex justify-end">
              <button onClick={() => setExpanded(false)} className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center space-x-1">
                <ChevronUp className="w-4 h-4" />
                <span>Hide message</span>
              </button>
            </div>
            {/* REFACTOR: Minimal background, reduced padding */}
            <div className="email-content bg-gray-50 rounded border border-gray-200 p-4 text-gray-700 leading-relaxed max-w-full overflow-x-auto">
              {bodyHTML ? (
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bodyHTML) }} />
              ) : bodyText ? (
                <pre className="whitespace-pre-wrap text-gray-800 text-sm">{bodyText}</pre>
              ) : (
                <div className="text-gray-500 italic text-sm">No email content available</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-gray-600">
            <p className="mb-2 line-clamp-3 text-sm">(Preview hidden)</p>
            {/* REFACTOR: Purple accent for expand button */}
            <button onClick={() => setExpanded(true)} className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center space-x-1">
              <ChevronDown className="w-4 h-4" />
              <span>Show full message</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MessageCard;