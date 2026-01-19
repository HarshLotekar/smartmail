import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, MessageCircle, Info, CheckCircle } from 'lucide-react';

/**
 * DecisionBadge Component
 * Displays a badge indicating if an email requires action/decision
 * 
 * Usage:
 * <DecisionBadge subject={email.subject} content={email.body} />
 */
export default function DecisionBadge({ subject, content, messageId, autoFetch = false }) {
  const [classification, setClassification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (autoFetch && (subject || content || messageId)) {
      classifyEmail();
    }
  }, [subject, content, messageId, autoFetch]);

  const classifyEmail = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/ai/classify-decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('smartmail_token')}`
        },
        body: JSON.stringify({ subject, content, messageId })
      });

      const data = await response.json();
      
      if (data.success) {
        setClassification(data);
      } else {
        setError(data.error || 'Classification failed');
      }
    } catch (err) {
      console.error('Decision classification error:', err);
      setError('Unable to classify email');
    } finally {
      setLoading(false);
    }
  };

  const getDecisionIcon = (type) => {
    switch (type) {
      case 'reply_required':
        return <MessageCircle className="w-4 h-4" />;
      case 'deadline':
        return <AlertCircle className="w-4 h-4" />;
      case 'follow_up':
        return <Clock className="w-4 h-4" />;
      case 'informational_only':
        return <Info className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const getDecisionColor = (type, required) => {
    if (!required) return 'bg-gray-100 text-gray-600 border-gray-200';
    
    switch (type) {
      case 'reply_required':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'deadline':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'follow_up':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getDecisionLabel = (type) => {
    switch (type) {
      case 'reply_required':
        return 'Reply Needed';
      case 'deadline':
        return 'Deadline';
      case 'follow_up':
        return 'Follow-Up';
      case 'informational_only':
        return 'Info Only';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
        <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        Analyzing...
      </div>
    );
  }

  if (error) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  if (!classification) {
    return (
      <button
        onClick={classifyEmail}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-dark-surface text-dark-text-secondary border border-dark-border hover:bg-dark-bg transition-colors"
      >
        <AlertCircle className="w-4 h-4" />
        Classify Email
      </button>
    );
  }

  const { decision_required, decision_type, reason } = classification;
  const colorClass = getDecisionColor(decision_type, decision_required);

  return (
    <div className="inline-flex flex-col gap-1">
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${colorClass}`}>
        {getDecisionIcon(decision_type)}
        {getDecisionLabel(decision_type)}
      </div>
      {reason && (
        <p className="text-xs text-dark-text-secondary">{reason}</p>
      )}
    </div>
  );
}
