import React, { useState } from 'react';
import { Bot, Loader2, TrendingUp, Mail, Users } from 'lucide-react';

export default function AIAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bot className="w-8 h-8 text-accent-primary" />
            <h1 className="text-3xl font-bold gradient-text">AI Email Analysis</h1>
          </div>
          <p className="text-text-secondary">
            Get AI-powered insights about your email patterns, productivity, and communication style
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="glass-card p-6 rounded-xl border border-card-border">
            <TrendingUp className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">Email Patterns</h3>
            <p className="text-text-secondary text-sm">
              Analyze your email activity patterns, peak hours, and response times
            </p>
          </div>

          <div className="glass-card p-6 rounded-xl border border-card-border">
            <Mail className="w-12 h-12 text-purple-500 mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">Content Analysis</h3>
            <p className="text-text-secondary text-sm">
              AI-powered analysis of email topics, sentiment, and communication style
            </p>
          </div>

          <div className="glass-card p-6 rounded-xl border border-card-border">
            <Users className="w-12 h-12 text-pink-500 mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">Contact Insights</h3>
            <p className="text-text-secondary text-sm">
              Identify key contacts, communication frequency, and relationship strength
            </p>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="glass-card p-8 rounded-xl border border-card-border text-center">
          <div className="max-w-md mx-auto">
            <Bot className="w-16 h-16 mx-auto text-accent-primary mb-4 opacity-50" />
            <h2 className="text-2xl font-bold text-text-primary mb-2">Coming Soon</h2>
            <p className="text-text-secondary mb-6">
              Advanced AI analysis features are currently in development. Stay tuned for powerful insights about your email habits!
            </p>
            <div className="flex gap-4 justify-center">
              <button className="btn-secondary" disabled>
                Run Analysis
              </button>
              <button className="btn-primary" onClick={() => window.location.href = '/analytics'}>
                View Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
