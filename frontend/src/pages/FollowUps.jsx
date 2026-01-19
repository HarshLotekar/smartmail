import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Bell, AlertCircle, Calendar, Mail, Tag, TrendingUp } from 'lucide-react';
import api from '../services/api';

export default function FollowUps() {
  const [followUps, setFollowUps] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchFollowUps();
    fetchStats();
  }, [filter]);

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/followups?status=${filter}`);
      if (response.data.success) {
        setFollowUps(response.data.followUps);
      }
    } catch (error) {
      console.error('Failed to fetch follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/followups/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleComplete = async (id) => {
    try {
      await api.put(`/followups/${id}/complete`);
      fetchFollowUps();
      fetchStats();
    } catch (error) {
      console.error('Failed to complete follow-up:', error);
    }
  };

  const handleSnooze = async (id, days) => {
    try {
      await api.put(`/followups/${id}/snooze`, { days });
      fetchFollowUps();
    } catch (error) {
      console.error('Failed to snooze follow-up:', error);
    }
  };

  const handleDismiss = async (id) => {
    try {
      await api.put(`/followups/${id}/dismiss`);
      fetchFollowUps();
      fetchStats();
    } catch (error) {
      console.error('Failed to dismiss follow-up:', error);
    }
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      low: 'bg-blue-100 text-blue-700 border-blue-300',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      high: 'bg-orange-100 text-orange-700 border-orange-300',
      critical: 'bg-red-100 text-red-700 border-red-300'
    };
    return colors[urgency] || colors.medium;
  };

  const getTypeIcon = (type) => {
    const icons = {
      question: '❓',
      request: '📋',
      promise: '🤝',
      deadline: '⏰',
      meeting: '📅'
    };
    return icons[type] || '📧';
  };

  const isOverdue = (reminderDate) => {
    return new Date(reminderDate) < new Date();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-400 bg-clip-text text-transparent mb-2">
          📌 Follow-up Reminders
        </h1>
        <p className="text-gray-600">Never miss an important email follow-up</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4 rounded-xl border border-primary-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-primary-600">{stats.pending || 0}</p>
              </div>
              <Bell className="w-8 h-8 text-primary-500" />
            </div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue || 0}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-700">{stats.total || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-gray-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {['pending', 'completed', 'dismissed', 'snoozed', 'all'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              filter === tab
                ? 'bg-gradient-to-r from-primary-500 to-accent-300 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Follow-ups List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading follow-ups...</p>
        </div>
      ) : followUps.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center border border-gray-200">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No follow-ups found</h3>
          <p className="text-gray-500">
            {filter === 'pending' 
              ? "You're all caught up! 🎉" 
              : `No ${filter} follow-ups at the moment.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {followUps.map((followUp) => (
            <div
              key={followUp.id}
              className={`glass-card rounded-xl p-5 border-l-4 transition-all hover:shadow-lg ${
                isOverdue(followUp.reminder_date) && followUp.status === 'pending'
                  ? 'border-l-red-500 bg-red-50/50'
                  : 'border-l-primary-500'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: Email Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getTypeIcon(followUp.commitment_type)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{followUp.email_subject}</h3>
                      <p className="text-sm text-gray-600">
                        From: <span className="font-medium">{followUp.email_from}</span>
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-3">{followUp.email_snippet}...</p>

                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {/* Urgency Badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getUrgencyColor(followUp.urgency)}`}>
                      {followUp.urgency.toUpperCase()}
                    </span>

                    {/* Type Badge */}
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                      {followUp.commitment_type}
                    </span>

                    {/* Confidence */}
                    {followUp.ai_confidence && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-300">
                        {Math.round(followUp.ai_confidence * 100)}% confident
                      </span>
                    )}
                  </div>

                  {/* Reason */}
                  <p className="text-sm text-gray-600 italic mb-2">
                    💡 {followUp.reason}
                  </p>

                  {/* Keywords */}
                  {followUp.detected_keywords && followUp.detected_keywords.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="w-4 h-4 text-gray-400" />
                      {followUp.detected_keywords.map((keyword, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Date & Actions */}
                <div className="flex flex-col items-end gap-3 min-w-[200px]">
                  {/* Reminder Date */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    isOverdue(followUp.reminder_date) && followUp.status === 'pending'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">{formatDate(followUp.reminder_date)}</span>
                  </div>

                  {/* Action Buttons (only for pending) */}
                  {followUp.status === 'pending' && (
                    <div className="flex flex-col gap-2 w-full">
                      <button
                        onClick={() => handleComplete(followUp.id)}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSnooze(followUp.id, 1)}
                          className="flex-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-xs font-medium"
                        >
                          1d
                        </button>
                        <button
                          onClick={() => handleSnooze(followUp.id, 3)}
                          className="flex-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-xs font-medium"
                        >
                          3d
                        </button>
                        <button
                          onClick={() => handleSnooze(followUp.id, 7)}
                          className="flex-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-xs font-medium"
                        >
                          7d
                        </button>
                      </div>

                      <button
                        onClick={() => handleDismiss(followUp.id)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* Status Badge (for non-pending) */}
                  {followUp.status !== 'pending' && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      followUp.status === 'completed' ? 'bg-green-100 text-green-700' :
                      followUp.status === 'dismissed' ? 'bg-gray-100 text-gray-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {followUp.status.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
