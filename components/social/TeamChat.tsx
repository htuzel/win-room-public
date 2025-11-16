// Win Room v2.0 - Team Chat Widget
'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '@/lib/types';

interface TeamChatProps {
  messages: ChatMessage[];
  onSend: (message: string) => Promise<void> | void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  currentSellerId?: string;
}

export function TeamChat({ messages, onSend, disabled, loading, className = '', currentSellerId }: TeamChatProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const orderedMessages = useMemo(() => [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()), [messages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [orderedMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || disabled || sending) return;
    setSending(true);
    try {
      await onSend(draft.trim());
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-accent/30 bg-gradient-to-br from-surface via-surface/90 to-surface/80 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-sm ring-1 ring-accent/10 ${className}`}>
      {/* Discord-style Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/30">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/20">
          <span className="text-lg">💬</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground tracking-tight">Team Pulse</p>
          <p className="text-[10px] text-foreground/50">Recent chats</p>
        </div>
      </div>

      {/* Discord-style Messages */}
      <div className="mb-3 max-h-72 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-accent/20 scrollbar-track-transparent">
        {loading && (
          <div className="space-y-2">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="flex gap-2 animate-pulse">
                <div className="w-6 h-6 rounded-full bg-background/60" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-20 bg-background/60 rounded" />
                  <div className="h-4 w-full bg-background/60 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && orderedMessages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-foreground/40">No messages yet</p>
            <p className="text-[10px] text-foreground/30 mt-1">Send the first message! 🚀</p>
          </div>
        )}
        {!loading && orderedMessages.map((message) => {
          const isSelf = currentSellerId && message.seller_id === currentSellerId;
          return (
            <div
              key={message.id}
              className="group px-2 py-1.5 hover:bg-background/40 rounded-lg transition-colors duration-150"
            >
              <div className="flex gap-2 items-start">
                {/* Mini Avatar */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                  isSelf
                    ? 'bg-gradient-to-br from-accent to-accent/70 text-black'
                    : 'bg-gradient-to-br from-foreground/20 to-foreground/10 text-foreground/70'
                }`}>
                  {(message.display_name || message.seller_id).charAt(0).toUpperCase()}
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`font-semibold text-[11px] ${isSelf ? 'text-accent' : 'text-foreground'}`}>
                      {message.display_name || message.seller_id}
                    </span>
                    <span className="text-[9px] text-foreground/40">
                      {new Date(message.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[12px] text-foreground/90 break-words whitespace-pre-wrap mt-0.5 leading-relaxed">
                    {message.message}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Discord-style Input */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={300}
            placeholder="Send message..."
            className="w-full rounded-lg border border-border/40 bg-background/80 px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 resize-none transition-all"
            rows={2}
            disabled={disabled || sending}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-2">
            <span className="text-[10px] text-foreground/30">{draft.length}/300</span>
          </div>
        </div>
        <button
          type="submit"
          disabled={disabled || sending || !draft.trim()}
          className="w-full rounded-lg bg-gradient-to-r from-accent to-accent/90 px-4 py-2 text-xs font-bold uppercase tracking-wider text-black hover:from-accent/90 hover:to-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent/20 hover:shadow-accent/30"
        >
          {sending ? '⏳ Sending...' : '🚀 Send'}
        </button>
      </form>
    </div>
  );
}
