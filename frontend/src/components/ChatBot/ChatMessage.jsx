import React from 'react';
import { Bot, User } from 'lucide-react';

export default function ChatMessage({ message, isBot }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`flex items-start gap-3 mb-4 ${!isBot ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isBot 
          ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-plum-glow' 
          : 'bg-gradient-to-br from-fuchsia-500 to-violet-500'
      }`}>
        {isBot ? (
          <Bot className="w-5 h-5 text-white" />
        ) : (
          <User className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-[75%] ${!isBot ? 'flex flex-col items-end' : ''}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isBot 
            ? 'glass-card text-text-primary' 
            : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-plum-glow'
        }`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
        
        {/* Timestamp */}
        <span className="text-xs text-text-muted mt-1 px-2">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
