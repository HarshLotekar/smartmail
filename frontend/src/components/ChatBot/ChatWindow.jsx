import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import ChatMessage from './ChatMessage';
import SuggestedActions from './SuggestedActions';
import EmailPreview from './EmailPreview';
import { sendChatMessage } from '../../services/chatAPI';

export default function ChatWindow({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      content: "Hi! I'm your SmartMail assistant. Ask me to summarize emails, draft replies, or organize your inbox!",
      isBot: true,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentActions, setCurrentActions] = useState([
    'Summarize today\'s emails',
    'Show unread emails',
    'What can you do?'
  ]);
  const [relatedEmails, setRelatedEmails] = useState([]);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async (messageText = inputValue) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      content: messageText,
      isBot: false,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build conversation history
      const conversationHistory = messages.map(msg => ({
        role: msg.isBot ? 'assistant' : 'user',
        content: msg.content
      }));

      const response = await sendChatMessage(messageText, conversationHistory);

      const botMessage = {
        id: Date.now() + 1,
        content: response.message || response.response || "I processed your request.",
        isBot: true,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMessage]);
      setCurrentActions(response.suggestedActions || []);
      setRelatedEmails(response.relatedEmails || []);

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        content: "Sorry, I'm having trouble right now. Please try again.",
        isBot: true,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (action) => {
    handleSendMessage(action);
  };

  const handleEmailClick = (email) => {
    // TODO: Navigate to email or open email detail
    console.log('Email clicked:', email);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 w-96 h-[600px] chat-window shadow-2xl rounded-2xl overflow-hidden z-50 animate-slide-in-right">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <h3 className="font-semibold text-white">SmartMail Assistant</h3>
            <p className="text-xs text-white/80">Always here to help</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="h-[430px] overflow-y-auto p-4 bg-[rgba(15,23,42,0.95)] backdrop-blur-md">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} isBot={msg.isBot} />
        ))}

        {/* Suggested Actions */}
        {!isLoading && currentActions.length > 0 && (
          <SuggestedActions
            actions={currentActions}
            onActionClick={handleActionClick}
          />
        )}

        {/* Related Emails */}
        {relatedEmails.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-text-muted mb-2">Related emails:</p>
            {relatedEmails.map(email => (
              <EmailPreview
                key={email.id}
                email={email}
                onClick={handleEmailClick}
              />
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-text-muted">
            <div className="glass-card px-4 py-3 rounded-2xl">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-[rgba(30,27,75,0.98)] border-t border-white/10">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            disabled={isLoading}
            className="input-field flex-1 text-sm rounded-lg"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
