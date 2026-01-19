import React from 'react';
import { Sparkles } from 'lucide-react';

export default function SuggestedActions({ actions = [], onActionClick }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3 mb-2">
      <div className="flex items-center gap-1 text-xs text-text-muted mb-1 w-full">
        <Sparkles className="w-3 h-3" />
        <span>Suggested actions:</span>
      </div>
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={() => onActionClick(action)}
          className="btn-secondary text-xs px-3 py-1.5 rounded-full hover:scale-105 transition-transform"
        >
          {action}
        </button>
      ))}
    </div>
  );
}
