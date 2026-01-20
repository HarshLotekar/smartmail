import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Mail, Star, Clock, Users, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Colors matching the 10 email categories - Blue-Purple Theme
const CATEGORY_COLORS = {
  'Work': '#3B82F6',        // Blue
  'Personal': '#8B5CF6',    // Purple (primary)
  'Promotions': '#F97316',  // Orange
  'Social': '#EC4899',      // Pink
  'Updates': '#14B8A6',     // Teal
  'Security': '#EF4444',    // Red
  'Spam': '#6B7280',        // Gray
  'Education': '#6366F1',   // Indigo
  'Newsletter': '#10B981',  // Green
  'Events': '#EAB308'       // Yellow
};

const COLORS = Object.values(CATEGORY_COLORS);

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/analytics/insights');
      
      if (response.data.success) {
        setInsights(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch insights:', err);
      setError('Failed to load analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-text-secondary">Analyzing your emails with AI...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center glass-card p-8 rounded-xl max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-text-primary mb-4">{error}</p>
          <button onClick={fetchInsights} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!insights) return null;

  const { overview, insights: aiInsights, analytics, recommendations } = insights;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
            <BarChart3 className="w-8 h-8" />
            Inbox Insights
          </h1>
          <p className="text-text-secondary mt-1">Understand your email patterns automatically</p>
        </div>
        <div className="text-sm text-text-muted">
          Last updated: just now
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-6 rounded-xl border border-card-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm">Total Emails</p>
              <p className="text-3xl font-bold text-text-primary mt-1">{overview.totalEmails}</p>
            </div>
            <Mail className="w-10 h-10 text-primary-500 opacity-50" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl border border-card-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm">Unread</p>
              <p className="text-3xl font-bold text-text-primary mt-1">{overview.unreadEmails}</p>
            </div>
            <Mail className="w-10 h-10 text-yellow-500 opacity-50" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl border border-card-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm">Starred</p>
              <p className="text-3xl font-bold text-text-primary mt-1">{overview.starredEmails}</p>
            </div>
            <Star className="w-10 h-10 text-yellow-400 opacity-50" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl border border-card-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm">Work Emails</p>
              <p className="text-3xl font-bold text-text-primary mt-1">{overview.workEmails}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Weekly Activity */}
        <div className="glass-card p-6 rounded-xl border border-card-border">
          <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary-500" />
            Weekly Email Activity
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.weeklyActivity}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F8CFF" stopOpacity={1} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.8} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="day" 
                stroke="rgba(255,255,255,0.6)"
                style={{ fontSize: '12px', fontWeight: 500 }}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.6)"
                style={{ fontSize: '12px', fontWeight: 500 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.9)', 
                  border: '1px solid rgba(79, 140, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontWeight: 600
                }}
                cursor={{ fill: 'rgba(79, 140, 255, 0.1)' }}
              />
              <Bar dataKey="count" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-sm text-text-secondary mt-4 italic">
            Most emails arrive on weekdays.
          </p>
        </div>

        {/* Pie Chart - Label Distribution */}
        <div className="glass-card p-6 rounded-xl border border-card-border">
          <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary-500" />
            Label Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.labelDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                outerRadius={90}
                fill="#8884d8"
                dataKey="count"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={2}
              >
                {analytics.labelDistribution.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={CATEGORY_COLORS[entry.label] || COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0,0,0,0.9)', 
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '12px'
                }}
                formatter={(value, name, props) => [`${value} emails (${props.payload.percentage}%)`, props.payload.label]}
              />
              <Legend 
                verticalAlign="bottom" 
                height={90}
                iconType="circle"
                wrapperStyle={{ 
                  color: '#fff', 
                  fontSize: '11px',
                  paddingTop: '15px',
                  lineHeight: '1.5'
                }}
                formatter={(value, entry) => {
                  const { label, count, percentage } = entry.payload;
                  return `${label}: ${count} (${percentage}%)`;
                }}
                layout="horizontal"
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Insight sentence */}
          <p className="text-sm text-text-secondary mt-4 italic">
            {analytics.labelDistribution[0]?.label} emails dominate your inbox.
          </p>
          
          {/* Category Breakdown Table */}
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
            {analytics.labelDistribution
              .sort((a, b) => b.count - a.count)
              .map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white/10 rounded-lg hover:bg-white/15 transition-colors border border-white/5">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full ring-2 ring-white/20" 
                      style={{ backgroundColor: CATEGORY_COLORS[item.label] || COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-white text-sm font-semibold">{item.label}</span>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-white font-bold text-base bg-white/10 px-3 py-1 rounded-lg">{item.count}</span>
                    <span className="text-white/70 text-sm font-medium">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="glass-card p-6 rounded-xl border border-card-border">
        <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary-500" />
          AI Insights
        </h2>
        <div className="space-y-3">
          {aiInsights?.map((insight, idx) => (
            <div key={idx} className="p-4 bg-white/5 rounded-lg border border-card-border">
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  insight.type === 'alert' ? 'bg-red-500' :
                  insight.type === 'trend' ? 'bg-blue-500' : 'bg-green-500'
                }`} />
                <div className="flex-1">
                  <h3 className="font-semibold text-text-primary">{insight.title}</h3>
                  <p className="text-text-secondary text-sm mt-1">{insight.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Analytics */}
        <div className="glass-card p-6 rounded-xl border border-card-border">
          <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary-500" />
            Activity Patterns
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-text-muted text-sm">Most Active Day</p>
              <p className="text-xl font-bold text-text-primary mt-1">{analytics.mostActiveDay}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <p className="text-text-muted text-sm">Average Emails/Day</p>
              <p className="text-xl font-bold text-text-primary mt-1">{analytics.averageEmailsPerDay}</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-4 italic">
            Your inbox is most active on {analytics.mostActiveDay}s.
          </p>

          <h3 className="text-lg font-semibold text-text-primary mt-6 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Top Senders
          </h3>
          <div className="space-y-2">
            {analytics.topSenders?.slice(0, 5).map((sender, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                <span className="text-text-primary text-sm truncate flex-1">{sender.sender}</span>
                <span className="text-white font-bold text-base ml-3 bg-primary-500/20 px-3 py-1 rounded-lg">{sender.count}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-text-secondary mt-4 italic">
            {analytics.topSenders?.[0]?.sender} emails you most frequently.
          </p>
        </div>

        {/* Recommendations */}
        <div className="glass-card p-6 rounded-xl border border-card-border">
          <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-primary-500" />
            Recommendations
          </h2>
          <div className="space-y-3">
            {recommendations?.map((rec, idx) => (
              <div key={idx} className="p-4 bg-white/5 rounded-lg border-l-4 border-primary-500">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-primary">{rec.title}</h3>
                    <p className="text-text-secondary text-sm mt-1">{rec.suggestion}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                    rec.impact === 'high' ? 'bg-red-500/20 text-red-400' :
                    rec.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {rec.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-text-muted text-sm">
        Generated by SmartMail AI ✨
      </div>
    </div>
  );
}
