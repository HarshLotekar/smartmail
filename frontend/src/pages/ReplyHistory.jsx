import React, { useState } from 'react';
import { Bot, MessageSquare, Clock } from 'lucide-react';

export default function ReplyHistory() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-8 h-8 text-accent-primary" />
            <h1 className="text-3xl font-bold gradient-text">AI Reply History</h1>
          </div>
          <p className="text-text-secondary">
            View and manage your AI-generated email replies and suggestions
          </p>
        </div>

        {/* Empty State */}
        <div className="glass-card p-12 rounded-xl border border-card-border text-center">
          <div className="max-w-md mx-auto">
            <Bot className="w-20 h-20 mx-auto text-accent-primary mb-4 opacity-50" />
            <h2 className="text-2xl font-bold text-text-primary mb-2">No Reply History Yet</h2>
            <p className="text-text-secondary mb-6">
              When you use AI to generate email replies, they'll appear here. You can review, edit, and reuse successful reply templates.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-white/5 rounded-lg text-left">
                <Clock className="w-5 h-5 text-accent-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-text-primary mb-1">Smart Suggestions</h3>
                  <p className="text-text-secondary text-sm">
                    AI learns from your writing style and suggests contextual replies
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-white/5 rounded-lg text-left">
                <MessageSquare className="w-5 h-5 text-accent-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-text-primary mb-1">Reply Templates</h3>
                  <p className="text-text-secondary text-sm">
                    Save and reuse successful AI-generated replies for similar emails
                  </p>
                </div>
              </div>
            </div>
            <button 
              className="btn-primary mt-6" 
              onClick={() => window.location.href = '/inbox'}
            >
              Go to Inbox
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
