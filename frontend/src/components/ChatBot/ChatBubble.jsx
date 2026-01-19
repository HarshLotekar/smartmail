import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import ChatWindow from './ChatWindow';

export default function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-fuchsia-glow hover:shadow-plum-glow hover:scale-110 transition-all duration-300 z-50 flex items-center justify-center group"
        aria-label="Open chat assistant"
      >
        {isOpen ? (
          <X className="w-7 h-7 group-hover:rotate-90 transition-transform" />
        ) : (
          <MessageCircle className="w-7 h-7 group-hover:scale-110 transition-transform" />
        )}
        
        {/* Notification Pulse */}
        {!isOpen && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0F172A] animate-pulse"></span>
        )}
      </button>

      {/* Chat Window */}
      <ChatWindow isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
