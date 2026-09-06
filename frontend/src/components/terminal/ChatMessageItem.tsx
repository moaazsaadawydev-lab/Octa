import React, { useState } from 'react';
import { Copy, Check, Terminal, User, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { ChatMessage } from '../../services/aiApi';

interface ChatMessageItemProps {
  message: ChatMessage;
  onInsertCommand?: (command: string) => void;
}

interface Block {
  type: 'text' | 'code';
  content: string;
  lang?: string;
}

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.split('\n');
  let inCode = false;
  let currentLang = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        blocks.push({
          type: 'code',
          content: currentContent.join('\n'),
          lang: currentLang || 'bash',
        });
        currentContent = [];
        inCode = false;
        currentLang = '';
      } else {
        if (currentContent.length > 0) {
          blocks.push({ type: 'text', content: currentContent.join('\n') });
          currentContent = [];
        }
        inCode = true;
        currentLang = line.trim().replace(/^```/, '').trim();
      }
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    blocks.push({
      type: inCode ? 'code' : 'text',
      content: currentContent.join('\n'),
      lang: currentLang,
    });
  }

  return blocks;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onInsertCommand,
}) => {
  const isUser = message.role === 'user';
  const blocks = parseBlocks(message.content);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 1800);
  };

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 1800);
  };

  return (
    <div
      className={clsx(
        'group relative flex gap-2.5 text-xs leading-relaxed transition-colors',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      )}

      <div
        className={clsx(
          'relative max-w-[88%] rounded-2xl p-3.5 space-y-2.5 transition-all shadow-xs group',
          isUser
            ? 'bg-brand-600 text-white rounded-tr-none'
            : 'bg-white dark:bg-[#12141c] border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 rounded-tl-none'
        )}
      >
        {/* Subtle Copy Message Button on Hover */}
        <button
          type="button"
          onClick={handleCopyMessage}
          title="Copy full message"
          className={clsx(
            'absolute top-2 right-2 p-1 rounded-md transition-opacity cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-xs flex items-center gap-1 text-[10.5px]',
            isUser
              ? 'bg-brand-700/80 hover:bg-brand-800 text-white/90'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300'
          )}
        >
          {copiedMessage ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </button>

        {blocks.map((block, idx) => {
          if (block.type === 'code') {
            const isCopied = copiedCodeIndex === idx;
            return (
              <div
                key={idx}
                className="my-2 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700/80 bg-slate-900 text-zinc-100 font-mono text-[11px]"
              >
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-950/80 border-b border-zinc-800 text-[10px] text-zinc-400">
                  <span className="font-semibold uppercase tracking-wider text-zinc-500">
                    {block.lang || 'terminal'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(block.content, idx)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      title="Copy code block"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {onInsertCommand && (
                      <button
                        type="button"
                        onClick={() => onInsertCommand(block.content)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
                        title="Insert into active terminal session"
                      >
                        <Terminal className="w-3 h-3" />
                        <span>Insert</span>
                      </button>
                    )}
                  </div>
                </div>

                <pre className="p-3 overflow-x-auto whitespace-pre leading-relaxed select-text">
                  <code>{block.content}</code>
                </pre>
              </div>
            );
          }

          return (
            <div
              key={idx}
              className="whitespace-pre-wrap font-sans text-xs leading-relaxed pr-6"
            >
              {block.content}
            </div>
          );
        })}
      </div>

      {isUser && (
        <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
};
