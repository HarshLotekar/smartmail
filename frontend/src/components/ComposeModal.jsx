import React, { useState, useEffect, useRef } from 'react';
import { X, Minus, Maximize2, Minimize2, Paperclip, MoreVertical, Sparkles } from 'lucide-react';
import { mailAPI, aiAPI } from '../services/api';

const ComposeModal = ({ open, onClose }) => {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Draggable state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);

  useEffect(() => {
    const theme = localStorage.getItem('smartmail_theme') || 'light';
    setIsDarkMode(theme === 'dark');
  }, []);

  // Drag handlers
  const handleMouseDown = (e) => {
    if (isMaximized) return; // Don't drag when maximized
    
    setIsDragging(true);
    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || isMaximized) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Keep modal within viewport bounds
      const maxX = window.innerWidth - (modalRef.current?.offsetWidth || 680);
      const maxY = window.innerHeight - (modalRef.current?.offsetHeight || 600);

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, isMaximized]);

  if (!open) return null;

  const handleSend = async () => {
    try {
      setSending(true);
      const fd = new FormData();
      fd.append('to', to);
      if (cc) fd.append('cc', cc);
      if (bcc) fd.append('bcc', bcc);
      fd.append('subject', subject);
      fd.append('body', body);
      files.forEach(f => fd.append('attachments', f));
      const resp = await mailAPI.sendEmail(fd);
      alert('Email sent!');
      onClose();
      // Reset form
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      setBody('');
      setFiles([]);
    } catch (err) {
      alert('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleDraftAI = async () => {
    try {
      setDrafting(true);
      const { data } = await aiAPI.draftEmail(subject || 'Email', '', 'Professional and concise');
      setBody(data.draft || body);
    } catch (e) {
      alert('AI drafting failed');
    } finally {
      setDrafting(false);
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-0 right-6 z-50">
        <div 
          onClick={() => setIsMinimized(false)}
          className="cursor-pointer bg-[rgba(30,27,75,0.95)] backdrop-blur-xl rounded-t-lg px-4 py-3 min-w-[250px] flex items-center justify-between border border-card-border hover:shadow-plum-glow transition-all"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-text-primary">New Message</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={modalRef}
      className={`fixed ${isMaximized ? 'inset-0' : ''} z-50`}
      style={!isMaximized ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        bottom: 'auto',
        right: 'auto',
        width: '680px',
        maxWidth: '90vw',
        height: '600px'
      } : {}}
    >
      <div className={`${
        isMaximized 
          ? 'w-full h-full' 
          : 'w-full h-full'
      } flex flex-col bg-[rgba(30,27,75,0.95)] backdrop-blur-xl rounded-t-lg shadow-2xl border border-card-border`}>
        {/* Header */}
        <div 
          onMouseDown={handleMouseDown}
          className={`flex items-center justify-between px-4 py-3 rounded-t-lg bg-gradient-to-r from-plum-900 to-plum-800 text-text-primary border-b border-accent-primary/20 ${!isMaximized ? 'cursor-move' : ''}`}
        >
          <h3 className="font-medium text-sm">New Message</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Minimize"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title={isMaximized ? "Default view" : "Maximize"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Compose Body */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* To Field */}
            <div className="flex items-center gap-2 pb-2 border-b border-card-border">
              <span className="text-sm font-medium min-w-[50px] text-text-secondary">
                To
              </span>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Recipients"
                className="flex-1 px-2 py-1 text-sm bg-transparent text-text-primary placeholder-text-muted focus:outline-none"
                autoFocus
              />
              <button
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-xs px-2 py-1 rounded hover:bg-white/10 text-text-secondary transition-colors"
              >
                Cc Bcc
              </button>
            </div>

            {/* Cc/Bcc Fields */}
            {showCcBcc && (
              <>
                <div className="flex items-center gap-2 pb-2 border-b border-card-border">
                  <span className="text-sm font-medium min-w-[50px] text-text-secondary">
                    Cc
                  </span>
                  <input
                    type="email"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="Carbon copy"
                    className="flex-1 px-2 py-1 text-sm bg-transparent text-text-primary placeholder-text-muted focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pb-2 border-b border-card-border">
                  <span className="text-sm font-medium min-w-[50px] text-text-secondary">
                    Bcc
                  </span>
                  <input
                    type="email"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="Blind carbon copy"
                    className="flex-1 px-2 py-1 text-sm bg-transparent text-text-primary placeholder-text-muted focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* Subject Field */}
            <div className="flex items-center gap-2 pb-2 border-b border-card-border">
              <span className="text-sm font-medium min-w-[50px] text-text-secondary">
                Subject
              </span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="flex-1 px-2 py-1 text-sm bg-transparent text-text-primary placeholder-text-muted focus:outline-none"
              />
            </div>

            {/* Message Body */}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message..."
              className="w-full px-2 py-2 text-sm bg-transparent text-text-primary placeholder-text-muted focus:outline-none resize-none flex-1 min-h-[250px]"
            />

            {/* File Attachments */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-card-background border border-card-border text-text-secondary"
                  >
                    <Paperclip className="w-3 h-3" />
                    <span>{file.name}</span>
                    <button
                      onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                      className="ml-1 hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-card-border bg-[rgba(30,27,75,0.8)]">
            <div className="flex items-center gap-2">
              {/* Attach File */}
              <label
                className="p-2 rounded cursor-pointer hover:bg-white/10 text-text-secondary transition-colors"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles([...files, ...Array.from(e.target.files || [])])}
                  className="hidden"
                />
              </label>

              {/* Write with AI */}
              <button
                onClick={handleDraftAI}
                disabled={drafting}
                className="btn-secondary flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg disabled:opacity-50"
                title="Write with AI"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {drafting ? 'Writing...' : 'Write with AI'}
              </button>

              {/* More Options */}
              <button
                className="p-2 rounded hover:bg-white/10 text-text-secondary transition-colors"
                title="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Discard */}
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-card-background hover:bg-white/10 text-text-secondary border border-card-border transition-colors"
              >
                Discard
              </button>

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={sending || !to || !body}
                className="btn-primary px-6 py-2 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComposeModal;
