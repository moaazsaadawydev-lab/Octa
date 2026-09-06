import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { ChatMessage } from '../../services/aiApi';
import { ChatMessageItem } from './ChatMessageItem';

interface AIDrawerChatProps {
  messages: ChatMessage[];
  isExplaining: boolean;
  isSendingFollowUp: boolean;
  onSendFollowUp: (query: string) => void;
  onInsertCommand: (command: string) => void;
}

export const AIDrawerChat: React.FC<AIDrawerChatProps> = ({
  messages,
  isExplaining,
  isSendingFollowUp,
  onSendFollowUp,
  onInsertCommand,
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isExplaining, isSendingFollowUp]);

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = () => {
    const q = inputQuery.trim();
    if (!q || isSendingFollowUp || isExplaining) return;
    onSendFollowUp(q);
    setInputQuery('');
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-[#0e1017]">
      {/* Scrollable Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 no-scrollbar">
        {isExplaining && (
          <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            <span>Analyzing selected commands and diagnosing root cause...</span>
          </div>
        )}

        {messages.map((msg, idx) => (
          <ChatMessageItem
            key={idx}
            message={msg}
            onInsertCommand={onInsertCommand}
          />
        ))}

        {isSendingFollowUp && (
          <div className="flex items-center gap-2 p-2.5 text-xs text-slate-500 dark:text-zinc-400 italic">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />
            <span>Consulting AI assistant...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Follow-up Chat Input Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#0c0d12]/40 flex-shrink-0">
        <div className="relative flex items-end gap-2 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700/80 rounded-xl p-1.5 focus-within:ring-1 focus-within:ring-purple-500 transition-all">
          <textarea
            ref={inputRef}
            rows={2}
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask a follow-up question about this diagnosis..."
            className="flex-1 bg-transparent text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none resize-none px-2 py-1 font-sans"
          />

          <button
            type="button"
            disabled={!inputQuery.trim() || isSendingFollowUp || isExplaining}
            onClick={handleSend}
            className={clsx(
              'p-2 rounded-lg text-white transition-all cursor-pointer flex-shrink-0',
              inputQuery.trim()
                ? 'bg-purple-600 hover:bg-purple-500'
                : 'bg-slate-300 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed'
            )}
            title="Send follow-up question (Enter)"
          >
            {isSendingFollowUp ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
