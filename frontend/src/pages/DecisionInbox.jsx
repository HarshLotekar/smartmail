import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, ChevronDown, ChevronUp, Loader2, Check, X, Clock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { mailAPI } from '../services/api';
import DecisionBadge from '../components/DecisionBadge';

/**
 * Decision Inbox Page
 * Shows emails that require action/decision
 */
const DecisionInbox = () => {
  const navigate = useNavigate();
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedReasons, setExpandedReasons] = useState(new Set());
  const [processingActions, setProcessingActions] = useState(new Set());
  const [debugMode, setDebugMode] = useState(false); // Debug toggle
  const [showSnoozeDialog, setShowSnoozeDialog] = useState(null); // emailId or null

  useEffect(() => {
    fetchDecisions();
  }, []);

  const fetchDecisions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await mailAPI.getPendingDecisions();
      console.log('Decisions response:', response.data);
      setDecisions(response.data?.decisions || []);
    } catch (err) {
      console.error('Failed to fetch decisions:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load decision inbox';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const toggleReason = (emailId) => {
    const newExpanded = new Set(expandedReasons);
    if (newExpanded.has(emailId)) {
      newExpanded.delete(emailId);
    } else {
      newExpanded.add(emailId);
    }
    setExpandedReasons(newExpanded);
  };

  const handleMarkAsDone = async (emailId, e) => {
    e.stopPropagation();
    
    const processing = new Set(processingActions);
    processing.add(emailId);
    setProcessingActions(processing);
    
    try {
      await mailAPI.markDecisionCompleted(emailId);
      // Remove from list
      setDecisions(decisions.filter(d => d.email_id !== emailId));
    } catch (err) {
      console.error('Failed to mark as done:', err);
      alert('Failed to mark as done. Please try again.');
    } finally {
      const processing = new Set(processingActions);
      processing.delete(emailId);
      setProcessingActions(processing);
    }
  };

  const handleIgnore = async (emailId, e) => {
    e.stopPropagation();
    
    const processing = new Set(processingActions);
    processing.add(emailId);
    setProcessingActions(processing);
    
    try {
      await mailAPI.ignoreDecision(emailId);
      // Remove from list
      setDecisions(decisions.filter(d => d.email_id !== emailId));
    } catch (err) {
      console.error('Failed to ignore:', err);
      alert('Failed to ignore. Please try again.');
    } finally {
      const processing = new Set(processingActions);
      processing.delete(emailId);
      setProcessingActions(processing);
    }
  };

  const handleSnooze = async (emailId, hours, e) => {
    if (e) e.stopPropagation();
    
    const processing = new Set(processingActions);
    processing.add(emailId);
    setProcessingActions(processing);
    
    try {
      const snoozedUntil = new Date();
      snoozedUntil.setHours(snoozedUntil.getHours() + hours);
      
      await mailAPI.snoozeDecision(emailId, snoozedUntil.toISOString());
      // Remove from list
      setDecisions(decisions.filter(d => d.email_id !== emailId));
      setShowSnoozeDialog(null);
    } catch (err) {
      console.error('Failed to snooze:', err);
      alert('Failed to snooze. Please try again.');
    } finally {
      const processing = new Set(processingActions);
      processing.delete(emailId);
      setProcessingActions(processing);
    }
  };

  const handleNotDecision = async (emailId, e) => {
    e.stopPropagation();
    
    const processing = new Set(processingActions);
    processing.add(emailId);
    setProcessingActions(processing);
    
    try {
      await mailAPI.markAsNotDecision(emailId);
      // Remove from list
      setDecisions(decisions.filter(d => d.email_id !== emailId));
    } catch (err) {
      console.error('Failed to mark as not decision:', err);
      alert('Failed to update. Please try again.');
    } finally {
      const processing = new Set(processingActions);
      processing.delete(emailId);
      setProcessingActions(processing);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const getUrgencyBadge = (urgencyLabel) => {
    const badges = {
      decide_now: { emoji: '🔴', label: 'Decide Now', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
      decide_soon: { emoji: '🟠', label: 'Decide Soon', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
      expires_soon: { emoji: '🟡', label: 'Expires Soon', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
      optional: { emoji: '⚪', label: 'Optional', color: 'bg-gray-500/10 text-gray-400 border-gray-500/30' }
    };
    return badges[urgencyLabel] || badges.optional;
  };

  const calculateTimeEstimate = (count) => {
    // Average 30-45 seconds per email, round up
    const avgSeconds = 40;
    const totalMinutes = Math.ceil((count * avgSeconds) / 60);
    return totalMinutes;
  };

  const timeEstimate = calculateTimeEstimate(decisions.length);

  const getBadgeColor = (decisionType) => {
    const colors = {
      action_required: 'bg-red-100 text-red-700 border-red-300',
      reply_required: 'bg-orange-100 text-orange-700 border-orange-300',
      approval_needed: 'bg-purple-100 text-purple-700 border-purple-300',
      feedback_requested: 'bg-blue-100 text-blue-700 border-blue-300',
      time_sensitive: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      informational_only: 'bg-gray-100 text-gray-600 border-gray-300'
    };
    return colors[decisionType] || colors.informational_only;
  };

  const getBadgeLabel = (decisionType) => {
    const labels = {
      action_required: 'Action Required',
      reply_required: 'Reply Required',
      approval_needed: 'Approval Needed',
      feedback_requested: 'Feedback Requested',
      time_sensitive: 'Time-Sensitive',
      informational_only: 'Info Only'
    };
    return labels[decisionType] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-dark-text-secondary">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading decisions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchDecisions}
            className="btn-primary px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-dark-bg">
      {/* Header */}
      <div className="border-b border-dark-border bg-dark-surface px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-accent" />
            <div>
              <h1 className="text-xl font-semibold text-dark-text-primary">
                Decision Inbox
              </h1>
              <p className="text-sm text-dark-text-secondary">
                {decisions.length > 0 
                  ? `${decisions.length} ${decisions.length === 1 ? 'decision' : 'decisions'} · ~${timeEstimate} ${timeEstimate === 1 ? 'minute' : 'minutes'} to clear`
                  : 'All caught up!'
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDebugMode(!debugMode)}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                debugMode 
                  ? 'bg-accent text-white' 
                  : 'btn-secondary'
              }`}
              title="Toggle debug mode"
            >
              {debugMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              Debug
            </button>
            <button
              onClick={fetchDecisions}
              className="btn-secondary px-4 py-2 rounded text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className="p-6">
        {decisions.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-16 h-16 text-dark-text-secondary mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-dark-text-primary mb-2">
              All caught up!
            </h3>
            <p className="text-dark-text-secondary mb-2">
              No emails require decisions right now.
            </p>
            <p className="text-sm text-dark-text-secondary/70">
              SmartMail only shows emails that truly need your attention.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {decisions.map((decision) => {
              const isExpanded = expandedReasons.has(decision.email_id);
              const badgeColor = getBadgeColor(decision.decision_type);
              const badgeLabel = getBadgeLabel(decision.decision_type);

              return (
                <div
                  key={decision.email_id}
                  className="bg-dark-surface border border-dark-border rounded-lg p-4 hover:border-accent/50 transition-colors"
                >
                  <div onClick={() => navigate(`/message/${decision.message_id}`)} className="cursor-pointer">
                    {/* Urgency Badge */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-dark-text-primary mb-1">
                          {decision.subject || 'No Subject'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-dark-text-secondary">
                          <span className="font-medium">{decision.from_email}</span>
                          <span>•</span>
                          <span>{formatDate(decision.date)}</span>
                        </div>
                      </div>
                      {decision.urgency_label && (
                        <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded border flex-shrink-0 ${getUrgencyBadge(decision.urgency_label).color}`}>
                          <span>{getUrgencyBadge(decision.urgency_label).emoji}</span>
                          {getUrgencyBadge(decision.urgency_label).label}
                        </span>
                      )}
                    </div>

                    {/* Snippet */}
                    {decision.snippet && (
                      <p className="text-sm text-dark-text-secondary mb-3 line-clamp-2">
                        {decision.snippet}
                      </p>
                    )}

                    {/* Why this is here - Explanation */}
                    {decision.explanation && Array.isArray(decision.explanation) && decision.explanation.length > 0 && (
                      <div className="mb-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded">
                        <p className="text-xs font-semibold text-blue-400 mb-2">Why this is here:</p>
                        <ul className="space-y-1">
                          {decision.explanation.map((bullet, idx) => (
                            <li key={idx} className="text-xs text-dark-text-secondary flex items-start gap-2">
                              <span className="text-blue-400">•</span>
                              <span className="flex-1">{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Debug Info - Only show in debug mode */}
                    {debugMode && (
                      <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-yellow-500">Confidence:</span>
                              <span className="text-dark-text-primary">
                                {decision.confidence?.toFixed(2) || decision.decision_score?.toFixed(2) || '0.00'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-yellow-500">Level:</span>
                              <span className="text-dark-text-primary">
                                {decision.decision_level || 'N/A'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-yellow-500">Type:</span>
                              <span className="text-dark-text-primary">
                                {decision.decision_type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-3 border-t border-dark-border flex-wrap">
                    {/* Completed */}
                    <button
                      onClick={(e) => handleMarkAsDone(decision.email_id, e)}
                      disabled={processingActions.has(decision.email_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Completed
                    </button>
                    
                    {/* Snooze */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowSnoozeDialog(
                            showSnoozeDialog === decision.email_id ? null : decision.email_id
                          );
                        }}
                        disabled={processingActions.has(decision.email_id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Snooze
                      </button>
                        
                        {/* Snooze Dropdown */}
                        {showSnoozeDialog === decision.email_id && (
                          <div className="absolute top-full left-0 mt-1 bg-dark-surface border border-dark-border rounded-lg shadow-xl z-10 py-1 min-w-[140px]">
                            <button
                              onClick={(e) => handleSnooze(decision.email_id, 4, e)}
                              className="w-full px-3 py-2 text-xs text-left hover:bg-dark-hover text-dark-text-primary transition-colors"
                            >
                              Later today (4h)
                            </button>
                            <button
                              onClick={(e) => handleSnooze(decision.email_id, 24, e)}
                              className="w-full px-3 py-2 text-xs text-left hover:bg-dark-hover text-dark-text-primary transition-colors"
                            >
                              Tomorrow
                            </button>
                            <button
                              onClick={(e) => handleSnooze(decision.email_id, 168, e)}
                              className="w-full px-3 py-2 text-xs text-left hover:bg-dark-hover text-dark-text-primary transition-colors"
                            >
                              Next week
                            </button>
                          </div>
                        )}
                      </div>
                    
                    {/* Not a Decision */}
                    <button
                      onClick={(e) => handleNotDecision(decision.email_id, e)}
                      disabled={processingActions.has(decision.email_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600/80 hover:bg-red-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="w-3.5 h-3.5" />
                      Not a Decision
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DecisionInbox;
