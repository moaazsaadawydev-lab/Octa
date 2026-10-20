import React, { useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Copy,
  Clipboard,
  Link2,
  ExternalLink,
} from 'lucide-react';

interface BrowserContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  selectedText?: string;
  onClose: () => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onCopyUrl: () => void;
  onOpenExternal: () => void;
}

export const BrowserContextMenu: React.FC<BrowserContextMenuProps> = ({
  isOpen,
  x,
  y,
  selectedText,
  onClose,
  onBack,
  onForward,
  onReload,
  onCopy,
  onPaste,
  onCopyUrl,
  onOpenExternal,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Viewport bounds calculation
  const menuWidth = 190;
  const menuHeight = 220;
  const clampedX = Math.min(Math.max(8, x), window.innerWidth - menuWidth - 8);
  const clampedY = Math.min(Math.max(8, y), window.innerHeight - menuHeight - 8);

  const itemClass =
    'flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800/80 rounded transition-colors text-left cursor-pointer';

  return (
    <div
      ref={menuRef}
      style={{ top: `${clampedY}px`, left: `${clampedX}px` }}
      className="fixed z-50 w-48 py-1 bg-white dark:bg-[#181920] border border-slate-200 dark:border-zinc-700/80 rounded-lg shadow-xl backdrop-blur-md select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Navigation Controls */}
      <button
        type="button"
        onClick={() => {
          onBack();
          onClose();
        }}
        className={itemClass}
      >
        <span className="flex items-center gap-2">
          <ArrowLeft className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
          <span>Back</span>
        </span>
        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">Alt+←</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onForward();
          onClose();
        }}
        className={itemClass}
      >
        <span className="flex items-center gap-2">
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
          <span>Forward</span>
        </span>
        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">Alt+→</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onReload();
          onClose();
        }}
        className={itemClass}
      >
        <span className="flex items-center gap-2">
          <RotateCw className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
          <span>Reload</span>
        </span>
        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">Ctrl+R</span>
      </button>

      <div className="my-1 border-t border-slate-200 dark:border-zinc-700/60" />

      {/* Clipboard Controls */}
      <button
        type="button"
        onClick={() => {
          onCopy();
          onClose();
        }}
        className={itemClass}
      >
        <span className="flex items-center gap-2">
          <Copy className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
          <span>{selectedText ? 'Copy Selection' : 'Copy'}</span>
        </span>
        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">Ctrl+C</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onPaste();
          onClose();
        }}
        className={itemClass}
      >
        <span className="flex items-center gap-2">
          <Clipboard className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
          <span>Paste</span>
        </span>
        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">Ctrl+V</span>
      </button>

      <div className="my-1 border-t border-slate-200 dark:border-zinc-700/60" />

      {/* URL & External Controls */}
      <button
        type="button"
        onClick={() => {
          onCopyUrl();
          onClose();
        }}
        className={itemClass}
      >
        <span className="flex items-center gap-2">
          <Link2 className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
          <span>Copy Page URL</span>
        </span>
      </button>

      <button
        type="button"
        onClick={() => {
          onOpenExternal();
          onClose();
        }}
        className={itemClass}
      >
        <span className="flex items-center gap-2">
          <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
          <span>Open in Browser</span>
        </span>
      </button>
    </div>
  );
};
