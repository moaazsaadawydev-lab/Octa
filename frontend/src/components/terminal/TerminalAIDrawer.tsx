import React, { useEffect } from 'react';
import { Sparkles, X, Trash2, Terminal, ListFilter } from 'lucide-react';
import { ChatMessage } from '../../services/aiApi';
import { TerminalCommandBlock } from '../../types/terminalHistory';
import { TerminalContextPicker } from './TerminalContextPicker';
import { AIDrawerChat } from './AIDrawerChat';

interface TerminalAIDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  shellType: string;
  viewMode: 'picker' | 'chat';
  onSwitchToPicker: () => void;
  isExplaining: boolean;
  isSendingFollowUp: boolean;
  messages: ChatMessage[];
  onSendFollowUp: (query: string) => void;
  onInsertCommand: (command: string) => void;
  onClearHistory: () => void;
  blocks: TerminalCommandBlock[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onExplainSelected: () => void;
}

export const TerminalAIDrawer: React.FC<TerminalAIDrawerProps> = ({
  isOpen,
  onClose,
  shellType,
  viewMode,
  onSwitchToPicker,
  isExplaining,
  isSendingFollowUp,
  messages,
  onSendFollowUp,
  onInsertCommand,
  onClearHistory,
  blocks,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onExplainSelected,
}) => {
  // Listen for Escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[450px] max-w-[92vw] z-50 bg-white dark:bg-[#0e1017] border-l border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col transition-all duration-200 animate-in slide-in-from-right font-sans">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-[#0c0d12]/60 select-none flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-500">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
              Terminal AI Explainer
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-zinc-400">
              <Terminal className="w-2.5 h-2.5 text-brand-500" />
              <span>Shell: <span className="font-semibold text-slate-700 dark:text-zinc-300">{shellType}</span></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Change Selection Button (Visible in Chat view) */}
          {viewMode === 'chat' && (
            <button
              type="button"
              onClick={onSwitchToPicker}
              title="Change command selection"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-300 dark:border-purple-800 transition-colors cursor-pointer"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Change Selection</span>
            </button>
          )}

          {/* Clear Conversation History Button */}
          {messages.length > 0 && viewMode === 'chat' && (
            <button
              type="button"
              onClick={onClearHistory}
              title="Clear conversation"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Close Drawer Button */}
          <button
            type="button"
            onClick={onClose}
            title="Close Drawer (Esc)"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Drawer Body (Picker View vs Chat View) */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {viewMode === 'picker' ? (
          <TerminalContextPicker
            blocks={blocks}
            selectedIds={selectedIds}
            isExplaining={isExplaining}
            onToggleSelect={onToggleSelect}
            onSelectAll={onSelectAll}
            onDeselectAll={onDeselectAll}
            onExplainSelected={onExplainSelected}
          />
        ) : (
          <AIDrawerChat
            messages={messages}
            isExplaining={isExplaining}
            isSendingFollowUp={isSendingFollowUp}
            onSendFollowUp={onSendFollowUp}
            onInsertCommand={onInsertCommand}
          />
        )}
      </div>
    </div>
  );
};
