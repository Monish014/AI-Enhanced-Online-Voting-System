import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import chatbotService from '@services/chatbotService';

const BOT_AVATAR = '🤖';
const USER_AVATAR = '👤';

const SUGGESTED = [
  'How do I cast my vote?',
  'How do I verify my vote?',
  'When does voting end?',
  'What is a block hash?',
];

export default function ChatbotWidget() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hi! I\'m your VoteAI assistant. How can I help you today?' },
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef         = useRef(null);
  const inputRef               = useRef(null);
  const { isAuthenticated }    = useAuth();
  const location               = useLocation();

  // Auto-scroll — always called regardless of showWidget
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Only show on voter & public pages, not admin
  // This return is AFTER all hooks — safe to do here
  const showWidget = !location.pathname.startsWith('/admin');
  if (!showWidget) return null;

  const sendMessage = async (text) => {
    const question = (text || input).trim();
    if (!question) return;
    setInput('');
    setMessages((prev) => [...prev, { from: 'user', text: question }]);
    setLoading(true);
    try {
      const data = await chatbotService.ask(question);
      setMessages((prev) => [...prev, { from: 'bot', text: data.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { from: 'bot', text: 'Sorry, I\'m having trouble connecting. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div
          role="dialog"
          aria-label="VoteAI Chatbot"
          aria-modal="true"
          className="fixed bottom-24 right-4 sm:right-6 w-[340px] max-h-[520px] flex flex-col
                     bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 animate-slide-up"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary-700 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">{BOT_AVATAR}</span>
              <div>
                <p className="text-white font-semibold text-sm">VoteAI Assistant</p>
                <p className="text-primary-200 text-xs">Here to help</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors p-1 rounded"
              aria-label="Close chatbot"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
            aria-live="polite"
            aria-relevant="additions"
            style={{ maxHeight: '300px' }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.from === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <span className="text-base flex-shrink-0 mt-0.5" aria-hidden="true">
                  {msg.from === 'bot' ? BOT_AVATAR : USER_AVATAR}
                </span>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                    msg.from === 'user'
                      ? 'bg-primary-600 text-white rounded-tr-none'
                      : 'bg-slate-100 text-slate-800 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <span aria-hidden="true">{BOT_AVATAR}</span>
                <div className="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-3">
                  <span className="flex gap-1" aria-label="Bot is typing">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                        aria-hidden="true"
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full
                             hover:bg-primary-100 transition-colors border border-primary-100"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-1 border-t border-slate-100">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                aria-label="Chat input"
                rows={1}
                className="flex-1 input-field resize-none text-sm py-2 min-h-[40px] max-h-[80px]"
                style={{ overflowY: 'auto' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="btn-primary px-3 py-2 text-sm flex-shrink-0"
                aria-label="Send message"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="fixed bottom-6 right-4 sm:right-6 w-14 h-14 bg-primary-700 hover:bg-primary-800
                   text-white rounded-full shadow-lg flex items-center justify-center z-50
                   transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        aria-expanded={open}
        aria-controls="chatbot-dialog"
      >
        <span className="text-2xl" aria-hidden="true">{open ? '✕' : '💬'}</span>
      </button>
    </>
  );
}
