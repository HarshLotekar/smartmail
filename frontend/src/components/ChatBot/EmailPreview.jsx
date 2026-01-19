import React from 'react';
import { Mail, Calendar, User } from 'lucide-react';

export default function EmailPreview({ email, onClick }) {
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getCategoryColor = (category) => {
    const colors = {
      Work: 'text-blue-400',
      Personal: 'text-green-400',
      Promotion: 'text-purple-400',
      Social: 'text-pink-400',
      Urgent: 'text-red-400',
      Newsletter: 'text-yellow-400',
      Spam: 'text-gray-400'
    };
    return colors[category] || 'text-gray-400';
  };

  return (
    <div
      onClick={() => onClick && onClick(email)}
      className="glass-card p-3 rounded-lg mb-2 cursor-pointer hover:bg-white/10 transition-all group"
    >
      <div className="flex items-start gap-2">
        <Mail className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {/* Sender */}
          <div className="flex items-center gap-2 mb-1">
            <User className="w-3 h-3 text-text-muted" />
            <span className="text-xs font-medium text-text-primary truncate">
              {email.sender}
            </span>
          </div>
          
          {/* Subject */}
          <p className={`text-sm ${email.isRead ? 'text-text-secondary' : 'text-text-primary font-semibold'} truncate mb-1`}>
            {email.subject}
          </p>
          
          {/* Snippet */}
          {email.snippet && (
            <p className="text-xs text-text-muted line-clamp-2 mb-2">
              {email.snippet}
            </p>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 text-text-muted" />
              <span className="text-text-muted">{formatDate(email.timestamp)}</span>
            </div>
            {email.category && (
              <span className={`${getCategoryColor(email.category)} font-medium`}>
                {email.category}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
